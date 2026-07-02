const GEMINI_MATCH = "https://gemini.google.com/*";
const LUMIERA_MATCH = [
  "http://127.0.0.1:5176/*",
  "http://127.0.0.1:5173/*",
  "http://localhost:5176/*",
  "http://localhost:5173/*",
];

const EXT_VERSION = "2.1.0";

let cachedGeminiTabId = null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isNarrationPrompt(prompt) {
  const p = String(prompt || "");
  if (/LUMIERA_TASK:vpe/i.test(p)) return false;
  return /LUMIERA_TASK:script|narrative_script|Gerar narração/i.test(p);
}

function waitForTabComplete(tabId, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);

    const listener = (updatedId, info) => {
      if (updatedId === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }).catch(() => resolve());
  });
}

async function reinjectLumieraBridge() {
  try {
    const tabs = await chrome.tabs.query({ url: LUMIERA_MATCH });
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content-lumiera.js"],
        });
      } catch {
        // aba pode estar em carregamento
      }
    }
  } catch {
    // ignore
  }
}

async function findGeminiTab() {
  if (cachedGeminiTabId) {
    try {
      const tab = await chrome.tabs.get(cachedGeminiTabId);
      if (tab?.id && tab.url?.startsWith("https://gemini.google.com")) return tab.id;
    } catch {
      cachedGeminiTabId = null;
    }
  }
  const tabs = await chrome.tabs.query({ url: [GEMINI_MATCH] });
  const found = tabs.find((t) => t.id != null);
  if (found?.id) cachedGeminiTabId = found.id;
  return found?.id || null;
}

async function ensureGeminiTab() {
  const existing = await findGeminiTab();
  if (existing) return existing;

  const created = await chrome.tabs.create({ url: "https://gemini.google.com/app", active: false });
  cachedGeminiTabId = created.id;
  await waitForTabComplete(created.id);
  await sleep(800);
  return created.id;
}

async function pingGeminiTab(tabId) {
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: "LUMIERA_GEMINI_PING" });
    return !!resp?.ok;
  } catch {
    return false;
  }
}

async function injectGeminiScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-gemini.js"],
    });
  } catch {
    // manifest pode já ter injetado
  }
  await sleep(400);
}

async function ensureGeminiContentScript(tabId) {
  if (await pingGeminiTab(tabId)) return;

  await injectGeminiScript(tabId);
  if (await pingGeminiTab(tabId)) return;

  await chrome.tabs.reload(tabId);
  await waitForTabComplete(tabId);
  await sleep(600);
  await injectGeminiScript(tabId);

  if (!(await pingGeminiTab(tabId))) {
    throw new Error(
      "Gemini não conectou. Abra https://gemini.google.com/app no Chrome, faça login e tente de novo.",
    );
  }
}

function sendTabMessageWithTimeout(tabId, message, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout aguardando resposta do Gemini na aba (5 min)."));
    }, timeoutMs);
    chrome.tabs.sendMessage(tabId, message, (resp) => {
      clearTimeout(timer);
      const err = chrome.runtime.lastError;
      if (err?.message) {
        reject(new Error(err.message));
        return;
      }
      resolve(resp);
    });
  });
}

async function captureOnGeminiTab(tabId, session) {
  const cap = await sendTabMessageWithTimeout(
    tabId,
    { type: "LUMIERA_CAPTURE_SCRIPT", session },
    20000,
  );
  if (cap?.ok && cap?.text) return String(cap.text).trim();
  return "";
}

