// Thomas — film de lancement.
// Tout l'état visuel est une fonction pure du temps : render(t) ne dépend que de t,
// ce qui garantit un rendu image par image déterministe.
//   index.html?format=landscape   1920×1080
//   index.html?format=vertical    1080×1920
//   &play=1                        aperçu en temps réel (boucle)
//   &t=12.5                        image fixe à 12,5 s

(() => {
  const params = new URLSearchParams(location.search);
  const FORMAT = params.get("format") === "vertical" ? "vertical" : "landscape";
  const V = FORMAT === "vertical";
  document.documentElement.dataset.format = FORMAT;

  const DURATION = 60;
  const W = V ? 1080 : 1920;
  const H = V ? 1920 : 1080;
  const stage = document.getElementById("stage");

  const C = {
    ink: "#1d2320",
    sage: "#7e9275",
    sageDeep: "#2f3e33",
    terra: "#c9704f",
    water: "#5f7e8e",
    card: "#fbfaf6",
  };

  // ---------- Motion primitives ----------

  // Damped harmonic oscillator, closed form. k = stiffness, c = damping, mass = 1.
  const SPRINGS = {
    soft: { k: 140, c: 20 },
    snappy: { k: 320, c: 30 },
    gentle: { k: 70, c: 15 },
    bouncy: { k: 260, c: 17 },
  };

  function spring(t, { k, c }) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(k);
    const z = c / (2 * w0);
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }

  const sp = (t, at, s = SPRINGS.soft) => spring(t - at, s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, p) => a + (b - a) * p;
  const easeInOut = (x) => {
    const p = clamp(x);
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  };
  const lerpRect = (a, b, p) => ({
    x: mix(a.x, b.x, p),
    y: mix(a.y, b.y, p),
    w: mix(a.w, b.w, p),
    h: mix(a.h, b.h, p),
    r: mix(a.r, b.r, p),
  });

  function hexMix(a, b, p) {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    const q = clamp(p);
    return `rgb(${pa.map((v, i) => Math.round(mix(v, pb[i], q))).join(",")})`;
  }

  // ---------- DOM helpers ----------

  const updates = [];
  const on = (fn) => updates.push(fn);

  function h(tag, cls, parent, content) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content != null) node.innerHTML = content;
    (parent || stage).appendChild(node);
    return node;
  }

  function style(node, props) {
    for (const key in props) node.style[key] = props[key];
  }

  function place(node, rect) {
    style(node, {
      width: `${rect.w}px`,
      height: `${rect.h}px`,
      borderRadius: `${rect.r}px`,
      transform: `translate(${rect.x}px, ${rect.y}px)`,
    });
  }

  // Word-by-word reveal: each word rises inside its own mask, then leaves upward.
  function kinetic(parent, text, { start, stagger = 0.05, exit = null, exitStagger = 0.018, accent = [], accentClass = "accent", s = SPRINGS.soft }) {
    const words = text.split(" ");
    const nodes = words.map((word, i) => {
      const mask = h("span", "mask", parent);
      const inner = h("span", "wi", mask);
      inner.textContent = word;
      if (accent.includes(i)) inner.classList.add(accentClass);
      if (i < words.length - 1) parent.appendChild(document.createTextNode(" "));
      return inner;
    });
    on((t) => {
      nodes.forEach((node, i) => {
        const p = sp(t, start + i * stagger, s);
        const q = exit == null ? 0 : sp(t, exit + i * exitStagger, SPRINGS.snappy);
        node.style.transform = `translateY(${(1 - p) * 105 - q * 105}%)`;
        node.style.opacity = clamp(p) * (1 - clamp(q));
      });
    });
    return nodes;
  }

  // Block fade with a small vertical travel.
  function fade(node, start, exit, { dy = 24, s = SPRINGS.soft, exitDy = -18 } = {}) {
    on((t) => {
      const p = sp(t, start, s);
      const q = exit == null ? 0 : sp(t, exit, SPRINGS.snappy);
      node.style.opacity = clamp(p) * (1 - clamp(q));
      node.style.transform = `translateY(${(1 - p) * dy + q * exitDy}px)`;
    });
  }

  const ICON = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.8L16.2 9.6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    sprout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9"/><path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7z"/><path d="M12 14c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z"/></svg>',
  };

  // ---------- Content ----------

  const TASKS = [
    { name: "Semis radis", short: "Semis", lane: 0, parcel: "Plein champ · B2", start: 450, end: 485, color: C.sage },
    { name: "Désherbage", short: "Désherbage", lane: 1, parcel: "Serre 1 · Planche 3", start: 490, end: 580, color: C.sageDeep },
    { name: "Récolte tomates", short: "Récolte", lane: 1, parcel: "Serre 1 · Planche 1", start: 590, end: 680, color: C.terra },
    { name: "Irrigation", short: "Irrigation", lane: 2, parcel: "Serre 2", start: 690, end: 730, color: C.water },
  ];
  const LANES = ["Plein champ", "Serre 1", "Serre 2"];
  const DAY_START = 420;
  const DAY_END = 750;

  const clock = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.floor(min % 60)).padStart(2, "0")}`;
  const hm = (min) => `${Math.floor(min / 60)}\u00a0h\u00a0${String(Math.round(min % 60)).padStart(2, "0")}`;
  const dur = (min) => (min < 60 ? `${min}\u00a0min` : hm(min));

  // ---------- Layout per format ----------

  const L = V
    ? {
        card: { x: 280, y: 900, w: 520, h: 490, r: -3 },
        phoneA: { x: 300, y: 520, s: 1.2 },
        phoneB: { x: 424, y: 440, s: 0.58 },
        panel: { x: 80, y: 968, s: 920 / 1100 },
      }
    : {
        card: { x: 1200, y: 300, w: 480, h: 480, r: -3 },
        phoneA: { x: 1260, y: 110, s: 1 },
        phoneB: { x: 150, y: 110, s: 1 },
        panel: { x: 640, y: 180, s: 1 },
      };

  // Key times (seconds). Edit here to retime the film.
  const T = {
    hookIn: 0.35,
    hookOut: 5.5,
    morph: 6.05,
    handoff: 7.5,
    solutionOut: 13.4,
    record: 14.0,
    recordEnd: 20.05,
    card: 20.15,
    list: 26.1,
    playStart: 27.0,
    playEnd: 32.6,
    trace: 34.4,
    demoOut: 42.0,
    benefits: 42.5,
    benefitsOut: 51.2,
    cta: 52.3,
    ctaOut: 57.5,
  };

  const playMinute = (t) => DAY_START + (DAY_END - DAY_START) * easeInOut((t - T.playStart) / (T.playEnd - T.playStart));

  function timeForMinute(min) {
    for (let t = T.playStart; t <= T.playEnd; t += 1 / 240) {
      if (playMinute(t) >= min) return t;
    }
    return T.playEnd;
  }

  // ---------- Background ----------

  const blobA = h("div", "blob");
  const blobB = h("div", "blob warm");
  on((t) => {
    const a = (2 * Math.PI * t) / DURATION;
    blobA.style.transform = `translate(${W * 0.72 + Math.cos(a) * W * 0.07 - 600}px, ${H * 0.28 + Math.sin(a) * H * 0.05 - 600}px)`;
    blobB.style.transform = `translate(${W * 0.18 - Math.cos(a) * W * 0.06 - 600}px, ${H * 0.82 - Math.sin(a) * H * 0.04 - 600}px)`;
  });

  // ---------- 1. Hook ----------

  const hook = h("div", "block hook");
  kinetic(h("div", "line", hook), "Sur le terrain,", { start: T.hookIn, exit: T.hookOut });
  kinetic(h("div", "line", hook), "on perd un temps fou", { start: 0.75, exit: T.hookOut + 0.03 });
  kinetic(h("div", "line", hook), "à noter à la main…", { start: 1.45, exit: T.hookOut + 0.06 });
  kinetic(h("div", "line third", hook), "…et on n’a jamais", { start: 2.9, exit: T.hookOut + 0.12 });
  kinetic(h("div", "line", hook), "de vraie traçabilité.", { start: 3.2, exit: T.hookOut + 0.15, accent: [1, 2] });

  const device = h("div", "device");
  const note = h("div", "note", device);
  h("div", "note-head", note, "<span>Carnet de terrain</span><span>Mardi</span>");
  const ENTRIES = [
    ["Désherbage serre 1", "?h??"],
    ["Semis radis, vers 7 h", "??"],
    ["Récolte tomates", "?h??"],
    ["Irrigation… oublié", "—"],
  ];
  const tilts = [-1.2, 0.8, -0.6, 1];
  ENTRIES.forEach(([label, q], i) => {
    const row = h("div", "entry", note);
    const txt = h("span", null, row);
    txt.textContent = label;
    const badge = h("span", "q", row);
    badge.textContent = q;
    on((t) => {
      const p = sp(t, 0.95 + i * 0.32, SPRINGS.soft);
      txt.style.opacity = clamp(p);
      txt.style.transform = `translateX(${(1 - p) * -16}px) rotate(${tilts[i]}deg)`;
      const b = sp(t, 3.3 + i * 0.12, SPRINGS.bouncy);
      badge.style.opacity = clamp(b);
      badge.style.transform = `scale(${0.6 + 0.4 * b})`;
    });
    if (i === 2) {
      const ns = "http://www.w3.org/2000/svg";
      const strike = document.createElementNS(ns, "svg");
      strike.setAttribute("class", "strike");
      strike.setAttribute("width", "260");
      strike.setAttribute("height", "40");
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", "M2 20 C 50 12, 90 26, 140 16 S 220 22, 256 14");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", C.terra);
      path.setAttribute("stroke-width", "3");
      path.setAttribute("stroke-linecap", "round");
      strike.appendChild(path);
      row.appendChild(strike);
      const len = 270;
      path.style.strokeDasharray = `${len}`;
      on((t) => {
        path.style.strokeDashoffset = `${len * (1 - clamp(sp(t, 2.5, SPRINGS.gentle)))}`;
      });
    }
  });

  function phonePose(t) {
    const m = sp(t, T.list, SPRINGS.soft);
    const q = sp(t, T.demoOut, SPRINGS.snappy);
    return {
      x: mix(L.phoneA.x, L.phoneB.x, m),
      y: mix(L.phoneA.y, L.phoneB.y, m) + q * 70,
      s: mix(L.phoneA.s, L.phoneB.s, m),
      o: 1 - clamp(q),
    };
  }

  on((t) => {
    const pin = sp(t, 0.6, SPRINGS.soft);
    const m = sp(t, T.morph, SPRINGS.soft);
    const c = L.card;
    const pa = L.phoneA;
    const target = { x: pa.x, y: pa.y, w: 400 * pa.s, h: 860 * pa.s, r: 58 * pa.s };
    const rect = lerpRect({ x: c.x, y: c.y + (1 - pin) * 50, w: c.w, h: c.h, r: 22 }, target, m);
    style(device, {
      width: `${rect.w}px`,
      height: `${rect.h}px`,
      borderRadius: `${rect.r}px`,
      background: hexMix(C.card, C.ink, m),
      transform: `translate(${rect.x}px, ${rect.y}px) rotate(${mix(c.r - (1 - pin) * 4, 0, m)}deg)`,
      opacity: t >= T.handoff ? 0 : clamp(pin),
    });
    note.style.opacity = 1 - clamp(sp(t, 5.9, SPRINGS.snappy));
  });

  // ---------- 2. Solution ----------

  const solution = h("div", "block solution");
  const brandrow = h("div", "brandrow", solution);
  const miniMark = h("div", "mini-mark", brandrow);
  [10, 18, 24, 14].forEach((v) => (h("i", null, miniMark).style.height = `${v}px`));
  h("span", null, brandrow, "Thomas");
  fade(brandrow, 6.7, T.solutionOut);
  const headline = h("div", "headline", solution);
  kinetic(h("div", "line", headline), "Vous parlez.", { start: 7.0, exit: T.solutionOut });
  kinetic(h("div", "line", headline), "Le temps et la tâche", { start: 7.35, exit: T.solutionOut + 0.05 });
  kinetic(h("div", "line", headline), "sont capturés.", { start: 7.6, exit: T.solutionOut + 0.1, accent: [1], accentClass: "accent-sage" });
  const solSub = h("div", "sub", solution);
  solSub.textContent = "Une note vocale sur le terrain devient une action datée, rattachée à sa parcelle, avec sa durée.";
  fade(solSub, 8.4, T.solutionOut + 0.1);

  // ---------- Steps ----------

  function step(num, title, sub, start, exit) {
    const node = h("div", "block step");
    const k = h("div", "kicker", node);
    k.textContent = num;
    fade(k, start, exit, { dy: 12 });
    kinetic(h("div", "title", node), title, { start: start + 0.12, exit });
    if (sub) {
      const s = h("div", "sub", node);
      s.textContent = sub;
      fade(s, start + 0.55, exit + 0.05);
    }
  }
  step("01 · Enregistrer", "Parlez en marchant.", "Thomas enregistre sur le terrain, les mains dans la terre.", 14.15, 19.9);
  step("02 · Comprendre", "La note devient une action.", "Tâche, parcelle, horaire et durée sont reconnus automatiquement.", 20.3, 25.75);
  if (V) {
    step("03 · Mesurer", "Le temps se construit tout seul.", null, 26.3, 34.1);
    step("04 · Tracer", "Une traçabilité prête.", null, 34.55, 41.75);
  }

  // ---------- Phone ----------

  const phone = h("div", "phone");
  const screen = h("div", "screen", phone);
  h("div", "island", screen);
  h("div", "status num", screen, "09:41");
  const bars = h("div", "status-r", screen);
  [6, 9, 12, 14].forEach((v) => (h("i", null, bars).style.height = `${v}px`));
  h("div", "p-date", screen, "Mardi 12 mai");
  h("div", "p-title", screen, "Aujourd’hui");
  const chipParcel = h("div", "p-chip", screen, "Serre 1");
  const chipTotal = h("div", "p-chip num", screen, "0\u00a0h\u00a000");

  const empty = h("div", "empty", screen);
  h("div", "dot", empty, ICON.sprout).style.color = C.sageDeep;
  h("b", null, empty, "Rien de noté ce matin");
  h("span", null, empty, "Maintenez le bouton et parlez.");

  const rings = [h("div", "ring", screen), h("div", "ring", screen)];
  const rec = h("div", "rec", screen, ICON.mic);
  rec.style.color = "#fff";
  const labelIdle = h("div", "rec-label", screen, "Maintenir pour parler");
  const labelLive = h("div", "rec-label live", screen, "Enregistrement…");
  const timer = h("div", "timer num", screen, "<i></i><span>00:00</span>");
  const timerDot = timer.querySelector("i");
  const timerText = timer.querySelector("span");

  const N_BARS = 32;
  const waveBars = Array.from({ length: N_BARS }, (_, i) => {
    const b = h("div", "bar", screen);
    b.style.left = `${32.5 + i * 10}px`;
    return b;
  });

  const captionWords = "Désherbage planche 3, serre 1. Commencé à 8\u00a0h\u00a010, fini à 9\u00a0h\u00a040.".split(" ");
  const caption = h("div", "caption", screen);
  const captionNodes = captionWords.map((w, i) => {
    const n = h("span", "cw", caption);
    n.textContent = w;
    if (i < captionWords.length - 1) caption.appendChild(document.createTextNode(" "));
    return n;
  });

  const tcard = h("div", "tcard", screen);
  const tcIn = h("div", "tc-in", tcard);
  h("div", "tc-head", tcIn, `<span class="m" style="color:${C.terra}">${ICON.mic}</span>Note vocale<em class="num">0:09</em>`);
  const quote = h(
    "div",
    "tc-quote",
    tcIn,
    "“<span class=hl>Désherbage</span> <span class=hl>planche 3</span>, <span class=hl>serre 1</span>. Commencé à <span class=hl>8\u00a0h\u00a010</span>, fini à <span class=hl>9\u00a0h\u00a040</span>.”"
  );
  const highlights = [...quote.querySelectorAll(".hl")];
  const tagsWrap = h("div", "tags", tcIn);
  const tags = [
    `<i style="background:${C.sageDeep}"></i>Désherbage`,
    `<i style="background:${C.sage}"></i>Serre 1 · Planche 3`,
    `<span class="num">08:10 → 09:40</span>`,
    `<span class="num">1\u00a0h\u00a030</span>`,
  ].map((html, i) => h("span", i === 3 ? "tag strong" : "tag", tagsWrap, html));
  const tcOk = h("div", "tc-ok", tcIn, `${ICON.checkCircle}Ajouté à votre journée`);

  const ROW_Y = (i) => 160 + i * 92;
  const rowBgs = TASKS.map((task, i) => (i === 1 ? null : h("div", "row", screen)));
  const rowIns = TASKS.map((task) =>
    h(
      "div",
      "row-in",
      screen,
      `<i class="cbar" style="background:${task.color}"></i><div class="txt"><b>${task.name}</b><span>${task.parcel}</span></div><div class="r"><b class="num">${dur(task.end - task.start)}</b><span class="num">${clock(task.start)}</span></div>`
    )
  );
  const rowTimes = TASKS.map((task) => timeForMinute(task.start));

  const WAVE_RECT = { x: 26, y: 470, w: 328, h: 100, r: 50 };
  const CARD_RECT = { x: 18, y: 160, w: 344, h: 332, r: 26 };
  const ROW1_RECT = { x: 18, y: ROW_Y(1), w: 344, h: 80, r: 20 };

  on((t) => {
    const pose = phonePose(t);
    phone.style.transform = `translate(${pose.x}px, ${pose.y}px) scale(${pose.s})`;
    phone.style.opacity = t >= T.handoff ? pose.o : 0;
    screen.style.opacity = clamp(sp(t, 7.35, SPRINGS.soft));

    const emptyP = sp(t, 7.9, SPRINGS.soft);
    const emptyQ = sp(t, 13.95, SPRINGS.snappy);
    empty.style.opacity = clamp(emptyP) * (1 - clamp(emptyQ));
    empty.style.transform = `translateY(${(1 - emptyP) * 16 - emptyQ * 16}px)`;

    const listOn = clamp(sp(t, T.list + 0.4, SPRINGS.soft));
    chipParcel.style.opacity = 1 - clamp(sp(t, T.list, SPRINGS.snappy));
    chipTotal.style.opacity = listOn;
    chipTotal.style.transform = `translateY(${(1 - listOn) * 8}px)`;

    // Record button: breathing when idle, pressed while recording.
    const press = sp(t, T.record, SPRINGS.bouncy) - sp(t, T.recordEnd, SPRINGS.bouncy);
    const breathe = (clamp(sp(t, 8.4)) - clamp(sp(t, 13.6))) * 0.03 * Math.sin((2 * Math.PI * (t - 8.4)) / 1.8);
    rec.style.transform = `scale(${1 - 0.08 * press + breathe})`;
    rec.style.background = hexMix(C.terra, "#a9553a", press);

    const recVis = clamp(sp(t, T.record + 0.05, SPRINGS.soft)) * (1 - clamp(sp(t, T.recordEnd, SPRINGS.snappy)));
    rings.forEach((ring, k) => {
      const phase = (((t - T.record + k * 0.7) % 1.4) + 1.4) % 1.4 / 1.4;
      ring.style.transform = `scale(${1 + 0.9 * phase})`;
      ring.style.opacity = (1 - phase) * 0.4 * recVis;
    });
    labelIdle.style.opacity = 1 - recVis;
    labelLive.style.opacity = recVis;
    timer.style.opacity = recVis;
    const secs = Math.floor(clamp((t - 14.25) / 5.6) * 9);
    timerText.textContent = `00:0${secs}`;
    timerDot.style.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos((2 * Math.PI * (t - T.record)) / 1.1));

    const collapse = clamp(sp(t, T.recordEnd - 0.05, SPRINGS.snappy));
    const waveOn = clamp(sp(t, T.record + 0.2, SPRINGS.soft)) * (1 - collapse);
    waveBars.forEach((bar, i) => {
      const amp = 0.35 + 0.65 * Math.abs(Math.sin(t * 6.3 + i * 0.55) * 0.6 + Math.sin(t * 11.1 + i * 1.21) * 0.4);
      const taper = Math.pow(Math.sin((Math.PI * (i + 0.5)) / N_BARS), 0.6);
      const height = 5 + 78 * amp * taper * waveOn;
      style(bar, { height: `${height}px`, top: `${520 - height / 2}px`, opacity: clamp(sp(t, T.record + 0.1)) * (1 - collapse) });
    });

    const capQ = sp(t, T.recordEnd, SPRINGS.snappy);
    caption.style.opacity = 1 - clamp(capQ);
    caption.style.transform = `translateY(${-capQ * 18}px)`;
    captionNodes.forEach((node, i) => {
      const p = sp(t, 14.7 + i * 0.34, SPRINGS.soft);
      node.style.opacity = clamp(p);
      node.style.transform = `translateY(${(1 - p) * 10}px)`;
    });

    // Transcript card: morphs out of the waveform, then into the day list.
    const m1 = sp(t, T.card, SPRINGS.soft);
    const m2 = sp(t, T.list + 0.05, SPRINGS.soft);
    place(tcard, lerpRect(lerpRect(WAVE_RECT, CARD_RECT, m1), ROW1_RECT, m2));
    tcard.style.opacity = clamp(sp(t, T.card - 0.05, SPRINGS.snappy));
    const tcP = sp(t, 20.6, SPRINGS.soft);
    const tcQ = sp(t, T.list - 0.1, SPRINGS.snappy);
    tcIn.style.opacity = clamp(tcP) * (1 - clamp(tcQ));
    tcIn.style.transform = `translateY(${(1 - tcP) * 12}px)`;
    highlights.forEach((node, k) => {
      const p = clamp(sp(t, 21.2 + k * 0.12, SPRINGS.soft));
      node.style.background = `rgba(126, 146, 117, ${0.24 * p})`;
      node.style.color = hexMix("#3b413c", C.sageDeep, p);
    });
    tags.forEach((tag, i) => {
      const p = sp(t, 21.55 + i * 0.13, SPRINGS.bouncy);
      tag.style.opacity = clamp(p);
      tag.style.transform = `translateY(${(1 - p) * 8}px) scale(${0.85 + 0.15 * p})`;
    });
    const okP = sp(t, 23.3, SPRINGS.soft);
    tcOk.style.opacity = clamp(okP);
    tcOk.style.transform = `translateX(${(1 - okP) * -10}px)`;

    TASKS.forEach((task, i) => {
      const y = ROW_Y(i);
      if (i === 1) {
        const p = sp(t, T.list + 0.45, SPRINGS.soft);
        style(rowIns[i], { top: `${y}px`, opacity: clamp(p), transform: `translateY(${(1 - p) * 6}px)` });
        return;
      }
      const p = sp(t, rowTimes[i], SPRINGS.soft);
      const transform = `translateY(${(1 - p) * 18}px) scale(${0.97 + 0.03 * p})`;
      style(rowBgs[i], { top: `${y}px`, opacity: clamp(p), transform });
      style(rowIns[i], { top: `${y}px`, opacity: clamp(p), transform });
    });
  });

  // ---------- Panel: time, then traceability ----------

  const panel = h("div", "panel");
  const kA = h("div", "pk", panel, "03 · Temps de travail");
  const kB = h("div", "pk", panel, "04 · Traçabilité");
  h("div", "pt", panel, "Mardi 12 mai");
  h("div", "ptot-l", panel, "Temps total");
  const total = h("div", "ptot num", panel, "0\u00a0h\u00a000");

  const X0 = 230;
  const X1 = 1052;
  const K = (X1 - X0) / (DAY_END - DAY_START);
  const LANE_Y = (j) => 160 + j * 124;
  const xOf = (min) => X0 + (min - DAY_START) * K;

  const timelineNodes = [];
  LANES.forEach((name, j) => {
    const lane = h("div", "lane", panel);
    lane.style.top = `${LANE_Y(j)}px`;
    const label = h("div", "lane-l", panel, name);
    label.style.top = `${LANE_Y(j) + 40}px`;
    timelineNodes.push({ node: lane, delay: j * 0.08 }, { node: label, delay: j * 0.08 });
  });
  for (let min = DAY_START; min <= 720; min += 60) {
    const g = h("div", "grid", panel);
    style(g, { left: `${xOf(min)}px`, top: "150px", height: "380px" });
    const lab = h("div", "hour num", panel, clock(min));
    style(lab, { left: `${xOf(min)}px`, top: "548px" });
    timelineNodes.push({ node: g, delay: 0.2 }, { node: lab, delay: 0.25 });
  }

  const ROWT = (i) => 214 + i * 92;
  const traceNodes = [];
  [["Parcelle", 48], ["Tâche", 330], ["Horaire", 590], ["Durée", 790]].forEach(([label, x]) => {
    const th = h("div", "th", panel, label);
    th.style.left = `${x}px`;
    traceNodes.push({ node: th, delay: 0 });
  });
  const hl = h("div", "tr-hl", panel);
  TASKS.forEach((task, i) => {
    const y = ROWT(i);
    const line = h("div", "tr-line", panel);
    line.style.top = `${y - 8}px`;
    traceNodes.push({ node: line, delay: 0.05 + i * 0.09 });
    [
      ["tcell p", 48, task.parcel],
      ["tcell", 330, task.name],
      ["tcell m num", 590, `${clock(task.start)} – ${clock(task.end)}`],
    ].forEach(([cls, x, text]) => {
      const cell = h("div", cls, panel, text);
      style(cell, { left: `${x}px`, top: `${y + 28}px` });
      traceNodes.push({ node: cell, delay: 0.1 + i * 0.09, dx: 14 });
    });
  });
  const lastLine = h("div", "tr-line", panel);
  lastLine.style.top = `${ROWT(4) - 8}px`;
  traceNodes.push({ node: lastLine, delay: 0.45 });

  const foot = h("div", "foot", panel, "<span>4 actions · 3 parcelles</span>");
  const okchip = h("span", "okchip", foot, `${ICON.check}Registre à jour`);
  const exportBtn = h("div", "export", panel, `${ICON.download}Exporter le registre`);
  const toast = h("div", "toast", panel, `${ICON.checkCircle}Registre exporté en PDF`);

  const blocks = TASKS.map((task) => {
    const b = h("div", "tblock", panel);
    b.style.background = task.color;
    const bt = h("div", "bt", b, task.short);
    const bd = h("div", "bd num", b, dur(task.end - task.start));
    return { b, bt, bd };
  });

  const playhead = h("div", "playhead", panel, "<b class=num>07:00</b>");
  const playLabel = playhead.querySelector("b");

  on((t) => {
    const p = sp(t, T.list, SPRINGS.soft);
    const q = sp(t, T.demoOut, SPRINGS.snappy);
    const P = L.panel;
    panel.style.transform = `translate(${P.x}px, ${P.y + (1 - p) * 40 + q * 70}px) scale(${P.s * (0.98 + 0.02 * p)})`;
    panel.style.opacity = clamp(p) * (1 - clamp(q));

    const toTrace = sp(t, T.trace, SPRINGS.snappy);
    kA.style.opacity = 1 - clamp(toTrace);
    kA.style.transform = `translateY(${-toTrace * 10}px)`;
    const kb = sp(t, T.trace + 0.1, SPRINGS.soft);
    kB.style.opacity = clamp(kb);
    kB.style.transform = `translateY(${(1 - kb) * 10}px)`;

    const pm = t < T.playStart ? DAY_START : playMinute(t);
    const tlOut = clamp(sp(t, T.trace - 0.1, SPRINGS.snappy));
    timelineNodes.forEach(({ node, delay }) => {
      const a = sp(t, T.list + 0.3 + delay, SPRINGS.soft);
      node.style.opacity = clamp(a) * (1 - tlOut);
      node.style.transform = `${node.classList.contains("hour") ? "translateX(-50%) " : ""}translateY(${(1 - a) * 12}px)`;
    });

    let sum = 0;
    blocks.forEach(({ b, bt, bd }, i) => {
      const task = TASKS[i];
      const length = task.end - task.start;
      const grow = clamp((pm - task.start) / length);
      sum += length * grow;
      const m = sp(t, T.trace + 0.2 + i * 0.07, SPRINGS.soft);
      const timelineRect = { x: xOf(task.start), y: LANE_Y(task.lane) + 14, w: length * K * grow, h: 76, r: 14 };
      const traceRect = { x: 790, y: ROWT(i) + 18, w: length * 2.9, h: 46, r: 12 };
      place(b, lerpRect(timelineRect, traceRect, m));
      b.style.opacity = grow > 0 ? 1 : 0;
      const labelOn = clamp((grow - 0.55) / 0.3);
      bt.style.opacity = labelOn * (1 - clamp(m * 1.6));
      bd.style.opacity = labelOn;
      bd.style.top = `${mix(42, 13, m)}px`;
    });
    total.textContent = hm(t >= T.trace ? 255 : sum);
    chipTotal.textContent = hm(t >= T.trace ? 255 : sum);

    const pv = clamp(sp(t, 26.9, SPRINGS.soft)) * (1 - clamp(sp(t, 33.0, SPRINGS.snappy)));
    playhead.style.opacity = pv;
    playhead.style.left = `${xOf(pm)}px`;
    playLabel.textContent = clock(pm);

    traceNodes.forEach(({ node, delay, dx = 0 }) => {
      const a = sp(t, T.trace + 0.55 + delay, SPRINGS.soft);
      node.style.opacity = clamp(a);
      node.style.transform = `translate(${(1 - a) * dx}px, ${(1 - a) * 10}px)`;
    });

    const hlIndex = [0, 1, 2].reduce((acc, k) => acc + sp(t, 37.2 + k * 0.6, SPRINGS.soft), 0);
    hl.style.top = `${ROWT(0) - 6 + hlIndex * 92}px`;
    hl.style.opacity = clamp(sp(t, 36.9, SPRINGS.soft)) * (1 - clamp(sp(t, 39.3, SPRINGS.snappy)));

    const fp = sp(t, T.trace + 1.8, SPRINGS.soft);
    foot.style.opacity = clamp(fp);
    foot.style.transform = `translateY(${(1 - fp) * 12}px)`;
    const ok = sp(t, T.trace + 2.2, SPRINGS.bouncy);
    okchip.style.opacity = clamp(ok);
    okchip.style.transform = `scale(${0.8 + 0.2 * ok})`;

    const ep = sp(t, T.trace + 2.0, SPRINGS.soft);
    const bump = sp(t, 39.6, SPRINGS.snappy) - sp(t, 39.78, SPRINGS.bouncy);
    exportBtn.style.opacity = clamp(ep);
    exportBtn.style.transform = `translateY(${(1 - ep) * 12}px) scale(${1 - 0.07 * bump})`;
    exportBtn.style.background = hexMix(C.ink, C.sageDeep, clamp(sp(t, 39.6, SPRINGS.soft)));

    const tp = sp(t, 39.95, SPRINGS.bouncy);
    const tq = sp(t, 41.6, SPRINGS.snappy);
    toast.style.opacity = clamp(tp) * (1 - clamp(tq));
    toast.style.transform = `translateY(${(1 - tp) * 16 - tq * 8}px) scale(${0.92 + 0.08 * tp})`;
  });

  // ---------- 4. Benefits ----------

  const bTitle = h("div", "block benefits-title");
  kinetic(h("div", "line", bTitle), "Moins de saisie.", { start: T.benefits, exit: T.benefitsOut });
  kinetic(h("div", "line", bTitle), "Plus de preuves.", { start: T.benefits + 0.3, exit: T.benefitsOut + 0.05, accent: [2] });

  const cards = h("div", "block cards");
  [
    { icon: ICON.clock, bg: "#dfe5d8", fg: C.sageDeep, title: "Du temps gagné", text: "La note se prend en marchant. Plus de carnet à recopier le soir." },
    { icon: ICON.shield, bg: "#f3e0d6", fg: C.terra, title: "Une traçabilité fiable", text: "Chaque action est datée, rattachée à sa parcelle et chiffrée en temps." },
    { icon: ICON.mic, bg: "#e1e9ec", fg: C.water, title: "Rien à apprendre", text: "Une voix, aucun formulaire. Thomas range tout seul." },
  ].forEach((item, i) => {
    const card = h("article", "bcard", cards);
    const ic = h("div", "ic", card, item.icon);
    style(ic, { background: item.bg, color: item.fg });
    h("h3", null, card, item.title);
    h("p", null, card, item.text);
    on((t) => {
      const p = sp(t, 43.3 + i * 0.16, SPRINGS.soft);
      const q = sp(t, T.benefitsOut + 0.1 + i * 0.05, SPRINGS.snappy);
      card.style.opacity = clamp(p) * (1 - clamp(q));
      card.style.transform = `translateY(${(1 - p) * 50 - q * 24}px) scale(${0.97 + 0.03 * p})`;
      const b = sp(t, 43.55 + i * 0.16, SPRINGS.bouncy);
      ic.style.transform = `scale(${0.6 + 0.4 * b})`;
    });
  });

  const proof = h("div", "block proof");
  kinetic(proof, "Ce matin\u00a0: 4\u00a0actions, 4\u00a0h\u00a015 de travail tracé, aucune saisie à la main.", {
    start: 45.2,
    stagger: 0.06,
    exit: T.benefitsOut + 0.2,
    accent: [2, 3, 7, 8],
    accentClass: "accent-sage",
  });

  // ---------- 5. CTA ----------

  const cta = h("div", "block cta");
  const mark = h("div", "mark", cta);
  const markBars = [28, 52, 72, 44, 30].map((v) => {
    const i = h("i", null, mark);
    i.style.height = `${v}px`;
    return { i, v };
  });
  const wordmark = h("div", "wordmark", cta);
  kinetic(wordmark, "T h o m a s", { start: 52.55, stagger: 0.04, exit: T.ctaOut + 0.05 });
  wordmark.querySelectorAll(".mask").forEach((m) => {
    if (m.nextSibling && m.nextSibling.nodeType === 3) m.nextSibling.remove();
  });
  const tagline = h("div", "tagline", cta);
  kinetic(tagline, "Parlez. C’est tracé.", { start: 53.25, stagger: 0.08, exit: T.ctaOut + 0.1, accent: [1, 2] });
  const ctaSub = h("div", "cta-sub", cta, "L’assistant vocal des maraîchers.");
  fade(ctaSub, 53.9, T.ctaOut + 0.15, { dy: 14 });
  const button = h("div", "button", cta, `Essayer Thomas<span class="arrow">${ICON.arrow}</span>`);
  const arrow = button.querySelector(".arrow");

  on((t) => {
    const p = sp(t, T.cta, SPRINGS.bouncy);
    const q = sp(t, T.ctaOut, SPRINGS.snappy);
    mark.style.opacity = clamp(p) * (1 - clamp(q));
    mark.style.transform = `translateY(${-q * 24}px) scale(${0.7 + 0.3 * p}) rotate(${(1 - p) * -8}deg)`;
    markBars.forEach(({ i, v }, k) => {
      i.style.height = `${v * (0.78 + 0.22 * Math.sin(t * 3.2 + k * 1.1))}px`;
    });

    const bp = sp(t, 54.4, SPRINGS.bouncy);
    const bq = sp(t, T.ctaOut + 0.2, SPRINGS.snappy);
    const press = sp(t, 55.7, SPRINGS.snappy) - sp(t, 55.88, SPRINGS.bouncy);
    button.style.opacity = clamp(bp) * (1 - clamp(bq));
    button.style.transform = `translateY(${(1 - bp) * 20 - bq * 20}px) scale(${(0.9 + 0.1 * bp) * (1 - 0.05 * press)})`;
    button.style.background = hexMix(C.ink, C.sageDeep, clamp(sp(t, 55.7, SPRINGS.soft)));
    arrow.style.transform = `translateX(${clamp(sp(t, 56.2, SPRINGS.soft)) * 3 * Math.sin((t - 56.2) * 4)}px)`;
  });

  // ---------- Runtime ----------

  function render(t) {
    for (const fn of updates) fn(t);
  }

  window.__duration = DURATION;
  window.__format = FORMAT;
  window.__render = render;
  window.__ready = false;

  document.fonts.ready.then(() => {
    render(0);
    window.__ready = true;
    const fixed = params.get("t");
    if (fixed != null) {
      render(Number(fixed));
    } else if (params.get("play") === "1") {
      const started = performance.now();
      const loop = () => {
        render(((performance.now() - started) / 1000) % DURATION);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  });
})();
