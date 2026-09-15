/* Tienda: ropa y productos de barbería, carrito y pedido por WhatsApp */
(function () {
  const grid = $("#shopGrid");
  if (!grid) return;

  const KEY = "polas_carrito_v1";
  let filtro = "todo";
  const talleSel = {};
  let cart = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* sin storage */ }
    renderCart();
  }
  const producto = id => PRODUCTOS.find(p => p.id === id);

  // ---------- Catálogo ----------
  function card(p) {
    const multi = p.talles && p.talles.length > 1;
    if (p.talles && p.talles.length === 1) talleSel[p.id] = p.talles[0];
    return `
      <article class="product" data-id="${p.id}">
        <div class="product__art marble">
          ${p.badge ? `<span class="product__badge">${p.badge}</span>` : ""}
          ${productArt(p)}
        </div>
        <div class="product__body">
          <span class="product__cat">${p.cat}</span>
          <h3 class="product__name">${p.nombre}</h3>
          <p class="product__desc">${p.desc}</p>
          ${multi ? `<div class="sizes" role="group" aria-label="Talle">${p.talles.map(t =>
            `<button type="button" class="size ${talleSel[p.id] === t ? "is-sel" : ""}" data-talle="${t}" aria-pressed="${talleSel[p.id] === t}">${t}</button>`).join("")}</div>` : ""}
          <div class="product__foot">
            <span class="product__price">${fmtPrice(p.precio)}</span>
            <button type="button" class="btn btn--gold btn--sm" data-add>Agregar</button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    grid.innerHTML = PRODUCTOS.filter(p => filtro === "todo" || p.tipo === filtro).map(card).join("");
  }

  $$(".tabs [data-filter]").forEach(tab => tab.addEventListener("click", () => {
    filtro = tab.dataset.filter;
    $$(".tabs [data-filter]").forEach(t => t.setAttribute("aria-selected", t === tab));
    render();
  }));

  grid.addEventListener("click", e => {
    const cardEl = e.target.closest(".product");
    if (!cardEl) return;
    const p = producto(cardEl.dataset.id);

    const size = e.target.closest("[data-talle]");
    if (size) {
      talleSel[p.id] = size.dataset.talle;
      $$(".size", cardEl).forEach(b => {
        const on = b === size;
        b.classList.toggle("is-sel", on);
        b.setAttribute("aria-pressed", on);
      });
      return;
    }

    if (e.target.closest("[data-add]")) {
      const talle = p.talles ? talleSel[p.id] : null;
      if (p.talles && !talle) {
        const s = $(".sizes", cardEl);
        s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake");
        toast("Elegí un talle primero");
        return;
      }
      const item = cart.find(i => i.id === p.id && i.talle === talle);
      if (item) item.qty++;
      else cart.push({ id: p.id, talle, qty: 1 });
      save();
      toast(`Agregaste ${p.nombre}${talle && talle !== "Único" ? ` (${talle})` : ""}`);
      const btn = $("#cartBtn");
      btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
    }
  });

  // ---------- Carrito ----------
  const drawer = $("#cart");
  const overlay = $("#overlay");
  const openCart = () => { drawer.classList.add("is-open"); overlay.classList.add("is-on"); drawer.setAttribute("aria-hidden", "false"); };
  const closeCart = () => { drawer.classList.remove("is-open"); overlay.classList.remove("is-on"); drawer.setAttribute("aria-hidden", "true"); };

  $("#cartBtn").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  overlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeCart(); });

  function renderCart() {
    cart = cart.filter(i => producto(i.id));
    const count = cart.reduce((n, i) => n + i.qty, 0);
    const total = cart.reduce((n, i) => n + i.qty * producto(i.id).precio, 0);
    const badge = $("#cartCount");
    badge.textContent = count;
    badge.dataset.n = count;

    $("#cartItems").innerHTML = cart.length ? cart.map((i, idx) => {
      const p = producto(i.id);
      return `<li class="citem">
        <div class="citem__art marble">${productArt(p, "c")}</div>
        <div>
          <div class="citem__name">${p.nombre}</div>
          <div class="citem__meta">${i.talle && i.talle !== "Único" ? `Talle ${i.talle} · ` : ""}${fmtPrice(p.precio)}</div>
          <div class="qty">
            <button type="button" data-qty="-1" data-idx="${idx}" aria-label="Restar">−</button>
            <span>${i.qty}</span>
            <button type="button" data-qty="1" data-idx="${idx}" aria-label="Sumar">+</button>
          </div>
        </div>
        <div>
          <div class="citem__price">${fmtPrice(p.precio * i.qty)}</div>
          <button type="button" class="citem__rm" data-rm="${idx}">Quitar</button>
        </div>
      </li>`;
    }).join("") : `<li class="drawer__empty"><img src="img/logo.png" alt=""><p>Tu carrito está vacío.</p><p>Date una vuelta por la tienda 👕</p></li>`;

    $("#cartTotal").textContent = fmtPrice(total);
    $("#cartCheckout").disabled = !cart.length;
  }

  $("#cartItems").addEventListener("click", e => {
    const q = e.target.closest("[data-qty]");
    const rm = e.target.closest("[data-rm]");
    if (q) {
      const item = cart[+q.dataset.idx];
      item.qty += +q.dataset.qty;
      if (item.qty <= 0) cart.splice(+q.dataset.idx, 1);
      save();
    } else if (rm) {
      cart.splice(+rm.dataset.rm, 1);
      save();
    }
  });

  $("#cartCheckout").addEventListener("click", () => {
    if (!cart.length) return;
    const lineas = cart.map(i => {
      const p = producto(i.id);
      const t = i.talle && i.talle !== "Único" ? ` (talle ${i.talle})` : "";
      return `• ${i.qty}x ${p.nombre}${t} — ${fmtPrice(p.precio * i.qty)}`;
    });
    const total = cart.reduce((n, i) => n + i.qty * producto(i.id).precio, 0);
    const msg = `Hola Pola's! Quiero hacer este pedido de la tienda web 🛍️\n\n${lineas.join("\n")}\n\nTotal: ${fmtPrice(total)}\n\n¿Cómo coordinamos el pago y el retiro?`;
    window.open(waLink(msg), "_blank", "noopener");
  });

  render();
  renderCart();
})();
