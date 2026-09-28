const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const params = new URLSearchParams(location.search);
const filmId = params.get("film") || "1";
const autoplay = params.get("play") === "1";

const FILMS = {
  1: { title: "01  —  Présentation", duration: 60 },
  2: { title: "02  —  Temps de travail", duration: 40 },
  3: { title: "03  —  Paramétrage", duration: 38 },
  4: { title: "04  —  Le suivi", duration: 42 },
  5: { title: "05  —  Pour qui", duration: 42 },
};

const stage = document.getElementById("stage");
const meta = FILMS[filmId] || FILMS[1];

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function anim(node, keyframes, { delay = 0, duration = 0.6, easing = EASE, fill = "both", iterations = 1 } = {}) {
  const animation = node.animate(keyframes, {
    delay: Math.max(0, delay) * 1000,
    duration: Math.max(0.05, duration) * 1000,
    easing,
    fill,
    iterations,
  });
  animation.pause();
  animation.currentTime = 0;
  return animation;
}

function enter(node, delay, { y = 28, duration = 0.7 } = {}) {
  anim(node, [
    { opacity: 0, transform: `translateY(${y}px)` },
    { opacity: 1, transform: "translateY(0px)" },
  ], { delay, duration });
}

function pop(node, delay) {
  anim(node, [
    { opacity: 0, transform: "translateY(18px) scale(0.96)" },
    { opacity: 1, transform: "translateY(0px) scale(1)" },
  ], { delay, duration: 0.65 });
}

function rule(parent, delay, className = "rule") {
  const node = el("div", className);
  parent.append(node);
  anim(node, [
    { transform: "scaleX(0)" },
    { transform: "scaleX(1)" },
  ], { delay, duration: 0.55 });
  return node;
}

function text(parent, tag, className, value, delay, opts) {
  const node = el(tag, className);
  node.textContent = value;
  parent.append(node);
  enter(node, delay, opts);
  return node;
}

function typeLine(parent, className, value, delay) {
  const node = el("p", className);
  enter(node, delay, { y: 16, duration: 0.4 });
  let t = delay + 0.15;
  const words = value.split(" ");
  words.forEach((word, index) => {
    const holder = el("span", "word");
    for (const ch of word) {
      const span = el("span", "ch");
      span.textContent = ch;
      holder.append(span);
      anim(span, [{ opacity: 0 }, { opacity: 1 }], {
        delay: t,
        duration: 0.04,
        easing: "linear",
      });
      t += 0.026;
    }
    node.append(holder);
    if (index < words.length - 1) {
      const space = el("span", "ch");
      space.textContent = " ";
      node.append(space);
      anim(space, [{ opacity: 0 }, { opacity: 1 }], {
        delay: t,
        duration: 0.04,
        easing: "linear",
      });
      t += 0.014;
    }
  });
  parent.append(node);
  return { node, end: t };
}

function mascot(parent, name, className, delay) {
  const wrap = el("div", "mascot-wrap");
  const img = el("img", `mascot ${className || ""}`.trim());
  img.src = `assets/${name}.jpg`;
  img.alt = "";
  wrap.append(img);
  parent.append(wrap);
  anim(wrap, [
    { opacity: 0, transform: "translateY(24px) scale(0.96)" },
    { opacity: 1, transform: "translateY(0px) scale(1)" },
  ], { delay, duration: 0.8 });
  anim(img, [
    { transform: "translateY(0px)" },
    { transform: "translateY(-8px)", offset: 0.5 },
    { transform: "translateY(0px)" },
  ], {
    delay: delay + 0.4,
    duration: 3.4,
    easing: "ease-in-out",
    iterations: 6,
  });
  return img;
}

function addScene(start, end, layout, build, { hold = false } = {}) {
  const scene = el("section", "scene");
  const inner = el("div", `scene-inner ${layout}`);
  scene.append(inner);
  stage.append(scene);
  const dur = end - start;
  const fadeIn = Math.min(0.4, dur * 0.18);
  const fadeOut = hold ? 0 : Math.min(0.4, dur * 0.16);
  if (hold) {
    anim(scene, [
      { opacity: 0 },
      { opacity: 1, offset: fadeIn / dur },
      { opacity: 1, offset: 1 },
    ], { delay: start, duration: dur, easing: "linear" });
  } else {
    anim(scene, [
      { opacity: 0 },
      { opacity: 1, offset: fadeIn / dur },
      { opacity: 1, offset: 1 - fadeOut / dur },
      { opacity: 0 },
    ], { delay: start, duration: dur, easing: "linear" });
  }
  build(inner, start);
}

