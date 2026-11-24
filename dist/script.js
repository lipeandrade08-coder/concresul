"use strict";

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".nav");
function closeMenu() {
  navigation.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menu");
}
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") !== "true";
  navigation.classList.toggle("is-open", expanded);
  menuButton.setAttribute("aria-expanded", String(expanded));
  menuButton.setAttribute("aria-label", expanded ? "Fechar menu" : "Abrir menu");
});
navigation.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && navigation.classList.contains("is-open")) {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener("click", event => {
  if (!event.target.closest(".header")) closeMenu();
});
window.matchMedia("(min-width: 1001px)").addEventListener("change", event => {
  if (event.matches) closeMenu();
});

const navLinks = [...navigation.querySelectorAll("a")];
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
    alt: "Caminhão betoneira Iveco da Concresul",
    name: "Caminhões betoneira",
    label: "TRANSPORTE"
  },
  bomba: {
    image: "concresul_bomba_estacionaria.webp",
    width: 1280,
    height: 632,
    alt: "Caminhão da Concresul equipado com bomba estacionária de concreto e mangotes",
    name: "Bomba estacionária",
    label: "BOMBEAMENTO"
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
  const imageChanged = image.getAttribute("src") !== `assets/${selected.image}`;
  image.src = `assets/${selected.image}`;
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

const decimalFormat = new Intl.NumberFormat("pt-BR", {
  maximumSignificantDigits: 12,
  useGrouping: false
});

const form = document.getElementById("orcamento");
const quoteFields = document.getElementById("quote-fields");
const quoteVolume = document.getElementById("quote-volume");
const requiredText = [document.getElementById("name"), document.getElementById("city")];

[...requiredText, quoteVolume].forEach(field => {
  field.addEventListener("input", () => field.setCustomValidity(""));
});

form.addEventListener("submit", event => {
  event.preventDefault();
  requiredText.forEach(field => {
    field.setCustomValidity(field.value.trim() ? "" : "Preencha este campo.");
  });

  const volumeText = quoteVolume.value.trim();
  const volume = positiveDecimal(volumeText);
  quoteVolume.setCustomValidity(volumeText && volume === null ? "Informe um volume maior que zero. Exemplo: 2,5." : "");
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const date = data.get("date");
  const details = data.get("message").trim();
  const lines = [
    "Olá, Concresul! Gostaria de solicitar um orçamento.",
    "",
    "Nome: " + data.get("name").trim(),
    "Cidade da obra: " + data.get("city").trim(),
    "Serviço: " + data.get("service")
  ];
  if (volume !== null) lines.push("Volume estimado: " + decimalFormat.format(volume) + " m³");
  if (date) lines.push("Data desejada: " + date.split("-").reverse().join("/"));
  if (details) lines.push("Detalhes da obra: " + details);
  const url = "https://wa.me/5524999851277?text=" + encodeURIComponent(lines.join("\n"));
  window.open(url, "_blank", "noopener,noreferrer");

  const status = document.getElementById("form-status");
  status.replaceChildren(document.createTextNode("Sua solicitação está pronta. Confira e finalize o envio no WhatsApp. "));
  const retry = document.createElement("a");
  retry.href = url;
  retry.target = "_blank";
  retry.rel = "noopener noreferrer";
  retry.textContent = "Abrir conversa";
  status.append(retry);
  status.hidden = false;
});

quoteFields.disabled = false;
quoteFields.hidden = false;
document.getElementById("quote-direct").hidden = true;

const estimator = document.getElementById("volume-estimator");
const dimensions = ["piece-length", "piece-width", "piece-depth"].map(id => document.getElementById(id));
const output = document.getElementById("estimated-volume");
const useVolume = document.getElementById("use-volume");
let estimatedVolume = null;

dimensions.forEach(field => field.addEventListener("input", () => {
  field.setCustomValidity("");
  if (estimatedVolume === null) return;
  estimatedVolume = null;
  output.value = "—";
  useVolume.hidden = true;
}));

estimator.addEventListener("submit", event => {
  event.preventDefault();
  const [length, width, depth] = dimensions.map(field => {
    const value = positiveDecimal(field.value);
    field.setCustomValidity(value === null ? "Informe uma medida maior que zero. Exemplo: 2,5." : "");
    return value;
  });
  if (!estimator.reportValidity()) return;

  estimatedVolume = decimalFormat.format(length * width * depth / 100);
  output.value = estimatedVolume + " m³";
  useVolume.hidden = false;
});

useVolume.addEventListener("click", () => {
  if (estimatedVolume === null) return;
  quoteVolume.value = estimatedVolume;
  quoteVolume.setCustomValidity("");

  const service = document.getElementById("service");
  if (!service.value) service.value = "Concreto usinado";
});

document.getElementById("volume-tool").hidden = false;
document.getElementById("year").textContent = new Date().getFullYear();
