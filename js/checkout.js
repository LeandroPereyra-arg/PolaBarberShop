/* ============================================================
   Módulo de pago de la tienda
   Carrito → entrega → datos del comprador → pago → comprobante.

   El pago con tarjeta es una SIMULACIÓN: no se conecta con ningún
   banco ni pasarela, y los datos de la tarjeta nunca se guardan ni
   se envían. El resultado depende del número (TARJETAS_PRUEBA en
   data.js) para poder mostrar pagos aprobados y rechazados.

   Vista previa de la tarjeta: crd-ui 0.13.2 (MIT), en vendor/crd-ui.
   ============================================================ */
import { createCard, detectBrand, getBrandSpec, formatCardNumber, normalizeDigits } from "../vendor/crd-ui/index.js";

const root = $("#checkout");
const panel = $(".checkout__panel", root);
const scrollers = [$(".checkout__body", root), $(".checkout__main", root)];
const btnNext = $("#coNext");
const btnBack = $("#coBack");
const nav = $("#coNav");
const panels = $$("[data-co-panel]", root);
const stepsLi = $$("#coSteps li", root);

const state = { step: 1, entrega: null, metodo: null, cuotas: 1, procesando: false, pedido: null, volverA: null };

const CAMPOS_TARJETA = ["numero", "titular", "vencimiento", "cvc"];
const FOCO_TARJETA = { numero: "number", titular: "name", vencimiento: "expiry", cvc: "cvc" };

const RESULTADOS = {
  rechazada: {
    titulo: "Pago rechazado",
    mensaje: "El banco rechazó la operación.",
    ayuda: "No se hizo ningún cobro. Probá con otra tarjeta o elegí otro medio de pago.",
  },
  sin_fondos: {
    titulo: "Saldo insuficiente",
    mensaje: "La tarjeta no tiene saldo o límite suficiente para esta compra.",
    ayuda: "No se hizo ningún cobro. Probá con otra tarjeta o con otro medio de pago.",
  },
  error_conexion: {
    titulo: "No pudimos procesar el pago",
    mensaje: "Hubo un problema de comunicación con el banco.",
    ayuda: "No se hizo ningún cobro. Podés volver a intentarlo.",
    reintentar: true,
  },
};

// ---------- Utilidades ----------
const fieldOf = name => $(`[data-cofield="${name}"]`, root);
const inputOf = name => $("input, select", fieldOf(name));
const digitosTarjeta = () => normalizeDigits(inputOf("numero").value);
const nombreMarca = marca => (marca ? getBrandSpec(marca).displayName : "Tarjeta");
const esTarjeta = () => state.metodo === "credito" || state.metodo === "debito";
const local = () => CONFIG.direccion.split(" — ")[0];
const esperar = ms => new Promise(r => setTimeout(r, ms));

function luhn(digits) {
  let suma = 0, doble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (doble) { d *= 2; if (d > 9) d -= 9; }
    suma += d;
    doble = !doble;
  }
  return digits.length > 0 && suma % 10 === 0;
}

function totales(n = state.cuotas, metodo = state.metodo) {
  const subtotal = Carrito.subtotal();
  const envio = state.entrega === "envio" && subtotal < CONFIG.envio.gratisDesde ? CONFIG.envio.costo : 0;
  const base = subtotal + envio;
  const credito = metodo === "credito";
  const plan = CONFIG.cuotas.find(c => c.n === n) || CONFIG.cuotas[0];
  const recargo = credito ? Math.round(base * plan.recargo) : 0;
  const total = base + recargo;
  const cuotas = credito ? plan.n : 1;
  return { subtotal, envio, recargo, total, cuotas, valorCuota: Math.ceil(total / cuotas) };
}

