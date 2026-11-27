import { test } from "node:test";
import assert from "node:assert/strict";
import { cargarSitio, proximaFecha } from "../helpers/sitio.mjs";

const s = cargarSitio();
s.CONFIG.demoOcupados = false; // sin horarios ocupados de mentira

const DOMINGO = 0, LUNES = 1, SABADO = 6;

test("el domingo está cerrado: no hay horarios", () => {
  assert.equal(s.Turnos.slots(proximaFecha(DOMINGO), "pola", 30).length, 0);
});

test("el lunes ofrece bloques de 30 min de 10:00 a 19:30", () => {
  const horarios = s.Turnos.slots(proximaFecha(LUNES), "pola", 30);
  assert.equal(horarios.length, 20);
  assert.equal(horarios[0].hora, "10:00");
  assert.equal(horarios.at(-1).hora, "19:30");
  assert.ok(horarios.every(h => h.libre));
});

test("el sábado respeta su horario extendido (9 a 21)", () => {
  const horarios = s.Turnos.slots(proximaFecha(SABADO), "pola", 30);
  assert.equal(horarios[0].hora, "09:00");
  assert.equal(horarios.at(-1).hora, "20:30");
});

test("un servicio de 60 min no se ofrece si terminaría después del cierre", () => {
  const horarios = s.Turnos.slots(proximaFecha(LUNES), "pola", 60);
  assert.equal(horarios.at(-1).hora, "19:00");
});

test("'el primero libre' siempre asigna un barbero real", () => {
  const reales = s.BARBEROS.filter(b => b.id !== "cualquiera").map(b => b.id);
  const horarios = s.Turnos.slots(proximaFecha(LUNES), "cualquiera", 30);
  assert.ok(horarios.every(h => reales.includes(h.barberoId)));
});

test("toMin y toHora convierten entre hora y minutos", () => {
  assert.equal(s.Turnos.toMin("14:30"), 870);
  assert.equal(s.Turnos.toHora(870), "14:30");
  assert.equal(s.Turnos.toHora(540), "09:00");
});
