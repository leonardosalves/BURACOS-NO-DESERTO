import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Clapperboard,
  FileAudio,
  Fingerprint,
  Images,
  Link2,
  Loader2,
  ScanLine,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import type { CreatorApplyIdeaOptions } from "./creatorEditorialImport";

type ReverseScene = {
  id: string;
  order: number;
  timecode: string;
  duration_sec: number;
  narration: string;
  speech_segments: Array<{
    id: string;
    speaker: string;
    role: "narrator" | "character" | string;
    text: string;
  }>;
  visual_description: string;
  shot: string;
  camera: string;
  image_prompt: string;
  video_prompt: string;
  on_screen_text: string;
  transition: string;
  audio_cue: string;
  confidence: "alta" | "media" | "baixa";
};

type ReverseResult = {
  source: {
    url: string;
    platform: string;
    title: string;
    author: string;
    thumbnail: string;
    duration_sec: number | null;
  };
  mode: "faithful" | "transformative";
  format: "SHORTS" | "LONGO";
  title: string;
  hook: string;
  content_summary: string;
  source_transcript: string;
  reconstructed_narration: string;
  visual_language: string;
  editing_blueprint: string;
  music_direction: string;
  sfx_direction: string;
  retention_mechanics: string[];
  scenes: ReverseScene[];
  warnings: string[];
  evidence: {
    transcript_available: boolean;
    multimodal: boolean;
    analysis_source: string;
  };
};

type Props = {
  getProjectUrl: (path: string) => string;
  initialNiche?: string;
  onApplyCreator: (
    title: string,
    hook: string,
    options?: CreatorApplyIdeaOptions
  ) => void | Promise<void>;
};

