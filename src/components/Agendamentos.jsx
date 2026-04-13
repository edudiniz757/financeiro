import { useState, useMemo } from "react";
import { formatarMoeda, formatarData } from "../utils/formatters";

const FORM_VAZIO = {
  categoria: "Moradia",
  descricao: "",
  valor: "",
  recorrencia: "mensal",
  data_inicio: new Date().toISOString().slice(0, 10),
  parcelas: 12,
};

function statusVencimento(dataStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataStr + "T12:00:00");
  const diff = Math.floor((venc - hoje) / (1000 * 60 * 60 * 24));

  if (diff < 0)
    return {
      label: `Vencido há ${Math.abs(diff)}d`,
      cor: "text-red-600 bg-red-50 border-red-200",
    };
  if (diff === 0)
    return {
      label: "Vence hoje",
      cor: "text-orange-600 bg-orange-50 border-orange-200",
    };
  if (diff <= 7)
    return {
      label: `${diff}d`,
      cor: "text-yellow-700 bg-yellow-50 border-yellow-200",
    };
  return {
    label: new Date(dataStr + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    }),
    cor: "text-blue-600 bg-blue-50 border-blue-200",
  };
}

function formatarMesAno(dataStr) {
  return new Date(dataStr + "T12:00:00").toLocaleDateString("pt-BR", {
    month: "2-digit",
    year: "numeric",
  });
}

