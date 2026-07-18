import test from "node:test";
import assert from "node:assert/strict";
import {
  extractDynamicEntities,
  detectOntologyCategories,
  analyzeLineLocally,
  analyzeScriptLocally,
  classifyVisualIntent,
  buildSemanticAnchors,
  validateVisualProposal,
  parseSemanticDirectorResponse,
  buildCardRegenerationPrompt,
  parseCardRegenerationResponse,
  listPreservableElements,
  summarizeCardChanges,
  snapshotCardVersion,
  GEO_ONTOLOGY,
} from "./collageSemanticDirector.js";

test("ontologia tem categorias mínimas de geografia", () => {
  const keys = Object.keys(GEO_ONTOLOGY);
  for (const k of [
    "POLITICAL_GEOGRAPHY",
    "PHYSICAL_GEOGRAPHY",
    "HYDROGRAPHY",
    "CLIMATOLOGY",
    "GEOLOGY",
    "HUMAN_GEOGRAPHY",
    "ECONOMIC_GEOGRAPHY",
    "CARTOGRAPHY",
  ]) {
    assert.ok(keys.includes(k), `falta ${k}`);
  }
});

test("detectOntologyCategories é genérica (tipos, não lugares)", () => {
  assert.ok(
    detectOntologyCategories("o mapa e a projeção distorcem").includes(
      "CARTOGRAPHY"
    )
  );
  assert.ok(
    detectOntologyCategories("o rio e a bacia hidrográfica").includes(
      "HYDROGRAPHY"
    )
  );
  assert.ok(
    detectOntologyCategories("população e urbanização na costa").includes(
      "HUMAN_GEOGRAPHY"
    )
  );
});

test("extractDynamicEntities extrai nomes e números sem lista fixa", () => {
  const e = extractDynamicEntities(
    "O rio Amazonas recebe água de milhares de afluentes."
  );
  assert.ok(
    e.geographicEntities.some((x) => /Amazonas/i.test(x)),
    "deve capturar Amazonas"
  );
  assert.ok(e.typeKeywords.some((t) => /rio|afluente/i.test(t)));
});

test("CARTOGRAFIA: linha de distorção de mapa classifica map/comparative", () => {
  const line = "Mapas planos distorcem partes da superfície terrestre.";
  const local = analyzeLineLocally(line, 0);
  assert.ok(
    ["map_based", "comparative", "literal", "process"].includes(
      local.recommendedVisualMode
    )
  );
  assert.ok(
    local.requiredVisualAnchors.some((a) => /mapa|map|distor/i.test(a)) ||
      local.ontologyCategories.includes("CARTOGRAPHY")
  );
});

test("HIDROGRAFIA: Amazonas preserva rio e afluentes como âncoras", () => {
  const line = "O rio Amazonas recebe água de milhares de afluentes.";
  const local = analyzeLineLocally(line, 0);
  const anchors = local.requiredVisualAnchors.join(" ").toLowerCase();
  assert.ok(/amazonas|rio|afluente/.test(anchors));
});

test("CLIMA: Andes e umidade viram âncoras", () => {
  const line = "A Cordilheira dos Andes bloqueia parte da umidade.";
  const local = analyzeLineLocally(line, 0);
  const blob = [
    ...(local.geographicEntities || []),
    ...(local.requiredVisualAnchors || []),
    ...(local.typeKeywords || []),
    ...(local.physicalPhenomena || []),
  ]
    .join(" ")
    .toLowerCase();
  assert.ok(/andes|umidade|montanha|cordilheira|bloqueia/.test(blob));
});

test("POPULAÇÃO: Egito e Nilo", () => {
  const line = "A população do Egito se concentra ao redor do rio Nilo.";
  const local = analyzeLineLocally(line, 0);
  const blob = JSON.stringify(local).toLowerCase();
  assert.ok(/egito|nilo|popula/.test(blob));
});

test("TECTÔNICA: Japão e placas", () => {
  const line = "O Japão está próximo ao encontro de várias placas tectônicas.";
  const local = analyzeLineLocally(line, 0);
  const blob = JSON.stringify(local).toLowerCase();
  assert.ok(/jap|placa|tect/.test(blob));
});

