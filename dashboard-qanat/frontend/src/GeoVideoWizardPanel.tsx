import React, { useEffect, useRef, useState } from "react";
import { Globe, MapPin, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { fetchProjectSatellite } from "./timelineStudioSatellite";
import { GeoFlyoverUploadField } from "./GeoFlyoverUploadField";
import {
  filterGeoMotionScenes,
  geoSceneLabel,
  motionSceneFlyoverPath,
  motionSceneHasGeoPrompt,
  patchMotionSceneProps,
  type GeoMotionScene,
} from "./geoVideoFlyover";

type Props = {
  motionScenes: unknown[] | null | undefined;
  getProjectUrl: (path: string) => string;
  getAssetUrl: (fileName: string) => string;
  copyToClipboard: (text: string, section: string) => void;
  copiedSection: string | null;
  onMotionScenesChange: (
    scenes: GeoMotionScene[],
    opts?: { immediate?: boolean }
  ) => void;
  onStudioSynced?: (studio: unknown) => void;
};

export function GeoVideoWizardPanel({
  motionScenes,
  getProjectUrl,
  getAssetUrl,
  copyToClipboard,
  copiedSection,
  onMotionScenesChange,
  onStudioSynced,
}: Props) {
  const geoScenes = filterGeoMotionScenes(motionScenes);
  const [fetching, setFetching] = useState(false);
  const autoStarted = useRef(false);

  const needsPrompt = geoScenes.some((s) => !motionSceneHasGeoPrompt(s));

  const runGeneratePrompts = async (silent = false) => {
    setFetching(true);
    try {
      const data = await fetchProjectSatellite(getProjectUrl, { silent });
      if (!data) return;
      if (data.studio && onStudioSynced) {
        onStudioSynced(data.studio);
      }
      if (Array.isArray(data.motion_scenes) && data.motion_scenes.length > 0) {
        onMotionScenesChange(data.motion_scenes as GeoMotionScene[], {
          immediate: true,
        });
      }
      const q = data.quality as { ok?: boolean; score?: number } | undefined;
      if (!silent) {
        toast.success(
          `Prompts IA Geo gerados · QC ${q?.score ?? "—"}/100${q?.ok ? " ✓" : ""}`
        );
      }
    } catch (err) {
      if (!silent) {
        toast.error(`Geo IA: ${(err as Error).message || "erro"}`);
      }
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    autoStarted.current = false;
  }, [geoScenes.map((s) => s.id).join("|")]);

  useEffect(() => {
    if (!needsPrompt || autoStarted.current || geoScenes.length === 0) return;
    autoStarted.current = true;
    void runGeneratePrompts(true);
  }, [needsPrompt, geoScenes.length]);

  if (geoScenes.length === 0) return null;

  const patchScene = (motionId: string, patch: Record<string, unknown>) => {
    onMotionScenesChange(patchMotionSceneProps(geoScenes, motionId, patch), {
      immediate: true,
    });
  };

  return (
    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-300 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-200">
              Vídeos geográficos IA
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed max-w-2xl">
              Separado dos prompts B-roll: cada cena de mapa tem prompt T2V para
              Grok ou Google Flow. Copie, gere o vídeo fora do Lumiera e envie o
              MP4 aqui — sincroniza com a Timeline Studio e o render.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={fetching}
          onClick={() => void runGeneratePrompts(false)}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-200 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${fetching ? "animate-spin" : ""}`} />
          {fetching ? "Gerando prompts…" : "Regenerar prompts geo"}
        </button>
      </div>

      <div className="space-y-4">
        {geoScenes.map((scene) => {
          const prompt = String(scene.props?.ai_video_prompt || "").trim();
          const hasPrompt = motionSceneHasGeoPrompt(scene);
          const flyover = motionSceneFlyoverPath(scene);
          const copyKey = `geo-prompt-${scene.id}`;
          const mapProvider = String(scene.props?.map_provider || "ai_t2v");
          const geoBrief = String(scene.props?.geo_prompt_brief || "").trim();

          return (
            <div
              key={scene.id}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-violet-300" />
                <span className="text-[11px] font-bold text-white">
                  {geoSceneLabel(scene)}
                </span>
                <span className="text-[9px] font-mono text-zinc-500">
                  {scene.scene_ref || scene.id} · {scene.template_id}
                </span>
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    hasPrompt
                      ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/25"
                      : "text-amber-300 bg-amber-500/10 border border-amber-500/25"
                  }`}
                >
                  {hasPrompt
                    ? `QC OK · ${mapProvider}${geoBrief ? ` · ${geoBrief}` : ""}`
                    : "Aguardando prompt"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["location", "region", "country"] as const).map((key) => (
                  <div key={key} className="space-y-0.5">
                    <label className="text-[8px] text-zinc-500 uppercase font-mono">
                      {key === "location"
                        ? "Local"
                        : key === "region"
                          ? "Região"
                          : "País"}
                    </label>
                    <input
                      type="text"
                      value={String(scene.props?.[key] || "")}
                      onChange={(e) =>
                        patchScene(scene.id, { [key]: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                    Prompt IA Geo (Grok / Google Flow)
                  </label>
                  {hasPrompt ? (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(prompt, copyKey)}
                      className="text-[9px] text-zinc-400 hover:text-white"
                    >
                      {copiedSection === copyKey ? (
                        <span className="text-emerald-500 font-bold">OK</span>
                      ) : (
                        "Copiar prompt"
                      )}
                    </button>
                  ) : null}
                </div>
                <textarea
                  rows={8}
                  value={prompt}
                  onChange={(e) =>
                    patchScene(scene.id, {
                      ai_video_prompt: e.target.value,
                      map_provider: "ai_t2v",
                      geo_generation: "ai_prompt",
                    })
                  }
                  placeholder="Zoom contínuo Terra→alvo, destaque territorial, órbita 360° em POIs…"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] text-zinc-200 resize-y min-h-[120px] font-mono leading-relaxed"
                />
              </div>

              <GeoFlyoverUploadField
                motionId={scene.id}
                flyoverPath={flyover}
                getProjectUrl={getProjectUrl}
                getAssetUrl={getAssetUrl}
                onUploaded={(result) => {
                  if (Array.isArray(result.motion_scenes)) {
                    onMotionScenesChange(
                      result.motion_scenes as GeoMotionScene[],
                      {
                        immediate: true,
                      }
                    );
                  } else if (result.flyover_video) {
                    patchScene(scene.id, {
                      flyover_video: result.flyover_video,
                    });
                  }
                  if (result.studio && onStudioSynced) {
                    onStudioSynced(result.studio);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
