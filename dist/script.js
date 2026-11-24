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
    const active = link.hash === `#${activeId}`;
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
  betoneira: {image:"concresul_betoneira_02.webp", alt:"Caminhão betoneira Iveco da Concresul", name:"Caminhões betoneira", label:"TRANSPORTE"},
  bomba: {image:"concresul_caminhao_bomba_01.webp", alt:"Caminhão bomba Volvo da Concresul", name:"Caminhões bomba", label:"BOMBEAMENTO"},
  logistica: {image:"concresul_betoneira_01.webp", alt:"Betoneira Mercedes-Benz da frota própria Concresul", name:"Da usina à sua obra", label:"FROTA PRÓPRIA"}
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
  image.src = `assets/${selected.image}`;
  image.alt = selected.alt;
  document.getElementById("fleet-name").textContent = selected.name;
  document.getElementById("fleet-label").textContent = selected.label;
  document.getElementById("fleet-panel").setAttribute("aria-labelledby", tab.id);
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

const form = document.getElementById("quote-form");
const phone = document.getElementById("phone");
["name", "city"].forEach(id => {
  const field = document.getElementById(id);
  field.addEventListener("input", () => field.setCustomValidity(""));
});
phone.addEventListener("input", () => {
  const digits = phone.value.replace(/\D/g, "").slice(0, 11);
  phone.setCustomValidity("");
  if (!digits) { phone.value = ""; return; }
  const area = digits.slice(0, 2);
  const local = digits.slice(2);
  const split = local.length > 8 ? 5 : 4;
  phone.value = `(${area}${digits.length >= 2 ? ") " : ""}${local.slice(0, split)}${local.length > split ? "-" + local.slice(split) : ""}`;
});
phone.addEventListener("blur", () => {
  const length = phone.value.replace(/\D/g, "").length;
  phone.setCustomValidity(length && length < 10 ? "Informe um telefone com DDD, com 10 ou 11 dígitos." : "");
});
form.addEventListener("submit", event => {
  event.preventDefault();
  const digits = phone.value.replace(/\D/g, "");
  phone.setCustomValidity(digits.length < 10 ? "Informe um telefone com DDD, com 10 ou 11 dígitos." : "");
  ["name", "city"].forEach(id => {
    const field = document.getElementById(id);
    field.setCustomValidity(field.value.trim() ? "" : "Preencha este campo.");
  });
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const message = ["Olá, Concresul! Gostaria de solicitar um orçamento.", "", `Nome: ${data.get("name").trim()}`, `Telefone: ${data.get("phone").trim()}`, `Cidade da obra: ${data.get("city").trim()}`, `Solução: ${data.get("service")}`, data.get("message").trim() ? `Detalhes da obra: ${data.get("message").trim()}` : ""].filter((line, index) => line || index === 1).join("\n");
  const url = `https://wa.me/5524999851277?text=${encodeURIComponent(message)}`;
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
document.getElementById("year").textContent = new Date().getFullYear();
