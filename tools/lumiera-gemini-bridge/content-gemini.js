(() => {
  const VERSION = "1.5.1";
  if (globalThis.__lumieraGeminiVersion === VERSION) return;
  globalThis.__lumieraGeminiVersion = VERSION;
  if (globalThis.__lumieraGeminiMessageHandler) {
    try {
      chrome.runtime.onMessage.removeListener(globalThis.__lumieraGeminiMessageHandler);
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

  function queryDeepAll(root, selector) {
    const results = [];
    const seen = new Set();
    const walk = (node) => {
      if (!node || seen.has(node)) return;
      seen.add(node);
      if (node.querySelectorAll) {
        node.querySelectorAll(selector).forEach((el) => results.push(el));
      }
      if (node.shadowRoot) walk(node.shadowRoot);
      if (node.children) {
        [...node.children].forEach((child) => walk(child));
      }
    };
    walk(root);
    return results;
  }

  function scoreInputCandidate(el) {
    if (!el || !isVisible(el)) return -1;
    let score = 0;
    if (el.isContentEditable) score += 40;
    if (el.classList?.contains("ql-editor")) score += 50;
    if (el.closest?.("rich-textarea, input-area, chat-input")) score += 30;
    const role = (el.getAttribute("role") || "").toLowerCase();
    if (role === "textbox") score += 20;
    const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("data-placeholder") || ""}`.toLowerCase();
    if (/prompt|mensagem|message|ask|digite|enter/.test(label)) score += 15;
    if (el.tagName === "TEXTAREA") score += 25;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight * 0.45) score += 10;
    return score;
  }

  function findInput() {
    const selectors = [
      "rich-textarea div.ql-editor[contenteditable='true']",
      "div.ql-editor[contenteditable='true']",
      "rich-textarea div[contenteditable='true']",
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="prompt" i]',
      'div[contenteditable="true"][aria-label*="mensagem" i]',
      'div[contenteditable="true"][aria-label*="message" i]',
      'div[contenteditable="true"][data-placeholder]',
      "textarea",
      'div[contenteditable="true"]',
    ];

    const candidates = [];
    for (const sel of selectors) {
      queryDeepAll(document, sel).forEach((el) => {
        const score = scoreInputCandidate(el);
        if (score >= 0) candidates.push({ el, score });
      });
    }

    document.querySelectorAll("rich-textarea, input-area").forEach((host) => {
      if (host.shadowRoot) {
        [...host.shadowRoot.querySelectorAll("div.ql-editor, [contenteditable='true'], textarea")]
          .forEach((el) => {
            const score = scoreInputCandidate(el);
            if (score >= 0) candidates.push({ el, score });
          });
      }
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.el || null;
  }

  function focusInputChain(el) {
    if (!el) return;
    const chain = [];
    let node = el;
    for (let i = 0; i < 8 && node; i += 1) {
      chain.push(node);
      node = node.parentElement;
    }
    chain.reverse().forEach((n) => {
      if (typeof n.focus === "function") n.focus();
      if (typeof n.click === "function") n.click();
    });
    el.focus();
    el.click();
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

  function isStopResponseButton(btn) {
    if (!btn || !isVisible(btn)) return false;
    const label = (btn.getAttribute("aria-label") || "").toLowerCase();
    const tooltip = (btn.getAttribute("mattooltip") || btn.getAttribute("matTooltip") || "").toLowerCase();
    const combined = `${label} ${tooltip}`;
    return /stop response|parar resposta|cancelar resposta|interromper|stop generating|parar geração/.test(combined);
  }

  function getLatestModelMessageRoot() {
    const nodes = [
      ...document.querySelectorAll('[data-message-author-role="model"]'),
      ...document.querySelectorAll("[data-message-id] model-response"),
      ...document.querySelectorAll("model-response"),
    ].filter(isVisible);
    return nodes[nodes.length - 1] || null;
  }

  function isGeminiStillStreaming() {
    return [...document.querySelectorAll("button")].some(isStopResponseButton);
  }

  function isGenerating() {
    return isGeminiStillStreaming();
  }

  function hasModelResponseActions() {
    const latestRoot = getLatestModelMessageRoot();
    if (!latestRoot) return false;
    const actions = [...latestRoot.querySelectorAll("button, [role='button']")].filter(isVisible);
    return actions.some((btn) => {
      const label = `${btn.getAttribute("aria-label") || ""} ${btn.getAttribute("mattooltip") || btn.getAttribute("matTooltip") || ""} ${btn.getAttribute("data-test-id") || ""}`.toLowerCase();
      return /copy|copiar|good response|boa resposta|bad response|ruim|regenerate|regerar|share|compartilhar|thumb/.test(label);
    });
  }

  function normalizeCapturedModelText(text) {
    let t = String(text || "").trim();
    if (!t) return "";
    const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1] && /narrative_script/i.test(fenced[1])) return fenced[1].trim();

    const jsonStarts = [
      t.search(/\{\s*"strategy"\s*:/i),
      t.search(/\{\s*['"]strategy['"]\s*:/i),
      t.search(/\{\s*"narrative_script"\s*:/i),
      t.search(/\{\s*['"]narrative_script['"]\s*:/i),
    ].filter((i) => i >= 0);
    if (jsonStarts.length) {
      const start = Math.min(...jsonStarts);
      if (start > 0) t = t.slice(start);
    }
    return t.replace(/^```json\s*/i, "").replace(/\s*```$/g, "").trim();
  }

  function getLatestNewModelText(beforeMessageCount, beforeTexts) {
    const current = snapshotModelMessages();
    const newTexts = current
      .slice(beforeMessageCount)
      .map((entry) => normalizeCapturedModelText(entry?.text || ""))
      .filter((t) => t.length > 60);
    if (newTexts.length) return newTexts.sort((a, b) => b.length - a.length)[0];

    return normalizeCapturedModelText(getLatestFreshModelText(beforeTexts));
  }

  function getLatestFreshModelText(beforeTexts) {
    const candidates = [];
    snapshotModelMessages().forEach((entry) => {
      const text = normalizeCapturedModelText(entry?.text || "");
      if (text.length > 60 && !beforeTexts.includes(text)) candidates.push(text);
    });
    collectModelTexts()
      .map((t) => normalizeCapturedModelText(t))
      .filter((t) => !beforeTexts.includes(t) && t.length > 60)
      .forEach((t) => candidates.push(t));
    return [...new Set(candidates)].sort((a, b) => b.length - a.length)[0] || "";
  }

  function extractPlanSessionFromPrompt(prompt) {
    const text = String(prompt || "");
    const quoted = text.match(/"plan_session"\s*:\s*"([^"]+)"/i);
    if (quoted?.[1]) return quoted[1];
    const inline = text.match(/plan_session["\s:]+([a-z0-9-]+)/i);
    return inline?.[1] || null;
  }

  function extractMetadataSessionFromPrompt(prompt) {
    const m = String(prompt || "").match(/LUMIERA_METADATA_SESSION:([a-z0-9-]+)/i);
    return m?.[1] || null;
  }

  function extractTaskType(prompt) {
    const m = String(prompt || "").match(/LUMIERA_TASK:(\w+)/i);
    return m ? m[1].toLowerCase() : null;
  }

  /** Overlays exigem JSON com "overlays"; metadados/chat retornam markdown/texto livre. */
  function isOverlayPlanningPrompt(prompt) {
    const task = extractTaskType(prompt);
    if (task === "overlay") return true;
    if (task === "metadata" || task === "generic") return false;
    const text = String(prompt || "");
    return /"overlays"\s*:\s*\[/i.test(text)
      || /planejar overlays/i.test(text)
      || /SCHEMA OBRIGATÓRIO.*HyperFrames/i.test(text);
  }

  function isMetadataPrompt(prompt) {
    const task = extractTaskType(prompt);
    if (task === "metadata") return true;
    const text = String(prompt || "");
    return /Metadados YouTube/i.test(text)
      || /especialista em títulos e SEO/i.test(text)
      || /FORMATO DE SAÍDA OBRIGATÓRIO/i.test(text);
  }

  function isScriptPrompt(prompt) {
    const task = extractTaskType(prompt);
    if (task === "script") return true;
    const text = String(prompt || "");
    return /Gerar narração|narrative_script|Script Master|roteiro creator/i.test(text)
      || /"narrative_script"\s*:/i.test(text)
      || /"visual_prompts"\s*:/i.test(text);
  }

  function isUsableNarrationPayload(parsed) {
    if (!parsed || typeof parsed !== "object") return false;
    const script = String(parsed.narrative_script || "").trim();
    const tech = String(parsed.technical_config?.script || "").trim();
    return script.length >= 120 || tech.length >= 120;
  }

  function looksLikeNarrationCandidate(text) {
    const t = normalizeCapturedModelText(String(text || "").trim());
    if (t.length < 100) return false;
    if (!/["']?narrative_script["']?\s*:/i.test(t)) return false;
    if (/["']?narrative_script["']?\s*:\s*["']/i.test(t) && t.length >= 160) return true;
    if (/["']?strategy["']?\s*:\s*\{/.test(t) && t.length >= 180) return true;
    if (looksLikeLumieraPrompt(t) && !/["']?technical_config["']?\s*:/i.test(t)) return false;
    return t.length >= 140;
  }

  function salvageScriptJsonText(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.search(/\{/);
    if (start < 0) return null;
    let slice = cleaned.slice(start);
    const openBraces = (slice.match(/\{/g) || []).length - (slice.match(/\}/g) || []).length;
    const openBrackets = (slice.match(/\[/g) || []).length - (slice.match(/\]/g) || []).length;
    for (let i = 0; i < openBrackets; i += 1) slice += "]";
    for (let i = 0; i < openBraces; i += 1) slice += "}";
    const attempts = [
      slice,
      slice.replace(/,\s*([}\]])/g, "$1"),
      slice.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/,\s*([}\]])/g, "$1"),
    ];
    for (const candidate of attempts) {
      try {
        const parsed = JSON.parse(candidate);
        if (isUsableNarrationPayload(parsed)) return candidate;
      } catch {
        // tenta próximo
      }
    }
    return null;
  }

  function pickScriptResponsePayload(text) {
    const normalized = normalizeCapturedModelText(text);
    const strict = extractScriptJsonPayload(normalized);
    if (strict) return strict;
    const salvaged = salvageScriptJsonText(normalized);
    if (salvaged) return salvaged;
    if (looksLikeNarrationCandidate(normalized)) return normalized;
    return null;
  }

  function extractScriptJsonPayload(text) {
    let cleaned = String(text || "").trim();
    if (!cleaned) return null;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/g, "").trim();
    }

    const keyIdx = cleaned.search(/["']?narrative_script["']?\s*:/i);
    if (keyIdx < 0) return null;
    const braceStart = cleaned.lastIndexOf("{", keyIdx);
    if (braceStart < 0) return null;
    const obj = extractBalancedJsonSpan(cleaned, braceStart, "{", "}");
    if (!obj || obj.length < 80) return null;

    try {
      const parsed = JSON.parse(obj);
      if (isUsableNarrationPayload(parsed)) return obj;
    } catch {
      // JSON ainda incompleto — não capturar no meio do streaming
    }
    return null;
  }

  function isAcceptableScriptResponse(text, beforeTexts) {
    const t = String(text || "").trim();
    if (!t || beforeTexts.includes(t)) return false;
    return Boolean(pickScriptResponsePayload(t));
  }

  function findScriptJsonResponse(beforeTexts) {
    const all = collectModelTexts();
    const fresh = all.filter((t) => isFreshModelText(t, beforeTexts));
    for (const text of [...fresh].reverse()) {
      const json = extractScriptJsonPayload(text);
      if (json && json.length > 80) return json;
    }
    return null;
  }

  function looksLikeMetadataResponse(text) {
    const t = String(text || "");
    return /##\s*T[ÍI]TULOS/i.test(t)
      || /##\s*DESCRI[ÇC][ÃA]O/i.test(t)
      || /##\s*HASHTAGS/i.test(t)
      || /##\s*TAGS/i.test(t)
      || /VARIANTE\s+[ABC]/i.test(t)
      || /Variante\s+[ABC]\s*[—–\-]/i.test(t)
      || /THUMBNAILS?\s+A\/B/i.test(t)
      || /COMENT[ÁA]RIO\s+PINADO/i.test(t)
      || /T[íi]tulo\s+pareado/i.test(t)
      || /Texto\s+na\s+capa/i.test(t)
      || /Composi[çc][ãa]o\s*:/i.test(t)
      || /Express[ãa]o\/elemento/i.test(t)
      || (/T[ÍI]TULOS/i.test(t) && /DESCRI[ÇC][ÃA]O/i.test(t));
  }

  function looksLikeLumieraPrompt(text) {
    const t = String(text || "");
    return /LUMIERA_TASK:/i.test(t)
      || /PRIORIDADE ABSOLUTA/i.test(t)
      || /--- INÍCIO DO ROTEIRO ---/i.test(t)
      || /FORMATO DE SAÍDA OBRIGATÓRIO/i.test(t)
      || /=== Metadados YouTube ===/i.test(t)
      || /especialista em títulos e SEO para YouTube em PT-BR/i.test(t);
  }

  function looksLikeMetadataTemplate(text) {
    const t = String(text || "");
    return /\(máx 5 palavras\)/i.test(t)
      || /\(número e texto do título escolhido\)/i.test(t);
  }

  function isTemplateFieldValue(value = "") {
    const v = String(value || "").trim();
    if (!v || v === "..." || v === "…") return true;
    return /^\([^)]*\)$/i.test(v)
      || /máx 5 palavras/i.test(v)
      || /número e texto do título escolhido/i.test(v);
  }

  function hasFilledYoutubeTitles(text) {
    const t = String(text || "");
    if (/\d+\.\s+[^(\n]{8,}\(\d+\s*chars?\)/i.test(t)) return true;
    if (/##\s*T[ÍI]TULOS/i.test(t) && /\d+\.\s+.{15,}/m.test(t)) return true;
    return false;
  }

  const METADATA_PLAIN_HEADERS = [
    "TÍTULOS", "DESCRIÇÃO", "HASHTAGS PRINCIPAIS", "HASHTAGS", "TAGS",
    "COMENTÁRIO PINADO", "CAPÍTULOS", "THUMBNAILS A/B", "THUMBNAILS AB", "THUMBNAILS",
    "GANCHO DE RETENÇÃO", "GANCHO PARA THUMBNAIL", "CTA DE MEIO DE VÍDEO",
  ];

  function stripHeaderAccents(value = "") {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function normalizePlainMetadataHeaders(text = "") {
    const headerKeys = new Set(
      METADATA_PLAIN_HEADERS.map((h) => stripHeaderAccents(h).toUpperCase()),
    );
    return String(text)
      .split("\n")
      .map((line) => {
        const trimmed = line.trim().replace(/:+$/, "");
        if (!trimmed || /^##\s+/i.test(trimmed)) return line;
        const key = stripHeaderAccents(trimmed).toUpperCase();
        if (headerKeys.has(key)) return `## ${trimmed}`;
        return line;
      })
      .join("\n");
  }

  function normalizeMetadataText(text = "") {
    return normalizePlainMetadataHeaders(String(text).replace(/\r\n/g, "\n")).trim();
  }

  function extractMetaSection(text, headerPattern) {
    const normalized = normalizeMetadataText(text);
    const m = String(normalized).match(
      new RegExp(`##\\s*${headerPattern}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i"),
    );
    return m?.[1]?.trim() || "";
  }

  function hasCompleteMetadataSections(text) {
    const t = normalizeMetadataText(text);
    const desc = extractMetaSection(t, "DESCRI[ÇC][ÃA]O");
    const tags = extractMetaSection(t, "TAGS");
    const hashtags = extractMetaSection(t, "HASHTAGS(?:\\s+PRINCIPAIS)?");
    const pinned = extractMetaSection(t, "COMENT[ÁA]RIO\\s+PINADO");
    if (!hasFilledYoutubeTitles(t) && !/##\s*T[ÍI]TULOS/i.test(t)) return false;
    if (desc.length < 50) return false;
    if (tags.length < 8 && hashtags.length < 3) return false;
    if (pinned.length < 12 && hashtags.length < 3) return false;
    return true;
  }

  function isMetadataReady(text) {
    const t = String(text || "").trim();
    if (t.length < 180) return false;
    if (extractJsonPayload(t)) return false;
    if (looksLikeLumieraPrompt(t)) return false;
    return hasCompleteMetadataSections(t);
  }

  function isPartialMetadataAcceptable(text, beforeTexts) {
    const t = normalizeMetadataText(String(text || "").trim());
    if (t.length < 280) return false;
    if (looksLikeLumieraPrompt(t)) return false;
    if (extractJsonPayload(t)) return false;
    if (beforeTexts.includes(t)) return false;
    if (!looksLikeMetadataResponse(t)) return false;

    const hasTitles = hasFilledYoutubeTitles(t) || /##\s*T[ÍI]TULOS/i.test(t);
    const hasDesc = extractMetaSection(t, "DESCRI[ÇC][ÃA]O").length >= 40;
    const variantCount = (t.match(/Variante\s+[ABC]/gi) || []).length;
    const hasVariants = variantCount >= 1;

    if (hasCompleteMetadataSections(t)) return true;
    if (hasTitles && hasDesc) return true;
    if (hasTitles && hasVariants && variantCount >= 2) return true;
    if (hasDesc && hasVariants && t.length >= 600) return true;
    if (hasVariants && variantCount >= 2 && t.length >= 700) return true;
    return false;
  }

  function isAcceptableMetadata(text, beforeTexts, metadataSession = null) {
    const t = normalizeMetadataText(String(text || "").trim());
    if (t.length < 120) return false;
    if (looksLikeLumieraPrompt(t)) return false;
    if (extractJsonPayload(t)) return false;
    if (beforeTexts.includes(t)) return false;
    if (metadataSession && t.includes(metadataSession) && isPartialMetadataAcceptable(t, beforeTexts)) {
      return true;
    }
    return isPartialMetadataAcceptable(t, beforeTexts);
  }

  function pickMetadataCandidate(beforeTexts, beforeMessages, metadataSession = null) {
    const current = snapshotModelMessages();
    for (let i = current.length - 1; i >= 0; i -= 1) {
      const text = String(current[i]?.text || "").trim();
      if (isAcceptableMetadata(text, beforeTexts, metadataSession)) return text;
    }
    const fresh = collectModelTexts()
      .filter((t) => !beforeTexts.includes(t))
      .sort((a, b) => b.length - a.length);
    for (const text of fresh) {
      if (isAcceptableMetadata(text, beforeTexts, metadataSession)) return text;
    }
    return "";
  }

  function getLatestGrownModelText(beforeTexts, beforeMessages) {
    const current = snapshotModelMessages();
    if (current.length) {
      for (let i = current.length - 1; i >= 0; i -= 1) {
        const cur = current[i];
        const prev = beforeMessages[i];
        const text = String(cur.text || "").trim();
        if (!text) continue;
        const isNew = i >= beforeMessages.length;
        const grew = !prev || cur.len > prev.len + 12 || cur.head !== prev.head;
        if ((isNew || grew) && !beforeTexts.includes(text)) return text;
      }
      const last = current[current.length - 1];
      const prevLast = beforeMessages[beforeMessages.length - 1];
      if (last?.text && (!prevLast || last.len > prevLast.len + 8)) return last.text;
    }

    const fresh = collectModelTexts()
      .filter((t) => !beforeTexts.includes(t) && t.length > 100)
      .sort((a, b) => b.length - a.length);
    return fresh[0] || "";
  }

  async function waitForMetadataResponse(beforeTexts, beforeMessages, submitStartedAt, deadline, metadataSession = null) {
    const MIN_WAIT_MS = 4000;
    let stableText = "";
    let stableSince = 0;
    let notGeneratingSince = 0;

    while (Date.now() < deadline) {
      await sleep(400);

      const generating = isGenerating();
      if (!generating) {
        notGeneratingSince = notGeneratingSince || Date.now();
      } else {
        notGeneratingSince = 0;
      }

      if (Date.now() - submitStartedAt < MIN_WAIT_MS) continue;

      const raw = getLatestGrownModelText(beforeTexts, beforeMessages);
      if (!isAcceptableMetadata(raw, beforeTexts, metadataSession)) continue;

      if (stableText && raw.length > stableText.length + 20) {
        stableText = raw;
        stableSince = Date.now();
        continue;
      }

      if (raw === stableText) {
        const stableFor = Date.now() - stableSince;
        if (stableFor >= 1200) return raw;
        if (!generating && notGeneratingSince && Date.now() - notGeneratingSince >= 800 && stableFor >= 600) {
          return raw;
        }
      } else {
        stableText = raw;
        stableSince = Date.now();
      }

      if (!generating && notGeneratingSince && Date.now() - notGeneratingSince >= 1500) {
        const doneCandidate = pickMetadataCandidate(beforeTexts, beforeMessages, metadataSession)
          || getLatestGrownModelText(beforeTexts, beforeMessages);
        if (isAcceptableMetadata(doneCandidate, beforeTexts, metadataSession)) return doneCandidate;
      }
    }

    const lastChance = pickMetadataCandidate(beforeTexts, beforeMessages, metadataSession)
      || getLatestGrownModelText(beforeTexts, beforeMessages);
    if (isAcceptableMetadata(lastChance, beforeTexts, metadataSession)) return lastChance;

    throw new Error(
      "Timeout aguardando metadados do Gemini (150s). "
      + "A resposta apareceu em gemini.google.com? Recarregue a aba (F5) e tente de novo.",
    );
  }

  function readScriptCandidateText(beforeTexts, beforeMessages, beforeMessageCount) {
    return getLatestNewModelText(beforeMessageCount, beforeTexts)
      || normalizeCapturedModelText(getLatestGrownModelText(beforeTexts, beforeMessages))
      || normalizeCapturedModelText(findScriptJsonResponse(beforeTexts) || "")
      || "";
  }

  function tryCaptureScriptResponse(beforeTexts, beforeMessages, beforeMessageCount, state) {
    const raw = readScriptCandidateText(beforeTexts, beforeMessages, beforeMessageCount);
    if (!looksLikeNarrationCandidate(raw)) return null;

    const streaming = isGeminiStillStreaming();
    if (!streaming) {
      const payload = pickScriptResponsePayload(raw);
      if (payload) return payload;
    }

    if (raw.length > state.lastLen + 8) {
      state.lastLen = raw.length;
      state.stableText = "";
      state.stableSince = 0;
    }

    if (raw !== state.stableText) {
      state.stableText = raw;
      state.stableSince = Date.now();
      return null;
    }

    const stableFor = Date.now() - state.stableSince;
    if (hasModelResponseActions() && stableFor >= 200) {
      return pickScriptResponsePayload(raw);
    }
    if (stableFor >= 700) {
      return pickScriptResponsePayload(raw);
    }
    return null;
  }

  async function waitForScriptResponse(beforeTexts, beforeMessages, beforeMessageCount, submitStartedAt, deadline) {
    const state = { lastLen: 0, stableText: "", stableSince: 0 };

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (payload) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearInterval(pollTimer);
        resolve(payload);
      };
      const fail = (err) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearInterval(pollTimer);
        reject(err);
      };

      const tick = () => {
        if (Date.now() - submitStartedAt < 4000) return;
        const hit = tryCaptureScriptResponse(beforeTexts, beforeMessages, beforeMessageCount, state);
        if (hit) finish(hit);
      };

      const observer = new MutationObserver(() => tick());
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      const pollTimer = setInterval(() => {
        if (Date.now() > deadline) {
          const last = tryCaptureScriptResponse(beforeTexts, beforeMessages, beforeMessageCount, state)
            || pickScriptResponsePayload(readScriptCandidateText(beforeTexts, beforeMessages, beforeMessageCount));
          if (last && !isGeminiStillStreaming()) finish(last);
          else {
            fail(new Error(
              "Timeout aguardando narração do Gemini (240s). "
              + "Mantenha gemini.google.com em foco e tente de novo.",
            ));
          }
          return;
        }
        tick();
      }, 280);
    });
  }

  async function waitForOverlayResponse(beforeTexts, beforeMessages, knownOverlayJson, planSession, submitStartedAt, deadline) {
    const MIN_WAIT_MS = 5000;
    const STABLE_MS = 1200;
    let stableJson = "";
    let stableSince = 0;

    while (Date.now() < deadline) {
      await sleep(500);
      if (Date.now() - submitStartedAt < MIN_WAIT_MS) continue;

      const json = findOverlayJsonResponse(beforeTexts, knownOverlayJson, planSession);
      if (!json || json.length <= 40) continue;

      if (json === stableJson) {
        if (Date.now() - stableSince >= STABLE_MS) return json;
      } else {
        stableJson = json;
        stableSince = Date.now();
      }
    }

    const fallback = findOverlayJsonResponse(beforeTexts, knownOverlayJson, planSession);
    if (fallback && fallback.length > 40) return fallback;

    throw new Error(
      "Timeout aguardando JSON de overlays do Gemini (130s). "
      + "Confira se a resposta apareceu em gemini.google.com.",
    );
  }

  function collectKnownOverlayJson(beforeTexts) {
    const known = new Set();
    for (const block of beforeTexts) {
      const json = extractJsonPayload(block);
      if (json) known.add(json);
    }
    return known;
  }

  function isStaleOverlayJson(json, knownJsonSet) {
    if (!json) return true;
    if (knownJsonSet.has(json)) return true;
    for (const prev of knownJsonSet) {
      if (prev.length > 60 && json.includes(prev.slice(0, 60))) return true;
      if (json.length > 60 && prev.includes(json.slice(0, 60))) return true;
    }
    return false;
  }

  function pushUniqueText(blocks, seen, text) {
    const t = String(text || "").trim();
    if (t.length <= 15 || seen.has(t)) return;
    seen.add(t);
    blocks.push(t);
  }

  function isUserMessageNode(node) {
    if (!node) return false;
    return Boolean(
      node.closest?.('[data-message-author-role="user"]')
      || node.getAttribute?.("data-message-author-role") === "user",
    );
  }

  function collectModelTexts() {
    const blocks = [];
    const seen = new Set();

    document.querySelectorAll('[data-message-author-role="model"]').forEach((node) => {
      if (isUserMessageNode(node)) return;
      pushUniqueText(blocks, seen, readNodeText(node));
    });

    document.querySelectorAll("model-response").forEach((node) => {
      const root = node.closest("[data-message-id]") || node.parentElement || node;
      pushUniqueText(blocks, seen, readNodeText(root));
    });

    document.querySelectorAll("message-content").forEach((node) => {
      const root = node.closest('[data-message-author-role="model"]')
        || node.closest("[data-message-id]")
        || node;
      if (isUserMessageNode(root)) return;
      pushUniqueText(blocks, seen, readNodeText(root));
    });

    queryDeepAll(document, "pre code, pre, code-block").forEach((node) => {
      const root = node.closest('[data-message-author-role="model"]')
        || node.closest("[data-message-id]")
        || node.closest("model-response");
      if (!root || isUserMessageNode(root)) return;
      pushUniqueText(blocks, seen, readNodeText(node));
    });

    const selectors = [
      '[data-test-id*="model-response" i]',
      '[class*="model-response" i]',
      '[class*="response-container" i]',
      ".markdown",
      ".model-response-text",
      "experimental-model-response",
      "div[data-message-id] model-response",
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((n) => {
        if (isUserMessageNode(n)) return;
        pushUniqueText(blocks, seen, n.innerText || n.textContent);
      });
    }

    return blocks;
  }

  function pickBestFreshCandidate(beforeTexts) {
    const fresh = collectModelTexts().filter((t) => isFreshModelText(t, beforeTexts));
    if (!fresh.length) return "";
    return fresh.reduce((best, t) => (t.length > best.length ? t : best), "");
  }

  function isFreshModelText(text, beforeTexts) {
    if (!text) return false;
    return !beforeTexts.some((b) => b === text);
  }

  const OVERLAY_TYPE_RE = "(?:lower-third|counter|bar-chart|timeline|kinetic-text|info-card)";

  function extractBalancedJsonSpan(src, startIdx, openChar, closeChar) {
    if (src[startIdx] !== openChar) return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = startIdx; i < src.length; i += 1) {
      const ch = src[i];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === openChar) depth += 1;
      else if (ch === closeChar) {
        depth -= 1;
        if (depth === 0) return src.slice(startIdx, i + 1);
      }
    }
    return null;
  }

  function extractJsonPayload(text) {
    let cleaned = String(text || "").trim();
    if (!cleaned) return null;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/g, "").trim();
    }

    const overlaysKey = cleaned.search(/"overlays"\s*:\s*\[/i);
    if (overlaysKey >= 0) {
      const braceStart = cleaned.lastIndexOf("{", overlaysKey);
      if (braceStart >= 0) {
        const obj = extractBalancedJsonSpan(cleaned, braceStart, "{", "}");
        if (obj) {
          try {
            const parsed = JSON.parse(obj);
            if (parsed && Array.isArray(parsed.overlays)) return obj;
          } catch {
            // tenta fallbacks
          }
        }
      }
    }

    const typeIdx = cleaned.search(new RegExp(`"type"\\s*:\\s*"${OVERLAY_TYPE_RE}"`, "i"));
    if (typeIdx >= 0) {
      const arrStart = cleaned.lastIndexOf("[", typeIdx);
      if (arrStart >= 0) {
        const arr = extractBalancedJsonSpan(cleaned, arrStart, "[", "]");
        if (arr) {
          try {
            const parsed = JSON.parse(arr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return `{"overlays":${arr}}`;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (cleaned.startsWith("{")) {
      const obj = extractBalancedJsonSpan(cleaned, 0, "{", "}");
      if (obj) return obj;
    }

    return null;
  }

  function readNodeText(node) {
    if (!node) return "";
    const pieces = [];
    const seen = new Set();
    const push = (text) => {
      const t = String(text || "").trim();
      if (t.length < 2 || seen.has(t)) return;
      seen.add(t);
      pieces.push(t);
    };

    push(node.innerText || node.textContent);
    queryDeepAll(node, "pre, code, pre code, .markdown, message-content, model-response").forEach((el) => {
      push(el.innerText || el.textContent);
    });

    return pieces.sort((a, b) => b.length - a.length)[0] || "";
  }

  function snapshotModelMessages() {
    const entries = [];
    const seenText = new Set();

    const pushEntry = (node) => {
      const text = readNodeText(node);
      if (text.length < 8 || seenText.has(text)) return;
      seenText.add(text);
      entries.push({
        node,
        len: text.length,
        head: text.slice(0, 160),
        text,
      });
    };

    document.querySelectorAll("[data-message-id]").forEach((node) => {
      if (node.querySelector('[data-message-author-role="user"]')) return;
      if (node.matches('[data-message-author-role="user"]')) return;
      pushEntry(node);
    });

    document.querySelectorAll('[data-message-author-role="model"]').forEach(pushEntry);
    document.querySelectorAll("model-response").forEach((node) => {
      pushEntry(node.closest("[data-message-id]") || node.parentElement || node);
    });
    document.querySelectorAll("message-content").forEach((node) => {
      const root = node.closest('[data-message-author-role="model"]')
        || node.closest("[data-message-id]")
        || node;
      if (isUserMessageNode(root)) return;
      pushEntry(root);
    });

    return entries;
  }

  function getLatestModelResponseText(beforeMessages, beforeTexts, opts = {}) {
    const { expectMetadata = false, submitStartedAt = 0, prompt = "" } = opts;
    const current = snapshotModelMessages();
    if (!current.length) return pickBestFreshCandidate(beforeTexts);

    const last = current[current.length - 1];

    if (current.length > beforeMessages.length) {
      return last.text;
    }

    if (beforeMessages.length > 0) {
      const prev = beforeMessages[beforeMessages.length - 1];
      if (last.len > prev.len + 20 || last.head !== prev.head) {
        return last.text;
      }
    }

    for (let i = current.length - 1; i >= 0; i -= 1) {
      const cur = current[i];
      const existed = beforeMessages.some((b) => b.head === cur.head && b.len === cur.len);
      if (!existed && cur.text.length > 80) return cur.text;
    }

    for (let i = current.length - 1; i >= 0; i -= 1) {
      const text = current[i].text;
      if (text && isFreshModelText(text, beforeTexts)) return text;
    }

    if (expectMetadata && Date.now() - submitStartedAt > 3000) {
      const metadataSession = extractMetadataSessionFromPrompt(String(opts.prompt || ""));
      const metadataCandidate = pickMetadataCandidate(beforeTexts, beforeMessages, metadataSession);
      if (metadataCandidate) return metadataCandidate;
    }

    return pickBestFreshCandidate(beforeTexts) || last.text;
  }

  function findOverlayJsonResponse(beforeTexts, knownJsonSet = new Set(), planSession = null) {
    const all = collectModelTexts();
    const fresh = all.filter((t) => isFreshModelText(t, beforeTexts));
    const withSession = planSession
      ? fresh.filter((t) => t.includes(planSession))
      : [];
    const candidates = [...withSession, ...fresh].reverse();
    for (const text of candidates) {
      const json = extractJsonPayload(text);
      if (!json || json.length <= 40) continue;
      if (isStaleOverlayJson(json, knownJsonSet)) continue;
      if (!/"overlays"\s*:\s*\[/.test(json)) continue;
      return json;
    }
    return null;
  }

  function inputHasText(el, text, minLen = 3) {
    const current = getInputText(el).length;
    const expected = Math.min(String(text || "").length, 8);
    return current >= Math.max(minLen, expected);
  }

  async function pasteText(el, text) {
    focusInputChain(el);
    await sleep(100);

    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const pasted = el.dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      }));
      if (pasted !== false && inputHasText(el, text)) return true;
    } catch {
      // ignore
    }

    try {
      await navigator.clipboard.writeText(text);
      focusInputChain(el);
      if (document.execCommand("paste")) {
        await sleep(120);
        if (inputHasText(el, text)) return true;
      }
    } catch {
      // ignore
    }

    return false;
  }

  async function insertTextInChunks(el, text) {
    focusInputChain(el);
    const chunkSize = 1800;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      try {
        document.execCommand("insertText", false, chunk);
      } catch {
        el.dispatchEvent(new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: chunk,
        }));
        el.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: chunk,
        }));
      }
      await sleep(i === 0 ? 80 : 24);
    }
  }

  async function fillInput(el, text) {
    const value = String(text || "");
    focusInputChain(el);
    await sleep(180);

    if (el.isContentEditable) {
      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("delete", false, null);
      } catch {
        // ignore
      }

      if (el.classList.contains("ql-editor")) {
        el.innerHTML = `<p>${value.replace(/</g, "&lt;")}</p>`;
      } else {
        el.textContent = "";
      }
      el.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertFromPaste",
        data: value,
      }));
      el.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertFromPaste",
        data: value,
      }));

      if (!inputHasText(el, value)) {
        await pasteText(el, value);
      }
      if (!inputHasText(el, value)) {
        await insertTextInChunks(el, value);
      }
      if (!inputHasText(el, value)) {
        if (el.classList.contains("ql-editor")) {
          el.innerHTML = `<p>${value.replace(/</g, "&lt;")}</p>`;
        } else {
          el.textContent = value;
        }
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
      }
    } else {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc?.set) desc.set.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    await sleep(450);
  }

  async function ensureInputFilled(el, text, attempts = 4) {
    for (let i = 0; i < attempts; i += 1) {
      await fillInput(el, text);
      if (inputHasText(el, text)) return true;
      await sleep(300 + i * 200);
      const refreshed = findInput();
      if (refreshed) el = refreshed;
    }
    return inputHasText(el, text);
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
    const beforeMessages = snapshotModelMessages();
    const beforeMessageCount = beforeMessages.length;
    const knownOverlayJson = collectKnownOverlayJson(before);
    const planSession = extractPlanSessionFromPrompt(prompt);
    const metadataSession = extractMetadataSessionFromPrompt(prompt);
    const expectOverlayJson = isOverlayPlanningPrompt(prompt);
    const expectMetadata = isMetadataPrompt(prompt);
    const expectScriptJson = isScriptPrompt(prompt);
    const submitStartedAt = Date.now();
    let activeInput = input;
    const filled = await ensureInputFilled(activeInput, prompt);
    if (!filled) {
      activeInput = findInput() || activeInput;
      focusInputChain(activeInput);
      await sleep(400);
      const retryFilled = await ensureInputFilled(activeInput, prompt, 2);
      if (!retryFilled) {
        throw new Error(
          "O Gemini não reconheceu o texto no campo. "
          + "Deixe gemini.google.com visível e logado; recarregue a aba (F5) e tente de novo.",
        );
      }
    }

    const inputLen = getInputText(activeInput).length;

    const sent = await trySubmit(activeInput);
    if (!sent) {
      const btn = findSendButton(activeInput);
      const btnState = btn
        ? `botão=${btn.getAttribute("aria-label") || "sem-label"}, habilitado=${isBtnEnabled(btn)}`
        : "botão não encontrado";
      throw new Error(
        `Não consegui enviar no Gemini (${btnState}, texto=${inputLen} chars). `
        + "Recarregue a extensão, F5 no Lumiera e deixe gemini.google.com aberto.",
      );
    }

    const deadline = Date.now() + (
      expectMetadata ? 150000
        : expectScriptJson ? 240000
          : expectOverlayJson ? 150000
            : 130000
    );

    if (expectMetadata) {
      return waitForMetadataResponse(before, beforeMessages, submitStartedAt, deadline, metadataSession);
    }
    if (expectScriptJson) {
      return waitForScriptResponse(before, beforeMessages, beforeMessageCount, submitStartedAt, deadline);
    }
    if (expectOverlayJson) {
      return waitForOverlayResponse(before, beforeMessages, knownOverlayJson, planSession, submitStartedAt, deadline);
    }

    const responseOpts = { expectMetadata: false, submitStartedAt, prompt };
    let lastCandidate = "";
    let stableHits = 0;
    while (Date.now() < deadline) {
      await sleep(500);
      if (Date.now() - submitStartedAt < 2000) continue;
      const candidate = getLatestModelResponseText(beforeMessages, before, responseOpts);
      if (!candidate || candidate.length < 40) continue;
      if (candidate === lastCandidate) {
        stableHits += 1;
        if (stableHits >= 3 && !isGenerating()) return candidate;
      } else {
        lastCandidate = candidate;
        stableHits = 0;
      }
    }
    if (lastCandidate.length >= 40) return lastCandidate;
    throw new Error("Timeout aguardando resposta do Gemini (130s).");
  }

  globalThis.__lumieraGeminiMessageHandler = (message, _sender, sendResponse) => {
    if (message?.type === "LUMIERA_GEMINI_PING") {
      sendResponse({ ok: true, version: VERSION });
      return;
    }
    if (message?.type !== "LUMIERA_RUN_PROMPT") return;

    submitPrompt(String(message.prompt || ""))
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
    return true;
  };
  chrome.runtime.onMessage.addListener(globalThis.__lumieraGeminiMessageHandler);
})();