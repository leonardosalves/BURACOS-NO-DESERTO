(() => {
  const VERSION = "1.4.1";
  if (globalThis.__lumieraGrokVersion === VERSION) return;
  globalThis.__lumieraGrokVersion = VERSION;
  if (globalThis.__lumieraGrokMessageHandler) {
    try {
      chrome.runtime.onMessage.removeListener(globalThis.__lumieraGrokMessageHandler);
    } catch {
      // ignore
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
  }

  function isBtnEnabled(btn) {
    if (!btn || btn.disabled) return false;
    if (btn.getAttribute("aria-disabled") === "true") return false;
    return isVisible(btn);
  }

  function getInputText(el) {
    if (!el) return "";
    if (el.isContentEditable) return (el.innerText || el.textContent || "").trim();
    return String(el.value || "").trim();
  }

  function findInput() {
    const selectors = [
      "textarea[placeholder]",
      'textarea[aria-label*="message" i]',
      'textarea[aria-label*="ask" i]',
      'textarea[aria-label*="grok" i]',
      "textarea",
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
    ];
    for (const sel of selectors) {
      const el = [...document.querySelectorAll(sel)].find(isVisible);
      if (el) return el;
    }
    return null;
  }

  function isSendCandidate(btn) {
    if (!isBtnEnabled(btn)) return false;
    const label = (btn.getAttribute("aria-label") || "").toLowerCase();
    const title = (btn.getAttribute("title") || "").toLowerCase();
    const testId = (btn.getAttribute("data-testid") || "").toLowerCase();
    const combined = `${label} ${title} ${testId}`;
    if (/attach|upload|mic|voice|menu|settings|share|copy|regenerate/.test(combined)) return false;
    if (/send|submit|ask|enviar|mandar/.test(combined)) return true;
    const icon = btn.querySelector("svg, [class*='icon']");
    const iconText = (icon?.getAttribute("aria-label") || icon?.textContent || "").toLowerCase();
    return /send|arrow|north|up/.test(iconText);
  }

  function findSendButton(nearInput) {
    const direct = [
      'button[aria-label*="Send" i]',
      'button[aria-label*="Ask" i]',
      'button[aria-label*="Enviar" i]',
      'button[data-testid*="send" i]',
      'button[type="submit"]',
    ];
    for (const sel of direct) {
      const btn = [...document.querySelectorAll(sel)].find(isSendCandidate);
      if (btn) return btn;
    }

    const scopes = [];
    if (nearInput) {
      let node = nearInput;
      for (let i = 0; i < 10 && node; i += 1) {
        scopes.push(node);
        node = node.parentElement;
      }
    }
    scopes.push(document);

    for (const scope of scopes) {
      const buttons = [...scope.querySelectorAll("button")].filter(isSendCandidate);
      if (buttons.length) return buttons[buttons.length - 1];
    }
    return null;
  }

  function clickElement(el) {
    el.scrollIntoView({ block: "center", inline: "center" });
    if (typeof el.click === "function") el.click();
  }

  function isGenerating() {
    const stopLabels = [...document.querySelectorAll("button")].map((b) => (
      (b.getAttribute("aria-label") || b.getAttribute("title") || "").toLowerCase()
    ));
    if (stopLabels.some((t) => /stop|cancel|parar|interromper/.test(t))) return true;
    return [...document.querySelectorAll("[class*='loading'], [class*='spinner'], [aria-busy='true']")]
      .some(isVisible);
  }

  function isUserNode(node) {
    if (!node) return false;
    const role = (node.getAttribute?.("data-role") || node.getAttribute?.("data-message-role") || "").toLowerCase();
    if (role === "user") return true;
    const cls = String(node.className || "").toLowerCase();
    return /user-message|message-user|prompt/.test(cls);
  }

  function collectAssistantTexts() {
    const blocks = [];
    const seen = new Set();
    const push = (text) => {
      const t = String(text || "").trim();
      if (t.length <= 20 || seen.has(t)) return;
      seen.add(t);
      blocks.push(t);
    };

    const selectors = [
      '[data-role="assistant"]',
      '[data-message-role="assistant"]',
      '[class*="assistant-message"]',
      '[class*="response-message"]',
      "article",
      ".markdown",
      ".prose",
      '[class*="markdown"]',
      '[class*="prose"]',
    ];

    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((node) => {
        if (isUserNode(node)) return;
        if (node.closest("form, textarea, [contenteditable='true']")) return;
        push(node.innerText || node.textContent);
      });
    }

    return blocks;
  }

  function getLatestAssistantText(beforeTexts) {
    const fresh = collectAssistantTexts().filter((t) => !beforeTexts.includes(t));
    if (!fresh.length) return "";
    return fresh.reduce((best, t) => (t.length > best.length ? t : best), "");
  }

  async function fillInput(input, text) {
    input.focus();
    await sleep(120);
    if (input.isContentEditable) {
      input.innerHTML = "";
      input.textContent = text;
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
    } else {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      if (setter) setter.call(input, text);
      else input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await sleep(250);
  }

  async function trySubmit(input) {
    const sendBtn = findSendButton(input);
    if (sendBtn) {
      clickElement(sendBtn);
      await sleep(700);
      if (isGenerating()) return true;
    }

    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
    }));
    await sleep(700);
    return isGenerating();
  }

  async function submitPrompt(prompt) {
    const input = findInput();
    if (!input) {
      throw new Error("Campo do Grok não encontrado. Abra https://grok.com logado.");
    }

    const before = collectAssistantTexts();
    const startedAt = Date.now();
    await fillInput(input, prompt);

    if (getInputText(input).length < 3) {
      throw new Error("O Grok não reconheceu o texto no campo. Clique no campo em grok.com e tente de novo.");
    }

    const sent = await trySubmit(input);
    if (!sent) {
      throw new Error("Não consegui enviar no Grok. Deixe grok.com aberto e tente de novo.");
    }

    const deadline = Date.now() + 150000;
    let lastCandidate = "";
    let stableHits = 0;

    while (Date.now() < deadline) {
      await sleep(500);
      if (Date.now() - startedAt < 2000) continue;
      const candidate = getLatestAssistantText(before);
      if (!candidate || candidate.length < 40) continue;
      if (candidate === lastCandidate) {
        stableHits += 1;
        if (stableHits >= 2 && !isGenerating()) return candidate;
      } else {
        lastCandidate = candidate;
        stableHits = 0;
      }
    }

    if (lastCandidate.length >= 40) return lastCandidate;
    throw new Error("Timeout aguardando resposta do Grok (150s).");
  }

  globalThis.__lumieraGrokMessageHandler = (message, _sender, sendResponse) => {
    if (message?.type === "LUMIERA_GROK_PING") {
      sendResponse({ ok: true, version: VERSION });
      return;
    }
    if (message?.type !== "LUMIERA_RUN_PROMPT") return;

    submitPrompt(String(message.prompt || ""))
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  };

  chrome.runtime.onMessage.addListener(globalThis.__lumieraGrokMessageHandler);
})();