// ---------- Validaciones ----------
const V = {
  nombre: v => (v.trim().length >= 3 ? "" : "Ingresá tu nombre y apellido"),
  telefono: v => (normTel(v).length >= 8 ? "" : "Ingresá un teléfono válido (mínimo 8 números)"),
  email: v => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Ingresá un email válido, por ejemplo nombre@mail.com"),
  direccion: v => (/\d/.test(v) && v.trim().length >= 5 ? "" : "Ingresá calle y número"),
  localidad: v => (v.trim().length >= 3 ? "" : "Ingresá la localidad"),
  cp: v => (/^(\d{4}|[a-z]\d{4}[a-z]{3})$/i.test(v.trim()) ? "" : "Código postal de 4 números (o CPA, ej. B1851ABC)"),
  numero: v => {
    const d = normalizeDigits(v);
    if (!d) return "Ingresá el número de la tarjeta";
    const marca = detectBrand(d);
    if (!marca) return "No reconocemos esa tarjeta";
    const spec = getBrandSpec(marca);
    if (!spec.lengths.includes(d.length)) return `Una ${spec.displayName} tiene ${spec.lengths.join(" o ")} números`;
    if (!luhn(d)) return "El número no es válido, revisalo";
    if (state.metodo === "debito" && marca === "amex") return "American Express no tiene tarjetas de débito";
    return "";
  },
  titular: v => (/^[a-záéíóúüñ' .-]{3,}$/i.test(v.trim()) && /\s/.test(v.trim()) ? "" : "Escribí nombre y apellido como figuran en la tarjeta"),
  vencimiento: v => {
    const m = /^(\d{2})\/(\d{2})$/.exec(v.trim());
    if (!m) return "Usá el formato MM/AA";
    const mes = +m[1], anio = 2000 + +m[2];
    if (mes < 1 || mes > 12) return "El mes tiene que ser entre 01 y 12";
    const hoy = new Date();
    if (new Date(anio, mes, 0, 23, 59, 59) < hoy) return "La tarjeta está vencida";
    if (anio > hoy.getFullYear() + 15) return "Revisá el año de vencimiento";
    return "";
  },
  cvc: v => {
    const marca = detectBrand(digitosTarjeta());
    const largo = marca ? getBrandSpec(marca).cvcLength : 3;
    return new RegExp(`^\\d{${largo}}$`).test(v.trim()) ? "" : `El código de seguridad tiene ${largo} números`;
  },
};

function setErr(name, msg) {
  const f = fieldOf(name);
  f.classList.toggle("has-err", !!msg);
  $(".err", f).textContent = msg;
  inputOf(name).setAttribute("aria-invalid", msg ? "true" : "false");
}

function camposPaso(n) {
  if (n === 2) return ["nombre", "telefono", "email", ...(state.entrega === "envio" ? ["direccion", "localidad", "cp"] : [])];
  if (n === 3 && esTarjeta()) return CAMPOS_TARJETA;
  return [];
}

function validarPaso(n) {
  if (n === 1 && !state.entrega) { toast("Elegí cómo querés recibir tu pedido"); return false; }
  if (n === 3 && !state.metodo) { toast("Elegí un medio de pago"); return false; }
  let primero = null;
  for (const name of camposPaso(n)) {
    const msg = V[name](inputOf(name).value);
    setErr(name, msg);
    if (msg && !primero) primero = inputOf(name);
  }
  if (primero) primero.focus();
  return !primero;
}

// Valida al salir de un campo y, si ya tenía error, mientras se corrige
root.addEventListener("focusout", e => {
  const f = e.target.closest("[data-cofield]");
  if (f && e.target.value) setErr(f.dataset.cofield, V[f.dataset.cofield](e.target.value));
});
root.addEventListener("input", e => {
  const f = e.target.closest("[data-cofield]");
  if (f && f.classList.contains("has-err")) setErr(f.dataset.cofield, V[f.dataset.cofield](e.target.value));
});

// ---------- Render ----------
const opcion = (tipo, o, sel) => `
  <button type="button" class="opt ${sel === o.id ? "is-sel" : ""}" data-${tipo}="${o.id}" aria-pressed="${sel === o.id}">
    <span class="opt__title">${o.titulo}</span>
    <span class="opt__meta">${o.meta}</span>
  </button>`;

function renderItems() {
  $("#coItems").innerHTML = Carrito.detalle().map(i => `
    <li class="co-item">
      <div class="co-item__art marble">${productArt(i.producto, "co")}</div>
      <div>
        <div class="co-item__name">${escapeHtml(i.nombre)}</div>
        <div class="co-item__meta">${i.talle && i.talle !== "Único" ? `Talle ${i.talle} · ` : ""}${i.qty} × ${fmtPrice(i.precio)}</div>
      </div>
      <div class="co-item__price">${fmtPrice(i.subtotal)}</div>
    </li>`).join("");
}

function renderEntrega() {
  const gratis = Carrito.subtotal() >= CONFIG.envio.gratisDesde;
  $("#coEntrega").innerHTML = [
    { id: "retiro", titulo: "Retiro en el local", meta: `${local()} · Gratis` },
    { id: "envio", titulo: "Envío a domicilio", meta: gratis ? "¡Gratis por el monto de tu compra!" : `${fmtPrice(CONFIG.envio.costo)} · gratis desde ${fmtPrice(CONFIG.envio.gratisDesde)}` },
  ].map(o => opcion("entrega", o, state.entrega)).join("");
  $("#coEnvioCampos").hidden = state.entrega !== "envio";
}

function renderMetodos() {
  const max = Math.max(...CONFIG.cuotas.map(c => c.n));
  $("#coMetodos").innerHTML = [
    { id: "credito", titulo: "Tarjeta de crédito", meta: `Hasta ${max} cuotas` },
    { id: "debito", titulo: "Tarjeta de débito", meta: "En un pago" },
    { id: "local", titulo: "Efectivo o transferencia", meta: state.entrega === "retiro" ? "Pagás al retirar" : "Coordinamos por WhatsApp" },
  ].map(o => opcion("metodo", o, state.metodo)).join("");

  $("#coTarjeta").hidden = !esTarjeta();
  $("#coLocal").hidden = state.metodo !== "local";
  $("#coCuotasField").hidden = state.metodo !== "credito";
  $("#coLocal").innerHTML = state.entrega === "retiro"
    ? `<strong>Pagás cuando retirás</strong><p>Te guardamos el pedido en ${escapeHtml(local())}. Aceptamos efectivo, transferencia y QR.</p>`
    : `<strong>Coordinamos el pago por WhatsApp</strong><p>Al confirmar te pasamos los datos para transferir. Despachamos el envío cuando se acredita el pago.</p>`;
  renderCuotas();
}

function renderCuotas() {
  $("#coCuotas").innerHTML = CONFIG.cuotas.map(c => {
    const t = totales(c.n, "credito");
    const texto = c.n === 1
      ? `1 pago de ${fmtPrice(t.total)}`
      : `${c.n} cuotas de ${fmtPrice(t.valorCuota)}${c.recargo ? ` (total ${fmtPrice(t.total)})` : " sin interés"}`;
    return `<option value="${c.n}" ${c.n === state.cuotas ? "selected" : ""}>${texto}</option>`;
  }).join("");
}

function renderResumen() {
  const t = totales();
  const fila = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const metodos = { credito: "Tarjeta de crédito", debito: "Tarjeta de débito", local: "Efectivo o transferencia" };
  $("#coResumen").innerHTML =
    fila(`Productos (${Carrito.cantidad()})`, fmtPrice(t.subtotal)) +
    fila("Envío", !state.entrega ? "A elegir" : t.envio ? fmtPrice(t.envio) : "Gratis") +
    (t.recargo ? fila(`Recargo ${t.cuotas} cuotas`, fmtPrice(t.recargo)) : "") +
    fila("Pago", state.metodo ? metodos[state.metodo] : "A elegir");
  $("#coTotal").textContent = fmtPrice(t.total);
  $("#coCuotaNote").textContent = t.cuotas > 1 ? `${t.cuotas} cuotas de ${fmtPrice(t.valorCuota)}` : "Precios finales en pesos argentinos.";
}

function renderPrueba() {
  $("#coPrueba").innerHTML = TARJETAS_PRUEBA.map((t, i) => `
    <li class="test-card">
      <code>${t.numero}</code>
      <span class="test-card__res test-card__res--${t.resultado === "aprobada" ? "ok" : "ko"}">${t.marca} · ${t.etiqueta}</span>
      <button type="button" class="mini-light" data-usar="${i}">Usar</button>
    </li>`).join("");
}

function actualizarBoton() {
  btnNext.textContent = state.step < 3 ? "Siguiente"
    : esTarjeta() ? `Pagar ${fmtPrice(totales().total)}`
    : state.metodo === "local" ? "Confirmar pedido" : "Pagar";
}

function go(n) {
  state.step = n;
  panels.forEach(p => p.classList.toggle("is-active", +p.dataset.coPanel === n));
  stepsLi.forEach((li, i) => {
    li.classList.toggle("is-active", i + 1 === n);
    li.classList.toggle("is-done", i + 1 < n);
  });
  btnBack.hidden = n === 1;
  nav.hidden = n === 4;
  actualizarBoton();
  renderResumen();
  scrollers.forEach(el => (el.scrollTop = 0));
}

// ---------- Tarjeta ----------
const card = createCard($("#coCard"), {
  variant: "graphite",
  tilt: true,
  placeholders: { name: "NOMBRE Y APELLIDO" },
  locale: { validThru: "vence" },
});

function syncCard() {
  card.update({
    number: inputOf("numero").value,
    name: inputOf("titular").value,
    expiry: inputOf("vencimiento").value,
    cvc: inputOf("cvc").value,
  });
}

function ajustarCvc(marca) {
  const cvc = inputOf("cvc");
  const largo = marca ? getBrandSpec(marca).cvcLength : 3;
  cvc.maxLength = largo;
  cvc.placeholder = largo === 4 ? "1234" : "123";
  if (cvc.value.length > largo) cvc.value = cvc.value.slice(0, largo);
  $("#coMarca").textContent = marca ? nombreMarca(marca) : "";
}

inputOf("numero").addEventListener("input", e => {
  const marca = detectBrand(e.target.value);
  const max = marca ? Math.max(...getBrandSpec(marca).lengths) : 16;
  e.target.value = formatCardNumber(normalizeDigits(e.target.value, max), marca);
  ajustarCvc(marca);
  syncCard();
});
inputOf("vencimiento").addEventListener("input", e => {
  let d = normalizeDigits(e.target.value, 4);
  if (d.length === 1 && +d > 1) d = "0" + d;
  e.target.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  syncCard();
});
inputOf("cvc").addEventListener("input", e => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, e.target.maxLength);
  syncCard();
});
inputOf("titular").addEventListener("input", syncCard);
CAMPOS_TARJETA.forEach(n => {
  inputOf(n).addEventListener("focus", () => card.update({ focused: FOCO_TARJETA[n] }));
  inputOf(n).addEventListener("blur", () => card.update({ focused: null }));
});