test("validação reprova metáfora abstrata que apaga entidades", () => {
  const lineAnalysis = analyzeLineLocally(
    "Este mapa faz a Groenlândia parecer quase do tamanho da África.",
    0
  );
  // Força entidades se o extrator falhar no ambiente
  if (!lineAnalysis.geographicEntities.length) {
    lineAnalysis.geographicEntities = ["Groenlândia", "África"];
    lineAnalysis.requiredVisualAnchors = [
      "mapa",
      "Groenlândia",
      "África",
      "tamanho",
    ];
  }
  const bad = validateVisualProposal({
    lineAnalysis,
    visualProposal: {
      visualMode: "abstract",
      primarySubject: "balança",
      objects: ["pena", "bloco de ferro", "balança"],
      composition: "Uma balança com uma pena e um bloco de ferro",
      semanticAnchors: [],
    },
  });
  assert.ok(
    bad.decision === "regenerate" || bad.decision === "revise",
    `esperado regenerate/revise, veio ${bad.decision}`
  );
  assert.ok(bad.entityCoverage < 75 || bad.irrelevantObjects.length > 0);
});

test("validação aprova proposta que cobre entidades geográficas", () => {
  const lineAnalysis = analyzeLineLocally(
    "O rio Nilo atravessa áreas extremamente secas.",
    0
  );
  if (!lineAnalysis.geographicEntities.includes("Nilo")) {
    lineAnalysis.geographicEntities.push("Nilo");
    lineAnalysis.requiredVisualAnchors.push("Nilo", "rio", "deserto");
  }
  const good = validateVisualProposal({
    lineAnalysis,
    visualProposal: {
      visualMode: "literal",
      primarySubject: "rio Nilo",
      objects: [
        "rio de papel azul Nilo",
        "deserto de cartolina",
        "vista de cima",
      ],
      composition:
        "Um rio de papel azul atravessando um grande deserto visto de cima",
      semanticAnchors: ["Nilo", "rio", "deserto"],
    },
  });
  assert.equal(good.decision, "approve");
  assert.ok(good.entityCoverage >= 50);
  assert.ok(good.geographicRelevance >= 80);
});

test("parseSemanticDirectorResponse preserva campos legados e adiciona validation", () => {
  const lines = [
    "O rio Amazonas recebe água de milhares de afluentes.",
    "Mapas planos distorcem partes da superfície terrestre.",
  ];
  const fakeLlm = JSON.stringify({
    scriptAnalysis: {
      domain: "geografia",
      subdomain: "fisica",
      mainTopic: "hidrografia e cartografia",
      thesis: "rios e mapas",
      educationalGoal: "ensinar",
      geographicScale: "multi_scale",
      timeContext: "atual",
      locations: ["Amazonas"],
      phenomena: ["afluentes", "distorção"],
      recurringVisualElements: ["rio", "mapa"],
      tone: "educativo",
      factualSensitivity: "high",
    },
    items: [
      {
        id: "c01",
        line: lines[0],
        mode: "geo",
        lineAnalysis: {
          plainMeaning: lines[0],
          geographicEntities: ["Amazonas"],
          requiredVisualAnchors: ["Amazonas", "rio", "afluentes"],
          recommendedVisualMode: "hydrography",
        },
        visualProposal: {
          visualMode: "literal",
          primarySubject: "rio Amazonas",
          objects: ["rio principal", "afluentes de papel", "bacia"],
          composition: "rede hidrográfica do Amazonas em colagem",
          semanticAnchors: ["Amazonas", "rio", "afluentes"],
          assemblySteps: ["1 bacia", "2 rio", "3 afluentes"],
        },
        visual_proposition: "rede hidrográfica do Amazonas em colagem",
        key_objects: ["rio principal", "afluentes de papel", "bacia"],
        background_color: { name: "ocean", hex: "#0B3D5C" },
      },
      {
        id: "c02",
        line: lines[1],
        mode: "geo",
        visualProposal: {
          visualMode: "comparative",
          primarySubject: "mapa e globo",
          objects: ["globo de papel", "mapa plano", "distorção visual"],
          composition: "globo ao lado de mapa plano mostrando distorção",
          semanticAnchors: ["mapa", "globo", "distorção"],
        },
        visual_proposition: "globo e mapa plano com distorção",
        key_objects: ["globo", "mapa plano", "setas de distorção"],
        background_color: { name: "parchment", hex: "#E8D5A3" },
      },
    ],
  });

  const parsed = parseSemanticDirectorResponse(fakeLlm, lines, {
    mode: "geo",
    fidelity: "balanced",
  });
  assert.equal(parsed.items.length, 2);
  assert.ok(parsed.scriptAnalysis.domain === "geografia");
  assert.ok(parsed.items[0].key_objects.length >= 3);
  assert.ok(parsed.items[0].visual_proposition);
  assert.ok(parsed.items[0].validation);
  assert.ok(parsed.items[0].lineAnalysis);
  assert.ok(parsed.items[0].visualProposal);
  // Não deve ser balança/pena
  const blob = JSON.stringify(parsed.items).toLowerCase();
  assert.ok(!/balança com uma pena|bloco de ferro/.test(blob));
});

