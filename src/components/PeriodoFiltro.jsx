// components/PeriodoFiltro.jsx
// Componente de filtro reutilizável — dropdown de presets + Tudo + Personalizado

import { useState, useRef, useEffect } from "react";
import { PRESETS_PASSADO, PRESETS_FUTURO } from "../hooks/usePeriodo";

const TODOS_PRESETS = [...PRESETS_PASSADO, ...PRESETS_FUTURO];

export function PeriodoFiltro({
  preset,
  setPreset,
  customInicio,
  setCustomInicio,
  customFim,
  setCustomFim,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const presetAtual = TODOS_PRESETS.find((p) => p.key === preset);
  const labelDropdown =
    presetAtual?.label ?? (preset === "tudo" ? "Tudo" : "Personalizado");

  function selecionar(key) {
    setPreset(key);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Dropdown de períodos */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`cursor-pointer flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            preset !== "tudo" && preset !== "custom"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          }`}
        >
          📅 {labelDropdown}
          <span className="text-xs">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-52 py-1 text-sm">
            <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Passado
            </p>
            {PRESETS_PASSADO.map((p) => (
              <button
                key={p.key}
                onClick={() => selecionar(p.key)}
                className={`cursor-pointer w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors ${
                  preset === p.key
                    ? "text-indigo-600 font-semibold bg-indigo-50"
                    : "text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Futuro
            </p>
            {PRESETS_FUTURO.map((p) => (
              <button
                key={p.key}
                onClick={() => selecionar(p.key)}
                className={`cursor-pointer w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors ${
                  preset === p.key
                    ? "text-indigo-600 font-semibold bg-indigo-50"
                    : "text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botão Tudo */}
      <button
        onClick={() => selecionar("tudo")}
        className={`cursor-pointer text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
          preset === "tudo"
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
        }`}
      >
        Tudo
      </button>

      {/* Botão Personalizado */}
      <button
        onClick={() => selecionar("custom")}
        className={`cursor-pointer text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
          preset === "custom"
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
        }`}
      >
        Personalizado
      </button>

      {/* Inputs de data — só quando custom */}
      {preset === "custom" && (
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <input
            type="date"
            value={customInicio}
            onChange={(e) => setCustomInicio(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <span className="text-xs text-gray-400">até</span>
          <input
            type="date"
            value={customFim}
            onChange={(e) => setCustomFim(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      )}
    </div>
  );
}