function llenarTarjeta(t) {
  const marca = detectBrand(t.numero);
  const nombre = inputOf("nombre").value.trim();
  const anio = String((new Date().getFullYear() + 3) % 100).padStart(2, "0");
  inputOf("numero").value = formatCardNumber(normalizeDigits(t.numero), marca);
  inputOf("titular").value = (/\s/.test(nombre) ? nombre : "Cliente de Prueba").toUpperCase();
  inputOf("vencimiento").value = `12/${anio}`;
  ajustarCvc(marca);
  inputOf("cvc").value = marca === "amex" ? "1234" : "123";
  CAMPOS_TARJETA.forEach(n => setErr(n, ""));
  syncCard();
}

function limpiarTarjeta() {
  CAMPOS_TARJETA.forEach(n => { inputOf(n).value = ""; setErr(n, ""); });
  ajustarCvc(null);
  card.update({ number: "", name: "", expiry: "", cvc: "", focused: null });
}

// ---------- Pago ----------
async function simularPasarela(numero) {
  await esperar(1800);
  const prueba = TARJETAS_PRUEBA.find(t => normalizeDigits(t.numero) === numero);
  const resultado = prueba ? prueba.resultado : "aprobada";
  return resultado === "aprobada"
    ? { ok: true, autorizacion: String(Math.floor(100000 + Math.random() * 900000)) }
    : { ok: false, ...RESULTADOS[resultado] };
}

