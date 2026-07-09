(function () {
  var RELOAD_KEY = "lumiera.stale-chunk-reload";
  var MIGRATION_KEY = "lumiera.cache-migration-v6";
  var MIGRATE_PARAM = "_lumiera_migrate";

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
    if (sessionStorage.getItem(RELOAD_KEY)) return;
    sessionStorage.setItem(RELOAD_KEY, "1");
    clearDeployCaches().finally(hardReload);
  }

  var params = new URLSearchParams(window.location.search);

  if (!localStorage.getItem(MIGRATION_KEY) && !params.has(MIGRATE_PARAM)) {
    localStorage.setItem(MIGRATION_KEY, "1");
    var migrateUrl = new URL(window.location.href);
    migrateUrl.searchParams.set(MIGRATE_PARAM, "6");
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
})();
