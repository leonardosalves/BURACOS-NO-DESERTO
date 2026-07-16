import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  buildNarrationIntegrityReport,
  buildProjectHealthReport,
} from "./projectHealth.js";
import { hashNarrationIntegrityText } from "./narrationChunks.js";

function withProject(storyboard, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumiera-health-test-"));
  try {
    fs.writeFileSync(path.join(dir, "config_qanat.json"), "{}", "utf8");
    fs.writeFileSync(
      path.join(dir, "storyboard.json"),
      JSON.stringify(storyboard),
      "utf8"
    );
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("integridade aprovada permanece verde quando texto e trechos coincidem", () => {
  const text = "Uma narracao curta e intacta.";
  withProject(
    {
      narrative_script: text,
      narrative_script_tagged: "Uma narracao [pausa] curta e intacta.",
      narration_integrity: {
        approved_text_sha256: hashNarrationIntegrityText(text),
      },
      narration_chunk_plan: {
        source_narration_hash: hashNarrationIntegrityText(text),
        chunks: [{ text: text }],
      },
    },
    (dir) => {
      const report = buildNarrationIntegrityReport(dir);
      assert.equal(report.status, "ok");
      assert.equal(
        report.checks.some((check) => check.status === "error"),
        false
      );
    }
  );
});

test("detecta texto alterado depois da aprovacao", () => {
  withProject(
    {
      narrative_script: "Texto alterado.",
      narration_integrity: {
        approved_text_sha256: hashNarrationIntegrityText("Texto original."),
      },
    },
    (dir) => {
      const report = buildNarrationIntegrityReport(dir);
      assert.equal(report.status, "error");
      assert.match(
        report.checks.find((check) => check.id === "approved").detail,
        /alterado/i
      );
    }
  );
});

test("relatorio acusa MP3 ausente sem alterar o projeto", () => {
  withProject({ narrative_script: "Texto pronto para sintetizar." }, (dir) => {
    const report = buildProjectHealthReport({
      workspaceDir: dir,
      projectDir: dir,
      projectName: "teste",
    });
    assert.equal(report.project.name, "teste");
    assert.ok(
      report.project.alerts.includes("Narracao aprovada sem MP3 master")
    );
  });
});