function Agendamentos({
  transacoes,
  loading,
  onAdicionarLote,
  onApagar,
  onMarcarPago,
  categoriasSaida,
}) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("pendentes");
  const [gruposExpandidos, setGruposExpandidos] = useState({});

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

    if (!form.data_inicio) {
      setErro("Informe a data de início.");
      setSalvando(false);
      return;
    }

    const parcelas =
      form.recorrencia === "parcelado"
        ? parseInt(form.parcelas)
        : form.recorrencia === "mensal"
          ? 12
          : 1;

    const [anoInicio, mesInicio, diaInicio] = form.data_inicio
      .split("-")
      .map(Number);

    const grupoId = crypto.randomUUID();
    const lote = [];

    for (let i = 0; i < parcelas; i++) {
      const dataVenc = new Date(anoInicio, mesInicio - 1 + i, diaInicio);

      // Corrige se o dia não existe no mês (ex: 31 em fevereiro)
      if (dataVenc.getDate() !== diaInicio) dataVenc.setDate(0);

      lote.push({
        tipo: "agendamento",
        categoria: form.categoria,
        descricao:
          form.recorrencia === "parcelado"
            ? `${form.descricao} (${i + 1}/${parcelas})`
            : form.descricao,
        valor,
        data: dataVenc.toISOString().slice(0, 10),
        status: "pendente",
        recorrente: form.recorrencia === "mensal",
        dia_vencimento: diaInicio,
        grupo_id: grupoId,
      });
    }

    const { error } = await onAdicionarLote(lote);

    if (error) {
      setErro("Erro ao salvar agendamento.");
    } else {
      setForm(FORM_VAZIO);
    }
    setSalvando(false);
  }

  function toggleGrupo(id) {
    setGruposExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const grupos = useMemo(() => {
    const agendamentos = transacoes.filter((t) => t.tipo === "agendamento");

    const filtrados = agendamentos.filter((t) => {
      if (filtro === "pendentes") return t.status === "pendente";
      if (filtro === "pagos") return t.status === "pago";
      return true;
    });

    const map = {};
    const semGrupo = [];

    filtrados.forEach((t) => {
      if (t.grupo_id) {
        if (!map[t.grupo_id]) map[t.grupo_id] = [];
        map[t.grupo_id].push(t);
      } else {
        semGrupo.push(t);
      }
    });

    const resultado = [];

    Object.entries(map).forEach(([grupoId, parcelas]) => {
      const todasParcelas = transacoes
        .filter((t) => t.tipo === "agendamento" && t.grupo_id === grupoId)
        .sort((a, b) => a.data.localeCompare(b.data));

      const pendentes = todasParcelas.filter((p) => p.status === "pendente");
      const pagas = todasParcelas.filter((p) => p.status === "pago");

      const hojeStr = new Date().toISOString().slice(0, 10);
      const proximoPendente =
        pendentes.find((p) => p.data >= hojeStr) || pendentes[0] || null;

      resultado.push({
        _tipo: "grupo",
        id: grupoId,
        grupo_id: grupoId,
        categoria: todasParcelas[0].categoria,
        descricao:
          todasParcelas[0].descricao?.replace(/ \(\d+\/\d+\)$/, "") || "",
        valor: todasParcelas[0].valor,
        recorrente: todasParcelas[0].recorrente,
        data_inicio: todasParcelas[0].data,
        data_fim: todasParcelas[todasParcelas.length - 1].data,
        total_parcelas: todasParcelas.length,
        pagas: pagas.length,
        pendentes: pendentes.length,
        status: pendentes.length > 0 ? "pendente" : "pago",
        proximo_pendente: proximoPendente,
        _todas: todasParcelas,
        _pendentes: pendentes,
        _pagas: pagas,
      });
    });

    semGrupo.forEach((t) => {
      resultado.push({ _tipo: "unico", ...t });
    });

    return resultado.sort((a, b) => {
      const dA = a.data_inicio || a.data || "";
      const dB = b.data_inicio || b.data || "";
      return dA.localeCompare(dB);
    });
  }, [transacoes, filtro]);

  const totalPendente = useMemo(
    () =>
      transacoes
        .filter((t) => t.tipo === "agendamento" && t.status === "pendente")
        .reduce((s, t) => s + Number(t.valor), 0),
    [transacoes],
  );

  const totalAgendamentos = useMemo(
    () => transacoes.filter((t) => t.tipo === "agendamento").length,
    [transacoes],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Formulário ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-6 h-fit">
        <h2 className="font-semibold text-gray-700 mb-1">
          🗓️ Novo Agendamento
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Agende contas futuras únicas, mensais ou parceladas.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de recorrência */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {[
                { key: "unico", label: "Único" },
                { key: "mensal", label: "Mensal" },
                { key: "parcelado", label: "Parcelado" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, recorrencia: key }))}
                  className={`cursor-pointer flex-1 py-2 text-xs font-semibold transition-colors ${
                    form.recorrencia === key
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {form.recorrencia === "unico" && "Uma única cobrança futura"}
              {form.recorrencia === "mensal" &&
                "Repete mensalmente (gera 12 meses)"}
              {form.recorrencia === "parcelado" && "Número fixo de parcelas"}
            </p>
          </div>

          {/* Data de início */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Data de início
            </label>
            <input
              name="data_inicio"
              type="date"
              value={form.data_inicio}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.recorrencia === "unico"
                ? "Data do vencimento"
                : "As parcelas seguintes repetem no mesmo dia dos meses seguintes"}
            </p>
          </div>

          {/* Número de parcelas — só para parcelado */}
          {form.recorrencia === "parcelado" && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Nº de parcelas
              </label>
              <input
                name="parcelas"
                type="number"
                min="2"
                max="60"
                value={form.parcelas}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          {/* Categoria */}
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
              {categoriasSaida.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Descrição
            </label>
            <input
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              placeholder="Ex: Aluguel, Netflix..."
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Valor mensal (R$)
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

          {/* Preview */}
          {form.valor && form.data_inicio && (
            <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-700 border border-indigo-100">
              {form.recorrencia === "unico" && (
                <p>
                  📅 1 vencimento em{" "}
                  <strong>
                    {new Date(
                      form.data_inicio + "T12:00:00",
                    ).toLocaleDateString("pt-BR")}
                  </strong>
                </p>
              )}
              {form.recorrencia === "mensal" && (
                <p>
                  🔁 12 vencimentos a partir de{" "}
                  <strong>
                    {new Date(
                      form.data_inicio + "T12:00:00",
                    ).toLocaleDateString("pt-BR")}
                  </strong>{" "}
                  · Todo dia <strong>{form.data_inicio.split("-")[2]}</strong> ·
                  Total:{" "}
                  <strong>{formatarMoeda(parseFloat(form.valor) * 12)}</strong>
                </p>
              )}
              {form.recorrencia === "parcelado" && (
                <p>
                  📦 {form.parcelas}x de{" "}
                  <strong>{formatarMoeda(parseFloat(form.valor))}</strong> a
                  partir de{" "}
                  <strong>
                    {new Date(
                      form.data_inicio + "T12:00:00",
                    ).toLocaleDateString("pt-BR")}
                  </strong>{" "}
                  · Total:{" "}
                  <strong>
                    {formatarMoeda(
                      parseFloat(form.valor) * parseInt(form.parcelas),
                    )}
                  </strong>
                </p>
              )}
            </div>
          )}

          {erro && <p className="text-red-500 text-sm">{erro}</p>}

          <button
            type="submit"
            disabled={salvando}
            className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Agendar"}
          </button>
        </form>
      </div>

      {/* ── Lista de Agendamentos ──────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-gray-700">📋 Agendamentos</h2>
            {totalPendente > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-300 px-2 py-1 rounded-full font-medium">
                ⏳ {formatarMoeda(totalPendente)} pendente
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {[
              { key: "pendentes", label: "Pendentes" },
              { key: "pagos", label: "Pagos" },
              { key: "todos", label: "Todos" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                  filtro === key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-12">Carregando...</p>
        ) : grupos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">🗓️</p>
            <p className="text-gray-500 font-medium mb-1">
              {filtro === "pendentes"
                ? "Nenhum agendamento pendente"
                : "Nenhum agendamento"}
            </p>
            <p className="text-gray-400 text-sm">
              Use o formulário ao lado para agendar contas futuras.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {grupos.map((g) => {
              if (g._tipo === "grupo") {
                const expandido = gruposExpandidos[g.grupo_id];
                const venc = g.proximo_pendente
                  ? statusVencimento(g.proximo_pendente.data)
                  : null;

                const hojeStr = new Date().toISOString().slice(0, 7);
                const proximoMes = (() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + 1);
                  return d.toISOString().slice(0, 7);
                })();

                const visiveis = g._pendentes.filter(
                  (p) => p.data.slice(0, 7) <= proximoMes,
                );
                const futuras = g._pendentes.filter(
                  (p) => p.data.slice(0, 7) > proximoMes,
                );

                return (
                  <div
                    key={g.id}
                    className="bg-white rounded-xl shadow-sm border-l-4 border-indigo-400 overflow-hidden"
                  >
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">
                          {g.recorrente ? "🔁" : "📦"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">
                            {g.descricao || g.categoria}
                          </p>
                          <p className="text-xs text-gray-400">
                            {g.categoria} · {formatarMesAno(g.data_inicio)} →{" "}
                            {formatarMesAno(g.data_fim)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                              {g.total_parcelas}x · {formatarMoeda(g.valor)}/mês
                            </span>
                            {g.pagas > 0 && (
                              <span className="text-xs text-green-600 font-medium">
                                ✓ {g.pagas}/{g.total_parcelas}{" "}
                                {g.pagas === 1 ? "paga" : "pagas"}
                              </span>
                            )}
                            {g.pendentes > 0 && venc && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border ${venc.cor}`}
                              >
                                Próx: {venc.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {g.pendentes > 0 && (
                          <div className="text-right">
                            <p className="font-bold text-sm text-yellow-600">
                              -{formatarMoeda(g.valor * g.pendentes)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {g.pendentes} restante
                              {g.pendentes !== 1 ? "s" : ""}
                            </p>
                          </div>
                        )}
                        {g.proximo_pendente && (
                          <button
                            onClick={() => onMarcarPago(g.proximo_pendente)}
                            className="cursor-pointer text-xs bg-green-500 hover:bg-green-600 text-white px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium"
                          >
                            ✓ Pagar próx.
                          </button>
                        )}
                        {futuras.length > 0 && (
                          <button
                            onClick={() => toggleGrupo(g.grupo_id)}
                            className="cursor-pointer text-xs text-indigo-500 hover:text-indigo-700 px-1 font-medium"
                            title={
                              expandido
                                ? "Recolher"
                                : `Ver +${futuras.length} meses`
                            }
                          >
                            {expandido ? "▲" : `▼ +${futuras.length}`}
                          </button>
                        )}
                        <button
                          onClick={() => onApagar(g.grupo_id)}
                          className="cursor-pointer text-gray-300 hover:text-red-500 transition-colors"
                          title="Apagar todos os agendamentos deste grupo"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {visiveis.length > 0 && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {visiveis.map((p) => {
                          const pv = statusVencimento(p.data);
                          return (
                            <div
                              key={p.id}
                              className="px-4 py-2.5 flex items-center justify-between gap-3 bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${pv.cor}`}
                                >
                                  {pv.label}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(
                                    p.data + "T12:00:00",
                                  ).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-yellow-600">
                                  -{formatarMoeda(p.valor)}
                                </span>
                                <button
                                  onClick={() => onMarcarPago(p)}
                                  className="cursor-pointer text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg transition-colors"
                                >
                                  ✓ Pago
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {expandido && futuras.length > 0 && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {futuras.map((p) => (
                          <div
                            key={p.id}
                            className="px-4 py-2.5 flex items-center justify-between gap-3"
                          >
                            <span className="text-xs text-gray-400">
                              {new Date(
                                p.data + "T12:00:00",
                              ).toLocaleDateString("pt-BR", {
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-xs text-gray-400 font-semibold">
                              -{formatarMoeda(p.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {filtro !== "pendentes" && g._pagas.length > 0 && (
                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => toggleGrupo(g.grupo_id + "_pagas")}
                          className="cursor-pointer w-full text-left px-4 py-2 text-xs text-gray-400 hover:bg-gray-50"
                        >
                          {gruposExpandidos[g.grupo_id + "_pagas"] ? "▲" : "▼"}{" "}
                          {g._pagas.length} paga
                          {g._pagas.length !== 1 ? "s" : ""}
                        </button>
                        {gruposExpandidos[g.grupo_id + "_pagas"] && (
                          <div className="divide-y divide-gray-50">
                            {g._pagas
                              .sort((a, b) => b.data.localeCompare(a.data))
                              .map((p) => (
                                <div
                                  key={p.id}
                                  className="px-4 py-2 flex items-center justify-between opacity-60"
                                >
                                  <span className="text-xs text-gray-500">
                                    {new Date(
                                      p.data + "T12:00:00",
                                    ).toLocaleDateString("pt-BR")}
                                  </span>
                                  <span className="text-xs text-green-600 font-semibold">
                                    ✓ {formatarMoeda(p.valor)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Agendamento único ─────────────────────────────────────────
              const venc = statusVencimento(g.data);
              return (
                <div
                  key={g.id}
                  className={`bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4 border-l-4 ${
                    g.status === "pago"
                      ? "border-green-300 opacity-70"
                      : "border-yellow-400"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">🗓️</span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {g.descricao || g.categoria}
                      </p>
                      <p className="text-xs text-gray-400">
                        {g.categoria} · {formatarData(g.data)}
                      </p>
                      {g.status === "pendente" && (
                        <span
                          className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full border ${venc.cor}`}
                        >
                          {venc.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-bold text-sm ${g.status === "pago" ? "text-green-600" : "text-yellow-600"}`}
                    >
                      {g.status === "pago" ? "✓ " : "-"}
                      {formatarMoeda(g.valor)}
                    </span>
                    {g.status === "pendente" && (
                      <button
                        onClick={() => onMarcarPago(g)}
                        className="cursor-pointer text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg transition-colors"
                      >
                        ✓ Pago
                      </button>
                    )}
                    <button
                      onClick={() => onApagar(g.id)}
                      className="cursor-pointer text-gray-300 hover:text-red-500 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Agendamentos;
