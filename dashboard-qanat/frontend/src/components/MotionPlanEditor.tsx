import { useState, useEffect, useMemo, useCallback } from "react";
import "../styles/motionPlanEditor.css";

/** Paletas padrão por nicho (espelha shared/nichePalettes.js) */
const NICHE_PALETTE_PRESETS: Record<string, Record<string, string>> = {
  Engenharia: {
    primary: "#F5A623",
    accent: "#4A9EFF",
    bg: "rgba(10,10,18,0.82)",
    text: "#FFFFFF",
    bar: "#F5A623",
  },
  Natureza: {
    primary: "#4CAF50",
    accent: "#81C784",
    bg: "rgba(8,18,10,0.82)",
    text: "#FFFFFF",
    bar: "#4CAF50",
  },
  Tecnologia: {
    primary: "#7C4DFF",
    accent: "#00E5FF",
    bg: "rgba(12,8,24,0.85)",
    text: "#FFFFFF",
    bar: "#7C4DFF",
  },
  Financas: {
    primary: "#FFD700",
    accent: "#00C853",
    bg: "rgba(10,12,8,0.84)",
    text: "#FFFFFF",
    bar: "#FFD700",
  },
  Saude: {
    primary: "#FF5252",
    accent: "#FF8A80",
    bg: "rgba(18,8,10,0.82)",
    text: "#FFFFFF",
    bar: "#FF5252",
  },
  Ciencia: {
    primary: "#00BCD4",
    accent: "#B388FF",
    bg: "rgba(6,14,18,0.84)",
    text: "#FFFFFF",
    bar: "#00BCD4",
  },
  Historia: {
    primary: "#FF8F00",
    accent: "#FFCC02",
    bg: "rgba(16,12,6,0.84)",
    text: "#FFFFFF",
    bar: "#FF8F00",
  },
  Esporte: {
    primary: "#FF3D00",
    accent: "#FFEA00",
    bg: "rgba(14,8,6,0.84)",
    text: "#FFFFFF",
    bar: "#FF3D00",
  },
  Educacao: {
    primary: "#2196F3",
    accent: "#64FFDA",
    bg: "rgba(8,12,20,0.84)",
    text: "#FFFFFF",
    bar: "#2196F3",
  },
  Entretenimento: {
    primary: "#E040FB",
    accent: "#FF6E40",
    bg: "rgba(16,6,18,0.84)",
    text: "#FFFFFF",
    bar: "#E040FB",
  },
  Viagem: {
    primary: "#26C6DA",
    accent: "#FFA726",
    bg: "rgba(6,14,16,0.82)",
    text: "#FFFFFF",
    bar: "#26C6DA",
  },
  Culinaria: {
    primary: "#FF7043",
    accent: "#FFCA28",
    bg: "rgba(16,10,6,0.84)",
    text: "#FFFFFF",
    bar: "#FF7043",
  },
};

type ShotCard = {
  templateId: string;
  name: string;
  category: string;
  styles?: string[];
  semanticTags?: string[];
  minDurationSec?: number;
  maxDurationSec?: number;
};

type MotionPlan = {
  niche?: string;
  format?: string;
  palette?: Record<string, string>;
  abertura?: { templateId?: string };
  encerramento?: { templateId?: string };
  cenas: Array<{
    scene_ref: string | number;
    scene_functions?: string[];
    motion_shot?: {
      templateId?: string;
      style?: string;
      props?: Record<string, unknown>;
      palette?: Record<string, string>;
    } | null;
    camera_move?: string;
    transicao_entrada?: string;
  }>;
};

const CATEGORIA_LABEL: Record<string, string> = {
  dados: "Dados & Métricas",
  comparacao: "Comparação",
  timeline: "Timeline",
  lista: "Lista & Ranking",
  destaque: "Destaque",
  abertura: "Abertura",
  encerramento: "Encerramento",
  transicao: "Transição",
  camera: "Câmera",
  texto: "Texto & Título",
  impacto: "Impacto & Ritmo",
  elemento: "Elemento & UI",
};

function agruparPorCategoria(templates: ShotCard[]) {
  return (templates || []).reduce((acc: Record<string, ShotCard[]>, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});
}

type Props = {
  storyboard: unknown;
  projectName?: string;
  niche?: string;
  format?: string;
  getProjectUrl: (path: string) => string;
  onClose: () => void;
  onPlanSaved?: (plan: MotionPlan, storyboard?: unknown) => void;
};

