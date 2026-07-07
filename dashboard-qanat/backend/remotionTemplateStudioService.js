import {
  extractTemplateTsxFromLlm,
  validateFinalTemplateCode,
  validateOriginalTemplateCode,
} from "../shared/remotionTemplateStudioValidate.js";
import { generateAdaptedTemplateLocally } from "../shared/remotionTemplateStudioGenerate.js";

const MAX_ATTEMPTS = 3;

function buildAdaptPrompt({
  niche,
  templateType,
  category,
  subcategory,
  briefing,
  propsDraft,
  originalCode,
  validationErrors = [],
}) {
  const props = String(propsDraft || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

  const repair =
    validationErrors.length > 0
      ? [
          "",
          "A tentativa anterior foi REJEITADA pelos motivos:",
          ...validationErrors.map((e) => `- ${e}`),
          "Gere novamente sem esses problemas.",
        ].join("\n")
      : "";

  return [
    "Voce adapta templates Remotion para nichos visuais.",
    "Retorne SOMENTE o arquivo TSX final. Sem markdown. Sem explicacao. Sem texto fora do codigo.",
    "",
    "PROIBIDO no codigo final:",
    "- TODO",
    "- JSON.stringify",
    "- <pre>",
    "- placeholder",
    "- substituir este bloco",
    "- CODIGO ORIGINAL",
    "- BRIEFING:",
    "- codigo original do template",
    "- comentarios longos com instrucoes",
    "",
    "O codigo final DEVE conter:",
    '- "use client";',
    "- import de remotion (AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing se necessario)",
    "- type Props tipado",
    "- export default function Componente(props)",
    "- export const exampleProps",
    "- animacao funcional com useCurrentFrame + interpolate",
    "- layout responsivo com useVideoConfig (9:16 e 16:9)",
    "- JSX visual finalizado",
    "",
    niche === "Engenharia"
      ? [
          "ESTILO ENGENHARIA (obrigatorio):",
          "- fundo grafite/azul tecnico",
          "- grid blueprint",
          "- linhas de medicao",
          "- HUD tecnico",
          "- bordas com cantos recortados",
          "- cyan tecnico + amarelo de marcacao",
          "- aparência de painel de obra/projeto estrutural",
        ].join("\n")
      : `ESTILO NICHO: ${niche} — aplicar identidade visual profissional coerente.`,
    "",
    isCircularProgress(templateType, subcategory)
      ? [
          "CIRCULAR PROGRESS:",
          "- progress deve chegar exatamente ao valor da prop progress (inclusive 100%)",
          "- NAO usar frame % 90 para progresso final",
          "- usar interpolate(frame, [0, durationInFrames], [0, progress], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })",
        ].join("\n")
      : "",
    "",
    `NICHO: ${niche}`,
    `TIPO: ${templateType || subcategory}`,
    `CATEGORIA: ${category}`,
    `SUBCATEGORIA: ${subcategory}`,
    `PROPS: ${props || "title, subtitle, progress, label"}`,
    "",
    "BRIEFING (instrucao apenas — nao repetir no codigo):",
    briefing,
    "",
    "CODIGO ORIGINAL (referencia — nao colar no output):",
    originalCode,
    repair,
  ]
    .filter(Boolean)
    .join("\n");
}

function isCircularProgress(templateType, subcategory) {
  const haystack = `${templateType} ${subcategory}`.toLowerCase();
  return (
    haystack.includes("circular progress") ||
    haystack.includes("circular-progress") ||
    (haystack.includes("circular") && haystack.includes("progress"))
  );
}

async function generateWithGemini({
  callGemini,
  projDir,
  prompt,
  temperature = 0.35,
}) {
  const text = await callGemini(projDir, prompt, {
    temperature,
    maxRetries: 2,
  });
  return extractTemplateTsxFromLlm(text);
}

export async function adaptRemotionTemplate(
  input,
  { callGemini, projDir } = {}
) {
  const {
    niche = "Engenharia",
    templateType = "",
    category = "",
    subcategory = "",
    briefing = "",
    propsDraft = "",
    propsInput = "",
    originalCode = "",
  } = input || {};

  const resolvedPropsDraft = propsDraft || propsInput || "";

  const originalCheck = validateOriginalTemplateCode(originalCode);
  if (!originalCheck.ok) {
    return {
      ok: false,
      error: originalCheck.errors[0],
      errors: originalCheck.errors,
      stage: "original",
    };
  }

  let lastErrors = [];

  if (callGemini && projDir) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const prompt = buildAdaptPrompt({
        niche,
        templateType,
        category,
        subcategory,
        briefing,
        propsDraft: resolvedPropsDraft,
        originalCode,
        validationErrors: lastErrors,
      });

      let code = "";
      try {
        code = await generateWithGemini({ callGemini, projDir, prompt });
      } catch (err) {
        lastErrors = [`Falha na IA: ${err.message}`];
        continue;
      }

      const finalCheck = validateFinalTemplateCode(code);
      if (finalCheck.ok) {
        return {
          ok: true,
          code,
          source: "gemini",
          attempts: attempt + 1,
        };
      }
      lastErrors = finalCheck.errors;
    }
  }

  const local = generateAdaptedTemplateLocally({
    niche,
    templateType,
    subcategory,
    propsDraft: resolvedPropsDraft,
  });

  if (local) {
    const finalCheck = validateFinalTemplateCode(local);
    if (finalCheck.ok) {
      return {
        ok: true,
        code: local,
        source: "local-generator",
        attempts: 1,
        geminiRejected: lastErrors,
      };
    }
    return {
      ok: false,
      error: finalCheck.errors[0],
      errors: finalCheck.errors,
      stage: "local",
    };
  }

  return {
    ok: false,
    error:
      lastErrors[0] ||
      "Nao foi possivel gerar template final. Verifique o codigo original e tente novamente.",
    errors: lastErrors.length
      ? lastErrors
      : ["Geracao local indisponivel para este tipo de template."],
    stage: "gemini",
  };
}
