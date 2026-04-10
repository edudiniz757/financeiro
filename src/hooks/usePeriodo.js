// hooks/usePeriodo.js
// Hook compartilhado de filtro de período — usado por Dashboard e Lancamentos

import { useState, useMemo } from "react";

export const PRESETS_PASSADO = [
  { key: "7d", label: "Últimos 7 dias" },
  { key: "mes", label: "Este mês" },
  { key: "mes_ant", label: "Mês passado" },
  { key: "3m", label: "Últimos 3 meses" },
  { key: "ano", label: "Este ano" },
];

export const PRESETS_FUTURO = [
  { key: "7d_f", label: "Próximos 7 dias" },
  { key: "30d_f", label: "Próximos 30 dias" },
  { key: "3m_f", label: "Próximos 3 meses" },
];

export function calcularIntervalo(preset, customInicio, customFim) {
  const hoje = new Date();
  const ini0 = new Date(hoje);
  ini0.setHours(0, 0, 0, 0);
  const fim0 = new Date(hoje);
  fim0.setHours(23, 59, 59, 999);

  switch (preset) {
    case "7d": {
      const ini = new Date(ini0);
      ini.setDate(ini.getDate() - 6);
      return { inicio: ini, fim: fim0 };
    }
    case "mes": {
      return {
        inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
        fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59),
      };
    }
    case "mes_ant": {
      return {
        inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1),
        fim: new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59),
      };
    }
    case "3m": {
      return {
        inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1),
        fim: fim0,
      };
    }
    case "ano": {
      return {
        inicio: new Date(hoje.getFullYear(), 0, 1),
        fim: fim0,
      };
    }
    case "7d_f": {
      const fim = new Date(ini0);
      fim.setDate(fim.getDate() + 6);
      fim.setHours(23, 59, 59, 999);
      return { inicio: ini0, fim };
    }
    case "30d_f": {
      const fim = new Date(ini0);
      fim.setDate(fim.getDate() + 29);
      fim.setHours(23, 59, 59, 999);
      return { inicio: ini0, fim };
    }
    case "3m_f": {
      const fim = new Date(
        hoje.getFullYear(),
        hoje.getMonth() + 3,
        0,
        23,
        59,
        59,
      );
      return { inicio: ini0, fim };
    }
    case "tudo":
      return { inicio: new Date("2000-01-01"), fim: new Date("2099-12-31") };
    case "custom": {
      return {
        inicio: customInicio
          ? new Date(customInicio + "T00:00:00")
          : new Date("2000-01-01"),
        fim: customFim
          ? new Date(customFim + "T23:59:59")
          : new Date("2099-12-31"),
      };
    }
    default:
      return { inicio: new Date("2000-01-01"), fim: new Date("2099-12-31") };
  }
}

export function usePeriodo(defaultPreset = "mes") {
  const [preset, setPreset] = useState(defaultPreset);
  const [customInicio, setCustomInicio] = useState("");
  const [customFim, setCustomFim] = useState("");

  const { inicio, fim } = useMemo(
    () => calcularIntervalo(preset, customInicio, customFim),
    [preset, customInicio, customFim],
  );

  function filtrar(transacoes) {
    return transacoes.filter((t) => {
      const d = new Date((t.data || t.data_inicio || "") + "T12:00:00");
      return d >= inicio && d <= fim;
    });
  }

  return {
    preset,
    setPreset,
    customInicio,
    setCustomInicio,
    customFim,
    setCustomFim,
    inicio,
    fim,
    filtrar,
  };
}