async function runNarrationPrompt(tabId, prompt) {
  await ensureGeminiContentScript(tabId);
  await injectGeminiScript(tabId);
  await chrome.tabs.update(tabId, { active: true });
  await sleep(400);

  const submit = await sendTabMessageWithTimeout(tabId, { type: "LUMIERA_SUBMIT_ONLY", prompt }, 90000);
  if (!submit?.ok || !submit?.session) {
    throw new Error(submit?.error || "Falha ao enviar prompt no Gemini.");
  }

  const session = submit.session;
  const deadline = Date.now() + 240000;
  let lastError = "Narração ainda não detectada no chat.";

  while (Date.now() < deadline) {
    await sleep(1200);
    await chrome.tabs.update(tabId, { active: true }).catch(() => {});
    try {
      const text = await captureOnGeminiTab(tabId, session);
      if (text.length > 200) return text;
      lastError = "Narração ainda não detectada no chat.";
    } catch (err) {
      lastError = String(err?.message || err);
      await injectGeminiScript(tabId);
    }
  }

  const last = await captureOnGeminiTab(tabId, { ...session, manual: true });
  if (last.length > 200) return last;

  throw new Error(
    `${lastError} Abra gemini.google.com, confira a resposta JSON e use Capturar do Gemini no Lumiera.`,
  );
}

async function runPromptOnTab(tabId, prompt) {
  if (isNarrationPrompt(prompt)) {
    return runNarrationPrompt(tabId, prompt);
  }

  await ensureGeminiContentScript(tabId);
  await injectGeminiScript(tabId);

  let previousTabId = null;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    previousTabId = activeTab?.id && activeTab.id !== tabId ? activeTab.id : null;
    await chrome.tabs.update(tabId, { active: true });
    await sleep(300);
  } catch {
    // segue mesmo se não conseguir focar a aba
  }

  try {
    const resp = await sendTabMessageWithTimeout(tabId, { type: "LUMIERA_RUN_PROMPT", prompt }, 200000);
    if (resp?.ok) return String(resp.text || "").trim();
    throw new Error(resp?.error || "Automação Gemini falhou.");
  } finally {
    if (previousTabId) {
      try {
        await chrome.tabs.update(previousTabId, { active: true });
      } catch {
        // ignore
      }
    }
  }
}

async function captureNarrationFromGemini() {
  const tabId = await ensureGeminiTab();
  await ensureGeminiContentScript(tabId);
  await chrome.tabs.update(tabId, { active: true });
  await sleep(300);
  const text = await captureOnGeminiTab(tabId, { manual: true, beforeTexts: [], beforeMessageCount: 0 });
  if (!text) {
    throw new Error("Não achei JSON com narrative_script no Gemini. Copie a resposta ou gere de novo.");
  }
  return text;
}

async function handleGeminiQuery(prompt) {
  const tabId = await ensureGeminiTab();
  return runPromptOnTab(tabId, prompt);
}

chrome.runtime.onStartup.addListener(() => {
  void reinjectLumieraBridge();
});

chrome.runtime.onInstalled.addListener(() => {
  void reinjectLumieraBridge();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "LUMIERA_GEMINI_PING") {
    sendResponse({ ok: true, version: EXT_VERSION });
    return;
  }
  if (message?.type === "LUMIERA_REINJECT_LUMIERA") {
    void reinjectLumieraBridge().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === "LUMIERA_GEMINI_CAPTURE") {
    (async () => {
      try {
        const text = await captureNarrationFromGemini();
        sendResponse({ ok: true, text });
      } catch (err) {
        cachedGeminiTabId = null;
        sendResponse({ ok: false, error: String(err?.message || err) });
      }
    })();
    return true;
  }
  if (message?.type !== "LUMIERA_GEMINI_QUERY") return;

  (async () => {
    try {
      const text = await handleGeminiQuery(message.prompt);
      sendResponse({ ok: true, text });
    } catch (err) {
      cachedGeminiTabId = null;
      const msg = String(err?.message || err);
      if (/receiving end does not exist|could not establish connection/i.test(msg)) {
        sendResponse({
          ok: false,
          error: "Aba do Gemini sem conexão. Abra gemini.google.com, faça login e tente de novo.",
        });
        return;
      }
      sendResponse({ ok: false, error: msg });
    }
  })();

  return true;
});