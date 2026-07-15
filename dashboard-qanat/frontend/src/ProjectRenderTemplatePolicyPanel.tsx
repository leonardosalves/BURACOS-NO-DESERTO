/**
 * Policy de templates Remotion — por PROJETO (aba Render / Status).
 * Não é configuração global do programa.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Clapperboard,
  Layers,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { SettingLabel } from "./SettingHelpTip";
import { SectionHeader } from "./SectionHeader";
import {
  RENDER_TEMPLATE_PRESET_OPTIONS,
  type RenderTemplatePolicy,
} from "./productionConfig";
import type { ConfigData } from "./appTypes";
import type { AppTab } from "./appTabs";

const FALLBACK_NICHES = [
  "Engenharia",
  "Historia",
  "Financas",
  "Tecnologia",
  "Misterio",
  "Natureza",
  "Geografia",
  "Default",
];

function defaultRenderPolicy(
  _isShort: boolean,
  niche = ""
): RenderTemplatePolicy {
  // Default LEGADO: sem camadas Remotion extras no Timing
  return {
    mode: "legacy",
    preset_id: "legacy",
    template_niche: niche || undefined,
    effects: { enabled: false, selection: "off" },
    intro: { enabled: false, template_id: "auto" },
    end_card: {
      enabled: false,
      template_id: "auto",
      replace_brand_outro: true,
    },
    chapter_title: {
      enabled: false,
      template_id: "auto",
      source: "auto",
    },
    subscribe_mid: {
      enabled: false,
      position: "mid",
      percent: 0.5,
    },
    frame: { enabled: false, template_id: "auto" },
    media_layouts: { enabled: false, selection: "off" },
    transitions: { enabled: false, selection: "off" },
    overlay_budget: { max_coverage: 0.35, max_dense_per_minute: 4 },
  };
}

function applyPresetToPolicy(
  presetId: string,
  isShort: boolean,
  niche = ""
): RenderTemplatePolicy {
  const base = defaultRenderPolicy(isShort, niche);
  if (presetId === "legacy") {
    return {
      ...base,
      mode: "legacy",
      preset_id: "legacy",
      effects: { enabled: false, selection: "off" },
      intro: { enabled: false },
      end_card: { enabled: false, replace_brand_outro: true },
      chapter_title: { enabled: false },
      subscribe_mid: { enabled: false },
      frame: { enabled: false },
      media_layouts: { enabled: false, selection: "off" },
      transitions: { enabled: false, selection: "off" },
    };
  }
  if (presetId === "doc-engenharia") {
    return {
      ...base,
      mode: "smart",
      preset_id: "doc-engenharia",
      effects: { enabled: true, selection: "auto", intensity: "subtle" },
      chapter_title: { enabled: true, source: "auto" },
      subscribe_mid: { enabled: false },
      transitions: { enabled: true, selection: "auto" },
    };
  }
  if (presetId === "shorts-curiosidade") {
    return {
      ...base,
      mode: "smart",
      preset_id: "shorts-curiosidade",
      chapter_title: { enabled: false },
      subscribe_mid: { enabled: true, position: "mid", percent: 0.5 },
      transitions: { enabled: false, selection: "off" },
    };
  }
  return { ...base, mode: "smart", preset_id: "smart" };
}

function mergePolicy(
  base: RenderTemplatePolicy,
  patch: Partial<RenderTemplatePolicy>
): RenderTemplatePolicy {
  return {
    ...base,
    ...patch,
    effects: { ...base.effects, ...patch.effects },
    intro: { ...base.intro, ...patch.intro },
    end_card: { ...base.end_card, ...patch.end_card },
    chapter_title: { ...base.chapter_title, ...patch.chapter_title },
    subscribe_mid: { ...base.subscribe_mid, ...patch.subscribe_mid },
    frame: { ...base.frame, ...patch.frame },
    media_layouts: { ...base.media_layouts, ...patch.media_layouts },
    transitions: { ...base.transitions, ...patch.transitions },
    overlay_budget: { ...base.overlay_budget, ...patch.overlay_budget },
  };
}

type Props = {
  config: ConfigData | null;
  activeProject: string;
  getProjectUrl: (path: string) => string;
  saveConfigPatch: (
    patch: Partial<ConfigData>,
    opts?: { skipRefresh?: boolean }
  ) => void | Promise<void>;
  /** Abre o Editor de Timing (scene-timing) após aplicar */
  setActiveTab?: (tab: AppTab) => void;
};

