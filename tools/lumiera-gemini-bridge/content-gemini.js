(() => {
  if (globalThis.__lumieraGeminiContentLoaded) return;
  globalThis.__lumieraGeminiContentLoaded = true;

  const VERSION = "1.1.8";
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
      "rich-textarea div.ql-editor[contenteditable='true']",
      "div.ql-editor[contenteditable='true']",
      "rich-textarea div[contenteditable='true']",
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="prompt" i]',
      'div[contenteditable="true"][aria-label*="mensagem" i]',
      'div[contenteditable="true"][data-placeholder]',
      "textarea",
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
    const tooltip = (btn.getAttribute("mattooltip") || btn.getAttribute("matTooltip") || "").toLowerCase();
    const testId = (btn.getAttribute("data-test-id") || "").toLowerCase();
    const cls = (btn.className || "").toLowerCase();

    if (/stop|parar|cancel|menu|attachment|voice|microphone|mic|upload|arquivo|imagem|image|tools|ferrament/.test(label)) {
      return false;
    }

    if (
      /send|enviar|mandar|submit/.test(label)
      || /send|enviar|submit/.test(tooltip)
      || /send|submit/.test(testId)
      || cls.includes("send-button")
    ) {
      return true;
    }

    const icon = btn.querySelector("mat-icon, svg, i, [class*='icon']");
    const iconName = (
      icon?.getAttribute("data-mat-icon-name")
      || icon?.getAttribute("fonticon")
      || icon?.getAttribute("aria-label")
      || icon?.textContent
      || ""
    ).toLowerCase();

    return /send|arrow_upward|arrow-up|north|prompt/.test(iconName);
  }

  function findSendButton(nearInput) {
    const directSelectors = [
      "button.send-button",
      'button[aria-label*="Send" i]',
      'button[aria-label*="Enviar" i]',
      'button[mattooltip*="Send" i]',
      'button[matTooltip*="Send" i]',
      'button[data-test-id*="send" i]',
    ];

    for (const sel of directSelectors) {
      const btn = [...document.querySelectorAll(sel)].find(isSendCandidate);
      if (btn) return btn;
    }

    const scopes = [];
    if (nearInput) {
      let node = nearInput;
      for (let i = 0; i < 12 && node; i += 1) {
        scopes.push(node);
        node = node.parentElement;
      }
    }
    scopes.push(document);

    for (const scope of scopes) {
      const buttons = [...scope.querySelectorAll("button")].filter(isSendCandidate);
      if (buttons.length) return buttons[buttons.length - 1];
    }

    if (nearInput) {
      const inputRect = nearInput.getBoundingClientRect();
      const nearButtons = [...document.querySelectorAll("button")]
        .filter(isSendCandidate)
        .map((btn) => {
          const r = btn.getBoundingClientRect();
          const dx = Math.abs(r.left - inputRect.right);
          const dy = Math.abs(r.top - inputRect.bottom);
          return { btn, score: dx + dy };
        })
        .sort((a, b) => a.score - b.score);
      if (nearButtons.length) return nearButtons[0].btn;
    }

    return null;
  }

  function clickElement(el) {
    el.scrollIntoView({ block: "center", inline: "center" });
    const rect = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerId: 1, pointerType: "mouse" }));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerId: 1, pointerType: "mouse" }));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
    if (typeof el.click === "function") el.click();
  }

  function isGenerating() {
    if ([...document.querySelectorAll("button")].some((b) => {
      const label = (b.getAttribute("aria-label") || "").toLowerCase();
      return /stop|parar|cancelar/.test(label) && isVisible(b);
    })) return true;

    return [...document.querySelectorAll('[aria-busy="true"], mat-progress-spinner, [class*="streaming"]')]
      .some(isVisible);
  }

  function collectModelTexts() {
    const blocks = [];
    for (const sel of ["message-content", '[data-message-author-role="model"]', ".markdown", "model-response"]) {
      document.querySelectorAll(sel).forEach((n) => {
        const t = (n.innerText || "").trim();
        if (t.length > 15) blocks.push(t);
      });
      if (blocks.length) break;
    }
    return [...new Set(blocks)];
  }

  async function pasteText(el, text) {
    el.focus();
    el.click();
    await sleep(80);

    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const pasted = el.dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      }));
      if (pasted !== false && getInputText(el).length > 0) return true;
    } catch {
      // ignore
    }

    return false;
  }

  async function fillInput(el, text) {
    el.focus();
    el.click();
    await sleep(120);

    if (el.isContentEditable) {
      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("delete", false, null);
      } catch {
        // ignore
      }

      const pasted = await pasteText(el, text);
      if (!pasted) {
        if (el.classList.contains("ql-editor")) {
          el.innerHTML = `<p>${text.replace(/</g, "&lt;")}</p>`;
        } else {
          el.textContent = text;
        }
        el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertFromPaste", data: text }));
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste", data: text }));
      }

      try {
        document.execCommand("insertText", false, text);
      } catch {
        // ignore
      }
    } else {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc?.set) desc.set.call(el, text);
      else el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    await sleep(500);

    if (getInputText(el).length < Math.min(text.length, 8)) {
      await pasteText(el, text);
      await sleep(400);
    }
  }

  async function waitForSendButton(input, maxMs = 8000) {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      const btn = findSendButton(input);
      if (btn && isBtnEnabled(btn)) return btn;
      await sleep(200);
    }
    const fallback = findSendButton(input);
    return fallback && isBtnEnabled(fallback) ? fallback : null;
  }

  async function pressKey(input, key, extra = {}) {
    input.focus();
    const opts = {
      key,
      code: key,
      keyCode: key === "Enter" ? 13 : 0,
      which: key === "Enter" ? 13 : 0,
      bubbles: true,
      cancelable: true,
      ...extra,
    };
    input.dispatchEvent(new KeyboardEvent("keydown", opts));
    input.dispatchEvent(new KeyboardEvent("keypress", opts));
    input.dispatchEvent(new KeyboardEvent("keyup", opts));
    await sleep(350);
  }

  async function trySubmit(input) {
    const sendBtn = await waitForSendButton(input);
    if (sendBtn) {
      clickElement(sendBtn);
      await sleep(700);
      if (isGenerating()) return true;
    }

    await pressKey(input, "Enter");
    if (isGenerating()) return true;

    await pressKey(input, "Enter", { ctrlKey: true });
    if (isGenerating()) return true;

    const retryBtn = findSendButton(input);
    if (retryBtn && isBtnEnabled(retryBtn)) {
      clickElement(retryBtn);
      await sleep(700);
      if (isGenerating()) return true;
    }

    return isGenerating();
  }

  async function submitPrompt(prompt) {
    const input = findInput();
    if (!input) {
      throw new Error("Campo do Gemini não encontrado. Abra https://gemini.google.com/app logado.");
    }

    const before = collectModelTexts();
    await fillInput(input, prompt);

    const inputLen = getInputText(input).length;
    if (inputLen < 3) {
      throw new Error(
        "O Gemini não reconheceu o texto no campo. "
        + "Deixe gemini.google.com visível, clique no campo uma vez e tente de novo.",
      );
    }

    const sent = await trySubmit(input);
    if (!sent) {
      const btn = findSendButton(input);
      const btnState = btn
        ? `botão=${btn.getAttribute("aria-label") || "sem-label"}, habilitado=${isBtnEnabled(btn)}`
        : "botão não encontrado";
      throw new Error(
        `Não consegui enviar no Gemini (${btnState}, texto=${inputLen} chars). `
        + "Recarregue a extensão, F5 no Lumiera e deixe gemini.google.com aberto.",
      );
    }

    const deadline = Date.now() + 90000;
    let lastCandidate = "";
    let stableHits = 0;

    while (Date.now() < deadline) {
      await sleep(450);

      if (isGenerating()) {
        stableHits = 0;
        continue;
      }

      const blocks = collectModelTexts();
      const fresh = blocks.filter((b) => !before.includes(b));
      const candidate = fresh[fresh.length - 1] || blocks[blocks.length - 1];
      if (!candidate || candidate.length < 20) continue;

      if (candidate === lastCandidate) {
        stableHits += 1;
        if (stableHits >= 1) return candidate;
      } else {
        lastCandidate = candidate;
        stableHits = 0;
      }
    }

    if (lastCandidate.length > 20) return lastCandidate;
    throw new Error("Timeout aguardando resposta do Gemini (90s).");
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "LUMIERA_GEMINI_PING") {
      sendResponse({ ok: true, version: VERSION });
      return;
    }
    if (message?.type !== "LUMIERA_RUN_PROMPT") return;

    submitPrompt(String(message.prompt || ""))
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  });
})();