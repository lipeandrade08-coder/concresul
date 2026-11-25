"use strict";

const locale = document.documentElement.lang;
const phrases = JSON.parse(document.getElementById("page-translations")?.textContent || "{}");
const assetDirectory = new URL("assets/", document.currentScript.src);

function tr(phrase) {
  return phrases[phrase] ?? phrase;
}

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".nav");
const languageMenu = document.querySelector(".language-menu");

function closeMenu() {
  languageMenu.open = false;
  navigation.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", tr("Abrir menu"));
}
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") !== "true";
  navigation.classList.toggle("is-open", expanded);
  menuButton.setAttribute("aria-expanded", String(expanded));
  menuButton.setAttribute("aria-label", expanded ? tr("Fechar menu") : tr("Abrir menu"));
});
navigation.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (languageMenu.open) {
    languageMenu.open = false;
    languageMenu.querySelector("summary").focus();
  } else if (navigation.classList.contains("is-open")) {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener("click", event => {
  if (!event.target.closest(".header")) closeMenu();
  else if (!languageMenu.contains(event.target)) languageMenu.open = false;
});
window.matchMedia("(min-width: 1001px)").addEventListener("change", event => {
  if (event.matches) closeMenu();
});

const navLinks = [...navigation.querySelectorAll(":scope > a")];
const trackedSections = [...document.querySelectorAll("main section[id]")];
let scrollPending = false;
function updateActiveSection() {
  const scrollPosition = window.scrollY + 160;
  let activeId = "inicio";
  trackedSections.forEach(section => {
    if (section.offsetTop <= scrollPosition) activeId = section.id;
  });
  navLinks.forEach(link => {
    const active = (link.dataset.section || link.hash.slice(1)) === activeId;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  scrollPending = false;
}
window.addEventListener("scroll", () => {
  if (!scrollPending) {
    scrollPending = true;
    requestAnimationFrame(updateActiveSection);
  }
}, { passive: true });
updateActiveSection();

const fleet = {
  betoneira: {
    image: "concresul_betoneira_02.webp",
    width: 654,
    height: 381,
    alt: tr("Caminhão betoneira Iveco da Concresul"),
    name: tr("Caminhões betoneira"),
    label: tr("TRANSPORTE")
  },
  bomba: {
    image: "concresul_bomba_estacionaria.webp",
    width: 1280,
    height: 632,
    alt: tr("Caminhão da Concresul equipado com bomba estacionária de concreto e mangotes"),
    name: tr("Bomba estacionária"),
    label: tr("BOMBEAMENTO")
  }
};
const fleetTabs = [...document.querySelectorAll(".fleet-tab")];
function selectFleet(tab) {
  const selected = fleet[tab.dataset.fleet];
  fleetTabs.forEach(item => {
    const active = item === tab;
    item.classList.toggle("is-selected", active);
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
  });
  const image = document.getElementById("fleet-image");
  const imageUrl = new URL(selected.image, assetDirectory).href;
  const imageChanged = image.src !== imageUrl;
  image.src = imageUrl;
  image.width = selected.width;
  image.height = selected.height;
  image.alt = selected.alt;
  document.getElementById("fleet-name").textContent = selected.name;
  document.getElementById("fleet-label").textContent = selected.label;
  document.getElementById("fleet-panel").setAttribute("aria-labelledby", tab.id);
  if (imageChanged) document.dispatchEvent(new CustomEvent("concresul:fleet-change"));
}
fleetTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectFleet(tab));
  tab.addEventListener("keydown", event => {
    let next;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % fleetTabs.length;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + fleetTabs.length) % fleetTabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = fleetTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    fleetTabs[next].focus();
    selectFleet(fleetTabs[next]);
  });
});

document.querySelectorAll("[data-service]").forEach(link => link.addEventListener("click", () => {
  document.getElementById("service").value = link.dataset.service;
}));