export function ProjectRenderTemplatePolicyPanel({
  config,
  activeProject,
  getProjectUrl,
  saveConfigPatch,
  setActiveTab,
}: Props) {
  const isShort =
    config?.aspect_ratio === "9:16" ||
    String(config?.video_format || "").toUpperCase() === "SHORTS";
  const projectNiche = String(
    config?.niche || config?.motion_template_pack?.niche || ""
  ).trim();

  const fingerprint = useMemo(
    () => JSON.stringify(config?.render_template_policy || null),
    [config?.render_template_policy]
  );

  const [draft, setDraft] = useState<RenderTemplatePolicy>(() =>
    mergePolicy(defaultRenderPolicy(isShort, projectNiche), {
      template_niche: projectNiche,
      ...((config?.render_template_policy as RenderTemplatePolicy) || {}),
    })
  );
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [niches, setNiches] = useState<string[]>(FALLBACK_NICHES);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [lastAppliedCount, setLastAppliedCount] = useState(0);

  useEffect(() => {
    setDraft(
      mergePolicy(defaultRenderPolicy(isShort, projectNiche), {
        template_niche:
          (config?.render_template_policy as RenderTemplatePolicy)
            ?.template_niche || projectNiche,
        ...((config?.render_template_policy as RenderTemplatePolicy) || {}),
      })
    );
  }, [activeProject, fingerprint, isShort, projectNiche]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/template-studio/catalog/niches", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const raw = Array.isArray(data?.niches) ? data.niches : [];
        const list = raw.map((n: { niche?: string; name?: string } | string) =>
          typeof n === "string" ? n : String(n?.niche || n?.name || "")
        );
        const cleaned = list.map((s: string) => s.trim()).filter(Boolean);
        if (!cancelled && cleaned.length) {
          setNiches([...new Set([...cleaned, ...FALLBACK_NICHES])]);
        }
      } catch {
        /* fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const policyMode = draft.mode || "legacy";
  const presetId = draft.preset_id || policyMode;

  const toggleRow = (
    key: keyof RenderTemplatePolicy,
    on: boolean,
    extra?: Record<string, unknown>
  ) => {
    setDraft((prev) =>
      mergePolicy(prev, {
        [key]: { ...(prev[key] as object), enabled: on, ...extra },
      } as Partial<RenderTemplatePolicy>)
    );
  };

  const handleSave = async () => {
    if (!activeProject) {
      toast.error("Selecione um projeto antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const niche = String(draft.template_niche || projectNiche || "").trim();
      const policyToSave = {
        ...draft,
        template_niche: niche || draft.template_niche,
      };
      await saveConfigPatch({
        render_template_policy: policyToSave,
        // Alinha pack do projeto ao nicho escolhido no Render
        ...(niche
          ? {
              motion_template_pack: {
                ...(config?.motion_template_pack || {}),
                enabled: true,
                niche,
              },
              niche: niche || config?.niche,
            }
          : {}),
      });
      // Aplica policy na timeline (intro/end/chapter/efeitos) — sem isso o render ignora os toggles
      const applyRes = await fetch(
        getProjectUrl("/api/ai/creator/render-template-policy/apply"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            render_template_policy: policyToSave,
            persist: true,
            sync_timeline: true,
          }),
        }
      );
      const applyData = (await applyRes.json().catch(() => ({}))) as {
        ok?: boolean;
        injected_count?: number;
        motion_count?: number;
        message?: string;
        error?: string;
      };
      if (!applyRes.ok) {
        toast.success("Policy salva no projeto.");
        toast.error(
          applyData.error ||
            "Não foi possível aplicar na timeline (reinicie o serviço se a API for nova)."
        );
        return;
      }
      const n = Number(applyData.injected_count) || 0;
      setLastAppliedCount(n);
      toast.success(
        applyData.message ||
          `Salvo · ${n} camada(s) na timeline · ${applyData.motion_count || 0} motion scene(s)`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao salvar no projeto"
      );
    } finally {
      setSaving(false);
    }
  };

  const openTimingEditor = () => {
    if (typeof setActiveTab === "function") {
      setActiveTab("scene-timing");
      toast("Editor de Timing — trilha Cenas Remotion (motion)", {
        icon: "🎬",
      });
    } else {
      toast.error("Navegação para Timing indisponível nesta tela.");
    }
  };

  const rows = [
    {
      key: "effects" as const,
      label: "Efeitos Remotion (só catálogo do nicho)",
      on: !!draft.effects?.enabled,
      toggle: (on: boolean) =>
        toggleRow("effects", on, { selection: on ? "auto" : "off" }),
    },
    {
      key: "intro" as const,
      label: "Intro Remotion",
      on: !!draft.intro?.enabled,
      toggle: (on: boolean) => toggleRow("intro", on, { template_id: "auto" }),
    },
    {
      key: "end_card" as const,
      label: "End Card (substitui logo final)",
      on: !!draft.end_card?.enabled,
      toggle: (on: boolean) =>
        toggleRow("end_card", on, {
          template_id: "auto",
          replace_brand_outro: true,
        }),
    },
    {
      key: "chapter_title" as const,
      label: "Chapter Title entre blocos",
      on: !!draft.chapter_title?.enabled,
      toggle: (on: boolean) =>
        toggleRow("chapter_title", on, { source: "auto" }),
    },
    {
      key: "subscribe_mid" as const,
      label: "Subscribe no meio (Shorts)",
      on: !!draft.subscribe_mid?.enabled,
      toggle: (on: boolean) =>
        toggleRow("subscribe_mid", on, {
          position: "mid",
          percent: 0.5,
        }),
    },
    {
      key: "frame" as const,
      label: "Frame de identidade (full video)",
      on: !!draft.frame?.enabled,
      toggle: (on: boolean) => toggleRow("frame", on, { template_id: "auto" }),
    },
    {
      key: "media_layouts" as const,
      label: "Layouts image/media (auto)",
      on: !!draft.media_layouts?.enabled,
      toggle: (on: boolean) =>
        toggleRow("media_layouts", on, {
          selection: on ? "auto" : "off",
        }),
    },
    {
      key: "transitions" as const,
      label: "Transições entre blocos",
      on: !!draft.transitions?.enabled,
      toggle: (on: boolean) =>
        toggleRow("transitions", on, {
          selection: on ? "auto" : "off",
        }),
    },
  ];

  return (
    <div className="glass-panel p-4 rounded-2xl border border-zinc-800/80 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <SectionHeader
          title="TEMPLATES & CAMADAS (ESTE PROJETO)"
          helpId="render-template-policy"
          icon={<Layers className="w-4 h-4 text-gold-400" />}
          size="sm"
          titleClassName="text-[10px]"
          subtitle="Intro, end card, chapter, efeitos, frame e transitions — salvos no config do projeto, não no programa."
        />
        <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
          Projeto
        </span>
      </div>

      <SettingLabel
        helpTitle="Nicho dos templates Remotion"
        help="Catálogo do Template Studio usado para efeitos, transitions, intro e end card. A IA orquestra com base neste nicho."
        align="start"
      >
        Nicho do catálogo de templates
      </SettingLabel>
      <select
        value={draft.template_niche || projectNiche || niches[0] || "Default"}
        onChange={(e) =>
          setDraft((prev) =>
            mergePolicy(prev, { template_niche: e.target.value })
          )
        }
        className="dash-select text-[11px] max-w-md"
      >
        {niches.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <SettingLabel
        helpTitle="Preset de montagem"
        help="Atalhos de policy por tipo de vídeo. Você ainda pode ligar/desligar cada camada abaixo."
        align="start"
      >
        Preset
      </SettingLabel>
      <div className="flex flex-wrap gap-2">
        {RENDER_TEMPLATE_PRESET_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            title={o.hint}
            onClick={() =>
              setDraft(
                applyPresetToPolicy(
                  o.id,
                  isShort,
                  draft.template_niche || projectNiche
                )
              )
            }
            className={`dash-option-btn text-[10px] ${
              presetId === o.id ? "dash-option-btn-active" : ""
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-zinc-500">
        {RENDER_TEMPLATE_PRESET_OPTIONS.find((o) => o.id === presetId)?.hint ||
          ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 px-3 py-2"
          >
            <span className="text-[11px] text-zinc-200 leading-snug">
              {row.label}
            </span>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                className={`dash-option-btn text-[10px] px-2 py-1 ${
                  row.on ? "dash-option-btn-active" : ""
                }`}
                onClick={() => row.toggle(true)}
              >
                On
              </button>
              <button
                type="button"
                className={`dash-option-btn text-[10px] px-2 py-1 ${
                  !row.on ? "dash-option-btn-active" : ""
                }`}
                onClick={() => row.toggle(false)}
              >
                Off
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-zinc-500 leading-relaxed">
        Com <strong className="text-zinc-400">Efeitos</strong> e{" "}
        <strong className="text-zinc-400">Transições</strong> On, o render usa
        templates Remotion do nicho (não efeitos genéricos soltos). Após{" "}
        <strong className="text-zinc-400">Salvar</strong>, as camadas entram na
        trilha <strong className="text-zinc-400">motion</strong> do Editor de
        Timing — lá você edita duração, props e asset. End Card substitui o logo
        final.
      </p>

      {aiTips.length > 0 ? (
        <ul className="text-[10px] text-amber-200/90 space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          {aiTips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/80">
        <button
          type="button"
          disabled={saving || !activeProject}
          onClick={() => void handleSave()}
          className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Salvando…" : "Salvar + aplicar na timeline"}
        </button>
        <button
          type="button"
          disabled={!activeProject || !setActiveTab}
          onClick={openTimingEditor}
          className="dash-option-btn text-[10px] inline-flex items-center gap-1.5 border-water-400/40 text-water-200"
          title="Abre o Editor de Timing para editar efeitos/templates na trilha motion"
        >
          <Clapperboard className="w-3.5 h-3.5" />
          Abrir no Timing
          {lastAppliedCount > 0 ? (
            <span className="text-[8px] opacity-80">({lastAppliedCount})</span>
          ) : null}
        </button>
        <button
          type="button"
          disabled={suggesting || !activeProject}
          onClick={async () => {
            setSuggesting(true);
            try {
              const res = await fetch(
                getProjectUrl("/api/ai/creator/render-template-policy/suggest"),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    template_niche:
                      draft.template_niche || projectNiche || "Default",
                    current_policy: draft,
                  }),
                }
              );
              const data = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                policy?: RenderTemplatePolicy;
                tips?: string[];
                error?: string;
              };
              if (!res.ok) {
                throw new Error(data.error || `HTTP ${res.status}`);
              }
              if (data.policy) {
                setDraft((prev) =>
                  mergePolicy(prev, {
                    ...data.policy,
                    template_niche:
                      data.policy?.template_niche ||
                      prev.template_niche ||
                      projectNiche,
                  })
                );
              }
              setAiTips(Array.isArray(data.tips) ? data.tips : []);
              toast.success(
                "Sugestões da IA aplicadas ao painel (salve p/ timeline)."
              );
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Falha nas sugestões (reinicie o serviço se a API for nova)"
              );
            } finally {
              setSuggesting(false);
            }
          }}
          className="dash-option-btn text-[10px] inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {suggesting ? "IA…" : "IA: sugerir efeitos/transições"}
        </button>
        <button
          type="button"
          disabled={validating || !activeProject}
          onClick={async () => {
            setValidating(true);
            try {
              const res = await fetch(
                getProjectUrl(
                  "/api/ai/creator/render-template-policy/validate"
                ),
                { cache: "no-store" }
              );
              const data = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                errors?: string[];
                warnings?: string[];
                error?: string;
              };
              if (!res.ok) {
                throw new Error(
                  data.error ||
                    `Validação indisponível (${res.status}) — reinicie o serviço se a API for nova.`
                );
              }
              if (data.ok) {
                toast.success(
                  data.warnings?.length
                    ? `Policy OK · ${data.warnings.length} aviso(s)`
                    : "Policy OK neste projeto"
                );
                data.warnings?.forEach((w) => toast(w, { icon: "⚠️" }));
              } else {
                toast.error(
                  (data.errors || ["Conflito na policy"]).join(" · ")
                );
              }
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Falha na validação"
              );
            } finally {
              setValidating(false);
            }
          }}
          className="dash-option-btn text-[10px] inline-flex items-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {validating ? "Validando…" : "Validar composição"}
        </button>
      </div>
    </div>
  );
}
