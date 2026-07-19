import type { EditorialIdeaImport } from "./creatorEditorialImport";
import type { HistoricalWitnessContext } from "./historicalWitnessTypes";
import type { CreatorIdeationMode } from "./creatorModeIdentity";

export const WIZARD_SESSION_KEY = "qanat_wizard_session";
export const LEGACY_CREATOR_STATE_KEY = "qanat_creator_state";
export const WORKSPACE_TAB_KEY = "qanat_active_tab";
export const WORKSPACE_PROJECT_KEY = "qanat_active_project";
export const WIZARD_SESSION_VERSION = 2;

export type WizardSession = {
  version: number;
  savedAt: string;
  wasInWizard: boolean;
  activeTab: string;
  activeProject: string;
  creatorStep: number;
  nicheInput: string;
  formatSelector: "LONGO" | "SHORTS";
  ideasData: unknown;
  selectedIdeaIndex: number;
  generatedScriptData: unknown;
  creatorProjectName: string;
  creatorScript: string;
  ideationTab: CreatorIdeationMode;
  historicalWitnessContext?: HistoricalWitnessContext | null;
  customTitle: string;
  customHooks: string;
  customOutline: string;
  customBlocks: { block: number; content: string }[];
  customIdeaTitle: string;
  customIdeaPromise: string;
  customIdeaHook: string;
  customIdeaEmotion: string;
  customIdeaBlocks: string;
  listNiche: string;
  listTopic: string;
  rankCount: number;
  rankOrder: "desc" | "asc";
  listicleHudStyle: "full" | "compact" | "auto";
  listicleIdeasData: unknown;
  listicleSearchNiche: string;
  ideasSearchNiche: string;
  selectedListicleIdeaIndex: number;
  showNarrationReview: boolean;
  narrationDraft: string;
  narrationTaggedDraft: string;
  narrationStrategy: unknown;
  narrationBlockPhrases: { block: number; phrase: string }[];
  narrationBlockScript: string;
  narrationNotebooklmEnriched: boolean;
  narrationProjectName: string;
  notebooklmSession?: unknown;
  useNotebooklm: boolean;
  notebooklmDeep: boolean;
  useDeepResearch: boolean;
  enablePov?: boolean;
  motionTemplatePackEnabled?: boolean;
  motionTemplateNiche?: string;
  motionTemplateIds?: string[];
  uploadedScenes: Record<string, boolean>;
  expandedBlocks: Record<number, boolean>;
  editorialIdeaImport?: EditorialIdeaImport | null;
};

export type WizardSessionPatch = Partial<Omit<WizardSession, "version">> & {
  savedAt?: string;
};

const EMPTY_BLOCKS = [{ block: 1, content: "" }];

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadWizardSession(): WizardSessionPatch | null {
  const modern = parseJson<WizardSessionPatch>(
    localStorage.getItem(WIZARD_SESSION_KEY)
  );
  const legacy = parseJson<WizardSessionPatch>(
    localStorage.getItem(LEGACY_CREATOR_STATE_KEY)
  );
  const merged = { ...(legacy || {}), ...(modern || {}) };
  if (!Object.keys(merged).length) return null;
  return merged;
}

/** Só força o wizard quando não há aba de workspace salva — evita F5 cair no passo 1. */
export function shouldRestoreWizardTab(
  session: WizardSessionPatch | null
): boolean {
  if (!session) return false;
  const step = Number(session.creatorStep || 1);
  if (session.showNarrationReview) return true;
  if (step > 1) return true;
  if (session.activeTab === "creator" && session.wasInWizard === true)
    return true;
  return false;
}

export function readPersistedWorkspaceTab(): string {
  if (typeof localStorage === "undefined") return "";
  return (
    String(localStorage.getItem(WORKSPACE_TAB_KEY) || "").trim() ||
    String(loadWizardSession()?.activeTab || "").trim()
  );
}

export function readPersistedWorkspaceProject(): string {
  if (typeof localStorage === "undefined") return "";
  return (
    String(localStorage.getItem(WORKSPACE_PROJECT_KEY) || "").trim() ||
    String(loadWizardSession()?.activeProject || "").trim()
  );
}

export function resolveInitialActiveTab(
  session: WizardSessionPatch | null,
  restorableTabs: readonly string[]
): string {
  const normalizeRetiredTab = (value: string) =>
    value === "scene-timing" ? "editor" : value;
  const fromKey = normalizeRetiredTab(readPersistedWorkspaceTab());
  if (fromKey && restorableTabs.includes(fromKey)) return fromKey;

  const saved = normalizeRetiredTab(String(session?.activeTab || "").trim());
  if (saved && restorableTabs.includes(saved)) return saved;

  if (shouldRestoreWizardTab(session)) return "creator";
  return "home";
}

