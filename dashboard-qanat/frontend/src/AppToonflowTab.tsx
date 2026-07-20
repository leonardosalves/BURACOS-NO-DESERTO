import React, { useState } from "react";
import { Clapperboard, RotateCw } from "lucide-react";
import { DashminPageLayout } from "./DashminPageLayout";

export function AppToonflowTab() {
  // Salva o link do Toonflow no localStorage (padrão: localhost do Toonflow-web)
  const [url, setUrl] = useState(() => {
    return (
      localStorage.getItem("lumiera-toonflow-url") || "http://localhost:5173"
    );
  });
  const [inputUrl, setInputUrl] = useState(url);
  const [key, setKey] = useState(0); // Usado para forçar reload do iframe

  const handleConnect = () => {
    localStorage.setItem("lumiera-toonflow-url", inputUrl);
    setUrl(inputUrl);
    setKey((k) => k + 1);
  };

  return (
    <DashminPageLayout
      title="Toonflow AI Studio"
      subtitle="Criador de dramas e quadrinhos curtos integrados ao Lumiera"
      breadcrumb={["Dashboard", "Ferramentas", "Toonflow AI"]}
      icon={<Clapperboard className="h-5 w-5 text-sky-300" />}
      className="lumiera-fill-view"
      actions={
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="URL (ex: http://localhost:5173)"
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-sky-500/30 focus:outline-none w-64"
          />
          <button
            onClick={handleConnect}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-cyan-500/10 border border-sky-500/40 text-xs font-bold text-sky-300 hover:from-sky-500/30 transition"
          >
            Conectar
          </button>
          <button
            onClick={() => setKey((k) => k + 1)}
            title="Recarregar página"
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl bg-zinc-950 border border-zinc-800 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      }
    >
      <div className="w-full h-[calc(100vh-210px)] rounded-lg overflow-hidden border border-dash-border bg-black">
        <iframe
          key={key}
          src={url}
          title="Toonflow"
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </DashminPageLayout>
  );
}
