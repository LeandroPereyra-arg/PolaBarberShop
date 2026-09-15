/* Navegación, servicios, horarios y animaciones */
(function () {
  // ---- Navegación ----
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 30);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  });
  $$("#navLinks a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }));

  // ---- Servicios ----
  const grid = $("#servicesGrid");
  if (grid) {
    grid.innerHTML = SERVICIOS.map((s, i) => `
      <article class="service reveal">
        <span class="service__num">${String(i + 1).padStart(2, "0")}</span>
        <span class="service__tag ${s.tag ? "" : "is-empty"}">${s.tag || "&nbsp;"}</span>
        <h3 class="service__name">${s.nombre}</h3>
        <p class="service__desc">${s.desc}</p>
        <div class="service__foot">
          <span class="service__time">${s.duracion} min</span>
          <span class="service__price">${fmtPrice(s.precio)}</span>
        </div>
        <button type="button" class="service__cta" data-service="${s.id}">Reservar este servicio <span aria-hidden="true">→</span></button>
      </article>`).join("");

    grid.addEventListener("click", e => {
      const b = e.target.closest("[data-service]");
      if (!b) return;
      document.dispatchEvent(new CustomEvent("polas:service", { detail: b.dataset.service }));
      $("#turnos").scrollIntoView({ behavior: "smooth" });
    });
  }

  // ---- Horarios ----
  const hours = $("#hoursTable");
  if (hours) {
    const hoy = new Date().getDay();
    hours.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => {
      const h = CONFIG.horarios[d];
      return `<tr class="${d === hoy ? "is-today" : ""}"><td>${DIAS[d]}${d === hoy ? " <em>(hoy)</em>" : ""}</td>
        <td class="${h ? "" : "closed"}">${h ? `${h.abre} – ${h.cierra} hs` : "Cerrado"}</td></tr>`;
    }).join("");
  }

  // ---- Datos de contacto desde CONFIG ----
  $$("[data-wa]").forEach(a => (a.href = waLink(a.dataset.wa)));
  $$("[data-ig]").forEach(a => (a.href = CONFIG.instagram));
  $$("[data-maps]").forEach(a => (a.href = CONFIG.mapsLink));
  $$("[data-addr]").forEach(el => (el.textContent = CONFIG.direccion));
  $$("[data-addr-old]").forEach(el => (el.textContent = CONFIG.direccionAnterior));
  $$("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));
  const map = $("#map");
  if (map) map.src = CONFIG.mapsEmbed;

  // ---- Aparición al hacer scroll ----
  const els = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    els.forEach(el => io.observe(el));
  } else {
    els.forEach(el => el.classList.add("is-in"));
  }
})();
