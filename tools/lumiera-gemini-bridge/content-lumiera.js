(() => {
  const VERSION = "1.4.2";

  function announceReady() {
    try {
      document.documentElement.setAttribute("data-lumiera-gemini-bridge", VERSION);
      window.dispatchEvent(new CustomEvent("lumiera-gemini-bridge-ready", { detail: { version: VERSION } }));
    } catch {
      // ignore
    }
  }

  if (globalThis.__lumieraGeminiBridgeLoaded) {
    announceReady();
    return;
  }
  globalThis.__lumieraGeminiBridgeLoaded = true;

  const SOURCE = "lumiera-gemini-bridge";
  const CONTEXT_INVALIDATED_MSG =
    "Extensão recarregada — recarregue esta página do Lumiera (F5) e tente de novo.";

  function isExtensionContextValid() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  function postBridgeMessage(payload) {
    try {
      window.postMessage({ source: SOURCE, ...payload }, "*");
    } catch {
      // ignore
    }
  }

  function safeSendMessage(message, onDone) {
    if (!isExtensionContextValid()) {
      onDone(null, { message: CONTEXT_INVALIDATED_MSG });
      return;
    }

    try {
      chrome.runtime.sendMessage(message, (resp) => {
        const runtimeErr = chrome.runtime.lastError;
        if (runtimeErr?.message) {
          onDone(resp, runtimeErr);
          return;
        }
        onDone(resp, null);
      });
    } catch (err) {
      onDone(null, err);
    }
  }

  function normalizeProvider(value) {
    return value === "grok" ? "grok" : "gemini";
  }

  function handleAppMessage(event) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "lumiera-app") return;

    if (data.type === "LUMIERA_GEMINI_PING" || data.type === "LUMIERA_BROWSER_PING") {
      postBridgeMessage({
        type: "LUMIERA_GEMINI_PONG",
        requestId: data.requestId,
        ok: true,
        version: VERSION,
      });
      return;
    }

    if (data.type === "LUMIERA_GEMINI_QUERY" || data.type === "LUMIERA_BROWSER_QUERY") {
      const provider = normalizeProvider(data.provider || data.browser_provider || "gemini");
      safeSendMessage(
        {
          type: "LUMIERA_BROWSER_QUERY",
          provider,
          browser_provider: provider,
          prompt: data.prompt,
        },
        (resp, err) => {
          const errMsg = err?.message || resp?.error || "";
          postBridgeMessage({
            type: "LUMIERA_GEMINI_RESULT",
            requestId: data.requestId,
            ok: !errMsg && !!resp?.ok,
            text: resp?.text,
            provider: resp?.provider || provider,
            error: errMsg || undefined,
          });
        },
      );
    }
  }

  window.addEventListener("message", handleAppMessage);
  announceReady();
})();