function wash(parent, kind) {
  const node = el("div", `wash ${kind}`);
  parent.append(node);
}

function backdrop(parent, file) {
  const node = el("div", "bg");
  node.style.backgroundImage = `url("assets/${file}.jpg")`;
  parent.append(node);
}

function chip(parent, label, value, delay) {
  const node = el("span", "chip");
  const i = el("i");
  i.textContent = label;
  node.append(i, document.createTextNode(value));
  parent.append(node);
  pop(node, delay);
  return node;
}

function brand() {
  const node = el("div", "brand");
  node.append(el("span", "logo-tom"));
  const name = el("span");
  name.textContent = "Thomas";
  node.append(name);
  stage.append(node);
  enter(node, 0.15, { y: 10, duration: 0.5 });

  const series = el("div", "series");
  series.textContent = meta.title;
  stage.append(series);
  enter(series, 0.3, { y: 8, duration: 0.5 });

  const bar = el("div", "progress");
  const fill = el("span");
  bar.append(fill);
  stage.append(bar);
  anim(fill, [
    { transform: "scaleX(0)" },
    { transform: "scaleX(1)" },
  ], { delay: 0, duration: meta.duration, easing: "linear" });
}

function film1() {
  addScene(0, 8.5, "layout-center", (root, t) => {
    wash(root, "green");
    text(root, "p", "kicker", "Assistant agricole", t + 0.25);
    text(root, "h1", "display", "Thomas", t + 0.4);
    rule(root, t + 0.7);
    mascot(root, "thomas-wave", "md", t + 0.55);
    text(root, "p", "lede", "Le maraîchage, noté en parlant.", t + 1.15);
  });

  addScene(8.1, 21, "layout-split", (root, t) => {
    wash(root, "tomato");
    const left = el("div", "stack center");
    root.append(left);
    mascot(left, "thomas-mic", "lg", t + 0.2);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Le geste", t + 0.2);
    text(right, "h2", "title", "Vous parlez. Thomas comprend.", t + 0.35);
    const chat = el("div", "chat");
    right.append(chat);
    const typed = typeLine(
      chat,
      "bubble user",
      "J’ai récolté des tomates pendant 1 h dans la serre 1.",
      t + 1.1
    );
    const reply = el("p", "bubble thomas");
    const mini = el("img", "mini");
    mini.src = "assets/thomas-wave.jpg";
    mini.alt = "";
    const replyText = el("span");
    replyText.textContent = "C’est noté. Récolte, durée, culture, parcelle.";
    reply.append(mini, replyText);
    chat.append(reply);
    enter(reply, typed.end + 0.25);
    const chips = el("div", "chips");
    right.append(chips);
    const base = typed.end + 0.7;
    chip(chips, "Action", "Récolte", base);
    chip(chips, "Culture", "Tomates", base + 0.15);
    chip(chips, "Durée", "1 h", base + 0.3);
    chip(chips, "Lieu", "Serre 1", base + 0.45);
  });

  addScene(20.6, 34.2, "layout-split", (root, t) => {
    wash(root, "green");
    const left = el("div", "stack");
    root.append(left);
    text(left, "p", "kicker", "La fiche", t + 0.2);
    text(left, "h2", "title sm", "Un message devient une trace claire.", t + 0.35);
    rule(left, t + 0.6);
    text(left, "p", "lede narrow", "Tâche faite ou à venir, observation, récolte. En français, à voix haute ou par écrit.", t + 0.7);
    mascot(left, "thomas-point", "sm", t + 0.5);

    const card = el("article", "fiche");
    root.append(card);
    const head = el("div", "head");
    head.textContent = "Tâche enregistrée";
    card.append(head);
    enter(card, t + 0.45);
    const rows = [
      ["Nature", "Récolte"],
      ["Culture", "Tomates"],
      ["Durée", "1 heure"],
      ["Parcelle", "Serre 1"],
      ["Statut", "Faite"],
    ];
    rows.forEach(([k, v], i) => {
      const row = el("div", "row");
      const s = el("span");
      s.textContent = k;
      const b = el("strong");
      b.textContent = v;
      row.append(s, b);
      card.append(row);
      enter(row, t + 0.9 + i * 0.28, { y: 12, duration: 0.45 });
    });
  });

  addScene(33.8, 48.2, "layout-left", (root, t) => {
    wash(root, "blue");
    text(root, "p", "kicker", "Autour du message", t + 0.15);
    text(root, "h2", "display sm", "Vocal ou écrit.", t + 0.3);
    text(root, "p", "lede", "Thomas comprend le français du terrain, et range la journée.", t + 0.5);
    const tiles = el("div", "tiles");
    root.append(tiles);
    const items = [
      ["tile", "Tâche faite", "Ce qui vient d’être fait, avec sa durée."],
      ["tile blue", "Tâche à venir", "Ce qui est prévu, pour le planning."],
      ["tile orange", "Observation", "Un constat : pucerons, mildiou, vigueur."],
      ["tile tomato", "Récolte", "Quantités, et vos unités à vous."],
    ];
    items.forEach(([cls, title, body], i) => {
      const tile = el("article", `tile ${cls}`);
      const b = el("b");
      b.textContent = title;
      const s = el("span");
      s.textContent = body;
      tile.append(b, s);
      tiles.append(tile);
      pop(tile, t + 1.05 + i * 0.16);
    });
    text(root, "p", "note", "Sans réseau, le message attend et part dès que la connexion revient.", t + 2.2);
  });

  addScene(47.8, 60, "layout-end", (root, t) => {
    backdrop(root, "bg-serre");
    const left = el("div");
    root.append(left);
    mascot(left, "thomas-wave", "lg", t + 0.2);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Thomas", t + 0.3);
    text(right, "h2", "display sm", "Vous travaillez.", t + 0.45);
    text(right, "h2", "display sm", "Thomas retient.", t + 1.05);
    rule(right, t + 1.7);
    text(right, "p", "lede narrow", "L’assistant agricole des maraîchers.", t + 1.9);
  }, { hold: true });
}

