import React, { useState, useEffect } from "react";
import CanalYouTube from "./CanalYouTube";
import Ressuscitador from "./Ressuscitador";
import RadarTendencias from "./RadarTendencias";
import MonitorVideos from "./MonitorVideos";
import MemoryPanel from "./MemoryPanel";
import TitleAB from "./TitleAB";
import EditorialCalendar from "./EditorialCalendar";

type TabId = "canal" | "reviver" | "radar" | "monitor" | "memoria" | "ab" | "calendario";

interface CanaisEPublicacaoProps {
  abaInicial?: TabId;
  aoVirarVideo?: (opts: { tema: string; sub_nicho?: string | null }) => void;
}

export default function CanaisEPublicacao({ abaInicial = "canal", aoVirarVideo }: CanaisEPublicacaoProps) {
  const [aba, setAba] = useState<TabId>(abaInicial);

  useEffect(() => {
    setAba(abaInicial);
  }, [abaInicial]);

  const ABAS = [
    { id: "canal" as const, rotulo: "📺 Canal YouTube" },
    { id: "reviver" as const, rotulo: "⚰️ Ressuscitador" },
    { id: "radar" as const, rotulo: "🎯 Radar de Tendências" },
    { id: "monitor" as const, rotulo: "🔥 Monitor de Vídeos" },
    { id: "memoria" as const, rotulo: "🧠 Memória" },
    { id: "ab" as const, rotulo: "🔀 A/B Títulos" },
    { id: "calendario" as const, rotulo: "📅 Calendário" },
  ];

  return (
    <div className="space-y-6">
      {/* Abas de Navegação */}
      <div className="flex border-b border-zinc-900 pb-px gap-1.5 overflow-x-auto select-none font-sans">
        {ABAS.map((a) => {
          const active = aba === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`px-4 py-3 text-xs font-bold transition-all relative border-b-2 -mb-px outline-none cursor-pointer ${
                active
                  ? "border-amber-500 text-amber-400 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {a.rotulo}
            </button>
          );
        })}
      </div>

      {/* Renderização do Painel Ativo */}
      <div className="animate-fade-in duration-200">
        {aba === "canal" && <CanalYouTube />}
        {aba === "reviver" && <Ressuscitador />}
        {aba === "radar" && <RadarTendencias aoVirarVideo={aoVirarVideo} />}
        {aba === "monitor" && <MonitorVideos />}
        {aba === "memoria" && <MemoryPanel />}
        {aba === "ab" && <TitleAB />}
        {aba === "calendario" && <EditorialCalendar aoAgendar={aoVirarVideo} />}
      </div>
    </div>
  );
}

