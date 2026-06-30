const EXT_VERSION = "1.4.1";

const PROVIDERS = {
  gemini: {
    match: "https://gemini.google.com/*",
    url: "https://gemini.google.com/app",
    script: "content-gemini.js",
    pingType: "LUMIERA_GEMINI_PING",
    hostPrefix: "https://gemini.google.com",
    label: "Gemini",
  },
  grok: {
    match: "https://grok.com/*",
    url: "https://grok.com",
    script: "content-grok.js",
    pingType: "LUMIERA_GROK_PING",
    hostPrefix: "https://grok.com",
    label: "Grok",
  },
};

const tabCache = { gemini: null, grok: null };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeProvider(value) {
  return value === "grok" ? "grok" : "gemini";
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

async function findProviderTab(providerKey) {
  const provider = PROVIDERS[providerKey];
  const cachedId = tabCache[providerKey];
  if (cachedId) {
    try {
      const tab = await chrome.tabs.get(cachedId);
      if (tab?.id && tab.url?.startsWith(provider.hostPrefix)) return tab.id;
    } catch {
      tabCache[providerKey] = null;
    }
  }
  const tabs = await chrome.tabs.query({ url: [provider.match] });
  const found = tabs.find((t) => t.id != null);
  if (found?.id) tabCache[providerKey] = found.id;
  return found?.id || null;
}

async function ensureProviderTab(providerKey) {
  const provider = PROVIDERS[providerKey];
  const existing = await findProviderTab(providerKey);
  if (existing) return existing;

  const created = await chrome.tabs.create({ url: provider.url, active: false });
  tabCache[providerKey] = created.id;
  await waitForTabComplete(created.id);
  await sleep(800);
  return created.id;
}

async function pingProviderTab(providerKey, tabId) {
  const provider = PROVIDERS[providerKey];
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: provider.pingType });
    return !!resp?.ok;
  } catch {
    return false;
  }
}

async function injectProviderScript(providerKey, tabId) {
  const provider = PROVIDERS[providerKey];
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [provider.script],
    });
  } catch {
    // manifest pode já ter injetado
  }
  await sleep(400);
}

async function ensureProviderContentScript(providerKey, tabId) {
  const provider = PROVIDERS[providerKey];
  if (await pingProviderTab(providerKey, tabId)) return;

  await injectProviderScript(providerKey, tabId);
  if (await pingProviderTab(providerKey, tabId)) return;

  await chrome.tabs.reload(tabId);
  await waitForTabComplete(tabId);
  await sleep(600);
  await injectProviderScript(providerKey, tabId);

  if (!(await pingProviderTab(providerKey, tabId))) {
    throw new Error(
      `${provider.label} não conectou. Abra ${provider.url} no Chrome, faça login e tente de novo.`,
    );
  }
}

async function runPromptOnTab(providerKey, tabId, prompt) {
  await ensureProviderContentScript(providerKey, tabId);
  await injectProviderScript(providerKey, tabId);

  let previousTabId = null;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    previousTabId = activeTab?.id && activeTab.id !== tabId ? activeTab.id : null;
    await chrome.tabs.update(tabId, { active: true });
    await sleep(600);
  } catch {
    // segue mesmo se não conseguir focar a aba
  }

  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: "LUMIERA_RUN_PROMPT", prompt });
    if (resp?.ok) return String(resp.text || "").trim();
    throw new Error(resp?.error || `Automação ${PROVIDERS[providerKey].label} falhou.`);
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

async function runBrowserQuery(providerKey, prompt) {
  const key = normalizeProvider(providerKey);
  try {
    const tabId = await ensureProviderTab(key);
    return await runPromptOnTab(key, tabId, prompt);
  } catch (err) {
    tabCache[key] = null;
    throw err;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "LUMIERA_GEMINI_PING") {
    sendResponse({ ok: true, version: EXT_VERSION, providers: ["gemini", "grok"] });
    return;
  }

  const provider = normalizeProvider(message?.provider || message?.browser_provider || "gemini");
  const isQuery = message?.type === "LUMIERA_GEMINI_QUERY" || message?.type === "LUMIERA_BROWSER_QUERY";

  if (!isQuery) return;

  (async () => {
    try {
      const text = await runBrowserQuery(provider, message.prompt);
      sendResponse({ ok: true, text, provider });
    } catch (err) {
      const msg = String(err?.message || err);
      if (/receiving end does not exist|could not establish connection/i.test(msg)) {
        sendResponse({
          ok: false,
          error: `Aba do ${PROVIDERS[provider].label} sem conexão. Abra o chat no Chrome e tente de novo.`,
        });
        return;
      }
      sendResponse({ ok: false, error: msg });
    }
  })();

  return true;
});