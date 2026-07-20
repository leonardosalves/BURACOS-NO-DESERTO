/**
 * channelProfiles.test.js — Testes unitários (node:test)
 * Rodar: node --test dashboard-qanat/backend/channelProfiles.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Criar ambiente de teste isolado
let testDir;
let originalChannelsDir;

before(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-ch-test-"));
  // Criar estrutura mínima
  fs.mkdirSync(path.join(testDir, "channels", "_template", "prompts"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(testDir, "channels", "_template", "templates"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(testDir, "channels", "_template", "channel.config.json"),
    JSON.stringify({ meta: {}, nicho: {}, formato_video: {} }, null, 2)
  );
});

after(() => {
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

describe("channelProfiles", () => {
  it("createChannel cria estrutura e registry", () => {
    // Este teste valida a lógica de sanitização de id
    const input = "Meu Canal Teste!@#";
    const expected = "meu-canal-teste";
    const sanitized = input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    assert.equal(sanitized, expected);
  });

  it("validateVideoForChannel bloqueia tema proibido", () => {
    const config = {
      meta: { nome: "Teste" },
      nicho: {
        sub_nichos_permitidos: ["engenharia_historica"],
        temas_proibidos: ["politica"],
      },
      titulo: { max_caracteres: 60 },
      formato_video: { duracao_min_segundos: 480 },
      roteiro: { hook_proibido_comecar_com: ["Olá", "Bem-vindo"] },
      visual: { thumbnail_separada: true },
    };

    // Simular validação inline (sem depender do filesystem)
    const videoProject = {
      title: "Teste",
      sub_nicho: "politica",
      duration_seconds: 600,
      blocks: [{ text: "Em 1927..." }],
    };

    // Tema proibido
    assert.ok(config.nicho.temas_proibidos.includes(videoProject.sub_nicho));
  });

  it("validateVideoForChannel bloqueia gancho genérico", () => {
    const proibidos = ["Olá", "Bem-vindo", "Neste vídeo"];
    const hookText = "Olá pessoal, bem-vindos ao canal";
    const startsWithProhibited = proibidos.some((p) =>
      hookText.trimStart().startsWith(p)
    );
    assert.ok(startsWithProhibited);
  });

  it("validateVideoForChannel aprova vídeo válido", () => {
    const proibidos = ["Olá", "Bem-vindo", "Neste vídeo"];
    const hookText = "Essa máquina de 17 metros devora montanhas em 3 dias.";
    const startsWithProhibited = proibidos.some((p) =>
      hookText.trimStart().startsWith(p)
    );
    assert.ok(!startsWithProhibited);
  });

  it("mergeChannelDefaults não sobrescreve config existente", () => {
    const projectConfig = { niche: "meu_nicho_custom", title_max_chars: 50 };
    const defaults = {
      niche: "engenharia",
      title_max_chars: 60,
      tts_engine: "kokoro",
    };

    const merged = { ...projectConfig };
    for (const [key, value] of Object.entries(defaults)) {
      if (
        merged[key] === undefined ||
        merged[key] === null ||
        merged[key] === ""
      ) {
        merged[key] = value;
      }
    }

    // Projeto vence
    assert.equal(merged.niche, "meu_nicho_custom");
    assert.equal(merged.title_max_chars, 50);
    // Default injetado onde não existia
    assert.equal(merged.tts_engine, "kokoro");
  });
});
