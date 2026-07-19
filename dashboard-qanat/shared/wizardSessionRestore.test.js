import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Espelha a lógica de wizardSession.ts (frontend) para teste no runner do backend.
function shouldRestoreWizardTab(session) {
  if (!session) return false;
  const step = Number(session.creatorStep || 1);
  if (session.showNarrationReview) return true;
  if (step > 1) return true;
  if (session.activeTab === "creator" && session.wasInWizard === true)
    return true;
  return false;
}

function resolveInitialActiveTab(session, restorableTabs, persistedTab = "") {
  const normalizeRetiredTab = (value) =>
    value === "scene-timing" ? "editor" : value;
  const fromKey = normalizeRetiredTab(String(persistedTab || "").trim());
  if (fromKey && restorableTabs.includes(fromKey)) return fromKey;

  const saved = normalizeRetiredTab(String(session?.activeTab || "").trim());
  if (saved && restorableTabs.includes(saved)) return saved;

  if (shouldRestoreWizardTab(session)) return "creator";
  return "home";
}

const TABS = ["home", "creator", "editor", "timeline"];

describe("wizardSession restore", () => {
  it("sessão antiga do Editor de Timing migra para o Editor", () => {
    const tab = resolveInitialActiveTab(
      {
        wasInWizard: true,
        activeTab: "creator",
        creatorProjectName: "Google_Maps_Hides_This",
        creatorStep: 1,
        generatedScriptData: { blocks: [] },
      },
      TABS,
      "scene-timing"
    );
    assert.equal(tab, "editor");
  });

  it("restaura creator só quando wasInWizard e passo > 1", () => {
    assert.equal(
      resolveInitialActiveTab(
        { wasInWizard: true, activeTab: "creator", creatorStep: 3 },
        TABS,
        ""
      ),
      "creator"
    );
    assert.equal(
      shouldRestoreWizardTab({
        creatorProjectName: "X",
        generatedScriptData: {},
      }),
      false
    );
  });

  it("honra activeTab salvo na sessão", () => {
    assert.equal(
      resolveInitialActiveTab(
        { activeTab: "editor", wasInWizard: false, creatorStep: 1 },
        TABS,
        ""
      ),
      "editor"
    );
  });
});
