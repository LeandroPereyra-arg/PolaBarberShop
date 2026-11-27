/* ============================================================
   Lógica del módulo de pago, sin acceso al DOM.
   Separada de checkout.js para poder probarla de forma aislada
   (ver tests/). La usa checkout.js en el navegador.
   ============================================================ */
import { detectBrand, getBrandSpec, normalizeDigits } from "../vendor/crd-ui/index.js";

const texto = v => String(v ?? "");
const soloDigitos = v => texto(v).replace(/\D/g, "");

/** Algoritmo de Luhn: verifica el dígito de control de una tarjeta. */
export function luhn(digitos) {
  let suma = 0, doble = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let d = +digitos[i];
    if (doble) { d *= 2; if (d > 9) d -= 9; }
    suma += d;
    doble = !doble;
  }
  return digitos.length > 0 && suma % 10 === 0;
}

/** Largo del código de seguridad según la marca (4 en American Express). */
export function largoCvc(numero) {
  const marca = detectBrand(normalizeDigits(texto(numero)));
  return marca ? getBrandSpec(marca).cvcLength : 3;
}

/**
 * Reglas de validación de cada campo del checkout.
 * Devuelven "" si el valor es válido, o el mensaje que se muestra bajo el campo.
 * ctx: { metodo: "credito" | "debito" | "local", numero: string, hoy: Date }
 */
export const validadores = {
  nombre: v => (texto(v).trim().length >= 3 ? "" : "Ingresá tu nombre y apellido"),
  telefono: v => (soloDigitos(v).length >= 8 ? "" : "Ingresá un teléfono válido (mínimo 8 números)"),
  email: v => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto(v).trim()) ? "" : "Ingresá un email válido, por ejemplo nombre@mail.com"),
  direccion: v => (/\d/.test(texto(v)) && texto(v).trim().length >= 5 ? "" : "Ingresá calle y número"),
  localidad: v => (texto(v).trim().length >= 3 ? "" : "Ingresá la localidad"),
  cp: v => (/^(\d{4}|[a-z]\d{4}[a-z]{3})$/i.test(texto(v).trim()) ? "" : "Código postal de 4 números (o CPA, ej. B1851ABC)"),

  numero: (v, ctx = {}) => {
    const d = normalizeDigits(texto(v));
    if (!d) return "Ingresá el número de la tarjeta";
    const marca = detectBrand(d);
    if (!marca) return "No reconocemos esa tarjeta";
    const spec = getBrandSpec(marca);
    if (!spec.lengths.includes(d.length)) return `Una ${spec.displayName} tiene ${spec.lengths.join(" o ")} números`;
    if (!luhn(d)) return "El número no es válido, revisalo";
    if (ctx.metodo === "debito" && marca === "amex") return "American Express no tiene tarjetas de débito";
    return "";
  },
  titular: v => {
    const t = texto(v).trim();
    return /^[a-záéíóúüñ' .-]{3,}$/i.test(t) && /\s/.test(t) ? "" : "Escribí nombre y apellido como figuran en la tarjeta";
  },
  vencimiento: (v, ctx = {}) => {
    const m = /^(\d{2})\/(\d{2})$/.exec(texto(v).trim());
    if (!m) return "Usá el formato MM/AA";
    const mes = +m[1], anio = 2000 + +m[2];
    if (mes < 1 || mes > 12) return "El mes tiene que ser entre 01 y 12";
    const hoy = ctx.hoy || new Date();
    if (new Date(anio, mes, 0, 23, 59, 59) < hoy) return "La tarjeta está vencida";
    if (anio > hoy.getFullYear() + 15) return "Revisá el año de vencimiento";
    return "";
  },
  cvc: (v, ctx = {}) => {
    const largo = largoCvc(ctx.numero);
    return new RegExp(`^\\d{${largo}}$`).test(texto(v).trim()) ? "" : `El código de seguridad tiene ${largo} números`;
  },
};

/**
 * Totales de la compra.
 * El envío es gratis desde config.envio.gratisDesde; el recargo por cuotas
 * solo aplica con tarjeta de crédito. Un plan inexistente cae en 1 pago.
 */
export function calcularTotales({ subtotal, entrega, metodo, cuotas = 1 }, config) {
  const envio = entrega === "envio" && subtotal < config.envio.gratisDesde ? config.envio.costo : 0;
  const base = subtotal + envio;
  const credito = metodo === "credito";
  const plan = config.cuotas.find(c => c.n === cuotas) || config.cuotas[0];
  const recargo = credito ? Math.round(base * plan.recargo) : 0;
  const total = base + recargo;
  const n = credito ? plan.n : 1;
  return { subtotal, envio, recargo, total, cuotas: n, valorCuota: Math.ceil(total / n) };
}

/** Resultado de la pasarela simulada: depende de la tarjeta de prueba; cualquier otra se aprueba. */
export function resultadoPago(numero, tarjetasPrueba) {
  const d = normalizeDigits(texto(numero));
  const prueba = tarjetasPrueba.find(t => normalizeDigits(t.numero) === d);
  return prueba ? prueba.resultado : "aprobada";
}

/**
 * Datos del pago aprobado que se guardan en el pedido.
 * Por diseño NO incluye el número completo, el vencimiento ni el código:
 * solo la marca y los últimos 4 dígitos, como un comprobante real.
 */
export function datosPagoAprobado({ numero, metodo, totales, autorizacion }) {
  const d = normalizeDigits(texto(numero));
  const marca = detectBrand(d);
  return {
    metodo,
    marca,
    marcaNombre: marca ? getBrandSpec(marca).displayName : "Tarjeta",
    last4: d.slice(-4),
    cuotas: totales.cuotas,
    valorCuota: totales.valorCuota,
    autorizacion,
    estado: "aprobado",
  };
}
