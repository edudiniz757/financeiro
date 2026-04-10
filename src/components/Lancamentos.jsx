import { useState, useEffect, useMemo } from "react";
import { usePeriodo } from "../hooks/usePeriodo";
import { PeriodoFiltro } from "./PeriodoFiltro";
import { formatarMoeda, formatarData } from "../utils/formatters";

const FORM_VAZIO = {
  modo: "saida",
  categoria: "Alimentação",
  descricao: "",
  valor: "",
  data: new Date().toISOString().slice(0, 10),
};

function Lancamentos({
  transacoes,
  loading,
  onAdicionar,
  onEditar,
  onApagar,
  categoriasSaida,
  categoriasEntrada,
}) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const periodo = usePeriodo("mes");

  useEffect(() => {
    const cats = form.modo === "entrada" ? categoriasEntrada : categoriasSaida;
    setForm((f) => ({ ...f, categoria: cats[0] }));
  }, [form.modo]);

  const categorias =
    form.modo === "entrada" ? categoriasEntrada : categoriasSaida;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const valor = parseFloat(form.valor);
    if (!valor || valor <= 0) {
      setErro("Informe um valor válido.");
      setSalvando(false);
      return;
    }

    const dados = {
      tipo: form.modo,
      categoria: form.categoria,
      descricao: form.descricao,
      valor,
      data: form.data,
      status: "pago",
      recorrente: false,
      dia_vencimento: null,
      grupo_id: null,
    };

    const { error } = editandoId
      ? await onEditar(editandoId, dados)
      : await onAdicionar(dados);
    if (error) {
      setErro("Erro ao salvar. Tente novamente.");
    } else {
      setForm(FORM_VAZIO);
      setEditandoId(null);
    }
    setSalvando(false);
  }

  function handleEditar(t) {
    setForm({
      modo: t.tipo,
      categoria: t.categoria,
      descricao: t.descricao || "",
      valor: t.valor,
      data: t.data,
    });
    setEditandoId(t.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelar() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setErro("");
  }

  // Lista: só entradas/saídas reais — agendamentos não aparecem aqui
  const lista = useMemo(() => {
    return transacoes
      .filter((t) => t.tipo === "entrada" || t.tipo === "saida")
      .filter((t) => {
        const d = new Date(t.data + "T12:00:00");
        return d >= periodo.inicio && d <= periodo.fim;
      })
      .filter((t) => filtroTipo === "todos" || t.tipo === filtroTipo)
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [transacoes, periodo.inicio, periodo.fim, filtroTipo]);

  const totalEntradas = useMemo(
    () =>
      lista
        .filter((t) => t.tipo === "entrada")
        .reduce((s, t) => s + Number(t.valor), 0),
    [lista],
  );
  const totalSaidas = useMemo(
    () =>
      lista
        .filter((t) => t.tipo === "saida")
        .reduce((s, t) => s + Number(t.valor), 0),
    [lista],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário */}
      <div className="bg-white rounded-2xl shadow-sm p-6 h-fit">
        <h2 className="font-semibold text-gray-700 mb-4">
          {editandoId ? "✏️ Editar" : "➕ Novo Lançamento"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {[
              {
                key: "entrada",
                label: "⬆️ Entrada",
                active: "bg-green-500 text-white",
              },
              {
                key: "saida",
                label: "⬇️ Saída",
                active: "bg-red-500 text-white",
              },
            ].map(({ key, label, active }) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, modo: key }))}
                className={`cursor-pointer flex-1 py-2 text-sm font-semibold transition-colors ${
                  form.modo === key
                    ? active
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {[{ label: "Data", name: "data", type: "date", required: true }].map(
            ({ label, name, type, required }) => (
              <div key={name}>
                <label className="block text-sm text-gray-600 mb-1">
                  {label}
                </label>
                <input
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={handleChange}
                  required={required}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            ),
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Categoria
            </label>
            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {categorias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Descrição
            </label>
            <input
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              placeholder="Ex: Conta de luz"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Valor (R$)
            </label>
            <input
              name="valor"
              type="number"
              step="0.01"
              min="0.01"
              value={form.valor}
              onChange={handleChange}
              required
              placeholder="0,00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {erro && <p className="text-red-500 text-sm">{erro}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="cursor-pointer flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {salvando ? "Salvando..." : editandoId ? "Salvar" : "Adicionar"}
            </button>
            {editandoId && (
              <button
                type="button"
                onClick={handleCancelar}
                className="cursor-pointer px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-xs text-indigo-600">
            🗓️ Para agendar contas futuras ou recorrentes, use a aba{" "}
            <strong>Agendamentos</strong>.
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="lg:col-span-2">
        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 space-y-3">
          <PeriodoFiltro {...periodo} />

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-400">Tipo:</span>
            {[
              { key: "todos", label: "Todos" },
              { key: "entrada", label: "⬆️ Entradas" },
              { key: "saida", label: "⬇️ Saídas" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltroTipo(key)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  filtroTipo === key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}

            <div className="ml-auto text-xs">
              <span className="text-green-600 font-semibold">
                {formatarMoeda(totalEntradas)}
              </span>
              <span className="text-gray-300 mx-1">·</span>
              <span className="text-red-500 font-semibold">
                {formatarMoeda(totalSaidas)}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-12">Carregando...</p>
        ) : lista.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-400">Nenhum lançamento no período</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lista.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">
                    {t.tipo === "entrada" ? "⬆️" : "⬇️"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {t.descricao || t.categoria}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t.categoria} · {formatarData(t.data)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-bold text-sm ${t.tipo === "entrada" ? "text-green-600" : "text-red-500"}`}
                  >
                    {t.tipo === "entrada" ? "+" : "-"}
                    {formatarMoeda(t.valor)}
                  </span>
                  <button
                    onClick={() => handleEditar(t)}
                    className="cursor-pointer text-indigo-400 hover:text-indigo-600"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onApagar(t.id)}
                    className="cursor-pointer text-gray-300 hover:text-red-500"
                    title="Apagar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Lancamentos;