function positiveDecimal(input) {
  const value = input.trim();
  if (!/^\d+(?:[,.]\d+)?$/.test(value)) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

const decimalFormat = new Intl.NumberFormat(locale, {
  maximumSignificantDigits: 12,
  useGrouping: false
});
const dateFormat = new Intl.DateTimeFormat(locale, {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC"
});

const form = document.getElementById("orcamento");
const quoteFields = document.getElementById("quote-fields");
const quoteVolume = document.getElementById("quote-volume");
const quotePlanNote = document.getElementById("quote-plan-note");
const requiredText = [document.getElementById("name"), document.getElementById("city")];
let quotedPieces = [];

[...requiredText, quoteVolume].forEach(field => {
  field.addEventListener("input", () => field.setCustomValidity(""));
});
quoteVolume.addEventListener("input", () => {
  quotedPieces = [];
  quotePlanNote.hidden = true;
});

form.addEventListener("submit", event => {
  event.preventDefault();
  requiredText.forEach(field => {
    field.setCustomValidity(field.value.trim() ? "" : tr("Preencha este campo."));
  });

  const volumeText = quoteVolume.value.trim();
  const volume = positiveDecimal(volumeText);
  quoteVolume.setCustomValidity(volumeText && volume === null ? tr("Informe um volume maior que zero. Exemplo: 2,5.") : "");
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const date = data.get("date");
  const details = data.get("message").trim();
  const lines = [
    tr("Olá, Concresul! Gostaria de solicitar um orçamento."),
    "",
    tr("Nome:") + " " + data.get("name").trim(),
    tr("Cidade da obra:") + " " + data.get("city").trim(),
    tr("Serviço:") + " " + data.get("service")
  ];
  if (volume !== null) {
    lines.push(tr("Volume aproximado:") + " " + decimalFormat.format(volume) + " m³ " + tr("(a confirmar com a Concresul)"));
  }
  if (date) {
    const selectedDate = new Date(date);
    lines.push(tr("Data desejada:") + " " + (Number.isNaN(selectedDate.getTime()) ? date : dateFormat.format(selectedDate)));
  }
  if (details) lines.push(tr("Detalhes da obra:") + " " + details);
  if (quotedPieces.length) {
    const sharedRows = quotedPieces.slice(0, 8);
    lines.push("", tr("Estimativa por peça:"));
    sharedRows.forEach(piece => {
      const quantity = piece.quantity > 1 ? " (×" + piece.quantity + ")" : "";
      lines.push("- " + piece.name + quantity + ": " + decimalFormat.format(piece.volume) + " m³");
    });
    const remaining = quotedPieces.length - sharedRows.length;
    if (remaining) lines.push(tr("Outras peças incluídas no total:") + " " + remaining);
  }
  const url = "https://wa.me/5524999851277?text=" + encodeURIComponent(lines.join("\n"));
  window.open(url, "_blank", "noopener,noreferrer");

  const status = document.getElementById("form-status");
  status.replaceChildren(document.createTextNode(tr("Sua solicitação está pronta. Confira e finalize o envio no WhatsApp.") + " "));
  const retry = document.createElement("a");
  retry.href = url;
  retry.target = "_blank";
  retry.rel = "noopener noreferrer";
  retry.textContent = tr("Abrir conversa");
  status.append(retry);
  status.hidden = false;
});

quoteFields.disabled = false;
quoteFields.hidden = false;
document.getElementById("quote-direct").hidden = true;

const estimator = document.getElementById("volume-estimator");
const pieceName = document.getElementById("piece-name");
const pieceQuantity = document.getElementById("piece-quantity");
const dimensions = ["piece-length", "piece-width", "piece-depth"].map(id => document.getElementById(id));
const output = document.getElementById("estimated-volume");
const useVolume = document.getElementById("use-volume");
const summary = document.getElementById("piece-summary");
const pieceList = document.getElementById("piece-list");
const savePiece = document.getElementById("save-piece");
const cancelEdit = document.getElementById("cancel-piece-edit");
const pieces = [];
let nextPieceId = 1;
let editingId = null;

dimensions.forEach(field => field.addEventListener("input", () => field.setCustomValidity("")));

function totalVolume() {
  return pieces.reduce((sum, piece) => sum + piece.volume, 0);
}

function pieceControl(action, label, piece) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "piece-action";
  button.dataset.pieceAction = action;
  button.dataset.pieceId = piece.id;
  button.textContent = label;
  button.setAttribute("aria-label", label + " " + piece.name);
  return button;
}

function renderPlan() {
  const rows = pieces.map(piece => {
    const row = document.createElement("li");
    const info = document.createElement("div");
    const title = document.createElement("strong");
    const measurements = document.createElement("span");
    title.textContent = piece.name;
    measurements.textContent = piece.dimensions.map(value => decimalFormat.format(value))
      .map((value, index) => value + (index === 2 ? " cm" : " m"))
      .join(" × ");
    if (piece.quantity > 1) measurements.textContent = piece.quantity + " " + tr("un.") + " · " + measurements.textContent;
    info.append(title, measurements);

    const actions = document.createElement("div");
    actions.className = "piece-row-actions";
    const volume = document.createElement("strong");
    volume.textContent = decimalFormat.format(piece.volume) + " m³";
    actions.append(volume, pieceControl("edit", tr("Editar"), piece), pieceControl("remove", tr("Remover"), piece));
    row.append(info, actions);
    return row;
  });

  pieceList.replaceChildren(...rows);
  const hasPieces = pieces.length > 0;
  summary.hidden = !hasPieces;
  useVolume.hidden = !hasPieces;
  document.getElementById("download-plan").hidden = !hasPieces;
  output.value = hasPieces ? decimalFormat.format(totalVolume()) + " m³" : "—";
}

