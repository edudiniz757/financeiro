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

const CATS_SAIDA = [
  "Alimentação",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Moradia",
  "Outros",
];
const CATS_ENTRADA = [
  "Salário",
  "Freelance",
  "Investimentos",
  "Aluguel recebido",
  "Outros",
];

// ─── Modal de Edição ─────────────────────────────────────────────────────────
function ModalEdicao({
  transacao,
  categoriasSaida,
  categoriasEntrada,
  onSalvar,
  onFechar,
}) {
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!transacao) return;
    setForm({
      tipo: transacao.tipo,
      categoria: transacao.categoria,
      descricao: transacao.descricao || "",
      valor: transacao.valor,
      data: transacao.data,
      observacao: transacao.observacao || "",
    });
    setErro("");
  }, [transacao]);

  if (!transacao) return null;

  const categorias =
    form.tipo === "entrada" ? categoriasEntrada : categoriasSaida;

  function set(name, value) {
    if (name === "tipo") {
      const cats = value === "entrada" ? categoriasEntrada : categoriasSaida;
      setForm((f) => ({ ...f, tipo: value, categoria: cats[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  async function handleSalvar() {
    const valor = parseFloat(form.valor);
    if (!valor || valor <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (!form.data) {
      setErro("Informe uma data.");
      return;
    }

    setSalvando(true);
    setErro("");

    const { error } = await onSalvar(transacao.id, {
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao,
      valor,
      data: form.data,
      observacao: form.observacao || null,
      status: "pago",
      recorrente: false,
      dia_vencimento: null,
      grupo_id: null,
    });

    if (error) setErro("Erro ao salvar. Tente novamente.");
    else onFechar();
    setSalvando(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4"
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">✏️ Editar lançamento</h2>
          <button
            onClick={onFechar}
            className="cursor-pointer text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Corpo */}
        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Tipo */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Tipo</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {[
                {
                  key: "entrada",
                  label: "⬆️ Entrada",
                  cls: "bg-green-500 text-white",
                },
                {
                  key: "saida",
                  label: "⬇️ Saída",
                  cls: "bg-red-500 text-white",
                },
              ].map(({ key, label, cls }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("tipo", key)}
                  className={`cursor-pointer flex-1 py-2 text-sm font-semibold transition-colors ${
                    form.tipo === key
                      ? cls
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Data</label>
            <input
              type="date"
              value={form.data || ""}
              onChange={(e) => set("data", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">
              Categoria
            </label>
            <select
              value={form.categoria || ""}
              onChange={(e) => set("categoria", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {(categorias || []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">
              Descrição
            </label>
            <input
              value={form.descricao || ""}
              onChange={(e) => set("descricao", e.target.value)}
              placeholder="Ex: Conta de luz"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.valor || ""}
              onChange={(e) => set("valor", e.target.value)}
              placeholder="0,00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Observação */}
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">
              Observação{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={form.observacao || ""}
              onChange={(e) => set("observacao", e.target.value)}
              placeholder="Ex: Pago via Pix, nota fiscal #1234..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {erro && <p className="text-red-500 text-sm">{erro}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onFechar}
            className="cursor-pointer flex-1 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="cursor-pointer flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
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
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [editando, setEditando] = useState(null); // transação sendo editada no modal

  const periodo = usePeriodo("mes");

  const catsSaida = categoriasSaida || CATS_SAIDA;
  const catsEntrada = categoriasEntrada || CATS_ENTRADA;
  const cats = form.modo === "entrada" ? catsEntrada : catsSaida;

  useEffect(() => {
    setForm((f) => ({ ...f, categoria: cats[0] }));
  }, [form.modo]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const valor = parseFloat(form.valor);
    if (!valor || valor <= 0) {
      setErro("Informe um valor válido.");
      return;
    }

    setSalvando(true);
    setErro("");

    const { error } = await onAdicionar({
      tipo: form.modo,
      categoria: form.categoria,
      descricao: form.descricao,
      valor,
      data: form.data,
      status: "pago",
      recorrente: false,
      dia_vencimento: null,
      grupo_id: null,
    });

    if (error) setErro("Erro ao salvar. Tente novamente.");
    else setForm(FORM_VAZIO);
    setSalvando(false);
  }

  // Lista filtrada — só entradas/saídas diretas
  const lista = useMemo(
    () =>
      transacoes
        .filter((t) => t.tipo === "entrada" || t.tipo === "saida")
        .filter((t) => {
          const d = new Date(t.data + "T12:00:00");
          return d >= periodo.inicio && d <= periodo.fim;
        })
        .filter((t) => filtroTipo === "todos" || t.tipo === filtroTipo)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [transacoes, periodo.inicio, periodo.fim, filtroTipo],
  );

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
    <>
      {/* Modal de edição */}
      <ModalEdicao
        transacao={editando}
        categoriasSaida={catsSaida}
        categoriasEntrada={catsEntrada}
        onSalvar={onEditar}
        onFechar={() => setEditando(null)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Formulário ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-6 h-fit">
          <h2 className="font-semibold text-gray-700 mb-4">
            ➕ Novo Lançamento
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {[
                {
                  key: "entrada",
                  label: "⬆️ Entrada",
                  cls: "bg-green-500 text-white",
                },
                {
                  key: "saida",
                  label: "⬇️ Saída",
                  cls: "bg-red-500 text-white",
                },
              ].map(({ key, label, cls }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, modo: key }))}
                  className={`cursor-pointer flex-1 py-2 text-sm font-semibold transition-colors ${
                    form.modo === key
                      ? cls
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Data</label>
              <input
                name="data"
                type="date"
                value={form.data}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

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
                {cats.map((c) => (
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

            <button
              type="submit"
              disabled={salvando}
              className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Adicionar"}
            </button>
          </form>

          <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs text-indigo-600">
              🗓️ Para agendar contas futuras ou recorrentes, use a aba{" "}
              <strong>Agendamentos</strong>.
            </p>
          </div>
        </div>

        {/* ── Lista ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
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
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                >
                  {/* Barra lateral colorida */}
                  <div
                    className={`w-1 self-stretch rounded-full shrink-0 ${t.tipo === "entrada" ? "bg-green-400" : "bg-red-400"}`}
                  />

                  <span className="text-xl shrink-0">
                    {t.tipo === "entrada" ? "⬆️" : "⬇️"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {t.descricao || t.categoria}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t.categoria} · {formatarData(t.data)}
                    </p>
                    {t.observacao && (
                      <p className="text-xs text-gray-400 italic mt-0.5 truncate">
                        "{t.observacao}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-bold text-sm ${t.tipo === "entrada" ? "text-green-600" : "text-red-500"}`}
                    >
                      {t.tipo === "entrada" ? "+" : "-"}
                      {formatarMoeda(t.valor)}
                    </span>

                    <button
                      onClick={() => setEditando(t)}
                      className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Editar"
                    >
                      🖊️
                    </button>

                    <button
                      onClick={() => onApagar(t.id)}
                      className="cursor-pointer p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
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
    </>
  );
}

export default Lancamentos;
