const GEMINI_MATCH = "https://gemini.google.com/*";
let cachedGeminiTabId = null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function runPromptOnTab(tabId, prompt) {
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
    const resp = await chrome.tabs.sendMessage(tabId, { type: "LUMIERA_RUN_PROMPT", prompt });
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "LUMIERA_GEMINI_PING") {
    sendResponse({ ok: true, version: "1.4.2" });
    return;
  }
  if (message?.type !== "LUMIERA_GEMINI_QUERY") return;

  (async () => {
    try {
      const tabId = await ensureGeminiTab();
      const text = await runPromptOnTab(tabId, message.prompt);
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