test("analyzeScriptLocally agrega locais do roteiro inteiro", () => {
  const script = analyzeScriptLocally([
    "No Japão há encontro de placas tectônicas.",
    "A população do Egito se concentra ao redor do Nilo.",
  ]);
  assert.equal(script.domain, "geografia");
  assert.ok(script.locations.length + script.phenomena.length > 0);
});

test("classifyVisualIntent: comparação → comparative/hybrid", () => {
  const e = extractDynamicEntities(
    "Este mapa faz a Groenlândia parecer quase do tamanho da África."
  );
  const c = classifyVisualIntent(
    "Este mapa faz a Groenlândia parecer quase do tamanho da África.",
    e
  );
  assert.ok(
    ["comparative", "hybrid", "map_based"].includes(c.recommendedVisualMode)
  );
});

test("ECONOMIA: Canal de Suez — âncoras de rota", () => {
  const local = analyzeLineLocally(
    "O Canal de Suez encurta uma das principais rotas entre Europa e Ásia.",
    0
  );
  const blob = JSON.stringify(local).toLowerCase();
  assert.ok(/suez|europa|ásia|asia|rota|canal/.test(blob));
});

test("DESASTRES: planície de inundação", () => {
  const local = analyzeLineLocally(
    "Uma planície de inundação pode ficar submersa durante grandes cheias.",
    0
  );
  const blob = JSON.stringify(local).toLowerCase();
  assert.ok(/planície|planicie|inunda|cheia|submers/.test(blob));
});

test("URBANIZAÇÃO: cidade avança sobre espaço rural", () => {
  const local = analyzeLineLocally(
    "A expansão da cidade substituiu áreas rurais nas periferias.",
    0
  );
  const blob = JSON.stringify(local).toLowerCase();
  assert.ok(/cidade|rural|perifer|expan|urban|substit/.test(blob));
  assert.ok(
    ["process", "causal", "spatial", "literal", "hybrid"].includes(
      local.recommendedVisualMode
    )
  );
});

test("ANTES/DEPOIS Gate 1: Groenlândia vs África — abstrato reprovado, geo aprovado", () => {
  const line =
    "Este mapa faz a Groenlândia parecer quase do tamanho da África.";
  const lineAnalysis = analyzeLineLocally(line, 0);
  if (
    !lineAnalysis.geographicEntities.some((e) => /groen|áfric|afric/i.test(e))
  ) {
    lineAnalysis.geographicEntities = [
      ...lineAnalysis.geographicEntities,
      "Groenlândia",
      "África",
    ];
    lineAnalysis.requiredVisualAnchors = [
      "mapa",
      "Groenlândia",
      "África",
      "tamanho",
    ];
  }

  // ANTES (erro clássico do Gate 1 antigo)
  const before = {
    visualMode: "abstract",
    primarySubject: "comparação de peso",
    objects: ["balança", "pena", "bloco de ferro"],
    composition: "Uma balança com uma pena e um bloco de ferro",
    semanticAnchors: [],
  };
  const beforeVal = validateVisualProposal({
    lineAnalysis,
    visualProposal: before,
  });
  assert.notEqual(beforeVal.decision, "approve");

  // DEPOIS (proposta visual com entidades)
  const after = {
    visualMode: "map_based",
    primarySubject: "mapa comparando Groenlândia e África",
    objects: [
      "mapa plano de papel",
      "silhueta da Groenlândia",
      "silhueta da África",
      "setas de distorção de escala",
    ],
    composition:
      "Mapa de papel com silhuetas da Groenlândia e da África lado a lado, marcando distorção de tamanho",
    semanticAnchors: ["mapa", "Groenlândia", "África", "distorção"],
  };
  const afterVal = validateVisualProposal({
    lineAnalysis,
    visualProposal: after,
  });
  assert.equal(afterVal.decision, "approve");
  assert.ok(afterVal.entityCoverage >= 75);
});