function sceneProductionText(scene: ReverseScene) {
  return [
    `CENA ${scene.order} · ${scene.timecode || `${scene.duration_sec}s`}`,
    scene.narration ? `NARRACAO: ${scene.narration}` : "",
    scene.visual_description ? `VISUAL: ${scene.visual_description}` : "",
    `PLANO/CAMERA: ${scene.shot}; ${scene.camera}`,
    scene.image_prompt ? `PROMPT IMAGEM: ${scene.image_prompt}` : "",
    scene.video_prompt ? `PROMPT VIDEO: ${scene.video_prompt}` : "",
    scene.on_screen_text ? `TEXTO NA TELA: ${scene.on_screen_text}` : "",
    scene.transition ? `TRANSICAO: ${scene.transition}` : "",
    scene.audio_cue ? `AUDIO/SFX: ${scene.audio_cue}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWizardOutline(result: ReverseResult) {
  return [
    "DOSSIE DE ENGENHARIA REVERSA — fonte estrutural do wizard:",
    `Referencia: ${result.source.title} — ${result.source.url}`,
    `Modo: ${result.mode === "faithful" ? "adaptacao fiel autorizada" : "transformacao criativa"}`,
    `LINGUAGEM VISUAL: ${result.visual_language}`,
    `EDICAO: ${result.editing_blueprint}`,
    `MUSICA: ${result.music_direction}`,
    `SONOPLASTIA: ${result.sfx_direction}`,
    "NARRACAO COMPLETA:",
    result.reconstructed_narration,
    "ROTEIRO VISUAL E PROMPTS:",
    ...result.scenes.map(sceneProductionText),
  ].join("\n\n");
}

function groupScenes(scenes: ReverseScene[], maxBlocks: number) {
  if (!scenes.length) return [];
  const size = Math.ceil(scenes.length / maxBlocks);
  const blocks: Array<{ block: number; content: string }> = [];
  for (let index = 0; index < scenes.length; index += size) {
    blocks.push({
      block: blocks.length + 1,
      content: scenes
        .slice(index, index + size)
        .map(sceneProductionText)
        .join("\n\n"),
    });
  }
  return blocks;
}

function resolveReconstructedNarration(result: ReverseResult) {
  const sceneNarration = result.scenes.every((scene) => scene.narration?.trim())
    ? result.scenes
        .map((scene) => scene.narration.trim())
        .filter(Boolean)
        .join(" ")
    : "";
  return (
    sceneNarration ||
    result.reconstructed_narration?.trim() ||
    result.scenes
      .map((scene) => scene.narration?.trim())
      .filter(Boolean)
      .join(" ")
  );
}

function resolveReverseSceneVideoPrompt(scene: ReverseScene) {
  const explicitPrompt = scene.video_prompt?.trim();
  if (explicitPrompt) return explicitPrompt;

  return [
    scene.visual_description?.trim() || scene.image_prompt?.trim(),
    scene.shot?.trim() ? `Shot: ${scene.shot.trim()}.` : "",
    scene.camera?.trim() ? `Camera movement: ${scene.camera.trim()}.` : "",
    "Natural continuous action, cinematic motion, coherent subject and environment, no static slideshow, no text or watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildPrebuiltStoryboard(result: ReverseResult) {
  const maxBlocks = result.format === "SHORTS" ? 4 : 8;
  const scenesPerBlock = Math.max(
    1,
    Math.ceil(result.scenes.length / maxBlocks)
  );
  const visualPrompts = result.scenes.map((scene, index) => {
    const block = Math.floor(index / scenesPerBlock) + 1;
    const sceneInBlock = (index % scenesPerBlock) + 1;
    const videoPrompt = resolveReverseSceneVideoPrompt(scene);
    return {
      scene: `${block}.${sceneInBlock}`,
      block,
      source_scene_id: scene.id,
      source_timecode: scene.timecode,
      narration_text: scene.narration,
      narration_excerpt: scene.narration,
      speech_segments: Array.isArray(scene.speech_segments)
        ? scene.speech_segments
        : [],
      visual_description: scene.visual_description,
      duration: `${Math.max(2, Number(scene.duration_sec) || 5)} segundos`,
      duration_seconds: Math.max(2, Number(scene.duration_sec) || 5),
      type: "vídeo IA (max 10s)",
      media_mode: "video",
      aspect_ratio: result.format === "SHORTS" ? "9:16" : "16:9",
      prompt: videoPrompt,
      image_prompt: scene.image_prompt,
      video_prompt: videoPrompt,
      ai_video_prompt: videoPrompt,
      production: {
        broll_type: "video",
        generation_source: "video-reverse-engineering",
      },
      shot: scene.shot,
      camera: scene.camera,
      text_overlay: scene.on_screen_text,
      transition: scene.transition,
      sfx_cue: scene.audio_cue,
      editor_notes: [
        scene.visual_description,
        scene.shot ? `Plano: ${scene.shot}` : "",
        scene.camera ? `Camera: ${scene.camera}` : "",
        scene.transition ? `Transicao: ${scene.transition}` : "",
        scene.audio_cue ? `SFX: ${scene.audio_cue}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      confidence: scene.confidence,
      provenance: "video-reverse-engineering",
    };
  });

  return {
    strategy: {
      title_main: result.title,
      title_variations: [],
      hook: result.hook,
      tone: result.visual_language,
      source_reference: result.source.url,
    },
    narrative_script: resolveReconstructedNarration(result),
    visual_prompts: visualPrompts,
    music_direction: result.music_direction,
    sfx_direction: result.sfx_direction,
    editing_blueprint: result.editing_blueprint,
    retention_mechanics: result.retention_mechanics,
    technical_config: {
      format: result.format,
      aspect_ratio: result.format === "SHORTS" ? "9:16" : "16:9",
      imported_scene_count: visualPrompts.length,
    },
    reverse_engineering: {
      source: result.source,
      mode: result.mode,
      content_summary: result.content_summary,
      source_transcript: result.source_transcript,
      visual_language: result.visual_language,
      warnings: result.warnings,
      evidence: result.evidence,
    },
  };
}

