/* Panel de administración de turnos.
   OJO: el PIN en el front es solo para la demo. Con un backend real,
   la autenticación tiene que hacerse del lado del servidor. */
(function () {
  const gate = $("#gate");
  const app = $("#app");
  const SESSION = "polas_admin";

  function enter() {
    gate.hidden = true;
    app.hidden = false;
    init();
  }

  try { if (sessionStorage.getItem(SESSION) === "1") enter(); } catch { /* sin storage */ }

  $("#pinForm").addEventListener("submit", e => {
    e.preventDefault();
    if ($("#pin").value === CONFIG.adminPin) {
      try { sessionStorage.setItem(SESSION, "1"); } catch { /* sin storage */ }
      enter();
    } else {
      toast("PIN incorrecto");
      $("#pin").value = "";
    }
  });

  let started = false;
  function init() {
    if (started) return;
    started = true;

    $("#fBarber").innerHTML = `<option value="todos">Todos los barberos</option>` +
      BARBEROS.filter(b => b.id !== "cualquiera").map(b => `<option value="${b.id}">${b.nombre}</option>`).join("");
    $("#fDate").value = Turnos.ymd(new Date());

    ["#fDate", "#fBarber", "#fEstado"].forEach(s => $(s).addEventListener("change", render));
    $("#fToday").addEventListener("click", () => { $("#fDate").value = Turnos.ymd(new Date()); render(); });
    $("#fAll").addEventListener("click", () => { $("#fDate").value = ""; render(); });
    $("#logout").addEventListener("click", () => {
      try { sessionStorage.removeItem(SESSION); } catch { /* sin storage */ }
      location.reload();
    });
    $("#export").addEventListener("click", exportCsv);
    $("#seed").addEventListener("click", seed);

    $("#rows").addEventListener("click", e => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const { act, id } = b.dataset;
      if (act === "borrar") {
        if (!confirm("¿Borrar este turno definitivamente?")) return;
        Turnos.remove(id);
      } else {
        Turnos.update(id, { estado: act });
      }
      render();
    });

    render();
  }

  function render() {
    const f = $("#fDate").value;
    const b = $("#fBarber").value;
    const st = $("#fEstado").value;
    const all = Turnos.read();

    const list = all
      .filter(t => (!f || t.fecha === f) && (b === "todos" || t.barberoId === b) && (st === "todos" || t.estado === st))
      .sort((x, y) => (x.fecha + x.hora).localeCompare(y.fecha + y.hora));

    $("#rows").innerHTML = list.length ? list.map(t => `
      <tr>
        <td><span class="when">${fechaCorta(t.fecha)} · ${t.hora}</span></td>
        <td><strong>${escapeHtml(t.nombre)}</strong>${t.notas ? `<span class="notes">“${escapeHtml(t.notas)}”</span>` : ""}</td>
        <td><a href="https://wa.me/${normTel(t.telefono)}" target="_blank" rel="noopener">${escapeHtml(t.telefono)}</a></td>
        <td>${escapeHtml(t.servicio)} <span class="notes">${fmtPrice(t.precio)} · ${t.duracion} min</span></td>
        <td>${escapeHtml(t.barbero)}</td>
        <td><span class="pill pill--${t.estado}">${t.estado}</span></td>
        <td><div class="row-actions">
          ${t.estado !== "atendido" ? `<button class="mini" data-act="atendido" data-id="${t.id}">✓ Atendido</button>` : ""}
          ${t.estado !== "cancelado" ? `<button class="mini" data-act="cancelado" data-id="${t.id}">Cancelar</button>` : `<button class="mini" data-act="confirmado" data-id="${t.id}">Reactivar</button>`}
          <button class="mini mini--danger" data-act="borrar" data-id="${t.id}" aria-label="Borrar">✕</button>
        </div></td>
      </tr>`).join("")
      : `<tr class="empty-row"><td colspan="7">No hay turnos para este filtro.</td></tr>`;

    const hoy = Turnos.ymd(new Date());
    const en7 = Turnos.ymd(new Date(Date.now() + 7 * 864e5));
    const activos = all.filter(t => t.estado !== "cancelado");
    const deHoy = activos.filter(t => t.fecha === hoy);
    $("#stHoy").textContent = deHoy.length;
    $("#stSemana").textContent = activos.filter(t => t.fecha >= hoy && t.fecha <= en7).length;
    $("#stPlata").textContent = fmtPrice(deHoy.reduce((n, t) => n + (t.precio || 0), 0));
    $("#stCancel").textContent = all.filter(t => t.estado === "cancelado").length;
  }

  function exportCsv() {
    const cols = ["codigo", "fecha", "hora", "nombre", "telefono", "servicio", "precio", "barbero", "estado", "notas"];
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...Turnos.read().map(t => cols.map(c => esc(t[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `turnos-polas-${Turnos.ymd(new Date())}.csv` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function seed() {
    const nombres = ["Lautaro Gómez", "Thiago Fernández", "Mateo Ruiz", "Benja Sosa", "Franco Díaz", "Nico Romero", "Santi Acosta", "Joaco Medina"];
    let creados = 0;
    for (let dia = 0; dia < 3 && creados < 8; dia++) {
      const d = new Date();
      d.setDate(d.getDate() + dia);
      const fecha = Turnos.ymd(d);
      SERVICIOS.slice(0, 4).forEach((s, i) => {
        if (creados >= 8) return;
        const slot = Turnos.slots(fecha, "cualquiera", s.duracion).filter(x => x.libre)[i * 3];
        if (!slot) return;
        Turnos.add({
          servicioId: s.id, servicio: s.nombre, precio: s.precio, duracion: s.duracion,
          barberoId: slot.barberoId, barbero: BARBEROS.find(b => b.id === slot.barberoId).nombre,
          fecha, hora: slot.hora,
          nombre: nombres[creados], telefono: `11 ${4000 + creados * 731} ${String(1000 + creados * 2957).slice(-4)}`, notas: "",
        });
        creados++;
      });
    }
    toast(creados ? `Se cargaron ${creados} turnos de ejemplo` : "No hay horarios libres para cargar ejemplos");
    $("#fDate").value = "";
    render();
  }
})();