export function resolveInitialActiveProject(
  session: WizardSessionPatch | null
): string {
  const fromKey = readPersistedWorkspaceProject();
  if (fromKey) return fromKey;

  const fromSession = String(session?.activeProject || "").trim();
  if (fromSession) return fromSession;

  return resolveWizardActiveProject(session) || "Buracos no Deserto";
}

export function resolveWizardActiveProject(
  session: WizardSessionPatch | null
): string {
  if (!session) return "";
  return String(
    session.narrationProjectName ||
      session.creatorProjectName ||
      session.activeProject ||
      ""
  ).trim();
}

export function saveWizardSession(patch: WizardSessionPatch): WizardSession {
  const prev = loadWizardSession() || {};
  const payload: WizardSession = {
    version: WIZARD_SESSION_VERSION,
    savedAt: new Date().toISOString(),
    wasInWizard: patch.wasInWizard ?? prev.wasInWizard ?? false,
    activeTab: patch.activeTab ?? prev.activeTab ?? "home",
    activeProject: patch.activeProject ?? prev.activeProject ?? "",
    creatorStep: patch.creatorStep ?? prev.creatorStep ?? 1,
    nicheInput: patch.nicheInput ?? prev.nicheInput ?? "",
    formatSelector: patch.formatSelector ?? prev.formatSelector ?? "LONGO",
    ideasData:
      patch.ideasData !== undefined
        ? patch.ideasData
        : (prev.ideasData ?? null),
    selectedIdeaIndex: patch.selectedIdeaIndex ?? prev.selectedIdeaIndex ?? -1,
    generatedScriptData:
      patch.generatedScriptData !== undefined
        ? patch.generatedScriptData
        : (prev.generatedScriptData ?? null),
    creatorProjectName:
      patch.creatorProjectName ?? prev.creatorProjectName ?? "",
    creatorScript: patch.creatorScript ?? prev.creatorScript ?? "",
    ideationTab: patch.ideationTab ?? prev.ideationTab ?? "ai",
    historicalWitnessContext:
      patch.historicalWitnessContext !== undefined
        ? patch.historicalWitnessContext
        : (prev.historicalWitnessContext ?? null),
    customTitle: patch.customTitle ?? prev.customTitle ?? "",
    customHooks: patch.customHooks ?? prev.customHooks ?? "",
    customOutline: patch.customOutline ?? prev.customOutline ?? "",
    customBlocks: patch.customBlocks ?? prev.customBlocks ?? EMPTY_BLOCKS,
    customIdeaTitle: patch.customIdeaTitle ?? prev.customIdeaTitle ?? "",
    customIdeaPromise: patch.customIdeaPromise ?? prev.customIdeaPromise ?? "",
    customIdeaHook: patch.customIdeaHook ?? prev.customIdeaHook ?? "",
    customIdeaEmotion: patch.customIdeaEmotion ?? prev.customIdeaEmotion ?? "",
    customIdeaBlocks: patch.customIdeaBlocks ?? prev.customIdeaBlocks ?? "",
    listNiche: patch.listNiche ?? prev.listNiche ?? "",
    listTopic: patch.listTopic ?? prev.listTopic ?? "",
    rankCount: patch.rankCount ?? prev.rankCount ?? 20,
    rankOrder: patch.rankOrder ?? prev.rankOrder ?? "desc",
    listicleHudStyle: patch.listicleHudStyle ?? prev.listicleHudStyle ?? "auto",
    listicleIdeasData:
      patch.listicleIdeasData !== undefined
        ? patch.listicleIdeasData
        : (prev.listicleIdeasData ?? null),
    listicleSearchNiche:
      patch.listicleSearchNiche ?? prev.listicleSearchNiche ?? "",
    ideasSearchNiche: patch.ideasSearchNiche ?? prev.ideasSearchNiche ?? "",
    selectedListicleIdeaIndex:
      patch.selectedListicleIdeaIndex ?? prev.selectedListicleIdeaIndex ?? -1,
    showNarrationReview:
      patch.showNarrationReview ?? prev.showNarrationReview ?? false,
    narrationDraft: patch.narrationDraft ?? prev.narrationDraft ?? "",
    narrationTaggedDraft:
      patch.narrationTaggedDraft ?? prev.narrationTaggedDraft ?? "",
    narrationStrategy:
      patch.narrationStrategy !== undefined
        ? patch.narrationStrategy
        : (prev.narrationStrategy ?? null),
    narrationBlockPhrases:
      patch.narrationBlockPhrases ?? prev.narrationBlockPhrases ?? [],
    narrationBlockScript:
      patch.narrationBlockScript ?? prev.narrationBlockScript ?? "",
    narrationNotebooklmEnriched:
      patch.narrationNotebooklmEnriched ??
      prev.narrationNotebooklmEnriched ??
      false,
    narrationProjectName:
      patch.narrationProjectName ?? prev.narrationProjectName ?? "",
    notebooklmSession:
      patch.notebooklmSession !== undefined
        ? patch.notebooklmSession
        : (prev.notebooklmSession ?? null),
    useNotebooklm: patch.useNotebooklm ?? prev.useNotebooklm ?? false,
    notebooklmDeep: patch.notebooklmDeep ?? prev.notebooklmDeep ?? false,
    useDeepResearch: patch.useDeepResearch ?? prev.useDeepResearch ?? true,
    uploadedScenes: patch.uploadedScenes ?? prev.uploadedScenes ?? {},
    expandedBlocks: patch.expandedBlocks ?? prev.expandedBlocks ?? { 1: true },
    editorialIdeaImport:
      patch.editorialIdeaImport !== undefined
        ? patch.editorialIdeaImport
        : (prev.editorialIdeaImport ?? null),
  };
  const serialized = JSON.stringify(payload);
  localStorage.setItem(WIZARD_SESSION_KEY, serialized);
  localStorage.setItem(LEGACY_CREATOR_STATE_KEY, serialized);
  if (payload.activeTab) {
    localStorage.setItem(WORKSPACE_TAB_KEY, payload.activeTab);
  }
  if (payload.activeProject) {
    localStorage.setItem(WORKSPACE_PROJECT_KEY, payload.activeProject);
  }
  return payload;
}

