/* Integración del módulo de pago: datos del sitio + crd-ui + lógica de pago + guardado de pedidos. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectBrand, getBrandSpec } from "../../vendor/crd-ui/index.js";
import { validadores, calcularTotales, resultadoPago, datosPagoAprobado } from "../../js/pago.js";
import { cargarSitio } from "../helpers/sitio.mjs";

const s = cargarSitio();

test("todas las tarjetas de prueba de data.js pasan la validación", () => {
  for (const t of s.TARJETAS_PRUEBA) {
    assert.equal(validadores.numero(t.numero, { metodo: "credito" }), "", t.numero);
  }
});

test("crd-ui reconoce la marca que anuncia cada tarjeta de prueba", () => {
  const nombres = { Visa: "Visa", Mastercard: "Mastercard", Amex: "American Express" };
  for (const t of s.TARJETAS_PRUEBA) {
    assert.equal(getBrandSpec(detectBrand(t.numero)).displayName, nombres[t.marca], t.numero);
  }
});

test("la pasarela simulada devuelve el resultado que anuncia cada tarjeta", () => {
  for (const t of s.TARJETAS_PRUEBA) assert.equal(resultadoPago(t.numero, s.TARJETAS_PRUEBA), t.resultado);
});

test("los productos del catálogo tienen precio y los de ropa tienen talles", () => {
  for (const p of s.PRODUCTOS) {
    assert.ok(Number.isInteger(p.precio) && p.precio > 0, p.id);
    if (p.tipo === "ropa") assert.ok(p.talles.length > 0, p.id);
  }
});

test("una compra con tarjeta se guarda sin el número completo ni el código", () => {
  const remera = s.PRODUCTOS.find(p => p.id === "remera-logo-negra");
  const pomada = s.PRODUCTOS.find(p => p.id === "pomada-mate");
  const items = [
    { id: remera.id, nombre: remera.nombre, talle: "M", qty: 1, precio: remera.precio, subtotal: remera.precio },
    { id: pomada.id, nombre: pomada.nombre, talle: null, qty: 2, precio: pomada.precio, subtotal: pomada.precio * 2 },
  ];
  const subtotal = items.reduce((n, i) => n + i.subtotal, 0);
  const totales = calcularTotales({ subtotal, entrega: "envio", metodo: "credito", cuotas: 6 }, s.CONFIG);
  assert.equal(totales.total, 44550);

  const pago = datosPagoAprobado({ numero: "4242 4242 4242 4242", metodo: "credito", totales, autorizacion: "123456" });
  const pedido = s.Pedidos.add({
    items, ...totales, entrega: "envio",
    cliente: { nombre: "Cliente de Prueba", telefono: "1123456789", email: "cliente@mail.com", direccion: "Av. Espora 1234", localidad: "Adrogué", cp: "1846" },
    pago, estado: "pagado",
  });
  assert.match(pedido.numero, /^PB-\d{6}$/);

  const guardado = s.localStorage.getItem("polas_pedidos_v1");
  assert.ok(!guardado.includes("4242424242424242"));
  assert.ok(!guardado.includes("4242 4242 4242 4242"));
  assert.ok(!/"cvc"|vencimiento|expiry/i.test(guardado));
  assert.equal(JSON.parse(guardado)[0].pago.last4, "4242");
});

test("el panel puede cambiar el estado del pedido", () => {
  const [p] = s.Pedidos.read();
  s.Pedidos.update(p.id, { estado: "entregado" });
  assert.equal(s.Pedidos.read()[0].estado, "entregado");
});
