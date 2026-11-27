import { test } from "node:test";
import assert from "node:assert/strict";
import { cargarSitio } from "../helpers/sitio.mjs";

const s = cargarSitio();

test("fmtPrice formatea en pesos con separador de miles", () => {
  assert.equal(s.fmtPrice(18000), "$18.000");
  assert.equal(s.fmtPrice(1500000), "$1.500.000");
  assert.equal(s.fmtPrice(0), "$0");
});

test("normTel deja solo los dígitos del teléfono", () => {
  assert.equal(s.normTel("+54 9 11 2345-6789"), "5491123456789");
  assert.equal(s.normTel(""), "");
  assert.equal(s.normTel(undefined), "");
});

test("escapeHtml neutraliza el HTML que escribe un usuario", () => {
  assert.equal(s.escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(s.escapeHtml("Pola's & Co"), "Pola&#39;s &amp; Co");
});

test("las fechas se muestran en castellano", () => {
  assert.equal(s.fechaLarga("2026-11-26"), "Jueves 26 de noviembre");
  assert.equal(s.fechaCorta("2026-09-04"), "Vie 4/9");
});