export function VideoReverseEngineeringLab({
  getProjectUrl,
  initialNiche = "",
  onApplyCreator,
}: Props) {
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState(initialNiche);
  const [format, setFormat] = useState<"SHORTS" | "LONGO">("SHORTS");
  const [mode, setMode] = useState<"transformative" | "faithful">(
    "transformative"
  );
  const [instructions, setInstructions] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReverseResult | null>(null);
  const [activeView, setActiveView] = useState<
    "blueprint" | "narration" | "scenes"
  >("blueprint");
  const [expandedScene, setExpandedScene] = useState<string | null>(null);

  const totalDuration = useMemo(
    () =>
      result?.scenes.reduce(
        (total, scene) => total + Number(scene.duration_sec || 0),
        0
      ) || 0,
    [result]
  );

  const copyText = async (text: string, label: string) => {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado.`);
  };

  const analyze = async () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error("Cole uma URL valida do video.");
      return;
    }
    if (!rightsConfirmed) {
      toast.error("Confirme a autorizacao ou o uso transformativo.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(
        getProjectUrl("/api/research/reverse-engineer-video"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url.trim(),
            niche,
            format,
            mode,
            instructions,
            rightsConfirmed,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.result) {
        throw new Error(
          String(data.error || data.details || "Falha na analise.")
        );
      }
      setResult(data.result as ReverseResult);
      setActiveView("blueprint");
      setExpandedScene(data.result.scenes?.[0]?.id || null);
      toast.success("Dossie audiovisual pronto para revisao.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na analise.");
    } finally {
      setLoading(false);
    }
  };

  const sendToWizard = async () => {
    if (!result) return;
    const outline = buildWizardOutline(result);
    const prebuiltStoryboard = buildPrebuiltStoryboard(result);
    if (!prebuiltStoryboard.narrative_script || !result.scenes.length) {
      toast.error("O dossiê precisa ter narração e pelo menos uma cena.");
      return;
    }
    await onApplyCreator(result.title, result.hook || result.title, {
      format: result.format,
      mechanic: "video-reverse-engineering",
      source: `reverse-engineering:${result.source.url}`,
      targetNiche: niche.trim() || initialNiche || "Geral",
      whyWorks: outline,
      customTitle: result.title,
      customHook: result.hook,
      customPromise: outline,
      approvedNarration: prebuiltStoryboard.narrative_script,
      prebuiltStoryboard,
      blocks: groupScenes(result.scenes, result.format === "SHORTS" ? 4 : 8),
    });
    toast.success("Storyboard carregado diretamente no wizard.");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <section className="relative overflow-hidden rounded-[30px] border border-cyan-300/20 bg-[#071115] px-6 py-8 shadow-2xl shadow-black/30 sm:px-9">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(103,232,249,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.35)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              <Fingerprint className="h-3.5 w-3.5" /> Laboratorio forense
            </div>
            <h1 className="max-w-4xl font-serif text-4xl font-semibold leading-none tracking-tight text-slate-50 sm:text-5xl">
              Engenharia Reversa do{" "}
              <span className="italic text-cyan-300">Video</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400">
              Desmonta a referencia em narracao, linguagem visual, edicao e
              cenas. Cada cena volta como prompt de imagem e video pronto para
              entrar no wizard Lumiera.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <EvidenceMetric icon={FileAudio} label="Narracao" value="Texto" />
            <EvidenceMetric icon={Camera} label="Decupagem" value="Cenas" />
            <EvidenceMetric icon={Images} label="Geracao" value="Prompts" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[370px_1fr]">
        <aside className="h-fit space-y-5 rounded-3xl border border-slate-800 bg-[#0a0d10] p-5 lg:sticky lg:top-5">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              <ScanLine className="h-4 w-4" /> Entrada da analise
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              YouTube, Shorts, TikTok, Reels ou URL direta acessivel.
            </p>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold text-slate-300">
              URL do video
            </span>
            <div className="relative">
              <Link2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-xl border border-slate-700 bg-black/40 py-3 pl-10 pr-3 text-xs text-slate-100 outline-none focus:border-cyan-300/55"
              />
            </div>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold text-slate-300">
              Nicho de destino
            </span>
            <input
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
              placeholder="Ex.: engenharia, historia, curiosidades..."
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-3 text-xs text-slate-100 outline-none focus:border-cyan-300/55"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["SHORTS", "LONGO"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFormat(item)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  format === item
                    ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
                    : "border-slate-800 bg-slate-900/40 text-slate-500"
                }`}
              >
                <span className="block text-[11px] font-black">
                  {item === "SHORTS" ? "Short vertical" : "Video longo"}
                </span>
                <span className="mt-1 block text-[9px] opacity-60">
                  {item === "SHORTS" ? "9:16 · ate 60s" : "16:9 · aprofundado"}
                </span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300">Metodo</span>
            <ModeButton
              active={mode === "transformative"}
              tone="emerald"
              title="Transformacao criativa"
              description="Recria mecanismo, fatos e ritmo com texto e imagens proprios."
              onClick={() => setMode("transformative")}
            />
            <ModeButton
              active={mode === "faithful"}
              tone="amber"
              title="Adaptacao fiel autorizada"
              description="Para video proprio, licenciado ou com permissao de reproducao."
              onClick={() => setMode("faithful")}
            />
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold text-slate-300">
              Direcao opcional
            </span>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={3}
              placeholder="Ex.: manter ritmo, trocar o cenario, usar imagens realistas..."
              className="w-full resize-y rounded-xl border border-slate-700 bg-black/40 px-3 py-3 text-xs leading-5 text-slate-200 outline-none focus:border-cyan-300/55"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(event) => setRightsConfirmed(event.target.checked)}
              className="mt-0.5 accent-cyan-300"
            />
            <span className="text-[10px] leading-4 text-slate-500">
              Confirmo que possuo o video, tenho autorizacao ou usarei o
              resultado de forma transformativa.
            </span>
          </label>
          <button
            type="button"
            onClick={() => void analyze()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Fingerprint className="h-4 w-4" />
            )}
            {loading
              ? "Assistindo e desmontando..."
              : "Executar engenharia reversa"}
          </button>
        </aside>

        <main className="min-w-0 space-y-5">
          {!result ? (
            <EmptyDossier loading={loading} />
          ) : (
            <>
              <ResultHeader
                result={result}
                totalDuration={totalDuration}
                onSend={() => void sendToWizard()}
              />
              {result.warnings.length > 0 && (
                <Warnings warnings={result.warnings} />
              )}
              <ViewTabs active={activeView} onChange={setActiveView} />
              {activeView === "blueprint" && <Blueprint result={result} />}
              {activeView === "narration" && (
                <div className="space-y-4">
                  <TextDossier
                    eyebrow="Narracao reconstruida · pronta para TTS"
                    text={result.reconstructed_narration}
                    onCopy={() =>
                      void copyText(result.reconstructed_narration, "Narracao")
                    }
                  />
                  <TextDossier
                    eyebrow="Transcricao recuperada da fonte"
                    text={
                      result.source_transcript ||
                      "Nenhuma transcricao completa foi recuperada."
                    }
                    muted
                    onCopy={() =>
                      void copyText(result.source_transcript, "Transcricao")
                    }
                  />
                </div>
              )}
              {activeView === "scenes" && (
                <div className="space-y-3">
                  {result.scenes.map((scene) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      expanded={expandedScene === scene.id}
                      onToggle={() =>
                        setExpandedScene(
                          expandedScene === scene.id ? null : scene.id
                        )
                      }
                      onCopy={copyText}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </section>
    </div>
  );
}

function ModeButton({
  active,
  tone,
  title,
  description,
  onClick,
}: {
  active: boolean;
  tone: "emerald" | "amber";
  title: string;
  description: string;
  onClick: () => void;
}) {
  const activeClass =
    tone === "emerald"
      ? "border-emerald-300/40 bg-emerald-300/[0.08]"
      : "border-amber-300/40 bg-amber-300/[0.08]";
  const titleClass = tone === "emerald" ? "text-emerald-200" : "text-amber-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left ${active ? activeClass : "border-slate-800 bg-black/20"}`}
    >
      <span
        className={`flex items-center gap-2 text-xs font-black ${titleClass}`}
      >
        {active && <Check className="h-3.5 w-3.5" />}
        {title}
      </span>
      <span className="mt-1 block text-[10px] leading-4 text-slate-500">
        {description}
      </span>
    </button>
  );
}

function EvidenceMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-cyan-300/15 bg-black/25 p-3">
      <Icon className="h-4 w-4 text-cyan-300" />
      <span className="mt-3 block text-[9px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </span>
      <span className="block text-xs font-black text-slate-200">{value}</span>
    </div>
  );
}

function EmptyDossier({ loading }: { loading: boolean }) {
  return (
    <div className="flex min-h-[560px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-[#080b0d] px-8 text-center">
      <Clapperboard className="h-12 w-12 text-cyan-300/50" />
      <h2 className="mt-5 font-serif text-2xl text-slate-200">
        {loading
          ? "A referencia esta na mesa de corte."
          : "Nenhum dossie aberto."}
      </h2>
      <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
        {loading
          ? "O Gemini analisa audio, cenas, camera, ritmo e texto na tela."
          : "Nada sera gravado no projeto ate voce mandar o resultado para o wizard."}
      </p>
    </div>
  );
}

function ResultHeader({
  result,
  totalDuration,
  onSend,
}: {
  result: ReverseResult;
  totalDuration: number;
  onSend: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0a0d10]">
      <div className="grid gap-5 border-b border-slate-800 p-5 sm:grid-cols-[150px_1fr_auto] sm:items-center">
        {result.source.thumbnail ? (
          <img
            src={result.source.thumbnail}
            alt="Referencia"
            className="aspect-video w-full rounded-xl border border-slate-700 object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
            <Clapperboard className="h-7 w-7 text-slate-600" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            Caso analisado
          </p>
          <h2 className="mt-2 font-serif text-2xl text-slate-100">
            {result.title || result.source.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">
            {result.content_summary}
          </p>
        </div>
        <button
          type="button"
          onClick={onSend}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/35 bg-emerald-300/10 px-4 py-3 text-xs font-black text-emerald-200"
        >
          Abrir no wizard <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 divide-x divide-slate-800 text-center text-[10px]">
        <ResultStat label="Cenas" value={String(result.scenes.length)} />
        <ResultStat label="Mapeado" value={`${Math.round(totalDuration)}s`} />
        <ResultStat
          label="Transcricao"
          value={
            result.evidence.transcript_available ? "Recuperada" : "Parcial"
          }
        />
        <ResultStat
          label="Analise"
          value={result.evidence.multimodal ? "Multimodal" : "Metadados"}
        />
      </div>
    </section>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-3">
      <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </span>
      <span className="mt-1 block font-black text-slate-200">{value}</span>
    </div>
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-300">
        <AlertTriangle className="h-4 w-4" /> Revisao humana
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-amber-100/60">
        {warnings.map((warning) => (
          <li key={warning}>• {warning}</li>
        ))}
      </ul>
    </div>
  );
}

function ViewTabs({
  active,
  onChange,
}: {
  active: "blueprint" | "narration" | "scenes";
  onChange: (value: "blueprint" | "narration" | "scenes") => void;
}) {
  const items = [
    ["blueprint", "Raio-X", Fingerprint],
    ["narration", "Narracao", FileAudio],
    ["scenes", "Cenas + prompts", Images],
  ] as const;
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-[#080b0d] p-2">
      {items.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${active === id ? "bg-cyan-300 text-slate-950" : "text-slate-500 hover:bg-slate-900"}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

function Blueprint({ result }: { result: ReverseResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <BlueprintCard icon={Sparkles} title="Gancho" text={result.hook} />
      <BlueprintCard
        icon={Camera}
        title="Linguagem visual"
        text={result.visual_language}
      />
      <BlueprintCard
        icon={Clapperboard}
        title="Blueprint de edicao"
        text={result.editing_blueprint}
      />
      <BlueprintCard
        icon={Sparkles}
        title="Musica e SFX"
        text={[result.music_direction, result.sfx_direction]
          .filter(Boolean)
          .join("\n\n")}
      />
      {result.retention_mechanics.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-[#0a0d10] p-5 sm:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
            Mecanicas de retencao
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.retention_mechanics.map((item) => (
              <span
                key={item}
                className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-[10px] text-cyan-100/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BlueprintCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0a0d10] p-5">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
        <Icon className="h-4 w-4" />
        {title}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-400">
        {text || "Nao identificado."}
      </p>
    </div>
  );
}

function TextDossier({
  eyebrow,
  text,
  muted = false,
  onCopy,
}: {
  eyebrow: string;
  text: string;
  muted?: boolean;
  onCopy: () => void;
}) {
  return (
    <section
      className={`rounded-3xl border p-5 sm:p-6 ${muted ? "border-slate-800 bg-[#090b0d]" : "border-cyan-300/20 bg-cyan-950/[0.08]"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-[10px] font-black uppercase tracking-[0.18em] ${muted ? "text-slate-500" : "text-cyan-300"}`}
        >
          {eyebrow}
        </p>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-400"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          Copiar
        </button>
      </div>
      <p
        className={`mt-5 whitespace-pre-wrap text-sm leading-7 ${muted ? "text-slate-500" : "text-slate-200"}`}
      >
        {text}
      </p>
    </section>
  );
}

function SceneCard({
  scene,
  expanded,
  onToggle,
  onCopy,
}: {
  scene: ReverseScene;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string, label: string) => Promise<void>;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0a0d10]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] font-mono text-xs font-black text-cyan-300">
          {String(scene.order).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
            {scene.timecode || `${scene.duration_sec}s`} · {scene.shot} ·
            confianca {scene.confidence}
          </span>
          <span className="mt-2 line-clamp-2 block text-xs leading-5 text-slate-300">
            {scene.visual_description || scene.narration}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="mt-2 h-4 w-4 text-slate-600" />
        ) : (
          <ChevronDown className="mt-2 h-4 w-4 text-slate-600" />
        )}
      </button>
      {expanded && (
        <div className="grid gap-3 border-t border-slate-800 p-4 md:grid-cols-2">
          <SceneField label="Narracao" text={scene.narration} />
          <SceneField label="Visual" text={scene.visual_description} />
          <SceneField
            label="Prompt de imagem"
            text={scene.image_prompt}
            accent="cyan"
            onCopy={() => void onCopy(scene.image_prompt, "Prompt de imagem")}
          />
          <SceneField
            label="Prompt de video"
            text={scene.video_prompt}
            accent="emerald"
            onCopy={() => void onCopy(scene.video_prompt, "Prompt de video")}
          />
          <div className="rounded-xl border border-slate-800 p-3 text-[10px] text-slate-500 md:col-span-2">
            Camera: {scene.camera || "—"} · Transicao: {scene.transition || "—"}{" "}
            · SFX: {scene.audio_cue || "—"}
          </div>
        </div>
      )}
    </article>
  );
}

function SceneField({
  label,
  text,
  accent = "default",
  onCopy,
}: {
  label: string;
  text: string;
  accent?: "default" | "cyan" | "emerald";
  onCopy?: () => void;
}) {
  const tone =
    accent === "cyan"
      ? "text-cyan-300"
      : accent === "emerald"
        ? "text-emerald-300"
        : "text-slate-500";
  return (
    <div className="rounded-xl border border-slate-800 bg-black/25 p-4">
      <div className="flex items-center justify-between">
        <p
          className={`text-[9px] font-black uppercase tracking-[0.16em] ${tone}`}
        >
          {label}
        </p>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="text-slate-600 hover:text-cyan-300"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-slate-400">
        {text || "—"}
      </p>
    </div>
  );
}