function resetEstimator() {
  estimator.reset();
  dimensions.forEach(field => field.setCustomValidity(""));
  editingId = null;
  savePiece.textContent = tr("Adicionar peça");
  cancelEdit.hidden = true;
}

estimator.addEventListener("submit", event => {
  event.preventDefault();
  const measures = dimensions.map(field => {
    const value = positiveDecimal(field.value);
    field.setCustomValidity(value === null ? tr("Informe uma medida maior que zero. Exemplo: 2,5.") : "");
    return value;
  });
  if (!estimator.reportValidity()) return;

  const [length, width, depth] = measures;
  const quantity = pieceQuantity.valueAsNumber;
  const id = editingId ?? nextPieceId++;
  const piece = {
    id,
    name: pieceName.value.trim() || tr("Peça") + " " + id,
    dimensions: measures,
    quantity,
    volume: length * width * depth * quantity / 100
  };
  if (editingId === null) pieces.push(piece);
  else pieces[pieces.findIndex(item => item.id === id)] = piece;

  resetEstimator();
  renderPlan();
});

cancelEdit.addEventListener("click", () => {
  resetEstimator();
  pieceName.focus();
});

pieceList.addEventListener("click", event => {
  const button = event.target.closest("button[data-piece-action]");
  if (!button) return;
  const index = pieces.findIndex(piece => piece.id === Number(button.dataset.pieceId));
  if (index < 0) return;
  const piece = pieces[index];

  if (button.dataset.pieceAction === "edit") {
    resetEstimator();
    editingId = piece.id;
    pieceName.value = piece.name;
    pieceQuantity.value = piece.quantity;
    dimensions.forEach((field, dimensionIndex) => {
      field.value = decimalFormat.format(piece.dimensions[dimensionIndex]);
    });
    savePiece.textContent = tr("Salvar peça");
    cancelEdit.hidden = false;
    pieceName.focus();
    return;
  }

  pieces.splice(index, 1);
  if (editingId === piece.id) resetEstimator();
  renderPlan();
  const next = pieceList.children[Math.min(index, pieces.length - 1)];
  const nextRemove = next?.querySelector("button[data-piece-action=remove]");
  (nextRemove || savePiece).focus({ preventScroll: true });
});

useVolume.addEventListener("click", () => {
  if (!pieces.length) return;
  quoteVolume.value = decimalFormat.format(totalVolume());
  quoteVolume.setCustomValidity("");
  quotedPieces = pieces.map(({ name, quantity, volume }) => ({ name, quantity, volume }));
  quotePlanNote.textContent = tr("Estimativa incluída no orçamento. Confirme o volume com a Concresul antes de fechar o pedido.");
  quotePlanNote.hidden = false;

  const service = document.getElementById("service");
  if (!service.value) service.value = tr("Concreto usinado");
});

document.getElementById("volume-tool").hidden = false;
document.getElementById("year").textContent = new Date().getFullYear();

document.getElementById("consulta-entrega").addEventListener("submit", event => {
  event.preventDefault();
  const location = document.getElementById("delivery-location").value.trim();
  const message = tr("Gostaria de consultar a entrega de concreto para") + " " + location + ".";
  window.location.assign("https://wa.me/5524999851277?text=" + encodeURIComponent(message));
});

document.getElementById("download-plan").addEventListener("click", () => {
  const lines = ["Concresul", document.querySelector("#piece-summary h4").textContent, ""];
  for (const piece of pieces) {
    const dimensions = piece.dimensions.map((value, index) =>
      decimalFormat.format(value) + (index === 2 ? " cm" : " m")).join(" × ");
    lines.push(piece.name + " · " + piece.quantity + " × (" + dimensions + ") · " +
      decimalFormat.format(piece.volume) + " m³");
  }
  lines.push("", document.querySelector(".volume-label").textContent + ": " + output.value,
    document.querySelector(".volume-note").textContent, "WhatsApp +55 24 99985-1277");
  const url = URL.createObjectURL(new Blob([lines.join("\n")], {type: "text/plain;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = "concresul.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
});