function datosComprador() {
  const v = n => inputOf(n).value.trim();
  const c = { nombre: v("nombre"), telefono: v("telefono"), email: v("email") };
  if (state.entrega === "envio") Object.assign(c, { direccion: v("direccion"), localidad: v("localidad"), cp: v("cp").toUpperCase() });
  return c;
}

async function confirmar() {
  if (state.procesando) return;
  state.procesando = true;
  root.classList.add("is-busy");
  try {
    const t = totales();
    let pago;
    if (esTarjeta()) {
      const numero = digitosTarjeta();
      const marca = detectBrand(numero);
      mostrarProcesando(t);
      const r = await simularPasarela(numero);
      if (!r.ok) return mostrarRechazo(r);
      pago = {
        metodo: state.metodo, marca, marcaNombre: nombreMarca(marca), last4: numero.slice(-4),
        cuotas: t.cuotas, valorCuota: t.valorCuota, autorizacion: r.autorizacion, estado: "aprobado",
      };
      limpiarTarjeta();
    } else {
      pago = { metodo: "local", estado: "pendiente" };
    }
    state.pedido = Pedidos.add({
      items: Carrito.detalle().map(({ producto, ...item }) => item),
      ...t,
      entrega: state.entrega,
      cliente: datosComprador(),
      pago,
      estado: pago.estado === "aprobado" ? "pagado" : "pendiente de pago",
    });
    Carrito.vaciar();
    mostrarComprobante(state.pedido);
  } finally {
    state.procesando = false;
    root.classList.remove("is-busy");
  }
}

