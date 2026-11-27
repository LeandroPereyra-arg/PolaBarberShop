/* Carga los scripts clásicos del sitio (data.js, utils.js, store.js) en un
   contexto aislado de Node, con un localStorage en memoria, para probarlos
   sin navegador. */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SCRIPTS = ["js/data.js", "js/utils.js", "js/store.js"];

function crearLocalStorage() {
  const datos = new Map();
  return {
    getItem: k => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: k => datos.delete(k),
    clear: () => datos.clear(),
  };
}

// Simula un navegador con el almacenamiento bloqueado (modo privado estricto, etc.)
function storageBloqueado() {
  const falla = () => { throw new Error("SecurityError: almacenamiento no disponible"); };
  return { getItem: falla, setItem: falla, removeItem: falla, clear: falla };
}

export function cargarSitio({ sinStorage = false } = {}) {
  const ctx = vm.createContext({ localStorage: sinStorage ? storageBloqueado() : crearLocalStorage(), console });
  for (const archivo of SCRIPTS) {
    const codigo = readFileSync(new URL(`../../${archivo}`, import.meta.url), "utf8");
    vm.runInContext(codigo, ctx, { filename: archivo });
  }
  // Las constantes de nivel superior no son propiedades del contexto: se leen evaluándolas.
  return vm.runInContext(
    "({ CONFIG, SERVICIOS, BARBEROS, PRODUCTOS, TARJETAS_PRUEBA, Turnos, Pedidos, fmtPrice, normTel, escapeHtml, fechaLarga, fechaCorta, localStorage })",
    ctx,
  );
}

/** Próxima fecha (a partir de mañana) que cae en el día de la semana indicado (0 = domingo). */
export function proximaFecha(diaSemana) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== diaSemana) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