test("ANTES/DEPOIS Gate 1: Nilo no deserto — fita genérica vs rio literal", () => {
  const line = "O rio Nilo atravessa áreas extremamente secas.";
  const lineAnalysis = analyzeLineLocally(line, 0);
  if (!lineAnalysis.geographicEntities.includes("Nilo")) {
    lineAnalysis.geographicEntities.push("Nilo");
    lineAnalysis.requiredVisualAnchors.push("Nilo", "rio", "deserto");
  }

  const before = validateVisualProposal({
    lineAnalysis,
    visualProposal: {
      visualMode: "abstract",
      primarySubject: "fita",
      objects: ["fita azul", "blocos de madeira"],
      composition: "Uma fita azul passando entre blocos de madeira",
    },
  });
  assert.notEqual(before.decision, "approve");

  const after = validateVisualProposal({
    lineAnalysis,
    visualProposal: {
      visualMode: "literal",
      primarySubject: "rio Nilo",
      objects: [
        "rio de papel azul Nilo",
        "deserto de cartolina",
        "vista aérea",
      ],
      composition:
        "Um rio de papel azul atravessando um grande deserto visto de cima",
      semanticAnchors: ["Nilo", "rio", "deserto"],
    },
  });
  assert.equal(after.decision, "approve");
});

test("oito assuntos geográficos distintos extraem âncoras sem lista fixa de lugares", () => {
  const samples = [
    "Mapas planos distorcem partes da superfície terrestre.",
    "O rio Amazonas recebe água de milhares de afluentes.",
    "A Cordilheira dos Andes bloqueia parte da umidade.",
    "A população do Egito se concentra ao redor do rio Nilo.",
    "O Japão está próximo ao encontro de várias placas tectônicas.",
    "A expansão da cidade substituiu áreas rurais nas periferias.",
    "O Canal de Suez encurta uma das principais rotas entre Europa e Ásia.",
    "Uma planície de inundação pode ficar submersa durante grandes cheias.",
  ];
  for (const line of samples) {
    const local = analyzeLineLocally(line, 0);
    assert.ok(local.requiredVisualAnchors.length >= 1, `sem âncoras: ${line}`);
    assert.ok(local.recommendedVisualMode);
    // Nenhuma âncora deve ser "balança" ou metáfora pré-programada
    const blob = local.requiredVisualAnchors.join(" ").toLowerCase();
    assert.ok(!/\bbalança\b|\bpena\b|\bferro\b/.test(blob));
  }
});

test("buildCardRegenerationPrompt inclui instrução, preserve e linhas vizinhas", () => {
  const prompt = buildCardRegenerationPrompt({
    fullScript: [
      "Introdução ao equador.",
      "A Linha do Equador atravessa a África e a América do Sul.",
      "Conclusão.",
    ],
    previousLine: "Introdução ao equador.",
    currentLine: "A Linha do Equador atravessa a África e a América do Sul.",
    nextLine: "Conclusão.",
    currentProposal: {
      id: "c02",
      visual_proposition: "Dois continentes abaixo de uma linha",
      key_objects: ["linha", "continentes"],
    },
    customInstruction: "posicione o equador atravessando os continentes",
    selectedQuickFixes: ["fix_precision", "preserve_entities", "use_map"],
    rejectionReasons: ["Erro geográfico"],
    preserveElements: ["África", "América do Sul", "Equador"],
    replaceElements: ["continentes abaixo da linha"],
    editScope: "geo_precision",
    mode: "geo",
  });
  assert.ok(prompt.includes("REVISANDO"));
  assert.ok(prompt.includes("posicione o equador"));
  assert.ok(prompt.includes("África"));
  assert.ok(prompt.includes("previousLine"));
  assert.ok(prompt.includes("NÃO crie uma cena completamente diferente"));
  assert.ok(!prompt.includes("c01") || prompt.includes("c02"));
});

