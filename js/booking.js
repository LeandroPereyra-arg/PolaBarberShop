/* Sistema de turnos: servicio → barbero → día y hora → datos → confirmación */
(function () {
  const root = $("#booking");
  if (!root) return;

  const state = { step: 1, servicio: null, barbero: null, fecha: null, hora: null, asignado: null };
  const panels = $$(".step-panel", root);
  const stepsLi = $$(".steps li", root);
  const btnBack = $("#bkBack");
  const btnNext = $("#bkNext");
  const nav = $(".booking__nav", root);

  const servicio = () => SERVICIOS.find(s => s.id === state.servicio);
  const barbero = id => BARBEROS.find(b => b.id === id);
  const initials = n => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // ---------- Render ----------
  function renderServices() {
    $("#bkServices").innerHTML = SERVICIOS.map(s => `
      <button type="button" class="opt ${state.servicio === s.id ? "is-sel" : ""}" data-servicio="${s.id}" aria-pressed="${state.servicio === s.id}">
        <span class="opt__title">${s.nombre}</span>
        <span class="opt__meta">${s.duracion} min · ${fmtPrice(s.precio)}</span>
      </button>`).join("");
  }

  function renderBarbers() {
    $("#bkBarbers").innerHTML = BARBEROS.map(b => {
      const any = b.id === "cualquiera";
      return `
      <button type="button" class="opt opt--barber ${state.barbero === b.id ? "is-sel" : ""}" data-barbero="${b.id}" aria-pressed="${state.barbero === b.id}">
        <span class="avatar ${any ? "avatar--any" : ""}">${any ? "★" : initials(b.nombre)}</span>
        <span class="opt__text"><span class="opt__title">${b.nombre}</span><span class="opt__meta">${b.rol}</span></span>
      </button>`;
    }).join("");
  }

  function diasDisponibles() {
    const hoy = new Date();
    return Array.from({ length: CONFIG.diasReserva }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i));
  }

  function renderDates() {
    $("#bkDates").innerHTML = diasDisponibles().map((d, i) => {
      const f = Turnos.ymd(d);
      const closed = !CONFIG.horarios[d.getDay()];
      const label = i === 0 ? "Hoy" : i === 1 ? "Mañana" : DIAS[d.getDay()].slice(0, 3);
      return `<button type="button" class="date ${state.fecha === f ? "is-sel" : ""}" data-fecha="${f}" ${closed ? "disabled" : ""}>
        <span class="date__dow">${label}</span>
        <span class="date__num">${d.getDate()}</span>
        <span class="date__mon">${closed ? "cerrado" : MESES[d.getMonth()].slice(0, 3)}</span>
      </button>`;
    }).join("");
  }

  function renderSlots() {
    const box = $("#bkSlots");
    if (!state.fecha) { box.innerHTML = `<p class="hint">Elegí un día para ver los horarios.</p>`; return; }
    const list = Turnos.slots(state.fecha, state.barbero, servicio().duracion);
    if (!list.some(x => x.libre)) {
      box.innerHTML = `<p class="hint">No quedan horarios libres este día. Probá con otro día u otro barbero.</p>`;
      return;
    }
    const grupos = [["Mañana", 0, 780], ["Tarde", 780, 1080], ["Noche", 1080, 1440]];
    box.innerHTML = grupos.map(([nombre, a, b]) => {
      const g = list.filter(x => x.min >= a && x.min < b);
      if (!g.length) return "";
      return `<div class="slot-group"><h4>${nombre}</h4><div class="slot-grid">${g.map(x => `
        <button type="button" class="slot ${state.hora === x.hora ? "is-sel" : ""}" data-hora="${x.hora}" data-asignado="${x.barberoId || ""}" ${x.libre ? "" : "disabled"} aria-label="${x.hora}${x.libre ? "" : " ocupado"}">${x.hora}</button>`).join("")}
      </div></div>`;
    }).join("");
  }

  function renderSummary() {
    const s = servicio();
    const bId = state.asignado || state.barbero;
    const row = (k, v) => `<div><dt>${k}</dt><dd class="${v ? "" : "empty"}">${v || "—"}</dd></div>`;
    $("#bkSummaryRows").innerHTML =
      row("Servicio", s && s.nombre) +
      row("Barbero", bId && barbero(bId).nombre) +
      row("Día", state.fecha && fechaLarga(state.fecha)) +
      row("Hora", state.hora && `${state.hora} hs`) +
      row("Duración", s && `${s.duracion} min`);
    $("#bkTotal").textContent = s ? fmtPrice(s.precio) : "$0";
  }

  // ---------- Validación y navegación ----------
  const nombre = () => $("#bkNombre").value.trim();
  const tel = () => normTel($("#bkTel").value);

  function valid(step) {
    if (step === 1) return !!state.servicio;
    if (step === 2) return !!state.barbero;
    if (step === 3) return !!(state.fecha && state.hora);
    if (step === 4) return nombre().length >= 2 && tel().length >= 8;
    return true;
  }

  function showErrors() {
    $('[data-field="nombre"]').classList.toggle("has-err", nombre().length < 2);
    $('[data-field="tel"]').classList.toggle("has-err", tel().length < 8);
  }

  function primerDiaAbierto() {
    const d = diasDisponibles().find(d => {
      const f = Turnos.ymd(d);
      return CONFIG.horarios[d.getDay()] && Turnos.slots(f, state.barbero, servicio().duracion).some(x => x.libre);
    });
    return d ? Turnos.ymd(d) : null;
  }

  function updateNext() {
    btnNext.disabled = state.step < 4 && !valid(state.step);
  }

  function go(n, scroll) {
    state.step = n;
    panels.forEach(p => p.classList.toggle("is-active", +p.dataset.panel === n));
    stepsLi.forEach((li, i) => {
      li.classList.toggle("is-active", i + 1 === n);
      li.classList.toggle("is-done", i + 1 < n || n === 5);
    });
    if (n === 3) {
      if (!state.fecha) state.fecha = primerDiaAbierto();
      renderDates();
      renderSlots();
      const sel = $(".date.is-sel", root);
      if (sel) sel.scrollIntoView({ block: "nearest", inline: "center" });
    }
    if (n === 4) setTimeout(() => $("#bkNombre").focus({ preventScroll: true }), 50);
    btnBack.hidden = n === 1;
    nav.hidden = n === 5;
    btnNext.textContent = n === 4 ? "Confirmar turno" : "Siguiente";
    updateNext();
    renderSummary();
    if (scroll && root.getBoundingClientRect().top < 0) root.scrollIntoView({ behavior: "smooth" });
  }

  // ---------- Eventos ----------
  root.addEventListener("click", e => {
    const t = e.target.closest("[data-servicio],[data-barbero],[data-fecha],[data-hora]");
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.servicio) {
      state.servicio = d.servicio; state.hora = null; state.asignado = null;
      renderServices();
    } else if (d.barbero) {
      state.barbero = d.barbero; state.hora = null; state.asignado = null;
      renderBarbers();
    } else if (d.fecha) {
      state.fecha = d.fecha; state.hora = null; state.asignado = null;
      renderDates(); renderSlots();
    } else if (d.hora) {
      state.hora = d.hora; state.asignado = d.asignado || null;
      renderSlots();
    }
    updateNext();
    renderSummary();
    // En los pasos de una sola elección avanzamos solos
    if ((d.servicio && state.step === 1) || (d.barbero && state.step === 2)) {
      setTimeout(() => go(state.step + 1), 240);
    }
  });

  btnBack.addEventListener("click", () => go(Math.max(1, state.step - 1), true));

  btnNext.addEventListener("click", () => {
    if (state.step === 4) {
      if (!valid(4)) { showErrors(); return; }
      confirmar();
      return;
    }
    if (valid(state.step)) go(state.step + 1, true);
  });

  $("#bkForm").addEventListener("input", e => {
    const f = e.target.closest(".field");
    if (f) f.classList.remove("has-err");
  });
  $("#bkForm").addEventListener("submit", e => { e.preventDefault(); btnNext.click(); });

  document.addEventListener("polas:service", e => {
    state.servicio = e.detail; state.hora = null; state.asignado = null;
    renderServices();
    go(2);
  });

  // ---------- Confirmación ----------
  function confirmar() {
    const s = servicio();
    let asignado = state.asignado;
    if (!asignado || !Turnos.barberFree(asignado, state.fecha, Turnos.toMin(state.hora), s.duracion)) {
      const libre = Turnos.slots(state.fecha, state.barbero, s.duracion).find(x => x.hora === state.hora && x.libre);
      if (!libre) {
        toast("Ese horario se acaba de ocupar. Elegí otro.");
        state.hora = null; state.asignado = null;
        go(3, true);
        return;
      }
      asignado = libre.barberoId;
    }
    const t = Turnos.add({
      servicioId: s.id, servicio: s.nombre, precio: s.precio, duracion: s.duracion,
      barberoId: asignado, barbero: barbero(asignado).nombre,
      fecha: state.fecha, hora: state.hora,
      nombre: nombre(), telefono: $("#bkTel").value.trim(), notas: $("#bkNotas").value.trim(),
    });
    state.asignado = asignado;
    renderTicket(t);
    go(5, true);
    $("#myTel").value = t.telefono;
  }

  function renderTicket(t) {
    const fin = Turnos.toHora(Turnos.toMin(t.hora) + t.duracion);
    const stamp = h => t.fecha.replace(/-/g, "") + "T" + h.replace(":", "") + "00";
    const gcal = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(`${t.servicio} · Pola's Barber Shop`) +
      "&dates=" + stamp(t.hora) + "/" + stamp(fin) +
      "&ctz=America/Argentina/Buenos_Aires" +
      "&details=" + encodeURIComponent(`Código ${t.codigo} · Con ${t.barbero}`) +
      "&location=" + encodeURIComponent(CONFIG.direccion);
    const msg = `Hola Pola's! Reservé un turno por la web 💈\n` +
      `✂️ ${t.servicio}\n📅 ${fechaLarga(t.fecha)} a las ${t.hora} hs\n` +
      `💈 Con ${t.barbero}\n👤 ${t.nombre}\nCódigo: ${t.codigo}`;

    $("#bkDone").innerHTML = `
      <div class="ticket">
        <img class="ticket__logo" src="img/logo.png" alt="">
        <span class="script">¡listo!</span>
        <h3>Turno confirmado</h3>
        <div class="ticket__code">Código <strong>${t.codigo}</strong></div>
        <dl class="ticket__rows">
          <div><dt>Servicio</dt><dd>${escapeHtml(t.servicio)}</dd></div>
          <div><dt>Barbero</dt><dd>${escapeHtml(t.barbero)}</dd></div>
          <div><dt>Día</dt><dd>${fechaLarga(t.fecha)}</dd></div>
          <div><dt>Hora</dt><dd>${t.hora} a ${fin} hs</dd></div>
        </dl>
        <div class="ticket__actions">
          <a class="btn btn--gold" href="${waLink(msg)}" target="_blank" rel="noopener">Avisar por WhatsApp</a>
          <a class="btn btn--dark" href="${gcal}" target="_blank" rel="noopener">Agendar en calendario</a>
        </div>
        <button type="button" class="link-btn" id="bkAgain">Reservar otro turno</button>
        <p class="ticket__note">Si no podés venir, cancelalo desde <a href="#misTurnos">Mis turnos</a> así le dejás el lugar a otro.</p>
      </div>`;

    $("#bkAgain").addEventListener("click", () => {
      Object.assign(state, { servicio: null, barbero: null, fecha: null, hora: null, asignado: null });
      $("#bkForm").reset();
      renderServices(); renderBarbers();
      go(1, true);
    });
  }

  // ---------- Mis turnos ----------
  const myList = $("#myList");
  function renderMine() {
    const telefono = $("#myTel").value;
    if (normTel(telefono).length < 6) {
      myList.innerHTML = `<li class="turn turn--empty">Ingresá tu número (mínimo 6 dígitos).</li>`;
      return;
    }
    const list = Turnos.byPhone(telefono).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    if (!list.length) {
      myList.innerHTML = `<li class="turn turn--empty">No encontramos turnos con ese teléfono.</li>`;
      return;
    }
    const ahora = Date.now();
    myList.innerHTML = list.map(t => {
      const futuro = parseFecha(t.fecha).getTime() + Turnos.toMin(t.hora) * 60000 > ahora;
      return `<li class="turn">
        <div>
          <div class="turn__when">${fechaCorta(t.fecha)} · ${t.hora} hs</div>
          <div class="turn__meta">${escapeHtml(t.servicio)} con ${escapeHtml(t.barbero)} · ${t.codigo}</div>
        </div>
        <div class="turn__side">
          <span class="pill pill--${t.estado}">${t.estado}</span>
          ${t.estado === "confirmado" && futuro ? `<button type="button" class="btn btn--line-dark btn--sm" data-cancel="${t.id}">Cancelar</button>` : ""}
        </div>
      </li>`;
    }).join("");
  }

  $("#myForm").addEventListener("submit", e => { e.preventDefault(); renderMine(); });
  myList.addEventListener("click", e => {
    const b = e.target.closest("[data-cancel]");
    if (!b || !confirm("¿Seguro que querés cancelar este turno?")) return;
    Turnos.update(b.dataset.cancel, { estado: "cancelado" });
    toast("Turno cancelado. ¡Gracias por avisar!");
    renderMine();
    if (state.step === 3) renderSlots();
  });

  // ---------- Inicio ----------
  renderServices();
  renderBarbers();
  go(1);
})();