function mostrarProcesando(t) {
  $("#coResultado").innerHTML = `
    <div class="co-state">
      <div class="spinner" aria-hidden="true"></div>
      <h3>Procesando el pago</h3>
      <p>Estamos autorizando ${fmtPrice(t.total)} con el banco. No cierres esta ventana.</p>
    </div>`;
  go(4);
}

function mostrarRechazo(r) {
  $("#coResultado").innerHTML = `
    <div class="co-state co-state--error" role="alert">
      <div class="co-state__icon" aria-hidden="true">!</div>
      <h3>${r.titulo}</h3>
      <p><strong>${r.mensaje}</strong><br>${r.ayuda}</p>
      <div class="co-actions">
        ${r.reintentar ? `<button type="button" class="btn btn--dark" data-co-accion="reintentar">Reintentar el pago</button>` : ""}
        <button type="button" class="btn ${r.reintentar ? "btn--line-dark" : "btn--dark"}" data-co-accion="otraTarjeta">Usar otra tarjeta</button>
        <button type="button" class="btn btn--line-dark" data-co-accion="pagoLocal">Pagar en efectivo o transferencia</button>
      </div>
    </div>`;
  go(4);
  $(".co-actions .btn", root).focus();
}

function mostrarComprobante(p) {
  const fecha = new Date(p.creado).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
  const pagado = p.estado === "pagado";
  const talle = i => (i.talle && i.talle !== "Único" ? i.talle : "");
  const pagoTxt = pagado
    ? `${p.pago.metodo === "credito" ? "Crédito" : "Débito"} ${p.pago.marcaNombre} terminada en ${p.pago.last4}${p.pago.cuotas > 1 ? ` · ${p.pago.cuotas} cuotas de ${fmtPrice(p.pago.valorCuota)}` : ""}`
    : "Efectivo o transferencia";
  const entregaTxt = p.entrega === "envio"
    ? `Envío a ${escapeHtml(p.cliente.direccion)}, ${escapeHtml(p.cliente.localidad)}`
    : `Retiro en ${escapeHtml(local())}`;
  const fila = (k, v, cls = "") => `<div class="${cls}"><span>${k}</span><span>${v}</span></div>`;
  const msg = `Hola Pola's! Hice una compra en la web 🛍️\nPedido ${p.numero}\n` +
    p.items.map(i => `• ${i.qty}x ${i.nombre}${talle(i) ? ` (talle ${talle(i)})` : ""}`).join("\n") +
    `\nTotal: ${fmtPrice(p.total)}\n${pagado ? "Pagado con tarjeta" : "Pago pendiente: efectivo o transferencia"}\n` +
    `${p.entrega === "envio" ? "Envío a domicilio" : "Retiro en el local"}\nA nombre de: ${p.cliente.nombre}`;

  $("#coResultado").innerHTML = `
    <div class="ticket receipt" id="coRecibo">
      <img class="ticket__logo" src="img/logo.png" alt="">
      <span class="script">¡gracias!</span>
      <h3>${pagado ? "Compra confirmada" : "Pedido registrado"}</h3>
      <div class="ticket__code">Pedido <strong>${p.numero}</strong></div>
      <p class="receipt__date">${fecha}</p>
      <ul class="receipt-items">${p.items.map(i => `
        <li><span>${i.qty} × ${escapeHtml(i.nombre)}${talle(i) ? ` <em>(talle ${talle(i)})</em>` : ""}</span><span>${fmtPrice(i.subtotal)}</span></li>`).join("")}
      </ul>
      <div class="receipt-totals">
        ${fila("Subtotal", fmtPrice(p.subtotal))}
        ${fila("Envío", p.envio ? fmtPrice(p.envio) : "Gratis")}
        ${p.recargo ? fila(`Recargo ${p.cuotas} cuotas`, fmtPrice(p.recargo)) : ""}
        ${fila("Total", fmtPrice(p.total), "is-total")}
      </div>
      <dl class="ticket__rows">
        <div><dt>Pago</dt><dd>${pagoTxt}</dd></div>
        <div><dt>${pagado ? "Autorización" : "Estado"}</dt><dd>${pagado ? p.pago.autorizacion : "Pendiente de pago"}</dd></div>
        <div><dt>Entrega</dt><dd>${entregaTxt}</dd></div>
        <div><dt>Comprador</dt><dd>${escapeHtml(p.cliente.nombre)}</dd></div>
      </dl>
      <div class="ticket__actions co-actions">
        <a class="btn btn--gold" href="${waLink(msg)}" target="_blank" rel="noopener">Avisar por WhatsApp</a>
        <button type="button" class="btn btn--dark" data-co-accion="imprimir">Imprimir comprobante</button>
      </div>
      <button type="button" class="link-btn co-actions" data-co-accion="seguir">Seguir comprando</button>
      <p class="ticket__note">${pagado ? "Pago simulado: no se realizó ningún cobro real." : "Te vamos a escribir para coordinar el pago."}</p>
    </div>`;
  go(4);
}