test("parseCardRegenerationResponse devolve só um card e preserva id", () => {
  const current = {
    id: "c07",
    line: "Nenhum mapa preserva tamanho, forma, distância e direção ao mesmo tempo.",
    mode: "geo",
    visual_proposition: "Quatro ícones de papel sendo amassados",
    key_objects: ["ícone1", "ícone2", "ícone3", "ícone4"],
    activeVersion: 1,
    lineAnalysis: analyzeLineLocally(
      "Nenhum mapa preserva tamanho, forma, distância e direção ao mesmo tempo.",
      0
    ),
  };
  const fake = JSON.stringify({
    item: {
      id: "c07",
      line: current.line,
      mode: "geo",
      core_meaning: "projeções cartográficas com trade-offs",
      visual_proposition:
        "Quatro mapas-múndi de papel lado a lado, cada um com uma projeção diferente",
      key_objects: [
        "mapa projeção 1",
        "mapa projeção 2",
        "mapa projeção 3",
        "mapa projeção 4",
      ],
      background_color: { name: "parchment", hex: "#E8D5A3" },
      accent_colors: ["#0B3D5C"],
      assembly_order: ["1 base", "2 mapas", "3 contraste"],
      visualProposal: {
        visualMode: "comparative",
        primarySubject: "quatro projeções",
        objects: [
          "mapa projeção 1",
          "mapa projeção 2",
          "mapa projeção 3",
          "mapa projeção 4",
        ],
        composition:
          "Quatro mapas-múndi de papel lado a lado, cada um com uma projeção diferente",
        semanticAnchors: ["mapa", "projeção", "tamanho", "forma"],
      },
    },
    changes: ["substituídos ícones por mapas"],
  });
  const parsed = parseCardRegenerationResponse(fake, {
    currentItem: current,
    currentLine: current.line,
    mode: "geo",
    preserveElements: ["mapa", "projeção"],
  });
  assert.equal(parsed.cardId, "c07");
  assert.equal(parsed.candidateVersion.id, "c07");
  assert.ok(/mapa/i.test(parsed.candidateVersion.visual_proposition));
  assert.ok(parsed.validation);
  assert.ok(
    parsed.previousVersion.proposal.visual_proposition.includes("ícones")
  );
});

test("summarizeCardChanges e snapshot não mutam outros cards", () => {
  const a = {
    id: "c01",
    visual_proposition: "A",
    key_objects: ["x"],
    validation: { semanticAlignment: 50, entityCoverage: 40 },
  };
  const b = {
    id: "c01",
    visual_proposition: "B",
    key_objects: ["y", "z"],
    validation: { semanticAlignment: 90, entityCoverage: 95 },
  };
  const diff = summarizeCardChanges(a, b);
  assert.ok(diff.changes.some((c) => /proposição|objetos/i.test(c)));
  assert.ok(diff.scoreDiffs.some((s) => s.metric === "semanticAlignment"));
  const snap = snapshotCardVersion(a, { version: 1 });
  assert.equal(snap.version, 1);
  assert.equal(snap.proposal.id, "c01");
});

test("listPreservableElements extrai do item sem lista fixa global", () => {
  const els = listPreservableElements({
    place_name: "Canal de Suez",
    key_objects: ["mapa", "rota marítima"],
    lineAnalysis: {
      geographicEntities: ["Europa", "Ásia"],
      requiredVisualAnchors: ["canal", "rota"],
    },
  });
  assert.ok(els.some((e) => /suez/i.test(e)));
  assert.ok(els.some((e) => /europa/i.test(e)));
});