function film2() {
  addScene(0, 8.2, "layout-split", (root, t) => {
    wash(root, "tomato");
    const left = el("div");
    root.append(left);
    mascot(left, "thomas-clock", "lg", t + 0.2);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Temps de travail", t + 0.25);
    text(right, "h2", "display sm", "Le temps est votre premier intrant.", t + 0.4);
    rule(right, t + 0.85);
    text(right, "p", "lede narrow", "En maraîchage, les heures décident du prix, des priorités, et de la semaine.", t + 1.05);
  });

  addScene(7.8, 18.2, "layout-left", (root, t) => {
    wash(root, "green");
    text(root, "p", "kicker", "Dans la phrase", t + 0.15);
    text(root, "h2", "title", "La durée est dans le message.", t + 0.3);
    const chat = el("div", "chat");
    root.append(chat);
    const typed = typeLine(
      chat,
      "bubble user",
      "J’ai désherbé des tomates et des courgettes pendant 3 heures.",
      t + 0.9
    );
    text(root, "p", "note", "Plusieurs cultures : Thomas répartit le temps, selon les surfaces.", typed.end + 0.15);
    const bar = el("div", "splitbar");
    root.append(bar);
    const a = el("div", "half a");
    a.textContent = "Tomates · 1 h 30";
    const b = el("div", "half b");
    b.textContent = "Courgettes · 1 h 30";
    bar.append(a, b);
    const splitAt = typed.end + 0.35;
    anim(a, [
      { transform: "scaleX(0)" },
      { transform: "scaleX(1)" },
    ], { delay: splitAt, duration: 0.8 });
    anim(b, [
      { transform: "scaleX(0)" },
      { transform: "scaleX(1)" },
    ], { delay: splitAt + 0.15, duration: 0.8 });
  });

  addScene(17.8, 29.6, "layout-chart", (root, t) => {
    wash(root, "green");
    const left = el("div", "stack");
    root.append(left);
    text(left, "p", "kicker", "Lecture", t + 0.15);
    text(left, "h2", "title", "Temps par culture.", t + 0.3);
    text(left, "p", "example", "Exemple de semaine", t + 0.5);

    const parts = [
      { name: "Tomates", hours: 8.4, color: "#e23b2f" },
      { name: "Courgettes", hours: 6.1, color: "#2f8a4e" },
      { name: "Laitues", hours: 3.5, color: "#e0a106" },
      { name: "Radis", hours: 1.8, color: "#7c8c4a" },
    ];
    const total = parts.reduce((s, p) => s + p.hours, 0);
    const wrap = el("div", "donut-wrap");
    left.append(wrap);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    const r = 72;
    const c = 2 * Math.PI * r;
    const gap = 8;
    let angle = -90;
    parts.forEach((part, i) => {
      const len = (part.hours / total) * (c - gap * parts.length);
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "100");
      circle.setAttribute("cy", "100");
      circle.setAttribute("r", String(r));
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", part.color);
      circle.setAttribute("stroke-width", "22");
      circle.setAttribute("stroke-linecap", "butt");
      circle.style.strokeDasharray = `${len} ${c}`;
      circle.style.transformBox = "fill-box";
      circle.style.transformOrigin = "center";
      circle.style.transform = `rotate(${angle}deg)`;
      svg.append(circle);
      anim(circle, [
        { strokeDashoffset: c },
        { strokeDashoffset: 0 },
      ], { delay: t + 0.7 + i * 0.18, duration: 0.9 });
      angle += (len / c) * 360 + (gap / c) * 360;
    });
    wrap.append(svg);
    const center = el("div", "donut-center");
    const strong = el("strong");
    strong.textContent = "19,8 h";
    const span = el("span");
    span.textContent = "sur la semaine";
    center.append(strong, span);
    wrap.append(center);
    enter(center, t + 1.5);

    const legend = el("div", "legend");
    root.append(legend);
    text(legend, "p", "kicker", "Et aussi", t + 0.4);
    parts.forEach((part, i) => {
      const item = el("div", "item");
      const sw = el("i", "swatch");
      sw.style.background = part.color;
      const name = el("span");
      name.textContent = part.name;
      const hours = el("em");
      hours.textContent = String(part.hours).replace(".", ",") + " h";
      item.append(sw, name, hours);
      legend.append(item);
      enter(item, t + 0.85 + i * 0.16, { y: 14, duration: 0.45 });
    });
    const extra = el("p", "note");
    extra.textContent = "Le même temps se lit par parcelle, par tâche, et dans la durée.";
    legend.append(extra);
    enter(extra, t + 2.1);
  });

  addScene(29.1, 40, "layout-left", (root, t) => {
    wash(root, "tomato");
    text(root, "p", "kicker", "La semaine", t + 0.15);
    text(root, "h2", "title", "Voir où passent les heures.", t + 0.28);
    const days = [
      ["Lun", [1.4, 0.8, 0.4]],
      ["Mar", [1.8, 1.0, 0.5]],
      ["Mer", [2.1, 0.5, 0.9]],
      ["Jeu", [1.2, 1.6, 0.4]],
      ["Ven", [1.5, 1.4, 0.6]],
      ["Sam", [0.4, 0.8, 0.7]],
    ];
    const colors = ["#e23b2f", "#2f8a4e", "#e0a106"];
    const week = el("div", "week");
    root.append(week);
    const max = 3.6;
    const maxH = 250;
    days.forEach((day, i) => {
      const col = el("div", "col");
      const stackbar = el("div", "stackbar");
      day[1].forEach((value, j) => {
        const bit = el("div", "bit");
        bit.style.height = `${(value / max) * maxH}px`;
        bit.style.background = colors[j];
        stackbar.append(bit);
        anim(bit, [
          { transform: "scaleY(0)" },
          { transform: "scaleY(1)" },
        ], { delay: t + 0.55 + i * 0.08 + j * 0.05, duration: 0.7 });
      });
      const label = el("label");
      label.textContent = day[0];
      col.append(stackbar, label);
      week.append(col);
    });
    text(root, "p", "lede narrow", "Chiffrer juste. Prioriser la semaine. Comparer les saisons.", t + 1.6);
  }, { hold: true });
}

