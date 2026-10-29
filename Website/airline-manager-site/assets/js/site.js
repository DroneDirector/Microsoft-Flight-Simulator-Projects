/* Airline Manager Pro website: route map, screenshots carousel, live flight card, downloads that follow
   the newest release, reveal animations, share and search. Own code, no libraries. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, W = window;
  var cfg = W.AMS || { repo: "DroneDirector/Microsoft-Flight-Simulator-Projects", tag: "airline-manager-pro-v", live: true, fixed: {}, copied: "Link copied" };
  var reduce = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = W.matchMedia && W.matchMedia("(hover: hover) and (pointer: fine)").matches;
  root.classList.add("ams-js");
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  function ready(fn) { if (doc.readyState !== "loading") fn(); else doc.addEventListener("DOMContentLoaded", fn); }

  /* The app's world map as a dot grid: 72 rows x 150 columns (Miller projection, 78°N to 56°S),
     run-length coded from the app's own land outlines. */
  var LAND = "11.5.3.m.d.5.1t|11.2.7.l.e.2.y.3.u|11.4.8.i.x.2.b.9.s|y.1.2.5.9.g.w.2.a.b.s|y.2.5.1.a.f.v.2.9.f.q|q.7.2.1.4.4.8.e.v.2.4.2.3.l.4.3.e|9.2.f.7.2.1.5.4.8.d.v.1.5.2.2.w.b|7.9.2.4.4.7.1.3.5.5.6.c.i.5.f.2.1.10.3.4.1|7.m.2.9.4.4.5.a.i.a.6.1.1.1f|6.z.3.5.4.9.j.b.1.1l|5.z.3.6.4.7.5.4.b.9.4.1l|8.v.3.7.5.4.8.3.a.5.1.5.1.1m.1|6.w.7.3.6.4.k.5.1.1t.1|6.v.6.2.a.2.k.5.2.1k.2.5.3|7.6.3.k.7.4.u.6.4.1g.2.4.5|9.1.8.i.7.6.o.1.3.1.2.2.3.1d.7.2.7|8.1.b.h.6.6.o.1.4.1.1.2.2.1d.7.3.7|7.1.d.j.2.8.n.2.9.1c.8.3.7|l.k.1.9.k.1.2.1.3.1j.7.2.8|m.u.j.1.1.3.1.1m.5.1.9|n.t.n.1o.f|n.o.3.3.k.1q.f|n.q.p.e.1.1.1.5.1.10.h|n.p.q.6.1.6.4.4.1.10.2.1.f|n.n.p.5.4.1.2.4.5.3.2.x.3.2.f|n.l.r.4.6.1.1.2.2.9.1.s.1.3.4.1.g|o.k.r.4.9.1.1.9.3.q.3.2.4.1.g|o.j.t.2.2.4.7.2.1.10.2.1.3.2.g|p.i.t.7.b.z.5.3.h|q.g.t.a.3.1.5.z.4.1.k|s.d.u.1j.o|r.1.1.6.5.1.t.p.1.u.o|t.5.7.1.r.k.1.6.3.q.p|u.4.y.m.1.6.1.1.4.l.1.1.o|v.3.6.2.q.m.1.9.4.8.1.9.s|v.4.2.2.5.1.n.m.2.7.6.6.3.5.v|x.5.u.n.2.5.7.5.4.5.6.1.o|10.4.s.o.1.3.a.2.8.4.5.1.o|13.1.s.q.c.2.8.5.t|13.1.4.3.m.o.1.2.b.1.a.2.u|15.9.j.r.b.2.7.1.a.1.m|17.8.k.5.1.i.d.1.7.2.w|17.b.p.g.k.1.1.1.4.2.q|16.c.p.e.n.1.4.3.q|15.e.o.e.o.1.3.3.1.1.o|16.g.l.d.p.2.2.3.6.4.g|15.j.k.b.r.1.d.4.e|16.i.k.b.t.2.a.4.e|16.i.l.b.18.1.d|17.g.m.b.12.1.3.1.f|17.g.l.c.3.1.v.1.1.3.2.1.f|19.e.l.b.3.2.u.7.1.2.e|1a.c.m.a.3.2.v.a.e|1a.c.n.9.3.2.s.e.d|1a.b.o.9.3.2.r.g.c|1a.9.q.8.y.g.b|19.a.r.7.y.g.b|19.9.s.6.z.g.b|19.9.t.4.10.6.1.8.c|19.8.u.3.11.4.4.7.c|19.6.2a.5.9.1.2|18.7.2b.3.b.1.1|18.5.2r.1.1|18.4.2f.2.9.2.2|18.4.2p.2.3|18.3.2p.2.4|18.3.2v|18.3.2v|18.2.2w|18.2.2w|46|46";
  var LAT_N = 78, LAT_S = -56, COLS = 150;
  var D2R = Math.PI / 180;
  function millerY(lat) { return 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * D2R)); }
  var MY_N = millerY(LAT_N), MY_S = millerY(LAT_S);
  var landRows = LAND.split("|").map(function (r) {
    var out = [], land = false; r.split(".").forEach(function (n) { n = parseInt(n, 36); for (var i = 0; i < n; i++) out.push(land); land = !land; }); return out;
  });

  // Airports the routes run between (latitude, longitude).
  var AP = {
    EKVG: [62.06, -7.28], EKCH: [55.62, 12.65], BIKF: [63.98, -22.6], ENGM: [60.19, 11.1], EGLL: [51.47, -0.45], KJFK: [40.64, -73.78],
    EDDF: [50.03, 8.56], LFPG: [49.0, 2.55], OMDB: [25.25, 55.36], VHHH: [22.3, 113.9], RJTT: [35.55, 139.78], KLAX: [33.94, -118.4],
    SBGR: [-23.43, -46.47], FAOR: [-26.13, 28.24], YSSY: [-33.95, 151.18], CYYZ: [43.68, -79.63], WSSS: [1.36, 103.99], LEMD: [40.47, -3.56],
    PANC: [61.17, -150.0], BGSF: [67.0, -50.7], KORD: [41.98, -87.9], VIDP: [28.56, 77.1], LTFM: [41.26, 28.74], KMIA: [25.79, -80.29]
  };
  var ROUTES = [["EKVG", "EKCH"], ["BIKF", "KJFK"], ["EGLL", "OMDB"], ["LFPG", "SBGR"], ["EDDF", "VHHH"], ["KLAX", "RJTT"], ["OMDB", "YSSY"],
    ["CYYZ", "EGLL"], ["EKCH", "KORD"], ["WSSS", "VIDP"], ["LTFM", "FAOR"], ["PANC", "RJTT"], ["LEMD", "KMIA"], ["ENGM", "BGSF"], ["EKVG", "BIKF"], ["VHHH", "YSSY"]];

  /* Points along the great circle between two airports. */
  function greatCircle(a, b, n) {
    var la1 = a[0] * D2R, lo1 = a[1] * D2R, la2 = b[0] * D2R, lo2 = b[1] * D2R;
    var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((la2 - la1) / 2), 2) + Math.cos(la1) * Math.cos(la2) * Math.pow(Math.sin((lo2 - lo1) / 2), 2)));
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      var x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2), y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2), z = A * Math.sin(la1) + B * Math.sin(la2);
      pts.push([Math.atan2(z, Math.sqrt(x * x + y * y)) / D2R, Math.atan2(y, x) / D2R]);
    }
    return pts;
  }

  /* ---------------- the route map behind the hero: land dots, flights on great circles, arrivals */
  function routeMap(cv) {
    var ctx = cv.getContext("2d"), host = cv.parentElement, dots = null, w = 0, h = 0, dpr = 1, k = 1, ox = 0, oy = 0, running = false, visible = true;
    var soft = cv.classList.contains("ams-routes--soft");
    var flights = ROUTES.map(function (r, i) {
      var pts = greatCircle(AP[r[0]], AP[r[1]], 90);
      for (var j = 1; j < pts.length; j++) { // across the date line the route carries on past the map's edge instead of jumping back
        while (pts[j][1] - pts[j - 1][1] > 180) pts[j][1] -= 360;
        while (pts[j][1] - pts[j - 1][1] < -180) pts[j][1] += 360;
      }
      return { pts: pts, from: r[0], to: r[1], t: (i * 0.137) % 1, speed: 0.018 + (i % 5) * 0.004, pulse: 0 };
    });
    function proj(lat, lon) {
      return [ox + (lon + 180) / 360 * COLS * k, oy + (MY_N - millerY(Math.max(LAT_S, Math.min(LAT_N, lat)))) / (MY_N - MY_S) * landRows.length * k];
    }
    function size() {
      var r = cv.getBoundingClientRect(); w = r.width; h = r.height; dpr = Math.min(2, W.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      // cover the area; keep the North Atlantic (where the demo airline lives) in view
      k = Math.max(w / COLS, h / landRows.length) * (w < 700 ? 1.6 : 1.08);
      var mapW = COLS * k, mapH = landRows.length * k, focus = proj(48, -10);
      ox = 0; oy = 0; focus = proj(48, -10);
      ox = Math.min(0, Math.max(w - mapW, w * (w < 700 ? 0.5 : 0.55) - focus[0]));
      oy = Math.min(0, Math.max(h - mapH, h * 0.42 - focus[1]));
      // dots drawn once
      dots = doc.createElement("canvas"); dots.width = cv.width; dots.height = cv.height;
      var d = dots.getContext("2d"); d.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rad = Math.max(0.8, k * 0.17);
      for (var y = 0; y < landRows.length; y++) for (var x = 0; x < COLS; x++) if (landRows[y][x]) {
        var px = ox + (x + 0.5) * k, py = oy + (y + 0.5) * k;
        if (px < -k || py < -k || px > w + k || py > h + k) continue;
        var edge = Math.min(1, py / (h * 0.9));
        d.fillStyle = "rgba(46,84,128," + (0.55 + 0.35 * (1 - edge)).toFixed(2) + ")";
        d.beginPath(); d.arc(px, py, rad, 0, Math.PI * 2); d.fill();
      }
      draw(performance.now(), true);
    }
    var last = performance.now();
    function draw(now, still) {
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      if (dots) ctx.drawImage(dots, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flights.forEach(function (f, i) {
        if (!still) { f.t += dt * f.speed * (soft ? 0.6 : 1); if (f.t >= 1) { f.t = 0; f.pulse = 1; } }
        if (f.pulse > 0 && !still) f.pulse = Math.max(0, f.pulse - dt * 0.7);
        var n = f.pts.length - 1, head = Math.max(1, Math.floor(f.t * n)), P = f.pts.map(function (p) { return proj(p[0], p[1]); });
        // planned route: faint dashes
        ctx.setLineDash([2, 5]); ctx.lineWidth = 1; ctx.strokeStyle = "rgba(147,169,193,.16)";
        ctx.beginPath(); P.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.setLineDash([]);
        // flown part: the magenta line, fading towards the start
        var tail = Math.max(0, head - 34), g = ctx.createLinearGradient(P[tail][0], P[tail][1], P[head][0], P[head][1]);
        var mine = i === 0;
        g.addColorStop(0, mine ? "rgba(63,208,232,0)" : "rgba(224,75,214,0)"); g.addColorStop(1, mine ? "rgba(63,208,232,.95)" : "rgba(224,75,214,.85)");
        ctx.strokeStyle = g; ctx.lineWidth = mine ? 2.2 : 1.6; ctx.lineCap = "round";
        ctx.beginPath(); for (var j = tail; j <= head; j++) { if (j === tail) ctx.moveTo(P[j][0], P[j][1]); else ctx.lineTo(P[j][0], P[j][1]); } ctx.stroke();
        // the aircraft
        var a = P[head], b = P[Math.max(0, head - 1)], ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
        ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(ang);
        ctx.shadowColor = mine ? "rgba(63,208,232,.9)" : "rgba(224,75,214,.8)"; ctx.shadowBlur = 10;
        ctx.fillStyle = mine ? "#bff4ff" : "#ffd6fb";
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4.2); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4.2); ctx.closePath(); ctx.fill(); ctx.restore();
        // airports
        [P[0], P[n]].forEach(function (p, e) {
          ctx.fillStyle = "rgba(230,238,247,.55)"; ctx.beginPath(); ctx.arc(p[0], p[1], 1.8, 0, Math.PI * 2); ctx.fill();
          if (e === 1 && f.pulse > 0) { ctx.strokeStyle = "rgba(61,220,151," + (f.pulse * 0.9).toFixed(2) + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p[0], p[1], 3 + (1 - f.pulse) * 22, 0, Math.PI * 2); ctx.stroke(); }
        });
      });
    }
    function loop(now) { if (!running) return; draw(now); requestAnimationFrame(loop); }
    function start() { if (running || reduce || !visible || doc.hidden) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
    function stop() { running = false; }
    size();
    var rt = 0; W.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 120); });
    if ("IntersectionObserver" in W) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(host);
    doc.addEventListener("visibilitychange", function () { if (doc.hidden) stop(); else start(); });
    start();
  }

  /* ---------------- the live flight card in the hero: one flight from gate to gate, then the landing */
  function flightCard(card) {
    var landed = card.parentElement.querySelector(".ams-landed");
    var phase = card.querySelector(".ams-flight__phase"), line = card.querySelector(".ams-flight__line"), f = {};
    $$("[data-f]", card).forEach(function (el) { f[el.getAttribute("data-f")] = el; });
    var DIST = 712, CYCLE = 30000, t0 = performance.now(), shown = false;
    var PH = [[0, "Taxi"], [0.05, "Climb"], [0.24, "Cruise"], [0.74, "Descent"], [0.9, "Approach"], [0.96, "Final"], [0.995, "At the gate"]];
    function alt(p) { if (p < 0.05) return 0; if (p < 0.24) return (p - 0.05) / 0.19 * 35000; if (p < 0.74) return 35000; if (p < 0.96) return 35000 * (1 - (p - 0.74) / 0.22); return Math.max(0, 1500 * (1 - (p - 0.96) / 0.035)); }
    function tick(now) {
      var p = (Math.max(0, now - t0) % CYCLE) / CYCLE, name = PH.filter(function (x) { return p >= x[0]; }).pop()[1];
      var a = alt(p), nm = Math.max(0, DIST * (1 - Math.min(1, Math.max(0, (p - 0.05) / 0.94)))), mins = Math.round(nm / 7.4 + (p < 0.05 ? 12 : 4) * (1 - p));
      phase.textContent = name; phase.setAttribute("data-p", name.toLowerCase().replace(/ .*/, ""));
      f.alt.textContent = a > 17999 ? "FL" + Math.round(a / 1000) * 10 : a > 50 ? (Math.round(a / 100) * 100).toLocaleString("en-US") + " ft" : "Ground";
      f.nm.textContent = Math.round(nm) + " nm";
      f.eta.textContent = Math.floor(mins / 60) + ":" + ("0" + (mins % 60)).slice(-2);
      line.style.setProperty("--p", Math.min(1, Math.max(0, (p - 0.04) / 0.95)).toFixed(4));
      var land = p > 0.995 || p < 0.02;
      if (landed && land !== shown) { shown = land; landed.classList.toggle("is-on", land); }
      if (!reduce) requestAnimationFrame(tick);
    }
    if (reduce) { t0 = performance.now() - CYCLE * 0.5; tick(performance.now()); } else requestAnimationFrame(tick);
  }

  /* ---------------- downloads and version: the newest release on GitHub */
  function release() {
    if (!cfg.live) return;
    var KEY = "ams-release", cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { cached = null; }
    function apply(r) {
      if (!r || !r.version) return;
      $$("[data-ams-dl]").forEach(function (a) { var k = a.getAttribute("data-ams-dl"); if (!(cfg.fixed && cfg.fixed[k]) && r[k]) a.href = r[k]; });
      $$("[data-ams-v]").forEach(function (e) { e.textContent = r.version; });
      $$("[data-ams-version]").forEach(function (e) { var b = e.querySelector("b"); if (b) b.textContent = r.version; e.hidden = false; });
    }
    if (cached && Date.now() - cached.at < 3600e3) return apply(cached);
    if (!W.fetch) return;
    fetch("https://api.github.com/repos/" + cfg.repo + "/releases?per_page=30", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) {
        var rel = (list || []).filter(function (x) { return x.tag_name && x.tag_name.indexOf(cfg.tag) === 0 && !x.draft; })[0];
        if (!rel) return;
        var r = { version: rel.tag_name.slice(cfg.tag.length), android: "", windows: "", at: Date.now() };
        (rel.assets || []).forEach(function (a) { if (/\.apk$/i.test(a.name)) r.android = a.browser_download_url; if (/PC.*\.zip$/i.test(a.name)) r.windows = a.browser_download_url; });
        try { sessionStorage.setItem(KEY, JSON.stringify(r)); } catch (e) { /* private mode */ }
        apply(r);
      }).catch(function () { /* the links from the page stay */ });
  }

  ready(function () {
    /* ---------------- reveal on scroll */
    var revealed = function (el) { el.classList.add("is-in"); };
    if ("IntersectionObserver" in W && !reduce) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { revealed(e.target); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
      $$("[data-reveal]").forEach(function (el) { io.observe(el); });
    } else $$("[data-reveal]").forEach(revealed);

    /* ---------------- top bar: solid when scrolled, reading progress, menu on small screens */
    var nav = doc.querySelector(".ams-nav"), bar = nav && nav.querySelector(".ams-progress i"), top = doc.querySelector(".ams-top");
    var ticking = false;
    var onScroll = function () {
      ticking = false;
      var y = W.scrollY || 0, h = root.scrollHeight - W.innerHeight;
      if (nav) nav.classList.toggle("is-scrolled", y > 24);
      if (bar) bar.style.setProperty("--p", h > 0 ? Math.min(1, y / h) : 0);
      if (top) top.classList.toggle("is-on", y > W.innerHeight * 0.7);
    };
    W.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();
    var menu = nav && nav.querySelector(".ams-nav__menu");
    function setMenu(open) { if (!nav) return; nav.classList.toggle("is-open", open); root.classList.toggle("ams-menu-open", open); if (menu) menu.setAttribute("aria-expanded", open ? "true" : "false"); }
    if (menu) menu.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
    $$(".ams-nav__links a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    W.addEventListener("resize", function () { if (W.innerWidth > 980) setMenu(false); });

    /* ---------------- 3D tilt that follows the mouse */
    if (finePointer && !reduce) $$("[data-tilt]").forEach(function (el) {
      var raf = 0;
      el.parentElement.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () { el.style.setProperty("--ry", (x * 12).toFixed(2) + "deg"); el.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg"); });
      });
      el.parentElement.addEventListener("mouseleave", function () { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); });
    });

    /* ---------------- full-size screenshot: grows smoothly out of the device, shrinks back when closed */
    function openShot(src) {
      if (doc.querySelector(".ams-lb")) return;
      var r0 = src.getBoundingClientRect();
      var lb = doc.createElement("div"); lb.className = "ams-lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", src.alt || "Screenshot");
      lb.innerHTML = '<button type="button" class="ams-lb__x" aria-label="Close">&times;</button>';
      var img = new Image(); img.className = "ams-lb__img"; img.alt = src.alt || ""; img.decoding = "async";
      img.src = src.src; // the full-size picture, not the small one for phones
      lb.appendChild(img);
      if (src.alt) { var cap = doc.createElement("p"); cap.className = "ams-lb__cap"; cap.textContent = src.alt; lb.appendChild(cap); }
      doc.body.appendChild(lb);
      root.classList.add("ams-lb-open");
      function place(r, radius) { img.style.left = r.left + "px"; img.style.top = r.top + "px"; img.style.width = r.width + "px"; img.style.height = r.height + "px"; img.style.borderRadius = radius; }
      function target() {
        var nw = img.naturalWidth || 1600, nh = img.naturalHeight || 900;
        var k = Math.min(W.innerWidth * 0.95 / nw, W.innerHeight * 0.84 / nh, 1.6), w = nw * k, h = nh * k;
        return { left: (W.innerWidth - w) / 2, top: (W.innerHeight - h) / 2 - 10, width: w, height: h };
      }
      place(r0, "10px");
      var go = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { lb.classList.add("is-open"); place(target(), "12px"); }); }); };
      if (img.complete) go(); else { img.onload = go; img.onerror = go; }
      var closing = false;
      function close() {
        if (closing) return; closing = true;
        lb.classList.remove("is-open"); lb.classList.add("is-closing");
        place(src.getBoundingClientRect(), "10px");
        setTimeout(function () { lb.remove(); root.classList.remove("ams-lb-open"); }, 560);
        doc.removeEventListener("keydown", key); W.removeEventListener("resize", fit);
      }
      function key(e) { if (e.key === "Escape") close(); }
      function fit() { if (!closing) place(target(), "12px"); }
      lb.addEventListener("click", close);
      doc.addEventListener("keydown", key); W.addEventListener("resize", fit);
    }

    /* ---------------- hero carousel: the screens take turns (left, middle, right; the rest wait behind).
       Tap a side one, swipe, arrows, keys or the dots; tap the middle one to see it full size. */
    $$(".ams-hero__stage").forEach(function (stage) {
      var POS = ["ams-hero__p--a", "ams-hero__p--b", "ams-hero__p--c"], OFF = "ams-hero__p--off";
      var first = POS.map(function (c) { return stage.querySelector("." + c); });
      if (first.some(function (e) { return !e; })) return;
      var order = first.concat($$("." + OFF, stage)), all = order.slice();
      var caption = stage.parentElement.querySelector(".ams-hero__caption");
      var dots = doc.createElement("div"); dots.className = "ams-hero__dots";
      all.forEach(function (el, i) {
        var d = doc.createElement("button"); d.type = "button"; d.setAttribute("aria-label", "Show screen " + (i + 1));
        d.addEventListener("click", function () { while (order[1] !== el) step(1); });
        dots.appendChild(d);
      });
      function apply() {
        order.forEach(function (el, i) {
          POS.forEach(function (c) { el.classList.remove(c); }); el.classList.remove(OFF);
          el.classList.add(i < 3 ? POS[i] : OFF);
          el.classList.toggle("ams-hero__p--next", i === 3); el.classList.toggle("ams-hero__p--prev", i === order.length - 1 && order.length > 4);
          // pictures waiting next to the visible ones start loading now
          if (i <= 3 || i === order.length - 1) { var im = el.querySelector("img"); if (im && im.loading === "lazy") im.loading = "eager"; }
        });
        Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle("is-on", order[1] === all[i]); });
        if (caption) { var im2 = order[1].querySelector("img"); caption.textContent = im2 ? im2.alt : ""; }
      }
      function step(dir) { order = dir > 0 ? order.slice(1).concat(order[0]) : [order[order.length - 1]].concat(order.slice(0, -1)); apply(); }
      function arrow(cls, dir, path, label) {
        var b = doc.createElement("button"); b.type = "button"; b.className = "ams-hero__nav " + cls; b.setAttribute("aria-label", label);
        b.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + path + '"/></svg>';
        b.addEventListener("click", function (e) { e.stopPropagation(); step(dir); });
        return b;
      }
      stage.appendChild(arrow("ams-hero__nav--prev", -1, "M15 5l-7 7 7 7", "Previous screen"));
      stage.appendChild(arrow("ams-hero__nav--next", 1, "M9 5l7 7-7 7", "Next screen"));
      stage.appendChild(dots);
      all.forEach(function (el) {
        el.addEventListener("click", function () {
          if (el === order[0]) step(-1); else if (el === order[2]) step(1);
          else { var im = el.querySelector("img"); if (im) openShot(im); }
        });
      });
      var sx = 0, sy = 0;
      stage.addEventListener("touchstart", function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
      stage.addEventListener("touchend", function (e) {
        var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
      }, { passive: true });
      doc.addEventListener("keydown", function (e) {
        var r = stage.getBoundingClientRect();
        if (r.bottom < 0 || r.top > W.innerHeight || doc.querySelector(".ams-lb")) return;
        if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
        if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
      });
      stage.removeAttribute("aria-hidden");
      apply();
    });

    /* ---------------- screenshots next to the features open full size too */
    $$(".ams-show__media img, .ams-monitor img").forEach(function (im) {
      im.style.cursor = "zoom-in"; im.addEventListener("click", function () { openShot(im); });
    });

    /* ---------------- route maps and the live flight card */
    $$(".ams-routes").forEach(routeMap);
    $$(".ams-flight").forEach(flightCard);

    /* ---------------- glow that follows the mouse on cards */
    if (finePointer) $$("[data-glow]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });

    /* ---------------- numbers count up (1,197 keeps its comma) */
    $$("[data-count]").forEach(function (el) {
      var m = /^(\D*)([\d,]+)(.*)$/.exec(el.textContent.trim()); if (!m || reduce) return;
      var end = +m[2].replace(/,/g, ""), comma = m[2].indexOf(",") >= 0, done = false;
      var fmt = function (v) { return comma ? v.toLocaleString("en-US") : String(v); };
      el.textContent = m[1] + "0" + m[3];
      var run = function () {
        if (done) return; done = true; var t0 = performance.now();
        (function step(t) { var k = Math.min(1, (t - t0) / 1500), e = 1 - Math.pow(1 - k, 3); el.textContent = m[1] + fmt(Math.round(end * e)) + m[3]; if (k < 1) requestAnimationFrame(step); })(t0);
      };
      if ("IntersectionObserver" in W) { var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { run(); o.disconnect(); } }); o.observe(el); } else run();
    });

    /* ---------------- questions: open smoothly, one at a time */
    $$(".ams-faq__item").forEach(function (d) {
      d.addEventListener("toggle", function () { if (d.open) $$(".ams-faq__item").forEach(function (o) { if (o !== d) o.open = false; }); });
    });

    /* ---------------- share this page */
    var url = encodeURIComponent(location.href.split("#")[0]), title = encodeURIComponent(doc.title || "Airline Manager Pro");
    $$(".ams-share__btn[data-share]").forEach(function (a) {
      a.href = a.getAttribute("data-share").replace(/\{u\}/g, url).replace(/\{t\}/g, title);
      if (a.href.indexOf("mailto:") === 0) a.removeAttribute("target");
    });
    if (navigator.share && !finePointer) $$(".ams-share__native").forEach(function (b) {
      b.hidden = false;
      b.addEventListener("click", function () { navigator.share({ title: doc.title, url: location.href.split("#")[0] }).catch(function () {}); });
    });
    $$(".ams-share__copy").forEach(function (b) {
      b.addEventListener("click", function () {
        var u = location.href.split("#")[0], lab = b.querySelector("span"), old = lab ? lab.textContent : "";
        var ok = function () { b.classList.add("is-done"); if (lab) lab.textContent = cfg.copied; setTimeout(function () { b.classList.remove("is-done"); if (lab) lab.textContent = old; }, 2000); };
        if (navigator.clipboard) navigator.clipboard.writeText(u).then(ok, function () { prompt("Copy this link:", u); });
        else prompt("Copy this link:", u);
      });
    });
    $$('a[aria-disabled="true"]').forEach(function (a) { a.addEventListener("click", function (e) { if (a.getAttribute("href") === "#") e.preventDefault(); }); });

    /* ---------------- feature page: search */
    $$(".ams-features").forEach(function (sec) {
      var input = sec.querySelector(".ams-search input"), count = sec.querySelector(".ams-features__count"), empty = sec.querySelector(".ams-features__empty");
      var items = $$(".ams-group li", sec);
      items.forEach(function (li) { li.dataset.html = li.innerHTML; li.dataset.text = li.textContent.toLowerCase(); });
      if (!input) return;
      var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
      input.addEventListener("input", function () {
        var q = input.value.trim().toLowerCase(), n = 0;
        items.forEach(function (li) {
          var hit = !q || li.dataset.text.indexOf(q) >= 0;
          li.classList.toggle("is-hidden", !hit); li.innerHTML = li.dataset.html;
          if (hit && q) { n++; li.innerHTML = li.innerHTML.replace(new RegExp("(" + esc(q) + ")(?![^<]*>)", "gi"), "<mark>$1</mark>"); }
        });
        $$(".ams-group", sec).forEach(function (g) { g.classList.toggle("is-hidden", !g.querySelector("li:not(.is-hidden)")); });
        count.textContent = q ? n + (n === 1 ? " feature" : " features") + " found" : "";
        empty.hidden = !q || n > 0;
      });
    });

    /* ---------------- scroll to top */
    if (top) top.addEventListener("click", function () { W.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

    release();
  });
})();
