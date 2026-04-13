import { useMemo } from "react";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useTransacoes } from "../hooks/useTransacoes";
import { usePeriodo } from "../hooks/usePeriodo";
import { PeriodoFiltro } from "./PeriodoFiltro";
import { formatarMoeda, formatarData } from "../utils/formatters";
import Lancamentos from "./Lancamentos";
import Agendamentos from "./Agendamentos";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const CATEGORIAS_SAIDA = [
  "Alimentação",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Moradia",
  "Outros",
];
const CATEGORIAS_ENTRADA = [
  "Salário",
  "Freelance",
  "Investimentos",
  "Aluguel recebido",
  "Outros",
];
const CORES = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

function Dashboard({ user }) {
  const [aba, setAba] = useState(
    () => localStorage.getItem("aba_ativa") || "dashboard",
  );

  function mudarAba(a) {
    localStorage.setItem("aba_ativa", a);
    setAba(a);
  }

  const {
    transacoes,
    loading,
    adicionarTransacao,
    adicionarTransacoes,
    editarTransacao,
    apagarTransacao,
    marcarComoPago,
  } = useTransacoes(user.id);

  // Filtro de período compartilhado
  const periodo = usePeriodo("mes");

  // Transações reais (sem agendamentos pendentes)
  const transacoesReais = useMemo(
    () =>
      transacoes.filter((t) => t.tipo !== "agendamento" || t.status === "pago"),
    [transacoes],
  );

  // Filtradas pelo período
  const transacoesFiltradas = useMemo(
    () => periodo.filtrar(transacoesReais),
    [transacoesReais, periodo.inicio, periodo.fim],
  );

  // Cards
  const totalEntradas = useMemo(
    () =>
      transacoesFiltradas
        .filter((t) => t.tipo === "entrada")
        .reduce((s, t) => s + Number(t.valor), 0),
    [transacoesFiltradas],
  );
  const totalSaidas = useMemo(
    () =>
      transacoesFiltradas
        .filter((t) => t.tipo === "saida")
        .reduce((s, t) => s + Number(t.valor), 0),
    [transacoesFiltradas],
  );
  const saldo = totalEntradas - totalSaidas;

  // A vencer: filtra pelo mesmo período selecionado (não fixo em 30d)
  const aVencer = useMemo(() => {
    return transacoes
      .filter((t) => {
        if (t.status !== "pendente") return false;
        const d = new Date(t.data + "T12:00:00");
        return d >= periodo.inicio && d <= periodo.fim;
      })
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 5);
  }, [transacoes, periodo.inicio, periodo.fim]);

  const totalPendente = useMemo(
    () => aVencer.reduce((s, t) => s + Number(t.valor), 0),
    [aVencer],
  );

  // Gráficos
  const dadosBarras = useMemo(() => {
    const meses = {};
    transacoesFiltradas.forEach((t) => {
      const mes = t.data.slice(0, 7);
      if (!meses[mes]) meses[mes] = { mes, entradas: 0, saidas: 0 };
      if (t.tipo === "entrada") meses[mes].entradas += Number(t.valor);
      else if (t.tipo === "saida") meses[mes].saidas += Number(t.valor);
    });
    return Object.values(meses)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((m) => ({
        ...m,
        mes: new Date(m.mes + "-01").toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        }),
      }));
  }, [transacoesFiltradas]);

  const dadosPizza = useMemo(() => {
    const cats = {};
    transacoesFiltradas
      .filter((t) => t.tipo === "saida")
      .forEach((t) => {
        cats[t.categoria] = (cats[t.categoria] || 0) + Number(t.valor);
      });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [transacoesFiltradas]);

  const dadosLinha = useMemo(() => {
    let ac = 0;
    return [...transacoesFiltradas]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((t) => {
        ac += t.tipo === "entrada" ? Number(t.valor) : -Number(t.valor);
        return { data: formatarData(t.data), saldo: ac };
      });
  }, [transacoesFiltradas]);

  const hojeZero = new Date();
  hojeZero.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-600">
          💰 Financeiro Familiar
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">
            {user.email}
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="cursor-pointer text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Sair
          </button>
        </div>
      </header>

      <nav className="bg-white border-b px-6 flex gap-1">
        {[
          { key: "dashboard", label: "📊 Dashboard" },
          { key: "lancamentos", label: "📝 Lançamentos" },
          { key: "agendamentos", label: "🗓️ Agendamentos" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => mudarAba(key)}
            className={`cursor-pointer py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
              aba === key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {aba === "dashboard" && (
          <>
            {/* Filtro */}
            <div className="bg-white rounded-2xl shadow-sm px-5 py-4 mb-6">
              <PeriodoFiltro {...periodo} />
            </div>

            {/* Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: "Saldo",
                  valor: saldo,
                  cor: saldo >= 0 ? "text-green-600" : "text-red-500",
                },
                {
                  label: "Entradas",
                  valor: totalEntradas,
                  cor: "text-green-600",
                },
                { label: "Saídas", valor: totalSaidas, cor: "text-red-500" },
                {
                  label: "A vencer",
                  valor: totalPendente,
                  cor: "text-yellow-500",
                },
              ].map(({ label, valor, cor }) => (
                <div key={label} className="bg-white rounded-2xl shadow-sm p-5">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${cor}`}>
                    {formatarMoeda(valor)}
                  </p>
                </div>
              ))}
            </div>

            {/* A vencer */}
            {aVencer.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">
                  ⏳ A vencer no período
                </h3>
                <div className="space-y-2">
                  {aVencer.map((t) => {
                    const data = new Date(t.data + "T12:00:00");
                    const diff = Math.floor((data - hojeZero) / 86400000);
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {t.descricao || t.categoria}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t.categoria} ·{" "}
                            {diff < 0 ? (
                              <span className="text-red-500 font-medium">
                                Vencido há {Math.abs(diff)}d
                              </span>
                            ) : diff === 0 ? (
                              <span className="text-orange-500 font-medium">
                                Vence hoje
                              </span>
                            ) : (
                              <span>
                                Vence em {diff}d —{" "}
                                {data.toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-sm text-yellow-600">
                            -{formatarMoeda(t.valor)}
                          </span>
                          <button
                            onClick={() => marcarComoPago(t)}
                            className="cursor-pointer text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-lg"
                          >
                            ✓ Pago
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gráficos */}
            {loading ? (
              <p className="text-center text-gray-400 py-12">Carregando...</p>
            ) : transacoesFiltradas.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <p className="text-gray-400 text-lg mb-1">
                  Sem lançamentos no período
                </p>
                <p className="text-gray-300 text-sm">
                  Tente outro período ou adicione lançamentos
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="font-semibold text-gray-700 mb-4">
                    📊 Entradas vs Saídas
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dadosBarras}>
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => formatarMoeda(v)} />
                      <Legend />
                      <Bar
                        dataKey="entradas"
                        name="Entradas"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="saidas"
                        name="Saídas"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="font-semibold text-gray-700 mb-4">
                    🍕 Gastos por Categoria
                  </h3>
                  {dadosPizza.length === 0 ? (
                    <p className="text-gray-300 text-sm text-center py-16">
                      Sem saídas no período
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={dadosPizza}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {dadosPizza.map((_, i) => (
                            <Cell key={i} fill={CORES[i % CORES.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatarMoeda(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-5 lg:col-span-2">
                  <h3 className="font-semibold text-gray-700 mb-4">
                    📈 Evolução do Saldo
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dadosLinha}>
                      <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => formatarMoeda(v)} />
                      <Line
                        type="monotone"
                        dataKey="saldo"
                        name="Saldo"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {aba === "lancamentos" && (
          <Lancamentos
            transacoes={transacoes}
            loading={loading}
            onAdicionar={adicionarTransacao}
            onEditar={editarTransacao}
            onApagar={apagarTransacao}
            categoriasSaida={CATEGORIAS_SAIDA}
            categoriasEntrada={CATEGORIAS_ENTRADA}
          />
        )}

        {aba === "agendamentos" && (
          <Agendamentos
            onEditar={editarTransacao}
            transacoes={transacoes}
            loading={loading}
            onAdicionarLote={adicionarTransacoes}
            onApagar={apagarTransacao}
            onMarcarPago={marcarComoPago}
            categoriasSaida={CATEGORIAS_SAIDA}
          />
        )}
      </main>
    </div>
  );
}

export default Dashboard;