function film3() {
  addScene(0, 7.2, "layout-split", (root, t) => {
    wash(root, "green");
    const left = el("div");
    root.append(left);
    mascot(left, "thomas-shrug", "lg", t + 0.15);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Paramétrage", t + 0.25);
    text(right, "h2", "display sm", "Avec vos mots.", t + 0.4);
    text(right, "h2", "display sm", "Si vous voulez.", t + 0.95);
    rule(right, t + 1.55);
    text(right, "p", "lede narrow", "Parcelles, matériel, unités. Depuis le chat, ou depuis les réglages.", t + 1.7);
  });

  addScene(6.8, 18.6, "layout-left", (root, t) => {
    wash(root, "blue");
    text(root, "p", "kicker", "Depuis un message", t + 0.15);
    text(root, "h2", "title", "La ferme se décrit en parlant.", t + 0.3);
    const rows = [
      ["Crée une serre plastique : Serre 1.", "Parcelle", "Serre 1 · serre plastique"],
      ["Ajoute le vibroculteur.", "Matériel", "Vibroculteur"],
      ["Une caisse de tomates fait 5 kg.", "Conversion", "1 caisse = 5 kg"],
    ];
    rows.forEach((row, i) => {
      const line = el("div", "chat");
      line.style.maxWidth = "1280px";
      root.append(line);
      const bubble = el("p", "bubble user");
      bubble.textContent = row[0];
      line.append(bubble);
      enter(bubble, t + 0.7 + i * 1.5, { y: 16, duration: 0.45 });
      const chips = el("div", "chips");
      line.append(chips);
      chip(chips, row[1], row[2], t + 1.15 + i * 1.5);
    });
  });

  addScene(18.1, 28.1, "layout-center", (root, t) => {
    wash(root, "green");
    text(root, "p", "kicker", "Deux chemins", t + 0.15);
    text(root, "h2", "display sm", "Au choix.", t + 0.3);
    const paths = el("div", "paths");
    root.append(paths);
    const cards = [
      ["Dans le chat", "En message", "« Crée la serre 1. » Thomas prépare la parcelle, le matériel ou l’unité."],
      ["Dans les réglages", "Profil → Configuration", "Parcelles, matériel, conversions. Les mêmes informations, dans les écrans."],
    ];
    cards.forEach((card, i) => {
      const path = el("article", "path");
      const tag = el("div", "tag");
      tag.textContent = card[0];
      const h = el("h3");
      h.textContent = card[1];
      const p = el("p");
      p.textContent = card[2];
      path.append(tag, h, p);
      paths.append(path);
      pop(path, t + 0.7 + i * 0.2);
    });
  });

  addScene(27.6, 38, "layout-split", (root, t) => {
    wash(root, "tomato");
    const left = el("div");
    root.append(left);
    mascot(left, "thomas-mic", "lg", t + 0.2);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Pas obligatoire", t + 0.25);
    text(right, "h2", "title", "On peut commencer sans rien régler.", t + 0.4);
    text(right, "p", "lede narrow", "Racontez la journée. S’il manque une parcelle ou une unité, Thomas le dit, et propose de la créer.", t + 0.7);
    const toast = el("div", "toast");
    toast.textContent = "Pas de conversion pour « caisse ». On la crée ?";
    right.append(toast);
    pop(toast, t + 1.7);
    text(right, "p", "note", "Maintenant, plus tard, ou jamais. Le suivi n’attend pas la configuration.", t + 2.3);
  }, { hold: true });
}

