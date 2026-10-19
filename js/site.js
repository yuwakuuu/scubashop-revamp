/* The Scuba Shop — site behaviour. Plain JS, no dependencies. */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  requestAnimationFrame(() => document.body.classList.add("loaded"));

  /* ---------- Header: solid after hero, tucks away on scroll down ---------- */
  const header = $(".site-header");
  let lastY = window.scrollY;
  const onScrollHeader = () => {
    const y = window.scrollY;
    header.classList.toggle("is-solid", y > 40);
    const goingDown = y > lastY && y > 400;
    header.classList.toggle("is-hidden", goingDown && !document.body.classList.contains("menu-open"));
    lastY = y;
  };

  /* ---------- Mobile menu ---------- */
  const menuBtn = $(".menu-btn");
  if (menuBtn) {
    const setMenu = (open) => {
      document.body.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
    $$(".nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  /* ---------- Depth gauge: page scroll mapped onto a 0–130 ft dive ---------- */
  const gauge = document.createElement("div");
  gauge.className = "gauge";
  gauge.setAttribute("aria-hidden", "true");
  gauge.innerHTML = '<div class="gauge-scale"><span class="gauge-needle"></span></div><div class="gauge-read">DEPTH<b>000 FT</b></div>';
  document.body.appendChild(gauge);
  const needle = $(".gauge-needle", gauge);
  const readout = $(".gauge-read b", gauge);
  const MAX_DEPTH = 130;
  const onScrollGauge = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    needle.style.transform = `translateY(${p * 218}px)`;
    readout.textContent = String(Math.round(p * MAX_DEPTH)).padStart(3, "0") + " FT";
  };

  /* ---------- Parallax ---------- */
  const parallax = $$("[data-parallax]");
  const onScrollParallax = () => {
    if (reduceMotion) return;
    const vh = window.innerHeight;
    parallax.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const speed = parseFloat(el.dataset.parallax) || 0.15;
      const offset = (r.top + r.height / 2 - vh / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScrollHeader();
      onScrollGauge();
      onScrollParallax();
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- Scroll reveals ---------- */
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    // Clip-revealed elements are fully clipped at rest, which Chrome counts as
    // not intersecting — so observe their parent instead.
    const owner = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { (owner.get(en.target) || []).forEach((el) => el.classList.add("in")); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
    revealEls.forEach((el) => {
      const t = el.dataset.reveal === "clip" ? el.parentElement : el;
      owner.set(t, [...(owner.get(t) || []), el]);
      io.observe(t);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Bubbles ---------- */
  $$("canvas.bubbles").forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    const host = canvas.parentElement;
    let w, h, dpr, bubbles = [], running = true;
    const spawn = (x, y, r) => ({
      x: x ?? Math.random() * w,
      y: y ?? h + Math.random() * h * 0.6,
      r: r ?? 1 + Math.random() * Math.random() * 7,
      vy: 0.25 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      wob: 0.3 + Math.random() * 0.9,
    });
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth; h = host.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(90, w / 18));
      bubbles = Array.from({ length: target }, () => { const b = spawn(); b.y = Math.random() * h; return b; });
    };
    const draw = (t) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y -= b.vy * (1 + b.r * 0.08);
        const x = b.x + Math.sin(t / 900 * b.wob + b.phase) * (2 + b.r);
        if (b.y < -20) { if (b.burst) { bubbles.splice(i, 1); continue; } Object.assign(b, spawn()); }
        const alpha = Math.min(1, (h - b.y) / (h * 0.3)) * 0.55;
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(211,236,230,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        if (b.r > 2.5) {
          ctx.beginPath();
          ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.28, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
          ctx.fill();
        }
      }
      requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    if (reduceMotion) return;
    // Exhale a small plume wherever the pointer moves, like a diver's reg.
    let last = 0;
    host.addEventListener("pointermove", (e) => {
      const now = performance.now();
      if (now - last < 45) return;
      last = now;
      const r = canvas.getBoundingClientRect();
      for (let k = 0; k < 2; k++) {
        const b = spawn(e.clientX - r.left + (Math.random() - 0.5) * 14, e.clientY - r.top, 1 + Math.random() * 4);
        b.vy = 0.9 + Math.random(); b.burst = true;
        bubbles.push(b);
      }
    });
    new IntersectionObserver(([en]) => {
      const was = running; running = en.isIntersecting;
      if (running && !was) requestAnimationFrame(draw);
    }).observe(host);
    requestAnimationFrame(draw);
  });

  /* ---------- Caustics (WebGL light pattern over hero) ---------- */
  $$("canvas.caustics").forEach((canvas) => {
    if (reduceMotion) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (!gl) return;
    const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs = `precision mediump float;uniform vec2 r;uniform float t;
      float c(vec2 uv,float tm){vec2 p=mod(uv*6.2831,6.2831)-250.;vec2 i=p;float k=1.;float inten=.005;
        for(int n=0;n<4;n++){float tt=tm*(1.-(3.5/float(n+1)));i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
        k+=1./length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten)));}
        k/=4.;k=1.17-pow(k,1.4);return pow(abs(k),8.);}
      void main(){vec2 uv=gl_FragCoord.xy/r.y*.55;float v=c(uv,t*.35+23.);
        float fade=smoothstep(0.,.9,gl_FragCoord.y/r.y);
        vec3 col=vec3(.55,.95,.9)*v*fade;gl_FragColor=vec4(col,1.);}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, "r"), uT = gl.getUniformLocation(prog, "t");
    // Rendered at reduced resolution; the softness reads as light through water.
    const scale = 0.5;
    const resize = () => {
      canvas.width = canvas.clientWidth * scale; canvas.height = canvas.clientHeight * scale;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);
    let running = true;
    new IntersectionObserver(([en]) => { const was = running; running = en.isIntersecting; if (running && !was) requestAnimationFrame(frame); }).observe(canvas);
    const frame = (ms) => {
      if (!running) return;
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, ms / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });

  /* ---------- Marquee: duplicate track for a seamless loop ---------- */
  $$(".marquee-track").forEach((track) => {
    const clone = track.innerHTML;
    track.insertAdjacentHTML("beforeend", clone);
    $$("span", track).slice(track.children.length / 2).forEach((s) => s.setAttribute("aria-hidden", "true"));
  });

  /* ---------- Course path scroller ---------- */
  $$("[data-scroller]").forEach((wrap) => {
    const track = $(".profile-track", wrap);
    $$("[data-dir]", wrap).forEach((btn) => btn.addEventListener("click", () => {
      const stop = track.querySelector(".stop");
      const step = stop ? stop.getBoundingClientRect().width + 19 : 300;
      track.scrollBy({ left: step * Number(btn.dataset.dir), behavior: reduceMotion ? "auto" : "smooth" });
    }));
  });

  /* ---------- Trip log: image follows the cursor ---------- */
  const preview = $(".log-preview");
  if (preview && finePointer) {
    const imgs = $$("img", preview);
    let x = 0, y = 0, cx = 0, cy = 0, active = false;
    $$(".log-row").forEach((row, i) => {
      row.addEventListener("pointerenter", () => {
        active = true; preview.classList.add("on");
        imgs.forEach((im, j) => im.classList.toggle("on", j === i));
      });
      row.addEventListener("pointerleave", () => { active = false; preview.classList.remove("on"); });
    });
    window.addEventListener("pointermove", (e) => { x = e.clientX + 190; y = e.clientY; });
    const follow = () => {
      cx += (x - cx) * 0.14; cy += (y - cy) * 0.14;
      if (active || preview.classList.contains("on")) preview.style.left = cx + "px", preview.style.top = cy + "px";
      requestAnimationFrame(follow);
    };
    follow();
  }

  /* ---------- Lightbox ---------- */
  const galleries = $$("[data-gallery]");
  if (galleries.length) {
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Photo viewer");
    const arrow = (d) => `<svg viewBox="0 0 20 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="${d}"/></svg>`;
    lb.innerHTML = `
      <div class="lb-top"><span class="lb-count"></span><button class="lb-btn lb-close" aria-label="Close">${arrow("M4 1l12 10M16 1L4 11")}</button></div>
      <div class="lb-stage"><button class="lb-btn lb-prev" aria-label="Previous photo">${arrow("M19 6H2M7 1L2 6l5 5")}</button><img alt=""><button class="lb-btn lb-next" aria-label="Next photo">${arrow("M1 6h17M13 1l5 5-5 5")}</button></div>
      <div class="lb-bottom"><span class="lb-cap"></span><span>← → to browse · Esc to close</span></div>`;
    document.body.appendChild(lb);
    const img = $(".lb-stage img", lb), cap = $(".lb-cap", lb), count = $(".lb-count", lb);
    let items = [], idx = 0, opener = null;
    const show = (i) => {
      idx = (i + items.length) % items.length;
      const a = items[idx];
      img.classList.add("swap");
      const next = new Image();
      next.onload = () => { img.src = next.src; img.alt = a.querySelector("img")?.alt || ""; img.classList.remove("swap"); };
      next.src = a.getAttribute("href");
      cap.textContent = a.dataset.caption || "";
      count.textContent = String(idx + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
    };
    const open = (gal, i, from) => {
      items = $$("a", gal); opener = from; show(i);
      lb.classList.add("open"); document.body.style.overflow = "hidden";
      $(".lb-close", lb).focus();
    };
    const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; opener && opener.focus(); };
    galleries.forEach((gal) => $$("a", gal).forEach((a, i) => a.addEventListener("click", (e) => { e.preventDefault(); open(gal, i, a); })));
    $(".lb-close", lb).addEventListener("click", close);
    $(".lb-prev", lb).addEventListener("click", () => show(idx - 1));
    $(".lb-next", lb).addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb-stage")) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "Tab") { // keep focus inside the viewer
        const f = $$("button", lb), first = f[0], lastB = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastB.focus(); }
        else if (!e.shiftKey && document.activeElement === lastB) { e.preventDefault(); first.focus(); }
      }
    });
    let sx = null;
    lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
  }

  /* ---------- Filters (courses, trips, price lists) ---------- */
  $$("[data-filter-scope]").forEach((scope) => {
    const items = $$("[data-tags]", scope);
    const chips = $$("[data-filter]", scope);
    const search = $("[data-search]", scope);
    const counter = $(".result-count", scope);
    const empty = $(".empty-state", scope);
    let current = "all";
    // counts on chips
    chips.forEach((c) => {
      const f = c.dataset.filter;
      const n = f === "all" ? items.length : items.filter((it) => it.dataset.tags.split(" ").includes(f)).length;
      c.insertAdjacentHTML("beforeend", `<sup>${n}</sup>`);
    });
    const apply = () => {
      const q = (search?.value || "").trim().toLowerCase();
      let shown = 0;
      items.forEach((it) => {
        const okTag = current === "all" || it.dataset.tags.split(" ").includes(current);
        const okText = !q || it.textContent.toLowerCase().includes(q);
        const show = okTag && okText;
        it.classList.toggle("is-hidden", !show);
        if (show) {
          shown++;
          if (!reduceMotion && it.animate) it.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: "cubic-bezier(.2,.7,.1,1)", delay: Math.min(shown, 8) * 40, fill: "backwards" });
        }
      });
      if (counter) counter.textContent = `Showing ${shown} of ${items.length}`;
      if (empty) empty.classList.toggle("show", shown === 0);
    };
    chips.forEach((c) => c.addEventListener("click", () => {
      current = c.dataset.filter;
      chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
      apply();
    }));
    search?.addEventListener("input", apply);
    const pre = new URLSearchParams(location.search).get("level");
    const preChip = pre && chips.find((c) => c.dataset.filter === pre);
    if (preChip) preChip.click(); else apply();
  });

  /* ---------- Course detail dialog ---------- */
  const sheet = $("dialog.sheet");
  if (sheet) {
    const body = $(".sheet-body", sheet), media = $(".sheet-media", sheet);
    $$("[data-open]").forEach((btn) => btn.addEventListener("click", () => {
      const card = btn.closest(".course");
      const tpl = $("template", card);
      const src = $(".course-img img", card);
      body.innerHTML = "";
      body.appendChild(tpl.content.cloneNode(true));
      media.innerHTML = src ? `<img src="${src.getAttribute("src")}" alt="">` : "";
      sheet.showModal();
      body.scrollTop = 0;
    }));
    $(".sheet-close", sheet).addEventListener("click", () => sheet.close());
    sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });
  }

  /* ---------- Rental calculator ---------- */
  const calc = $(".calc");
  if (calc) {
    const boxes = $$("input[type=checkbox]", calc);
    const daysOut = $("output", calc);
    const totalEl = $(".calc-total b", calc);
    const hint = $(".calc-hint", calc);
    let days = 1;
    const fmt = (n) => "$" + n.toLocaleString("en-US");
    const update = () => {
      daysOut.textContent = days + (days === 1 ? " day" : " days");
      // Weekly rate is five times the daily rate, so anything past 5 days of a 7-day block is free.
      const priced = (daily) => {
        const weeks = Math.floor(days / 7), rest = days % 7;
        return weeks * daily * 5 + Math.min(rest, 5) * daily;
      };
      const chosen = boxes.filter((b) => b.checked);
      const total = chosen.reduce((s, b) => s + priced(Number(b.dataset.daily)), 0);
      totalEl.textContent = fmt(total);
      const set = ["bcd", "reg", "suit", "hood"];
      const hasSet = set.every((k) => chosen.some((b) => b.dataset.key === k || (k === "suit" && (b.dataset.key === "suit7" || b.dataset.key === "suit3"))));
      const extra = chosen.filter((b) => !["bcd", "reg", "suit7", "suit3", "hood"].includes(b.dataset.key));
      const setPrice = priced(60) + extra.reduce((s, b) => s + priced(Number(b.dataset.daily)), 0);
      if (hasSet && setPrice < total) hint.textContent = `Tip: the Complete Dive Set covers BCD, reg, suit & hood — ${fmt(setPrice)} for this trip, saving ${fmt(total - setPrice)}.`;
      else if (days % 7 > 5) hint.textContent = "Days 6 and 7 are on us — weekly rate kicks in.";
      else if (!chosen.length) hint.textContent = "Pick what you need. Certification card required at pickup.";
      else hint.textContent = "Certification card required at pickup.";
    };
    boxes.forEach((b) => b.addEventListener("change", update));
    $$(".stepper button", calc).forEach((b) => b.addEventListener("click", () => {
      days = Math.max(1, Math.min(28, days + Number(b.dataset.step)));
      update();
    }));
    update();
  }

  /* ---------- Hours: open-now in Mesa (America/Phoenix, no DST) ---------- */
  const HOURS = { 0: null, 1: [12, 19], 2: [12, 19], 3: [12, 19], 4: [12, 19], 5: [12, 19], 6: [9, 17] };
  const az = (() => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t)?.value;
      const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
      return { day, h: Number(get("hour")) % 24 + Number(get("minute")) / 60 };
    } catch { const d = new Date(); return { day: d.getDay(), h: d.getHours() + d.getMinutes() / 60 }; }
  })();
  $$(".hours tr[data-day]").forEach((tr) => tr.classList.toggle("today", Number(tr.dataset.day) === az.day));
  $$("[data-open-now]").forEach((el) => {
    const span = HOURS[az.day];
    const isOpen = span && az.h >= span[0] && az.h < span[1];
    el.classList.toggle("closed", !isOpen);
    if (isOpen) {
      const left = span[1] - az.h;
      el.textContent = left < 1 ? `Open · closing in ${Math.round(left * 60)} min` : `Open now · until ${span[1] > 12 ? span[1] - 12 : span[1]}pm`;
    } else {
      let d = az.day, guard = 0;
      do { d = (d + 1) % 7; guard++; } while (!HOURS[d] && guard < 7);
      const sameDay = span && az.h < span[0];
      const nd = sameDay ? az.day : d;
      const name = sameDay ? "today" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][nd];
      const o = HOURS[nd][0];
      el.textContent = `Closed · opens ${name} ${o > 12 ? o - 12 + "pm" : o === 12 ? "noon" : o + "am"}`;
    }
  });

  /* ---------- Enquiry form ---------- */
  const form = $("form.enquiry");
  if (form) {
    const params = new URLSearchParams(location.search);
    const interest = params.get("interest");
    const sel = $("select[name=interest]", form);
    if (interest && sel) {
      const opt = Array.from(sel.options).find((o) => o.value === interest);
      if (opt) sel.value = interest;
    }
    const rules = {
      name: (v) => v.trim().length > 1 || "Tell us who we're talking to.",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "That email doesn't look right.",
      phone: (v) => !v.trim() || v.replace(/\D/g, "").length >= 10 || "Ten digits, please — or leave it blank.",
      interest: (v) => !!v || "Pick the closest match.",
      message: (v) => v.trim().length >= 10 || "A sentence or two helps us reply properly.",
    };
    const check = (field) => {
      const rule = rules[field.name];
      if (!rule) return true;
      const res = rule(field.value);
      const wrap = field.closest(".field");
      wrap.classList.toggle("invalid", res !== true);
      field.setAttribute("aria-invalid", String(res !== true));
      const err = $(".err", wrap);
      if (err) err.textContent = res === true ? "" : res;
      return res === true;
    };
    $$("input, select, textarea", form).forEach((f) => {
      f.addEventListener("blur", () => { if (f.value) check(f); });
      f.addEventListener("input", () => { if (f.closest(".field")?.classList.contains("invalid")) check(f); });
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fields = $$("input[name], select[name], textarea[name]", form).filter((f) => rules[f.name]);
      const bad = fields.filter((f) => !check(f));
      if (bad.length) { bad[0].focus(); return; }
      const btn = $("button[type=submit]", form);
      btn.disabled = true; btn.classList.add("loading");
      setTimeout(() => {
        const ok = $(".form-success");
        const first = $("[name=name]", form).value.trim().split(" ")[0];
        $(".who", ok).textContent = first;
        $(".ref", ok).textContent = "Ref TSS-" + Date.now().toString(36).toUpperCase().slice(-6);
        form.hidden = true;
        ok.classList.add("show");
        ok.setAttribute("tabindex", "-1");
        ok.focus();
      }, 1100);
    });
  }

  /* ---------- Newsletter ---------- */
  $$("form.newsletter").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("input", f), msg = f.nextElementSibling;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) { msg.textContent = "Check that email address."; input.focus(); return; }
    msg.textContent = "You're on the list. See you at the surface.";
    input.value = "";
  }));

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
