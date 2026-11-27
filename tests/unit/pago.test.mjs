import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { luhn, largoCvc, validadores as v, calcularTotales, resultadoPago, datosPagoAprobado } from "../../js/pago.js";

const HOY = new Date(2026, 10, 26); // 26/11/2026
const AMEX = "3782 822463 10005";
const VISA = "4242 4242 4242 4242";
const CONFIG = {
  envio: { costo: 3500, gratisDesde: 60000 },
  cuotas: [{ n: 1, recargo: 0 }, { n: 3, recargo: 0 }, { n: 6, recargo: 0.1 }, { n: 12, recargo: 0.2 }],
};

describe("algoritmo de Luhn", () => {
  test("acepta un número válido", () => assert.equal(luhn("4242424242424242"), true));
  test("rechaza el mismo número con un dígito cambiado", () => assert.equal(luhn("4242424242424241"), false));
  test("rechaza un número vacío", () => assert.equal(luhn(""), false));
});

describe("número de tarjeta", () => {
  test("pide el número si está vacío", () => assert.equal(v.numero(""), "Ingresá el número de la tarjeta"));
  test("rechaza una marca desconocida", () => assert.equal(v.numero("9999 9999 9999 9999"), "No reconocemos esa tarjeta"));
  test("controla el largo según la marca", () => assert.match(v.numero("4242 4242"), /^Una Visa tiene .*números$/));
  test("rechaza un número que no pasa Luhn", () => assert.equal(v.numero("4242 4242 4242 4241"), "El número no es válido, revisalo"));
  test("acepta Visa y American Express con crédito", () => {
    assert.equal(v.numero(VISA, { metodo: "credito" }), "");
    assert.equal(v.numero(AMEX, { metodo: "credito" }), "");
  });
  test("no acepta American Express como débito", () => {
    assert.equal(v.numero(AMEX, { metodo: "debito" }), "American Express no tiene tarjetas de débito");
  });
});

describe("vencimiento", () => {
  test("acepta una fecha futura", () => assert.equal(v.vencimiento("12/26", { hoy: HOY }), ""));
  test("acepta el mes en curso (vence a fin de mes)", () => assert.equal(v.vencimiento("11/26", { hoy: HOY }), ""));
  test("rechaza una tarjeta vencida", () => assert.equal(v.vencimiento("10/26", { hoy: HOY }), "La tarjeta está vencida"));
  test("rechaza un mes inexistente", () => assert.equal(v.vencimiento("13/27", { hoy: HOY }), "El mes tiene que ser entre 01 y 12"));
  test("exige el formato MM/AA", () => assert.equal(v.vencimiento("1227", { hoy: HOY }), "Usá el formato MM/AA"));
  test("rechaza un año demasiado lejano", () => assert.equal(v.vencimiento("12/45", { hoy: HOY }), "Revisá el año de vencimiento"));
});

describe("código de seguridad", () => {
  test("3 dígitos para Visa", () => {
    assert.equal(largoCvc(VISA), 3);
    assert.equal(v.cvc("123", { numero: VISA }), "");
  });
  test("4 dígitos para American Express", () => {
    assert.equal(largoCvc(AMEX), 4);
    assert.equal(v.cvc("123", { numero: AMEX }), "El código de seguridad tiene 4 números");
    assert.equal(v.cvc("1234", { numero: AMEX }), "");
  });
});

describe("datos del comprador y del titular", () => {
  test("el titular necesita nombre y apellido, sin números", () => {
    assert.notEqual(v.titular("Leandro"), "");
    assert.notEqual(v.titular("J0hn Doe"), "");
    assert.equal(v.titular("LEANDRO PEREYRA"), "");
  });
  test("email", () => {
    assert.notEqual(v.email("leandro@"), "");
    assert.equal(v.email("leandro@mail.com"), "");
  });
  test("teléfono de al menos 8 dígitos", () => {
    assert.notEqual(v.telefono("1234"), "");
    assert.equal(v.telefono("11 2345-6789"), "");
  });
  test("código postal de 4 números o CPA", () => {
    assert.equal(v.cp("1846"), "");
    assert.equal(v.cp("b1851abc"), "");
    assert.notEqual(v.cp("18"), "");
  });
  test("la dirección necesita calle y número", () => {
    assert.notEqual(v.direccion("Av. Espora"), "");
    assert.equal(v.direccion("Av. Espora 1234"), "");
  });
});