function film4() {
  addScene(0, 5.3, "layout-center", (root, t) => {
    wash(root, "green");
    text(root, "p", "kicker", "Le suivi", t + 0.15);
    text(root, "h2", "display sm", "Quatre traces.", t + 0.3);
    text(root, "h2", "display sm", "Un seul geste.", t + 0.85);
    mascot(root, "thomas-point", "sm", t + 0.45);
  });

  addScene(4.8, 14.3, "layout-split", (root, t) => {
    wash(root, "green");
    const left = el("div");
    root.append(left);
    mascot(left, "thomas-tools", "lg", t + 0.15);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Matériel", t + 0.2);
    text(right, "h2", "title", "Réglage, puis usage.", t + 0.35);
    const typed = typeLine(
      right,
      "bubble user",
      "J’ai passé le vibroculteur 20 minutes sur la planche 3.",
      t + 0.9
    );
    const chips = el("div", "chips");
    right.append(chips);
    chip(chips, "Outil", "Vibroculteur", typed.end + 0.2);
    chip(chips, "Durée", "20 min", typed.end + 0.35);
    chip(chips, "Lieu", "Planche 3", typed.end + 0.5);
    text(right, "p", "note", "On déclare le matériel une fois. Ensuite, Thomas le reconnaît dans la phrase.", typed.end + 0.85);
  });

  addScene(13.8, 23.3, "layout-chart", (root, t) => {
    wash(root, "phyto");
    const left = el("div", "stack");
    root.append(left);
    text(left, "p", "kicker", "Traitements", t + 0.15);
    text(left, "h2", "title", "Le phytosanitaire, daté.", t + 0.3);
    const typed = typeLine(
      left,
      "bubble user",
      "J’ai traité les tomates contre les pucerons avec la bouillie, 45 minutes.",
      t + 0.75
    );
    const tiles = el("div", "tiles");
    left.append(tiles);
    [
      ["tile phyto", "Produit", "Bouillie"],
      ["tile", "Cible", "Pucerons · tomates"],
      ["tile tomato", "Durée", "45 minutes"],
      ["tile blue", "Trace", "Liée à la culture"],
    ].forEach((item, i) => {
      const tile = el("article", item[0]);
      const b = el("b");
      b.textContent = item[1];
      const s = el("span");
      s.textContent = item[2];
      tile.append(b, s);
      tiles.append(tile);
      pop(tile, typed.end + 0.15 + i * 0.1);
    });
    const right = el("div");
    root.append(right);
    mascot(right, "thomas-tools", "md", t + 0.3);
  });

  addScene(22.8, 32.3, "layout-split", (root, t) => {
    wash(root, "obs");
    const left = el("div");
    root.append(left);
    mascot(left, "thomas-observe", "lg", t + 0.15);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Observations", t + 0.2);
    text(right, "h2", "title", "Le constat reste sur la parcelle.", t + 0.35);
    const typed = typeLine(
      right,
      "bubble user",
      "J’ai observé des pucerons sur les tomates, serre 1.",
      t + 0.85
    );
    const card = el("article", "fiche");
    right.append(card);
    const head = el("div", "head");
    head.textContent = "Observation";
    head.style.background = "#d9841a";
    card.append(head);
    [["Type", "Ravageurs"], ["Culture", "Tomates"], ["Lieu", "Serre 1"]].forEach(([k, v]) => {
      const row = el("div", "row");
      const s = el("span");
      s.textContent = k;
      const b = el("strong");
      b.textContent = v;
      row.append(s, b);
      card.append(row);
    });
    enter(card, typed.end + 0.2);
  });

  addScene(31.8, 42, "layout-split", (root, t) => {
    backdrop(root, "bg-marche");
    const left = el("div");
    root.append(left);
    mascot(left, "thomas-market", "lg", t + 0.15);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Ventes", t + 0.2);
    text(right, "h2", "title", "Le marché, dans le même fil.", t + 0.35);
    const typed = typeLine(
      right,
      "bubble user",
      "Vente au marché : 85 euros de tomates.",
      t + 0.8
    );
    const price = el("p", "price");
    price.textContent = "85 €";
    right.append(price);
    enter(price, typed.end + 0.15, { y: 20 });
    const chips = el("div", "chips");
    right.append(chips);
    chip(chips, "Type", "Vente directe", typed.end + 0.35);
    chip(chips, "Culture", "Tomates", typed.end + 0.5);
    text(right, "p", "note", "Matériel, traitements, observations, ventes. Tout part d’une phrase.", typed.end + 0.9);
  }, { hold: true });
}

