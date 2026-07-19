import { z } from "zod";

export const BriefingOutputSchema = z.object({
  thesis: z.string(),
  promise: z.string(),
  audience: z.string(),
  tone: z.string(),
  constraints: z.array(z.string()),
  sources: z.array(z.string()),
  cta: z.string(),
});

export const ScriptSegmentSchema = z.object({
  sceneNumber: z.number(),
  narrationText: z.string(),
  visualDescription: z.string(),
  engineHint: z.enum([
    "vox-director",
    "vox-explainer",
    "gbro-collage-broll",
    "hyperframes",
    "remotion",
  ]),
  estimatedDurationSec: z.number(),
  paletteId: z.string(),
  motionProfile: z.string(),
});

export const ScriptOutputSchema = z.object({
  segments: z.array(ScriptSegmentSchema),
});

export type BriefingOutput = z.infer<typeof BriefingOutputSchema>;
export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;

export function generateBriefingPrompt(topic: string, niche: string): string {
  return `Você é um diretor de conteúdo especializado em canais de YouTube de alto engajamento.
Gere um briefing estruturado para um vídeo sobre o tópico: "${topic}".
O canal pertence ao nicho de: "${niche}".

O resultado deve ser um JSON válido e estrito contendo exatamente os seguintes campos:
- thesis (tese principal, ângulo único do vídeo)
- promise (promessa inicial do gancho)
- audience (público-alvo detalhado)
- tone (tom da narração)
- constraints (lista de regras e termos proibidos)
- sources (fontes confiáveis para pesquisa)
- cta (chamada para ação final)

Responda APENAS com o objeto JSON purificado, sem decorações em markdown ou explicações.`;
}

export function generateScriptPrompt(briefing: BriefingOutput): string {
  return `Com base no seguinte briefing de produção:
${JSON.stringify(briefing, null, 2)}

Gere um roteiro estruturado com cenas completas em formato de vídeo curto (9:16) ou longo (16:9).
A narração deve ser em português (Brasil), coloquial, falada e cativante.

O resultado deve ser um JSON válido e estrito contendo um array de "segments" no seguinte formato:
- sceneNumber (número sequencial da cena)
- narrationText (texto falado da narração para este segmento)
- visualDescription (diretrizes e metáforas visuais para o b-roll/imagens/gráficos)
- engineHint (um dos seguintes motores sugeridos: 'vox-director', 'vox-explainer', 'gbro-collage-broll', 'hyperframes', 'remotion')
- estimatedDurationSec (estimativa inicial de segundos para leitura, ex: 5)
- paletteId (id de paleta sugerida, ex: "sepia", "neon")
- motionProfile (perfil de movimento sugerido, ex: "assemble", "hinge-pop")

Responda APENAS com o objeto JSON purificado contendo o array "segments", sem decorações markdown ou explicações adicionais.`;
}
