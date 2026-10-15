// TEMPORARY debugging aid (delete this file and the line marked TEMP title-debug in app/layout.tsx; never commit them).
// A green box at the bottom left logs what the page does around navigation, so a click that "does nothing" can be understood afterwards:
//  - FULL PAGE LOAD: a new document started (and why: navigate / reload / back_forward). A normal click inside the site must NOT cause one.
//  - click link <href>: a link was clicked; then "address changed" or, after 2 s, "NO NAVIGATION after 2s" with everything that could explain it:
//    requests still waiting (and for how long), the router's pending address, long freezes of the page, errors.
//  - pointerdown without click: a press on the page that never became a click (something on top of the link?), with the element that was on top.
//  - slow/failed request: a page-data (RSC) or API request that took over 700 ms, failed, or answered an error.
//  - freeze: the page was blocked for over 200 ms (a click during that time waits).
//  - title -> [..] / address -> ..: every change of the tab title and of the address.
//  - error / console.error / unhandledrejection: the first 140 characters.
// Alt+L: bigger box (more lines). Alt+H: hide / show the box (it keeps logging while hidden; the choice lasts for the tab). The box ignores the mouse, so it never gets in the way.
(function () {
  if (window.__navDebug) return;
  window.__navDebug = true;
  var KEY = "title-debug-log";
  var MAX_STORED = 80;
  var log = [];
  try { log = JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch (e) {}
  var big = false, box, hidden = false;
  try { hidden = sessionStorage.getItem(KEY + "-hidden") === "1"; } catch (e) {}

  function stamp() { return new Date().toISOString().slice(11, 23); }
  function short(s, n) { s = String(s); return s.length > n ? s.slice(0, n) + "…" : s; }
  function draw() {
    if (!box && document.body) {
      box = document.createElement("pre");
      box.style.cssText = "position:fixed;left:0;bottom:0;z-index:2147483647;margin:0;padding:6px 8px;max-width:70vw;max-height:60vh;overflow:hidden;background:#000;color:#0f0;font:11px/1.3 monospace;white-space:pre-wrap;word-break:break-all;pointer-events:none";
      document.body.appendChild(box);
    }
    if (box) box.textContent = log.slice(-(big ? 45 : 18)).join("\n");
    if (box) box.style.display = hidden ? "none" : "";
  }
  function add(text) {
    log.push(stamp() + "  " + text);
    if (log.length > MAX_STORED) log = log.slice(-MAX_STORED);
    try { sessionStorage.setItem(KEY, JSON.stringify(log)); } catch (e) {}
    draw();
  }
  addEventListener("keydown", function (e) { if (e.altKey && (e.key === "l" || e.key === "L")) { big = !big; draw(); } });
  addEventListener("keydown", function (e) {
    if (e.altKey && (e.key === "h" || e.key === "H")) {
      hidden = !hidden;
      try { sessionStorage.setItem(KEY + "-hidden", hidden ? "1" : "0"); } catch (err) {}
      draw();
    }
  });

  // ---- a new document
  var navEntry = (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]) || {};
  add("FULL PAGE LOAD " + location.pathname + " (" + (navEntry.type || "?") + ") title=[" + document.title + "]");
  addEventListener("pagehide", function () { add("pagehide (leaving this document)"); });
  document.addEventListener("visibilitychange", function () { add("tab " + document.visibilityState); });
  addEventListener("online", function () { add("browser went ONLINE"); });
  addEventListener("offline", function () { add("browser went OFFLINE"); });

  // ---- requests: page-data (RSC) and API calls, only when slow or failed; always counted while waiting
  var pending = {}, pendingId = 0;
  function isInteresting(url) { return /[?&]_rsc=/.test(url) || (url.indexOf(location.origin) !== 0 && /^https?:/.test(url)); }
  function pendingSummary() {
    var now = Date.now(), parts = [];
    for (var k in pending) parts.push(short(pending[k].label, 60) + " waiting " + (now - pending[k].t0) + "ms");
    return parts.length ? parts.join("; ") : "none";
  }
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      var url = "";
      try { url = typeof input === "string" ? input : input.url || String(input); } catch (e) {}
      var method = (init && init.method) || (input && input.method) || "GET";
      var prefetch = false;
      try {
        var h = (init && init.headers) || (input && input.headers);
        if (h) prefetch = !!(h.get ? h.get("next-router-prefetch") : h["next-router-prefetch"] || h["Next-Router-Prefetch"]);
      } catch (e) {}
      var watch = isInteresting(url);
      var id = ++pendingId, t0 = Date.now();
      var label = (prefetch ? "prefetch " : "") + method + " " + url.replace(location.origin, "");
      if (watch) pending[id] = { t0: t0, label: label };
      var p = origFetch.apply(this, arguments);
      if (!watch) return p;
      p.then(
        function (res) {
          delete pending[id];
          var ms = Date.now() - t0;
          if (res.status >= 400 || ms > 700) add((res.status >= 400 ? "request ERROR " + res.status : "slow request") + " " + short(label, 90) + " " + ms + "ms");
        },
        function (err) {
          delete pending[id];
          add("request FAILED " + short(label, 90) + " after " + (Date.now() - t0) + "ms: " + short(err && err.name ? err.name + " " + err.message : err, 80));
        }
      );
      return p;
    };
  }

  // ---- freezes of the page (a click during a long task waits for it)
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { if (e.duration > 200) add("freeze: page blocked " + Math.round(e.duration) + "ms"); });
    }).observe({ entryTypes: ["longtask"] });
  } catch (e) {}

  // ---- errors
  addEventListener("error", function (e) { add("error: " + short(e.message || e.type, 140)); });
  addEventListener("unhandledrejection", function (e) { add("unhandledrejection: " + short(e.reason && (e.reason.message || e.reason), 140)); });
  var origConsoleError = console.error;
  console.error = function () {
    try { add("console.error: " + short(Array.prototype.map.call(arguments, function (a) { return a && a.message ? a.message : String(a); }).join(" "), 140)); } catch (e) {}
    return origConsoleError.apply(this, arguments);
  };

  // ---- title and address changes (polled: the title is swapped by the page, there is no event for it)
  var lastTitle = document.title, lastPath = location.pathname + location.search;
  setInterval(function () {
    if (document.title !== lastTitle) { lastTitle = document.title; add("title -> [" + lastTitle + "] on " + location.pathname); }
    var now = location.pathname + location.search;
    if (now !== lastPath) { lastPath = now; add("address -> " + now + " (title [" + document.title + "])"); }
    if (!box) draw();
  }, 10);

  // ---- clicks on links: did the address change?
  function describe(el) {
    if (!el || !el.tagName) return "?";
    var s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    var label = el.getAttribute && (el.getAttribute("aria-label") || el.getAttribute("href"));
    if (label) s += "[" + short(label, 30) + "]";
    else if (el.textContent) s += "(" + short(el.textContent.trim(), 20) + ")";
    return s;
  }
  function routerState() {
    var parts = [];
    try { parts.push("pendingUrl=" + (window.next && window.next.__pendingUrl ? window.next.__pendingUrl.pathname : "none")); } catch (e) {}
    parts.push("history.length=" + history.length);
    parts.push("online=" + navigator.onLine);
    parts.push("readyState=" + document.readyState);
    parts.push("visible=" + document.visibilityState);
    return parts.join(" ");
  }
  var downAt = null, lastClickAt = 0; // the last press: where, on what, and when; and when the last click arrived
  document.addEventListener("pointerdown", function (e) {
    downAt = { t: Date.now(), x: e.clientX, y: e.clientY, target: e.target };
    var mine = downAt;
    setTimeout(function () {
      if (lastClickAt >= mine.t || mine.target === document.documentElement) return;
      var a = mine.target && mine.target.closest && mine.target.closest("a,button");
      if (!a) return; // a press on plain content is not interesting
      var top = document.elementFromPoint(mine.x, mine.y);
      add("pointerdown on " + describe(a) + " but NO click within 1 s; element on top at that point: " + describe(top) + "; " + routerState());
    }, 1000);
  }, true);
  document.addEventListener("click", function (e) {
    lastClickAt = Date.now();
    var a = e.target && e.target.closest && e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href");
    var startedAt = location.href, t0 = Date.now();
    add("click link " + href + (e.defaultPrevented ? " (default prevented)" : "") + "; " + routerState() + "; waiting requests: " + pendingSummary());
    var watcher = setInterval(function () {
      if (location.href !== startedAt) {
        clearInterval(watcher);
        add("address changed " + (Date.now() - t0) + "ms after click on " + href);
      } else if (Date.now() - t0 >= 2000) {
        clearInterval(watcher);
        add("NO NAVIGATION after 2s for click on " + href + "; " + routerState() + "; waiting requests: " + pendingSummary());
      }
    }, 50);
    // a link to the page you are on cannot change the address: say so instead of crying wolf
    try { if (new URL(a.href, location.href).href === startedAt) { clearInterval(watcher); add("(that link points to the page you are already on)"); } } catch (err) {}
  }, true);
})();