describe("cálculo de totales", () => {
  test("retiro en el local, un pago: sin envío ni recargo", () => {
    const t = calcularTotales({ subtotal: 37000, entrega: "retiro", metodo: "credito", cuotas: 1 }, CONFIG);
    assert.deepEqual(t, { subtotal: 37000, envio: 0, recargo: 0, total: 37000, cuotas: 1, valorCuota: 37000 });
  });
  test("envío con costo por debajo del mínimo", () => {
    assert.equal(calcularTotales({ subtotal: 37000, entrega: "envio", metodo: "debito" }, CONFIG).envio, 3500);
  });
  test("envío gratis desde el mínimo", () => {
    assert.equal(calcularTotales({ subtotal: 60000, entrega: "envio", metodo: "debito" }, CONFIG).envio, 0);
  });
  test("6 cuotas con 10% de recargo", () => {
    const t = calcularTotales({ subtotal: 37000, entrega: "envio", metodo: "credito", cuotas: 6 }, CONFIG);
    assert.equal(t.recargo, 4050);
    assert.equal(t.total, 44550);
    assert.equal(t.valorCuota, 7425);
  });
  test("3 cuotas sin interés", () => {
    const t = calcularTotales({ subtotal: 45000, entrega: "retiro", metodo: "credito", cuotas: 3 }, CONFIG);
    assert.equal(t.total, 45000);
    assert.equal(t.valorCuota, 15000);
  });
  test("el valor de la cuota se redondea hacia arriba", () => {
    assert.equal(calcularTotales({ subtotal: 10000, entrega: "retiro", metodo: "credito", cuotas: 3 }, CONFIG).valorCuota, 3334);
  });
  test("con débito no hay cuotas ni recargo", () => {
    const t = calcularTotales({ subtotal: 37000, entrega: "retiro", metodo: "debito", cuotas: 6 }, CONFIG);
    assert.equal(t.cuotas, 1);
    assert.equal(t.recargo, 0);
  });
  test("un plan de cuotas inexistente cae en un pago", () => {
    assert.equal(calcularTotales({ subtotal: 1000, entrega: "retiro", metodo: "credito", cuotas: 5 }, CONFIG).cuotas, 1);
  });
});

describe("pasarela simulada", () => {
  const PRUEBA = [
    { numero: "4000 0000 0000 0002", resultado: "rechazada" },
    { numero: "4000 0000 0000 9995", resultado: "sin_fondos" },
  ];
  test("las tarjetas de prueba devuelven su resultado", () => {
    assert.equal(resultadoPago("4000000000000002", PRUEBA), "rechazada");
    assert.equal(resultadoPago("4000 0000 0000 9995", PRUEBA), "sin_fondos");
  });
  test("cualquier otra tarjeta válida se aprueba", () => assert.equal(resultadoPago(VISA, PRUEBA), "aprobada"));
});

describe("datos del pago guardados", () => {
  const pago = datosPagoAprobado({ numero: VISA, metodo: "credito", totales: { cuotas: 3, valorCuota: 15000 }, autorizacion: "123456" });
  test("guarda la marca y los últimos 4 dígitos", () => {
    assert.equal(pago.marcaNombre, "Visa");
    assert.equal(pago.last4, "4242");
    assert.equal(pago.estado, "aprobado");
  });
  test("no guarda el número completo, el vencimiento ni el código", () => {
    const json = JSON.stringify(pago);
    assert.ok(!json.includes("4242424242424242"));
    assert.ok(!/cvc|vencimiento|expiry/i.test(json));
  });
});
