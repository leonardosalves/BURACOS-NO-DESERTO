import React, { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";

type Props = {
  url: string;
  onClose: () => void;
};

/**
 * Player de OUTPUT com estado de loading/erro.
 * Vídeos grandes ou MP4 sem faststart parecem “travados” no <video> nativo.
 */
export function OutputVideoPreviewModal({ url, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [loadSec, setLoadSec] = useState(0);

  useEffect(() => {
    setStatus("loading");
    setErrorMsg("");
    setLoadSec(0);
    const t = window.setInterval(() => setLoadSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [url]);

  const downloadUrl = url.includes("?")
    ? `${url}&download=true`
    : `${url}?download=true`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in font-sans">
      <div className="bg-[#0c0c0e] border border-zinc-850 rounded-3xl p-6 w-[720px] max-w-[95%] space-y-4 shadow-2xl relative animate-fade-in">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
          <h3 className="font-sans font-bold text-white text-xs tracking-wider">
            PREVIEW DE VÍDEO COMPILADO
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-semibold px-2 py-1 rounded hover:bg-zinc-900 border border-zinc-800"
          >
            Fechar
          </button>
        </div>

        <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-900 flex items-center justify-center shadow-inner relative">
          {status === "loading" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 pointer-events-none">
              <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
              <p className="text-[11px] text-zinc-300 font-medium">
                Carregando vídeo… {loadSec}s
              </p>
              <p className="text-[9px] text-zinc-500 max-w-[80%] text-center">
                Arquivos grandes ou MP4 sem “faststart” podem demorar até o
                navegador achar o início. O download costuma abrir na hora.
              </p>
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/85 p-4">
              <p className="text-[11px] text-red-300 font-semibold text-center">
                Não foi possível reproduzir neste navegador
              </p>
              <p className="text-[9px] text-zinc-500 text-center max-w-[90%]">
                {errorMsg ||
                  "Codec/container não suportado (ex.: ProRes .mov) ou URL inválida."}
              </p>
            </div>
          )}
          <video
            key={url}
            ref={videoRef}
            src={url}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="w-full h-full object-contain"
            onLoadedData={() => setStatus("ready")}
            onCanPlay={() => setStatus("ready")}
            onPlaying={() => setStatus("ready")}
            onWaiting={() => {
              /* mantém ready se já tocou; só loading no início */
            }}
            onError={() => {
              const mediaErr = videoRef.current?.error;
              const code = mediaErr?.code;
              const map: Record<number, string> = {
                1: "Abortado",
                2: "Erro de rede / proxy (404 ou stream interrompido)",
                3: "Arquivo corrompido ou decode falhou",
                4: "Formato/codec não suportado pelo browser",
              };
              setErrorMsg(
                (code && map[code]) || "Falha desconhecida no elemento <video>"
              );
              setStatus("error");
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-gold-500/90 text-zinc-950 hover:bg-gold-500"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar arquivo
          </a>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] font-medium px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir em nova aba
          </a>
        </div>

        <div className="text-[10px] text-zinc-500 text-center font-sans leading-relaxed">
          Preview via{" "}
          <code className="text-zinc-400">/api/projects-media/…</code>. Se o
          player ficar só carregando, use <strong>Baixar</strong> — o arquivo já
          está renderizado no disco.
        </div>
      </div>
    </div>
  );
}