const acciones = {
  reintentar: () => confirmar(),
  otraTarjeta: () => { go(3); inputOf("numero").focus(); inputOf("numero").select(); },
  pagoLocal: () => { state.metodo = "local"; state.cuotas = 1; renderMetodos(); go(3); },
  editarCarrito: () => { cerrar(); Carrito.abrir(); },
  imprimir: () => { document.body.classList.add("printing"); window.print(); },
  seguir: () => cerrar(),
};
window.addEventListener("afterprint", () => document.body.classList.remove("printing"));

// ---------- Apertura, cierre y navegación ----------
function abrir() {
  if (!Carrito.cantidad()) return;
  if (state.pedido) reiniciar();
  state.volverA = document.activeElement;
  renderItems();
  renderEntrega();
  renderMetodos();
  go(state.step === 4 ? 3 : state.step);
  root.hidden = false;
  document.body.classList.add("no-scroll");
  panel.focus();
}

function cerrar() {
  if (state.procesando) { toast("Esperá a que termine el pago"); return; }
  root.hidden = true;
  document.body.classList.remove("no-scroll");
  if (state.pedido) reiniciar();
  if (state.volverA && state.volverA.focus) state.volverA.focus();
}

function reiniciar() {
  // Conserva nombre, teléfono y email del comprador por comodidad
  Object.assign(state, { step: 1, entrega: null, metodo: null, cuotas: 1, pedido: null });
  limpiarTarjeta();
}

function atraparFoco(e) {
  const focos = $$('button:not([disabled]), [href], input:not([disabled]), select, textarea, summary', panel)
    .filter(el => el.offsetParent !== null);
  if (!focos.length) return;
  const primero = focos[0], ultimo = focos[focos.length - 1];
  if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
}

root.addEventListener("click", e => {
  if (e.target.closest("[data-co-close]")) { cerrar(); return; }
  const b = e.target.closest("[data-entrega],[data-metodo],[data-usar],[data-co-accion]");
  if (!b) return;
  const d = b.dataset;
  if (d.entrega) {
    state.entrega = d.entrega;
    renderEntrega();
    renderMetodos();
    renderResumen();
  } else if (d.metodo) {
    state.metodo = d.metodo;
    if (state.metodo !== "credito") state.cuotas = 1;
    renderMetodos();
    renderResumen();
    actualizarBoton();
    if (esTarjeta()) setTimeout(() => inputOf("numero").focus(), 50);
  } else if (d.usar) {
    llenarTarjeta(TARJETAS_PRUEBA[+d.usar]);
  } else if (d.coAccion) {
    acciones[d.coAccion]();
  }
});

btnNext.addEventListener("click", () => {
  if (state.procesando || !validarPaso(state.step)) return;
  if (state.step < 3) go(state.step + 1);
  else confirmar();
});
btnBack.addEventListener("click", () => go(Math.max(1, state.step - 1)));
$("#coCuotas").addEventListener("change", e => {
  state.cuotas = +e.target.value;
  renderResumen();
  actualizarBoton();
});
$$("form", root).forEach(f => f.addEventListener("submit", e => { e.preventDefault(); btnNext.click(); }));

document.addEventListener("keydown", e => {
  if (root.hidden) return;
  if (e.key === "Escape") cerrar();
  if (e.key === "Tab") atraparFoco(e);
});
document.addEventListener("polas:checkout", abrir);

renderPrueba();