export default function MotionPlanEditor({
  storyboard,
  projectName,
  niche = "",
  format = "16:9",
  getProjectUrl,
  onClose,
  onPlanSaved,
}: Props) {
  const [plan, setPlan] = useState<MotionPlan | null>(null);
  const [catalog, setCatalog] = useState<ShotCard[]>([]);
  const [overrides, setOverrides] = useState<{
    cenas: Record<string, Record<string, unknown>>;
    abertura?: Record<string, unknown>;
    encerramento?: Record<string, unknown>;
  }>({ cenas: {} });
  const [busca, setBusca] = useState("");
  const [cenaAberta, setCenaAberta] = useState<string | number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [paletteNiche, setPaletteNiche] = useState(niche || "Engenharia");

  useEffect(() => {
    setPaletteNiche(niche || "Engenharia");
  }, [niche]);

  /** Aplica paleta do nicho ao plan local e a todos os motion_shots */
  const applyPalettePreset = useCallback((nicheKey: string) => {
    setPaletteNiche(nicheKey);
    const pal =
      NICHE_PALETTE_PRESETS[nicheKey] ||
      Object.entries(NICHE_PALETTE_PRESETS).find(
        ([k]) => k.toLowerCase() === nicheKey.toLowerCase()
      )?.[1] ||
      NICHE_PALETTE_PRESETS.Engenharia;

    setPlan((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        niche: nicheKey,
        palette: pal,
        cenas: (prev.cenas || []).map((c) =>
          c.motion_shot
            ? {
                ...c,
                motion_shot: { ...c.motion_shot, palette: pal },
              }
            : c
        ),
      };
      // Propaga palette via overrides (mesmo tick)
      setOverrides((ov) => {
        const cenas = { ...(ov.cenas || {}) };
        for (const c of next.cenas || []) {
          if (!c.motion_shot?.templateId) continue;
          const key = String(c.scene_ref);
          cenas[key] = {
            ...(cenas[key] || {}),
            templateId: c.motion_shot.templateId,
            palette: pal,
          };
        }
        return { ...ov, cenas };
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!storyboard && !projectName) return;
    setCarregando(true);
    setErro("");
    Promise.all([
      fetch(getProjectUrl("/api/motion/plan"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboard,
          project: projectName,
          niche,
          format,
          apply: false,
        }),
      }).then((r) => r.json()),
      fetch(getProjectUrl("/api/motion/catalog")).then((r) => r.json()),
    ])
      .then(([planRes, catRes]) => {
        if (planRes.error) throw new Error(planRes.error);
        setPlan(planRes.plan);
        setCatalog(catRes.templates || []);
      })
      .catch((e) => setErro(e.message || "Falha ao carregar motion plan"))
      .finally(() => setCarregando(false));
  }, [storyboard, projectName, niche, format, getProjectUrl]);

  const catalogoAgrupado = useMemo(
    () => agruparPorCategoria(catalog),
    [catalog]
  );

  const catalogFiltrado = useMemo(() => {
    if (!busca.trim()) return catalogoAgrupado;
    const q = busca.toLowerCase();
    return agruparPorCategoria(
      catalog.filter(
        (t) =>
          t.templateId.includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.semanticTags || []).some((tag) => tag.toLowerCase().includes(q))
      )
    );
  }, [catalogoAgrupado, catalog, busca]);

  const overrideCena = useCallback(
    (sceneRef: string | number, patch: Record<string, unknown>) => {
      const key = String(sceneRef);
      setOverrides((ov) => ({
        ...ov,
        cenas: {
          ...ov.cenas,
          [key]: { ...(ov.cenas[key] || {}), ...patch },
        },
      }));
    },
    []
  );

  const planPreview = useMemo(() => {
    if (!plan) return null;
    const clone = JSON.parse(JSON.stringify(plan)) as MotionPlan;
    for (const cena of clone.cenas) {
      const ov = overrides.cenas[String(cena.scene_ref)];
      if (!ov) continue;
      if (ov.remover) {
        cena.motion_shot = null;
        cena.camera_move = String(ov.camera_move || "slow-push-in");
        continue;
      }
      if (ov.templateId) {
        cena.motion_shot = cena.motion_shot || {};
        cena.motion_shot.templateId = String(ov.templateId);
        if (ov.style) cena.motion_shot.style = String(ov.style);
        if (ov.palette && typeof ov.palette === "object") {
          cena.motion_shot.palette = ov.palette as Record<string, string>;
        }
      } else if (ov.palette && cena.motion_shot) {
        cena.motion_shot.palette = ov.palette as Record<string, string>;
      }
      if (ov.props && cena.motion_shot) {
        cena.motion_shot.props = {
          ...(cena.motion_shot.props || {}),
          ...(ov.props as Record<string, unknown>),
        };
      }
      if (ov.transicao_entrada)
        cena.transicao_entrada = String(ov.transicao_entrada);
      if (ov.camera_move !== undefined)
        cena.camera_move = String(ov.camera_move);
    }
    if (overrides.abertura && clone.abertura) {
      Object.assign(clone.abertura, overrides.abertura);
    }
    if (overrides.encerramento && clone.encerramento) {
      Object.assign(clone.encerramento, overrides.encerramento);
    }
    return clone;
  }, [plan, overrides]);

  const salvar = async () => {
    if (!plan) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(getProjectUrl("/api/motion/plan/override"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          overrides,
          project: projectName,
          apply: Boolean(projectName),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar");
      onPlanSaved?.(data.plan, data.storyboard);
      onClose();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="mpe-overlay" onClick={onClose}>
        <div
          className="mpe-panel mpe-loading"
          onClick={(e) => e.stopPropagation()}
        >
          Gerando motion plan…
        </div>
      </div>
    );
  }

  if (!planPreview) {
    return (
      <div className="mpe-overlay" onClick={onClose}>
        <div className="mpe-panel" onClick={(e) => e.stopPropagation()}>
          <div className="mpe-head">
            <h2>Motion Plan</h2>
            <button className="mpe-btn mpe-btn--ghost" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="mpe-loading">{erro || "Sem plan"}</div>
        </div>
      </div>
    );
  }

  const paleta = planPreview.palette || {};
  const numOverrides = Object.keys(overrides.cenas).length;

  return (
    <div className="mpe-overlay" onClick={onClose}>
      <div className="mpe-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mpe-head">
          <div>
            <h2>🎬 Motion Plan</h2>
            <div className="mpe-sub">
              {planPreview.cenas.length} cenas · nicho{" "}
              {planPreview.niche || niche || "—"} · formato{" "}
              {planPreview.format || format}
            </div>
          </div>
          <div className="mpe-palette" title="Paleta do nicho">
            {Object.values(paleta).map((c, i) => (
              <span key={i} style={{ background: c }} />
            ))}
          </div>
          <label
            className="mpe-sub"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            Paleta
            <select
              value={paletteNiche}
              onChange={(e) => applyPalettePreset(e.target.value)}
              className="mpe-busca"
              style={{
                margin: 0,
                padding: "4px 8px",
                width: "auto",
                minWidth: 140,
              }}
              title="Aplicar paleta padrão do nicho a todos os shots"
            >
              {Object.keys(NICHE_PALETTE_PRESETS).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <button className="mpe-btn mpe-btn--ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {erro ? (
          <div style={{ color: "#f87171", padding: "8px 24px" }}>{erro}</div>
        ) : null}

        <div className="mpe-ends">
          <EndEditor
            label="🎬 Abertura"
            value={planPreview.abertura}
            catalog={catalog}
            categoria="abertura"
            onChange={(patch) =>
              setOverrides((ov) => ({
                ...ov,
                abertura: { ...(ov.abertura || {}), ...patch },
              }))
            }
          />
          <EndEditor
            label="🏁 Encerramento"
            value={planPreview.encerramento}
            catalog={catalog}
            categoria="encerramento"
            onChange={(patch) =>
              setOverrides((ov) => ({
                ...ov,
                encerramento: { ...(ov.encerramento || {}), ...patch },
              }))
            }
          />
        </div>

        <input
          className="mpe-busca"
          placeholder="Buscar shot card (odometer, timeline, impacto…)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="mpe-cenas">
          {planPreview.cenas.map((cena) => (
            <CenaCard
              key={String(cena.scene_ref)}
              cena={cena}
              aberta={cenaAberta === cena.scene_ref}
              onToggle={() =>
                setCenaAberta(
                  cenaAberta === cena.scene_ref ? null : cena.scene_ref
                )
              }
              catalogoAgrupado={catalogFiltrado}
              getProjectUrl={getProjectUrl}
              onOverride={(patch) => overrideCena(cena.scene_ref, patch)}
            />
          ))}
        </div>

        <div className="mpe-footer">
          <span className="mpe-sub">
            {numOverrides > 0
              ? `${numOverrides} cena(s) com override`
              : "Plano automático"}
          </span>
          <button className="mpe-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="mpe-btn mpe-btn--primary"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? "Salvando…" : "✓ Aplicar Motion Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EndEditor({
  label,
  value,
  catalog,
  categoria,
  onChange,
}: {
  label: string;
  value?: { templateId?: string };
  catalog: ShotCard[];
  categoria: string;
  onChange: (patch: Record<string, string>) => void;
}) {
  const opcoes = catalog.filter((c) => c.category === categoria);
  return (
    <div className="mpe-end">
      <span className="mpe-end__label">{label}</span>
      <select
        className="select"
        value={value?.templateId || ""}
        onChange={(e) => onChange({ templateId: e.target.value })}
      >
        {opcoes.map((o) => (
          <option key={o.templateId} value={o.templateId}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CenaCard({
  cena,
  aberta,
  onToggle,
  catalogoAgrupado,
  getProjectUrl,
  onOverride,
}: {
  cena: MotionPlan["cenas"][0];
  aberta: boolean;
  onToggle: () => void;
  catalogoAgrupado: Record<string, ShotCard[]>;
  getProjectUrl: (p: string) => string;
  onOverride: (patch: Record<string, unknown>) => void;
}) {
  const shot = cena.motion_shot;
  return (
    <div
      className={`mpe-cena ${aberta ? "mpe-cena--aberta" : ""} ${shot ? "" : "mpe-cena--semshot"}`}
    >
      <div className="mpe-cena__head" onClick={onToggle}>
        <span className="mpe-cena__num">#{cena.scene_ref}</span>
        <div className="mpe-cena__info">
          <div className="mpe-cena__shot">
            {shot
              ? `🎬 ${shot.templateId}`
              : `🎥 câmera: ${cena.camera_move || "—"}`}
            <span className="mpe-cena__trans">
              {" "}
              · ⤵ {cena.transicao_entrada}
            </span>
          </div>
          <div className="mpe-cena__funcs">
            {(cena.scene_functions || []).join(" · ")}
          </div>
        </div>
        <span>{aberta ? "▾" : "▸"}</span>
      </div>
      {aberta && (
        <div className="mpe-cena__body">
          <div className="mpe-field">
            <label>Shot card</label>
            <select
              className="select"
              value={shot?.templateId || "__none__"}
              onChange={(e) => {
                if (e.target.value === "__none__")
                  onOverride({ remover: true });
                else
                  onOverride({
                    templateId: e.target.value,
                    remover: false,
                  });
              }}
            >
              <option value="__none__">
                — Sem shot card (só footage + câmera) —
              </option>
              {Object.entries(catalogoAgrupado).map(([cat, cards]) => (
                <optgroup key={cat} label={CATEGORIA_LABEL[cat] || cat}>
                  {cards.map((c) => (
                    <option key={c.templateId} value={c.templateId}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {shot?.templateId ? (
            <StylePicker
              templateId={shot.templateId}
              value={shot.style}
              getProjectUrl={getProjectUrl}
              onChange={(style) => onOverride({ style })}
            />
          ) : (
            <div className="mpe-field">
              <label>Camera move</label>
              <select
                className="select"
                value={cena.camera_move || ""}
                onChange={(e) => onOverride({ camera_move: e.target.value })}
              >
                {[
                  "slow-push-in",
                  "pull-back-isolation",
                  "drone-dive-landing",
                  "multiplane",
                  "dolly-zoom",
                  "crash-zoom-punch",
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mpe-field">
            <label>Transição de entrada</label>
            <select
              className="select"
              value={cena.transicao_entrada || ""}
              onChange={(e) =>
                onOverride({ transicao_entrada: e.target.value })
              }
            >
              {[
                "shot-transitions",
                "wipe-transitions",
                "transition-hidden-cut",
                "circle-match-iris",
                "color-block-step-wipe",
                "page-turn-transitions",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function StylePicker({
  templateId,
  value,
  getProjectUrl,
  onChange,
}: {
  templateId: string;
  value?: string;
  getProjectUrl: (p: string) => string;
  onChange: (style: string) => void;
}) {
  const [styles, setStyles] = useState<string[]>([]);
  useEffect(() => {
    fetch(getProjectUrl("/api/motion/catalog"))
      .then((r) => r.json())
      .then((d) => {
        const card = (d.templates || []).find(
          (t: ShotCard) => t.templateId === templateId
        );
        setStyles(card?.styles || []);
      })
      .catch(() => setStyles([]));
  }, [templateId, getProjectUrl]);

  if (styles.length <= 1) {
    return (
      <div className="mpe-field">
        <label>Estilo</label>
        <span className="mpe-sub">{styles[0] || "único"}</span>
      </div>
    );
  }
  return (
    <div className="mpe-field">
      <label>Estilo / variante</label>
      <select
        className="select"
        value={value || styles[0]}
        onChange={(e) => onChange(e.target.value)}
      >
        {styles.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