function film5() {
  addScene(0, 7.2, "layout-center", (root, t) => {
    backdrop(root, "bg-serre");
    text(root, "p", "kicker", "Pour qui", t + 0.2);
    text(root, "h2", "display sm", "De la planche", t + 0.35);
    text(root, "h2", "display sm", "au collectif.", t + 0.85);
    mascot(root, "thomas-wave", "sm", t + 0.5);
  });

  addScene(6.8, 17.1, "layout-split", (root, t) => {
    wash(root, "green");
    const left = el("div");
    root.append(left);
    mascot(left, "thomas-field", "lg", t + 0.15);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Le maraîcher", t + 0.25);
    text(right, "h2", "title", "Seul entre les rangs.", t + 0.4);
    text(right, "p", "lede narrow", "Il dicte en marchant. Le soir, la journée est déjà écrite : heures, récoltes, constats.", t + 0.65);
    const tiles = el("div", "tiles");
    right.append(tiles);
    [
      ["tile", "Sans bureau", "Pas de formulaire en fin de journée."],
      ["tile tomato", "À sa façon", "Ses parcelles, ses caisses, ses mots."],
    ].forEach((item, i) => {
      const tile = el("article", item[0]);
      const b = el("b");
      b.textContent = item[1];
      const s = el("span");
      s.textContent = item[2];
      tile.append(b, s);
      tiles.append(tile);
      pop(tile, t + 1.4 + i * 0.15);
    });
  });

  addScene(16.6, 27.3, "layout-left", (root, t) => {
    wash(root, "blue");
    const row = el("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr 360px";
    row.style.gap = "24px";
    row.style.alignItems = "center";
    row.style.width = "100%";
    root.append(row);
    const left = el("div", "stack");
    row.append(left);
    text(left, "p", "kicker", "L’équipe de la ferme", t + 0.15);
    text(left, "h2", "title", "Chacun note. La ferme se souvient.", t + 0.3);
    text(left, "p", "lede narrow", "Propriétaire, responsable, salarié, conseiller : le même fil, des accès différents.", t + 0.55);
    const roles = el("div", "roles");
    left.append(roles);
    [
      ["Propriétaire", "La ferme, les membres"],
      ["Responsable", "Parcelles, tâches, équipe"],
      ["Salarié", "Ce qu’il fait, ce qu’il voit"],
      ["Conseiller", "Présent auprès de la ferme"],
    ].forEach((role, i) => {
      const card = el("article", "role");
      const b = el("b");
      b.textContent = role[0];
      const s = el("span");
      s.textContent = role[1];
      card.append(b, s);
      roles.append(card);
      pop(card, t + 1.15 + i * 0.12);
    });
    const right = el("div");
    row.append(right);
    mascot(right, "thomas-advisor", "md", t + 0.25);
  });

  addScene(26.8, 42, "layout-split", (root, t) => {
    wash(root, "tomato");
    const left = el("div");
    root.append(left);
    mascot(left, "thomas-community", "lg", t + 0.2);
    const right = el("div", "stack");
    root.append(right);
    text(right, "p", "kicker", "Les communautés", t + 0.25);
    text(right, "h2", "title", "Celles et ceux qui relient les maraîchers.", t + 0.4);
    text(right, "p", "lede narrow", "Un animateur ou un conseiller rassemble. Un maraîcher rejoint, est invité, ou demande à entrer.", t + 0.7);
    const steps = el("div", "steps");
    right.append(steps);
    [
      ["01", "Rejoindre", "Une communauté ouverte, ou sur validation."],
      ["02", "Inviter", "Un maraîcher, un conseiller, un administrateur."],
      ["03", "Accueillir", "La demande d’entrée, quand le groupe le souhaite."],
    ].forEach((step, i) => {
      const card = el("article", "step");
      const n = el("div", "n");
      n.textContent = step[0];
      const body = el("div");
      const b = el("b");
      b.textContent = step[1];
      const s = el("span");
      s.textContent = step[2];
      body.append(b, s);
      card.append(n, body);
      steps.append(card);
      enter(card, t + 1.35 + i * 0.22, { y: 16, duration: 0.5 });
    });
    text(right, "p", "note", "Thomas sert le maraîcher sur sa planche, et le collectif qui l’accompagne.", t + 2.4);
  }, { hold: true });
}

const builders = { 1: film1, 2: film2, 3: film3, 4: film4, 5: film5 };
brand();
(builders[filmId] || film1)();

window.__duration = meta.duration;
window.__seek = (ms) => {
  document.getAnimations().forEach((animation) => {
    animation.pause();
    const limit = animation.effect.getComputedTiming().endTime;
    animation.currentTime = Math.max(0, Math.min(ms, limit));
  });
};

window.__ready = false;
Promise.all([
  document.fonts.ready,
  ...[...document.images].map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())),
]).then(() => {
  window.__seek(0);
  window.__ready = true;
  if (autoplay) {
    const started = performance.now();
    const loop = () => {
      window.__seek(performance.now() - started);
      if (performance.now() - started < meta.duration * 1000) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
});
