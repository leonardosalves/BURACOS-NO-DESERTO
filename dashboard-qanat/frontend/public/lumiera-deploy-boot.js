(function () {
  var RELOAD_KEY = "lumiera.stale-chunk-reload";
  var MIGRATION_KEY = "lumiera.cache-migration-v7";
  var MIGRATE_PARAM = "_lumiera_migrate";
  var IS_DEV = /\/src\/main\.tsx/.test(document.documentElement.innerHTML);

  function clearDeployCaches() {
    var ops = [];
    if ("serviceWorker" in navigator) {
      ops.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(
            regs.map(function (r) {
              return r.unregister();
            })
          );
        })
      );
    }
    if ("caches" in window) {
      ops.push(
        caches.keys().then(function (keys) {
          return Promise.all(
            keys.map(function (k) {
              return caches.delete(k);
            })
          );
        })
      );
    }
    return Promise.all(ops);
  }

  function hardReload() {
    sessionStorage.removeItem(RELOAD_KEY);
    var url = new URL(window.location.href);
    url.searchParams.set("_lumiera_reload", String(Date.now()));
    window.location.replace(url.toString());
  }

  function isStaleChunkMessage(msg) {
    return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\d]+ failed/i.test(
      msg || ""
    );
  }

  function recoverFromStaleChunk() {
    sessionStorage.removeItem(RELOAD_KEY);
    sessionStorage.setItem(RELOAD_KEY, "1");
    clearDeployCaches().finally(hardReload);
  }

  function extractModuleEntry(html) {
    var meta = html.match(/<meta name="lumiera-entry" content="([^"]+)"/i);
    if (meta) return meta[1];
    var match = html.match(
      /<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/i
    );
    return match ? match[1] : null;
  }

  function removeStaticProdEntry() {
    document
      .querySelectorAll('script[type="module"][src*="/assets/index-"]')
      .forEach(function (node) {
        node.parentNode.removeChild(node);
      });
  }

  function loadDashboardEntry() {
    removeStaticProdEntry();
    return fetch("/index.html", { cache: "no-store" })
      .then(function (res) {
        return res.text();
      })
      .then(function (html) {
        var src = extractModuleEntry(html);
        if (!src) {
          throw new Error("Lumiera entry ausente em index.html");
        }
        var url =
          src +
          (src.indexOf("?") >= 0 ? "&" : "?") +
          "_lumiera_entry=" +
          Date.now();
        return import(url);
      });
  }

  function startDashboard() {
    if (IS_DEV) return;
    loadDashboardEntry().catch(function () {
      recoverFromStaleChunk();
    });
  }

  var params = new URLSearchParams(window.location.search);

  if (!localStorage.getItem(MIGRATION_KEY) && !params.has(MIGRATE_PARAM)) {
    localStorage.setItem(MIGRATION_KEY, "1");
    var migrateUrl = new URL(window.location.href);
    migrateUrl.searchParams.set(MIGRATE_PARAM, "7");
    migrateUrl.searchParams.set("_t", String(Date.now()));
    window.location.replace(migrateUrl.toString());
    return;
  }

  if (params.has(MIGRATE_PARAM)) {
    clearDeployCaches();
    params.delete(MIGRATE_PARAM);
    params.delete("_t");
    var next =
      window.location.pathname +
      (params.toString() ? "?" + params.toString() : "") +
      window.location.hash;
    window.history.replaceState(null, "", next);
  }

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var msg =
      reason && reason.message ? String(reason.message) : String(reason || "");
    if (!isStaleChunkMessage(msg)) return;
    event.preventDefault();
    recoverFromStaleChunk();
  });

  window.addEventListener(
    "error",
    function (event) {
      if (!isStaleChunkMessage(event.message || "")) return;
      recoverFromStaleChunk();
    },
    true
  );

  document.addEventListener(
    "click",
    function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var btn = target.closest("button");
      if (!btn) return;
      var label = (btn.textContent || "").trim();
      if (label !== "Tentar novamente" && label !== "Atualizar dashboard") {
        return;
      }
      var panel = btn.closest("div");
      if (!panel || !isStaleChunkMessage(panel.textContent || "")) return;
      event.preventDefault();
      event.stopPropagation();
      recoverFromStaleChunk();
    },
    true
  );

  window.addEventListener("load", function () {
    sessionStorage.removeItem(RELOAD_KEY);
  });

  startDashboard();
})();
