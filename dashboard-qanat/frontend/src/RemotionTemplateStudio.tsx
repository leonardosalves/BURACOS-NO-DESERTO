import React, { useMemo, useState } from "react";
import {
  BadgeCheck,
  Braces,
  Copy,
  Film,
  Layers3,
  Maximize2,
  PencilRuler,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

type TemplateCategory =
  | "maps"
  | "chart-data"
  | "text"
  | "content-animation"
  | "background"
  | "cinematic"
  | "transition"
  | "logo-branding"
  | "intro-outro"
  | "image-media";

type TemplateItem = {
  id: string;
  name: string;
  category: TemplateCategory;
  subcategory: string;
  niche: string;
  status: "approved" | "draft";
  description: string;
  dataSlots: string[];
  shortPreview: "ring" | "map" | "bars" | "title" | "media";
  longPreview: "line" | "map" | "bars" | "cinematic" | "media";
};

const CATEGORIES: Array<{
  id: TemplateCategory;
  label: string;
  subcategories: string[];
}> = [
  {
    id: "maps",
    label: "Mapas",
    subcategories: ["PIP mapa", "Flyover", "Mapa antigo", "Pin regional"],
  },
  {
    id: "chart-data",
    label: "Chart Data",
    subcategories: ["Counter", "Bar chart", "Line chart", "KPI"],
  },
  {
    id: "text",
    label: "Text",
    subcategories: ["Lower third", "Title", "Quote", "Callout"],
  },
  {
    id: "content-animation",
    label: "Content Animation",
    subcategories: ["Processo", "Timeline", "Comparacao", "Explainer"],
  },
  {
    id: "background",
    label: "Background",
    subcategories: ["Grid", "HUD", "Blueprint", "Texture"],
  },
  {
    id: "cinematic",
    label: "Cinematic",
    subcategories: ["Reveal", "Lens", "Depth", "Frame"],
  },
  {
    id: "transition",
    label: "Transition",
    subcategories: ["Swipe", "Map zoom", "Match cut", "Glitch"],
  },
  {
    id: "logo-branding",
    label: "Logo e Branding",
    subcategories: ["Bug", "Ident", "Watermark", "Sponsor"],
  },
  {
    id: "intro-outro",
    label: "Intro e Outro",
    subcategories: ["Hook", "Chapter", "CTA", "Recap"],
  },
  {
    id: "image-media",
    label: "Image e Media",
    subcategories: ["PIP media", "Before after", "Stack", "Gallery"],
  },
];

const NICHES = [
  "Engenharia",
  "Historia",
  "Financas",
  "Tecnologia",
  "Misterio",
  "Natureza",
];

const TEMPLATES: TemplateItem[] = [
  {
    id: "eng-map-pip-tactical",
    name: "Engineering Tactical Map PIP",
    category: "maps",
    subcategory: "PIP mapa",
    niche: "Engenharia",
    status: "approved",
    description: "Mapa em janela tecnica para shorts, fora da area de legenda.",
    dataSlots: ["locationName", "coordinates", "siteRef", "map"],
    shortPreview: "map",
    longPreview: "map",
  },
  {
    id: "geo-continuous-flyover",
    name: "Continuous Geo Flyover",
    category: "maps",
    subcategory: "Flyover",
    niche: "Engenharia",
    status: "approved",
    description:
      "Zoom continuo regiao, pais, cidade e alvo com orbit 360 para POI.",
    dataSlots: ["lat", "lng", "place_type", "flyover_video"],
    shortPreview: "map",
    longPreview: "cinematic",
  },
  {
    id: "industrial-kpi-ring",
    name: "Industrial KPI Ring",
    category: "chart-data",
    subcategory: "Counter",
    niche: "Engenharia",
    status: "approved",
    description: "Indicador circular com leitura tecnica para metricas curtas.",
    dataSlots: ["value", "label", "suffix"],
    shortPreview: "ring",
    longPreview: "line",
  },
  {
    id: "engineering-bar-grid",
    name: "Engineering Bar Grid",
    category: "chart-data",
    subcategory: "Bar chart",
    niche: "Engenharia",
    status: "approved",
    description: "Barras SVG com grid tecnico e cores por serie.",
    dataSlots: ["title", "items", "source"],
    shortPreview: "bars",
    longPreview: "bars",
  },
  {
    id: "blueprint-lower-third",
    name: "Blueprint Lower Third",
    category: "text",
    subcategory: "Lower third",
    niche: "Engenharia",
    status: "draft",
    description: "Texto ancorado em placa CAD, nunca solto sobre o video.",
    dataSlots: ["title", "subtitle", "tag"],
    shortPreview: "title",
    longPreview: "media",
  },
  {
    id: "structural-process",
    name: "Structural Process Steps",
    category: "content-animation",
    subcategory: "Processo",
    niche: "Engenharia",
    status: "draft",
    description: "Sequencia de processo com linhas, etapas e marcadores.",
    dataSlots: ["steps", "currentStep", "caption"],
    shortPreview: "media",
    longPreview: "bars",
  },
];

function PreviewFrame({
  format,
  variant,
}: {
  format: "9:16" | "16:9";
  variant: TemplateItem["shortPreview"] | TemplateItem["longPreview"];
}) {
  const vertical = format === "9:16";
  return (
    <div
      className={`template-preview relative overflow-hidden rounded-[6px] border border-white/10 bg-[#0b111b] shadow-lg shadow-black/30 ${
        vertical ? "aspect-[9/16] w-[92px]" : "aspect-video w-[190px]"
      }`}
    >
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.13)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.13)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="template-scan absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-300/12 to-transparent" />
      {variant === "ring" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="template-spin grid h-16 w-16 place-items-center rounded-full border-[8px] border-blue-500 border-l-cyan-300">
            <span className="text-lg font-black text-white">90%</span>
          </div>
        </div>
      )}
      {variant === "bars" && (
        <div className="absolute inset-x-4 bottom-6 flex h-24 items-end gap-2">
          {[42, 80, 34, 72, 56, 92].map((h, i) => (
            <div
              key={i}
              className="template-bar flex-1 rounded-t-sm"
              style={{
                height: `${h}%`,
                background: ["#4f7cff", "#7c2dff", "#00d4ff", "#ff2f8f"][i % 4],
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </div>
      )}
      {variant === "line" && (
        <svg
          viewBox="0 0 180 100"
          className="absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)]"
        >
          <path
            className="template-line"
            d="M5 80 L35 55 L60 62 L92 28 L126 38 L170 14"
            fill="none"
            stroke="#5d7cff"
            strokeWidth="3"
          />
          <path
            d="M5 80 L35 55 L60 62 L92 28 L126 38 L170 14 L170 92 L5 92 Z"
            fill="rgba(66,103,255,.22)"
          />
        </svg>
      )}
      {variant === "map" && (
        <div className="template-map absolute inset-3 rounded border border-cyan-300/60 bg-cyan-950/40">
          <div className="template-pin absolute left-[48%] top-[45%] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_#22d3ee]" />
          <div className="absolute inset-x-3 bottom-3 h-1 rounded bg-amber-300" />
        </div>
      )}
      {variant === "title" && (
        <div className="template-title absolute left-4 right-4 top-1/2 -translate-y-1/2 border-l-2 border-cyan-300 pl-3">
          <div className="h-3 w-3/4 rounded bg-white" />
          <div className="mt-2 h-2 w-1/2 rounded bg-cyan-300" />
        </div>
      )}
      {(variant === "cinematic" || variant === "media") && (
        <div className="template-camera absolute inset-4 overflow-hidden rounded border border-amber-300/40 bg-gradient-to-br from-zinc-700 via-zinc-950 to-cyan-950">
          <div className="absolute bottom-3 left-3 h-10 w-24 rounded-sm border border-white/30" />
          <div className="absolute right-4 top-4 h-8 w-8 rounded-full bg-amber-300/70 blur-sm" />
        </div>
      )}
      <div className="absolute inset-x-2 bottom-2">
        <div className="flex items-center gap-2 text-white/45">
          <Play className="h-3 w-3 fill-current" />
          <div className="h-1 flex-1 overflow-hidden rounded bg-white/10">
            <div className="template-progress h-full rounded bg-cyan-300" />
          </div>
          <Maximize2 className="h-3 w-3" />
        </div>
      </div>
      <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-zinc-200">
        {format === "9:16" ? "Shorts" : "Longos"}
      </span>
    </div>
  );
}

export function RemotionTemplateStudio({
  activeProject,
  projectNiche,
}: {
  activeProject: string;
  projectNiche: string;
}) {
  const [niche, setNiche] = useState(projectNiche || "Engenharia");
  const [category, setCategory] = useState<TemplateCategory>("maps");
  const [subcategory, setSubcategory] = useState("PIP mapa");
  const [selectedId, setSelectedId] = useState("eng-map-pip-tactical");
  const [templates, setTemplates] = useState<TemplateItem[]>(TEMPLATES);
  const [codeDraft, setCodeDraft] = useState(
    "export function MyTemplate(props) {\n  return <AbsoluteFill>{/* cole seu template aqui */}</AbsoluteFill>;\n}"
  );
  const [aiBrief, setAiBrief] = useState(
    "Adaptar para Engenharia, com versao 9:16 e 16:9, sem texto solto e com props editaveis."
  );

  const subcategories =
    CATEGORIES.find((c) => c.id === category)?.subcategories || [];
  const visibleTemplates = useMemo(
    () =>
      templates.filter(
        (t) =>
          t.niche === niche &&
          t.category === category &&
          (!subcategory || t.subcategory === subcategory)
      ),
    [category, niche, subcategory, templates]
  );
  const selected =
    templates.find((t) => t.id === selectedId) ||
    visibleTemplates[0] ||
    templates[0];

  function deleteTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const shouldDelete = window.confirm(
      `Excluir o template "${template.name}"?`
    );
    if (!shouldDelete) return;
    setTemplates((current) => current.filter((item) => item.id !== templateId));
    if (selectedId === templateId) {
      const nextTemplate = templates.find((item) => item.id !== templateId);
      setSelectedId(nextTemplate?.id || "");
    }
  }

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes template-progress { from { width: 0%; } to { width: 100%; } }
        @keyframes template-scan { 0% { transform: translateY(-80%); opacity: .2; } 50% { opacity: .75; } 100% { transform: translateY(260%); opacity: .2; } }
        @keyframes template-spin { from { transform: rotate(-18deg); } to { transform: rotate(342deg); } }
        @keyframes template-bar { 0%, 100% { transform: scaleY(.42); } 50% { transform: scaleY(1); } }
        @keyframes template-line { from { stroke-dashoffset: 220; } to { stroke-dashoffset: 0; } }
        @keyframes template-map { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12) translate(-3%, 2%); } }
        @keyframes template-pin { 0%, 100% { transform: scale(.85); opacity: .7; } 50% { transform: scale(1.35); opacity: 1; } }
        @keyframes template-title { 0% { transform: translate(-14px, -50%); opacity: .35; } 25%, 100% { transform: translate(0, -50%); opacity: 1; } }
        @keyframes template-camera { 0%, 100% { transform: scale(1.02) translateX(0); } 50% { transform: scale(1.14) translateX(-3%); } }
        .template-preview:hover { border-color: rgba(34, 211, 238, .55); }
        .template-progress { animation: template-progress 3s linear infinite; }
        .template-scan { animation: template-scan 3.2s ease-in-out infinite; }
        .template-spin { animation: template-spin 3s linear infinite; }
        .template-bar { transform-origin: bottom; animation: template-bar 2.4s ease-in-out infinite; }
        .template-line { stroke-dasharray: 220; animation: template-line 2.8s ease-in-out infinite; }
        .template-map { animation: template-map 4s ease-in-out infinite; }
        .template-pin { animation: template-pin 1.2s ease-in-out infinite; }
        .template-title { animation: template-title 3s ease-out infinite; }
        .template-camera { animation: template-camera 5s ease-in-out infinite; }
      `}</style>
      <div className="grid gap-4 xl:grid-cols-[280px_1fr_360px]">
        <aside className="rounded-lg border border-white/10 bg-[#0b0f17] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-cyan-300" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Nicho
              </p>
              <p className="text-sm font-bold text-white">
                {activeProject || "Catalogo global"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {NICHES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNiche(item)}
                className={`rounded-md border px-3 py-2 text-left text-xs font-bold ${
                  niche === item
                    ? "border-cyan-300 bg-cyan-300/12 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-400"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Categorias
            </p>
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCategory(item.id);
                  setSubcategory(item.subcategories[0] || "");
                }}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-bold ${
                  category === item.id
                    ? "border-blue-400 bg-blue-500/12 text-white"
                    : "border-white/10 bg-white/[0.025] text-zinc-400"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] text-zinc-600">
                  {item.subcategories.length}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="rounded-lg border border-white/10 bg-[#101622]">
          <div className="border-b border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                  Showcase
                </p>
                <h2 className="text-xl font-black text-white">
                  {niche} / {CATEGORIES.find((c) => c.id === category)?.label}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {subcategories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSubcategory(item)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      subcategory === item
                        ? "border-amber-300 bg-amber-300/14 text-amber-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-400"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 2xl:grid-cols-2">
            {visibleTemplates.map((template) => (
              <article
                key={template.id}
                onClick={() => setSelectedId(template.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(template.id);
                  }
                }}
                tabIndex={0}
                className={`overflow-hidden rounded-lg border bg-[#111722] text-left shadow-xl shadow-black/20 ${
                  selected?.id === template.id
                    ? "border-cyan-300/70"
                    : "border-white/10"
                }`}
              >
                <div className="flex gap-3 border-b border-white/10 bg-[#0c121d] p-3">
                  <PreviewFrame format="9:16" variant={template.shortPreview} />
                  <PreviewFrame format="16:9" variant={template.longPreview} />
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-base font-black text-white">
                      {template.name}
                    </h3>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                          template.status === "approved"
                            ? "bg-emerald-400/12 text-emerald-300"
                            : "bg-amber-300/12 text-amber-200"
                        }`}
                      >
                        <BadgeCheck className="h-3 w-3" />
                        {template.status === "approved"
                          ? "Aprovado"
                          : "Rascunho"}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteTemplate(template.id);
                        }}
                        className="grid h-7 w-7 place-items-center rounded-md border border-red-400/20 bg-red-500/10 text-red-200 hover:border-red-300/60 hover:bg-red-500/20"
                        title="Excluir template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="min-h-[38px] text-sm leading-relaxed text-zinc-400">
                    {template.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {template.dataSlots.map((slot) => (
                      <span
                        key={slot}
                        className="rounded bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-zinc-300"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            {!visibleTemplates.length && (
              <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">
                Nenhum template aprovado nessa combinacao ainda.
              </div>
            )}
          </div>
        </main>

        <aside className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-[#0b0f17] p-4">
            <div className="mb-3 flex items-center gap-2">
              <PencilRuler className="h-4 w-4 text-amber-300" />
              <h3 className="text-sm font-black text-white">
                Criar / editar com IA
              </h3>
            </div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Briefing de modificacao
            </label>
            <textarea
              value={aiBrief}
              onChange={(e) => setAiBrief(e.target.value)}
              className="min-h-[104px] w-full resize-y rounded-md border border-white/10 bg-black/30 p-3 text-xs text-zinc-200 outline-none focus:border-cyan-300"
            />
            <label className="mb-2 mt-4 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Template code
            </label>
            <textarea
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              className="min-h-[210px] w-full resize-y rounded-md border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-zinc-200 outline-none focus:border-cyan-300"
              spellCheck={false}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Assistir IA
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Salvar draft
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-[#0b0f17] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Braces className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-black text-white">
                Contrato do template
              </h3>
            </div>
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-white">
                    {selected.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(selected.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-400/20 bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-200 hover:border-red-300/60 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Todo template aprovado precisa ter preview 9:16 e 16:9, props
                  declaradas e safe zones de legenda.
                </p>
                <div className="mt-3 space-y-2">
                  {selected.dataSlots.map((slot) => (
                    <div
                      key={slot}
                      className="flex items-center justify-between rounded border border-white/10 px-3 py-2 text-xs"
                    >
                      <span className="font-mono text-zinc-300">{slot}</span>
                      <Copy className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Nenhum template selecionado.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-red-400/20 bg-red-950/10 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Film className="h-4 w-4 text-red-300" />
              <h3 className="text-sm font-black text-red-100">
                Regra de orquestracao
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-red-100/70">
              Shorts usam no maximo 1 template Remotion. Longos usam ate 8.
              Texto solto sem template aprovado nao entra automaticamente.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
