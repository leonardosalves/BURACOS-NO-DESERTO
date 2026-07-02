(() => {
  const VERSION = "2.1.1";

  const SOURCE = "lumiera-gemini-bridge";
  const CONTEXT_INVALIDATED_MSG =
    "Extensão recarregada — aguarde 2s e tente de novo (reconexão automática).";

  function announceReady() {
    try {
      document.documentElement.setAttribute("data-lumiera-gemini-bridge", VERSION);
      window.dispatchEvent(new CustomEvent("lumiera-gemini-bridge-ready", { detail: { version: VERSION } }));
    } catch {
      // ignore
    }
  }

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

  function handleAppMessage(event) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "lumiera-app") return;

    if (data.type === "LUMIERA_GEMINI_REINJECT") {
      safeSendMessage({ type: "LUMIERA_REINJECT_LUMIERA" }, (_resp, err) => {
        announceReady();
        postBridgeMessage({
          type: "LUMIERA_GEMINI_REINJECT_DONE",
          requestId: data.requestId,
          ok: !err,
          error: err?.message,
        });
      });
      return;
    }

    if (data.type === "LUMIERA_GEMINI_PING") {
      if (!isExtensionContextValid()) {
        postBridgeMessage({
          type: "LUMIERA_GEMINI_PONG",
          requestId: data.requestId,
          ok: false,
          error: CONTEXT_INVALIDATED_MSG,
        });
        return;
      }
      postBridgeMessage({
        type: "LUMIERA_GEMINI_PONG",
        requestId: data.requestId,
        ok: true,
        version: VERSION,
      });
      return;
    }

    if (data.type === "LUMIERA_GEMINI_QUERY" || data.type === "LUMIERA_GEMINI_CAPTURE") {
      safeSendMessage(
        { type: data.type, prompt: data.prompt },
        (resp, err) => {
          const errMsg = err?.message || resp?.error || "";
          postBridgeMessage({
            type: "LUMIERA_GEMINI_RESULT",
            requestId: data.requestId,
            ok: !errMsg && !!resp?.ok,
            text: resp?.text,
            error: errMsg || undefined,
          });
        },
      );
    }
  }

  if (globalThis.__lumieraGeminiBridgeHandler) {
    window.removeEventListener("message", globalThis.__lumieraGeminiBridgeHandler);
  }
  globalThis.__lumieraGeminiBridgeHandler = handleAppMessage;
  globalThis.__lumieraGeminiBridgeLoaded = true;
  window.addEventListener("message", handleAppMessage);
  announceReady();
})();