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
            placeholder="URL do Toonflow (ex: http://localhost:5173)"
            className="px-3 py-1.5 text-sm rounded bg-dash-input border border-dash-border focus:outline-none focus:border-dash-primary w-64 text-white"
          />
          <button
            onClick={handleConnect}
            className="px-3 py-1.5 text-sm bg-dash-primary text-white rounded hover:bg-opacity-80 transition-all font-medium"
          >
            Conectar
          </button>
          <button
            onClick={() => setKey((k) => k + 1)}
            title="Recarregar página"
            className="p-2 text-dash-muted hover:text-dash-foreground rounded bg-dash-card border border-dash-border"
          >
            <RotateCw className="w-4 h-4" />
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
