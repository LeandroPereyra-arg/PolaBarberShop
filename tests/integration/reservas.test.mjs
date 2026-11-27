/* Integración del sistema de turnos con el almacenamiento (store.js + localStorage). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cargarSitio, proximaFecha } from "../helpers/sitio.mjs";

const s = cargarSitio();
s.CONFIG.demoOcupados = false;

const lunes = proximaFecha(1);
const turno = {
  servicioId: "corte-barba", servicio: "Corte + Barba", precio: 12000, duracion: 60,
  barberoId: "pola", barbero: "Pola", fecha: lunes, hora: "14:00",
  nombre: "Cliente de Prueba", telefono: "11 2345 6789", notas: "",
};
const libre = (barbero, hora, duracion = 30) => s.Turnos.slots(lunes, barbero, duracion).find(h => h.hora === hora).libre;

test("reservar bloquea al barbero durante toda la duración del servicio", () => {
  const t = s.Turnos.add(turno);
  assert.match(t.codigo, /^PB-[A-Z0-9]{4}$/);
  assert.equal(t.estado, "confirmado");
  assert.equal(libre("pola", "14:00"), false);
  assert.equal(libre("pola", "14:30"), false);
  assert.equal(libre("pola", "15:00"), true);
});

test("no se puede reservar un servicio que se superponga con otro turno", () => {
  assert.equal(libre("pola", "13:30", 60), false);
  assert.equal(libre("pola", "13:00", 60), true);
});

test("los otros barberos siguen libres y 'el primero libre' asigna a uno de ellos", () => {
  const h = s.Turnos.slots(lunes, "cualquiera", 30).find(x => x.hora === "14:00");
  assert.equal(h.libre, true);
  assert.notEqual(h.barberoId, "pola");
});

test("el turno queda guardado en localStorage", () => {
  const guardado = JSON.parse(s.localStorage.getItem("polas_turnos_v1"));
  assert.equal(guardado.length, 1);
  assert.equal(guardado[0].hora, "14:00");
  assert.equal(guardado[0].precio, 12000);
});

test("el cliente encuentra su turno con el teléfono escrito de otra forma", () => {
  assert.equal(s.Turnos.byPhone("+54 9 11 2345-6789").length, 1);
  assert.equal(s.Turnos.byPhone("11 9999 0000").length, 0);
  assert.equal(s.Turnos.byPhone("123").length, 0);
});

test("cancelar el turno libera el horario", () => {
  const [t] = s.Turnos.read();
  s.Turnos.update(t.id, { estado: "cancelado" });
  assert.equal(libre("pola", "14:00"), true);
});

test("si el navegador bloquea el almacenamiento, el sistema no se rompe", () => {
  const bloqueado = cargarSitio({ sinStorage: true });
  assert.doesNotThrow(() => bloqueado.Turnos.add(turno));
  assert.equal(bloqueado.Turnos.read().length, 0);
});
