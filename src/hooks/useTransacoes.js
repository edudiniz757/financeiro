import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useTransacoes(userId) {
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  async function buscarTransacoes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("transacoes")
      .select("*")
      .eq("user_id", userId)
      .order("data", { ascending: false });

    if (!error) setTransacoes(data);
    setLoading(false);
  }

  async function adicionarTransacao(transacao) {
    const { data, error } = await supabase
      .from("transacoes")
      .insert([{ ...transacao, user_id: userId }])
      .select()
      .single();

    if (!error && data) {
      setTransacoes((prev) =>
        [data, ...prev].sort((a, b) => b.data.localeCompare(a.data)),
      );
    }
    return { error };
  }

  // Insert em lote — 1 única chamada para múltiplos registros
  async function adicionarTransacoes(lista) {
    const comUser = lista.map((t) => ({ ...t, user_id: userId }));
    const { data, error } = await supabase
      .from("transacoes")
      .insert(comUser)
      .select();

    if (!error && data) {
      setTransacoes((prev) =>
        [...data, ...prev].sort((a, b) => b.data.localeCompare(a.data)),
      );
    }
    return { error };
  }

  async function editarTransacao(id, transacao) {
    const { data, error } = await supabase
      .from("transacoes")
      .update(transacao)
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      setTransacoes((prev) => prev.map((t) => (t.id === id ? data : t)));
    }
    return { error };
  }

  async function apagarTransacao(id) {
    // Verifica se é um grupo_id
    const porGrupo = transacoes.filter((t) => t.grupo_id === id);

    if (porGrupo.length > 0) {
      const { error } = await supabase
        .from("transacoes")
        .delete()
        .eq("grupo_id", id)
        .eq("user_id", userId);

      if (!error) {
        setTransacoes((prev) => prev.filter((t) => t.grupo_id !== id));
      }
      return { error };
    }

    const { error } = await supabase.from("transacoes").delete().eq("id", id);

    if (!error) {
      setTransacoes((prev) => prev.filter((t) => t.id !== id));
    }
    return { error };
  }

  async function marcarComoPago(agendamento) {
    const { error: errUpdate } = await supabase
      .from("transacoes")
      .update({ status: "pago" })
      .eq("id", agendamento.id);

    if (errUpdate) return { error: errUpdate };

    const novaTransacao = {
      user_id: userId,
      tipo: "saida",
      categoria: agendamento.categoria,
      descricao: agendamento.descricao,
      valor: agendamento.valor,
      data: new Date().toISOString().slice(0, 10),
      status: "pago",
      recorrente: false,
      dia_vencimento: null,
      grupo_id: null,
    };

    const { data, error: errInsert } = await supabase
      .from("transacoes")
      .insert([novaTransacao])
      .select()
      .single();

    if (errInsert) return { error: errInsert };

    setTransacoes((prev) => {
      const atualizado = prev.map((t) =>
        t.id === agendamento.id ? { ...t, status: "pago" } : t,
      );
      return [data, ...atualizado].sort((a, b) => b.data.localeCompare(a.data));
    });

    return { error: null };
  }

  useEffect(() => {
    if (userId) buscarTransacoes();
  }, [userId]);

  const transacoesReais = transacoes.filter(
    (t) => t.tipo !== "agendamento" || t.status === "pago",
  );

  const totalEntradas = transacoesReais
    .filter((t) => t.tipo === "entrada")
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const totalSaidas = transacoesReais
    .filter((t) => t.tipo === "saida")
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const saldo = totalEntradas - totalSaidas;

  const totalPendente = transacoes
    .filter((t) => t.status === "pendente")
    .reduce((acc, t) => acc + Number(t.valor), 0);

  return {
    transacoes,
    loading,
    totalEntradas,
    totalSaidas,
    totalPendente,
    saldo,
    adicionarTransacao,
    adicionarTransacoes,
    editarTransacao,
    apagarTransacao,
    marcarComoPago,
    buscarTransacoes,
  };
}
