const main = document.querySelector("main");
const fileName = (location.pathname.split("/").pop() || "index.html").split("?")[0];
const draftKey = `thomas-v3-draft:${fileName}`;
const bar = document.createElement("div");

bar.className = "editor-bar";
bar.dataset.editorUi = "true";
bar.dataset.state = "idle";
document.body.appendChild(bar);

main.setAttribute("contenteditable", "true");
main.setAttribute("spellcheck", "true");
main.setAttribute("aria-label", "Contenu éditable");

let timer = null;
let saving = false;

function setStatus(state, text) {
  bar.dataset.state = state;
  bar.textContent = text;
}

function serialize() {
  const copy = document.documentElement.cloneNode(true);
  copy.querySelectorAll("[data-editor-ui]").forEach((node) => node.remove());
  copy.querySelector("main")?.removeAttribute("contenteditable");
  copy.querySelector("main")?.removeAttribute("aria-label");
  return `<!DOCTYPE html>\n${copy.outerHTML}\n`;
}

async function save() {
  const html = serialize();
  localStorage.setItem(draftKey, html);
  if (location.protocol === "file:") {
    setStatus("error", "Modifié dans le navigateur. Ouvre le serveur local pour écrire le fichier.");
    return;
  }

  saving = true;
  setStatus("idle", "Enregistrement…");
  try {
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: fileName, html })
    });
    if (!response.ok) throw new Error(await response.text());
    localStorage.removeItem(draftKey);
    setStatus("saved", "Enregistré dans le fichier");
  } catch (error) {
    setStatus("error", "Non enregistré dans le fichier. Le texte reste dans ce navigateur.");
  } finally {
    saving = false;
  }
}

function scheduleSave() {
  setStatus("idle", "Modification en cours");
  clearTimeout(timer);
  timer = setTimeout(save, 700);
}

if (location.protocol === "file:") {
  const draft = localStorage.getItem(draftKey);
  if (draft) {
    const parsed = new DOMParser().parseFromString(draft, "text/html");
    const savedMain = parsed.querySelector("main");
    if (savedMain) main.innerHTML = savedMain.innerHTML;
    setStatus("error", "Brouillon local restauré. Lance le serveur pour l’écrire dans le fichier.");
  } else {
    setStatus("idle", "Clique dans le texte pour modifier. Lance le serveur pour enregistrer le fichier.");
  }
} else {
  setStatus("saved", "Édition directe. Les changements s’enregistrent dans le fichier.");
}

main.addEventListener("input", scheduleSave);
main.addEventListener("blur", () => {
  if (!saving) save();
}, true);

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    clearTimeout(timer);
    save();
  }
});