export function clearWizardSession(): void {
  localStorage.removeItem(WIZARD_SESSION_KEY);
  localStorage.removeItem(LEGACY_CREATOR_STATE_KEY);
  localStorage.removeItem(WORKSPACE_TAB_KEY);
}

/** Sessão zerada — substitui localStorage por completo (sem merge com estado anterior). */
export function buildEmptyWizardSession(activeTab = "creator"): WizardSession {
  return {
    version: WIZARD_SESSION_VERSION,
    savedAt: new Date().toISOString(),
    wasInWizard: false,
    activeTab,
    activeProject: "",
    creatorStep: 1,
    nicheInput: "",
    formatSelector: "LONGO",
    ideasData: null,
    selectedIdeaIndex: -1,
    generatedScriptData: null,
    creatorProjectName: "",
    creatorScript: "",
    ideationTab: "ai",
    historicalWitnessContext: null,
    customTitle: "",
    customHooks: "",
    customOutline: "",
    customBlocks: EMPTY_BLOCKS,
    customIdeaTitle: "",
    customIdeaPromise: "",
    customIdeaHook: "",
    customIdeaEmotion: "",
    customIdeaBlocks: "",
    listNiche: "",
    listTopic: "",
    rankCount: 20,
    rankOrder: "desc",
    listicleHudStyle: "auto",
    listicleIdeasData: null,
    listicleSearchNiche: "",
    ideasSearchNiche: "",
    selectedListicleIdeaIndex: -1,
    showNarrationReview: false,
    narrationDraft: "",
    narrationTaggedDraft: "",
    narrationStrategy: null,
    narrationBlockPhrases: [],
    narrationBlockScript: "",
    narrationNotebooklmEnriched: false,
    narrationProjectName: "",
    notebooklmSession: null,
    useNotebooklm: false,
    notebooklmDeep: false,
    useDeepResearch: true,
    uploadedScenes: {},
    expandedBlocks: { 1: true },
    editorialIdeaImport: null,
  };
}

export function resetWizardSessionStorage(
  activeTab = "creator"
): WizardSession {
  const payload = buildEmptyWizardSession(activeTab);
  const serialized = JSON.stringify(payload);
  localStorage.setItem(WIZARD_SESSION_KEY, serialized);
  localStorage.setItem(LEGACY_CREATOR_STATE_KEY, serialized);
  return payload;
}

export function isServerSessionNewer(
  localSession: WizardSessionPatch | null,
  serverSavedAt?: string | null
): boolean {
  if (!serverSavedAt) return false;
  const localAt = localSession?.savedAt ? Date.parse(localSession.savedAt) : 0;
  const serverAt = Date.parse(serverSavedAt);
  return Number.isFinite(serverAt) && serverAt > localAt + 500;
}

export function formatWizardSavedAt(savedAt?: string): string {
  if (!savedAt) return "";
  try {
    return new Date(savedAt).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
