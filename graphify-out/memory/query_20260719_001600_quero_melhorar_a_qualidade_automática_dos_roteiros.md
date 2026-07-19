---
type: "query"
date: "2026-07-19T00:16:00.596145+00:00"
question: "Quero melhorar a qualidade automática dos roteiros"
contributor: "graphify"
outcome: "useful"
source_nodes:
  [
    "assessEditorialContract()",
    "assessNarracaoProIntegrity()",
    "normalizeScriptChecklist()",
    "scriptQuality.js",
  ]
---

# Q: Quero melhorar a qualidade automática dos roteiros

## Answer

Expanded from graph vocabulary: [script, quality, editorial, narration, narrative, hook, retention, dedupe, coverage, pov, factual, validate]. Criado e validado tasks/automatic-script-quality.prd.json com cinco historias: relatorio deterministico unificado, diagnostico de retencao, prompt de reparo que preserva fatos, uma unica tentativa segura de reparo e integracao antes de gerar assets. O plano reutiliza assessEditorialContract, assessNarrationReadiness e assessNarracaoProIntegrity, sem criar um verificador factual paralelo.

## Outcome

- Signal: useful

## Source Nodes

- assessEditorialContract()
- assessNarracaoProIntegrity()
- normalizeScriptChecklist()
- scriptQuality.js
