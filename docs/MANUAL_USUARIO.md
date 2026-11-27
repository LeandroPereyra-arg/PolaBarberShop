# Manual de usuario — Pola's Barber Shop

Cómo usar el sitio de la barbería. Está dividido según quién lo usa: **clientes**, **personal de la barbería** y **quien mantiene el sitio**.

---

## 1. Para clientes

### 1.1 Reservar un turno

1. En la página principal tocá **Reservar** (arriba a la derecha) o bajá hasta **Tu turno**.
2. **Elegí el servicio.** El sistema pasa solo al paso siguiente.
3. **Elegí el barbero**, o "El primero libre" si te da igual.
4. **Elegí el día** en la fila de fechas y después el **horario**. Los horarios tachados están ocupados; los días cerrados no se pueden elegir.
5. **Completá tu nombre y tu teléfono**, y si querés una nota (por ejemplo "low fade con una rayita").
6. Tocá **Confirmar turno**. Vas a ver tu **código de turno** (por ejemplo PB-7K2Q).

Desde la confirmación podés:
- **Avisar por WhatsApp**, con el mensaje ya armado.
- **Agendar en el calendario** del celular.

A la derecha (o abajo, en el celular) siempre ves el resumen: servicio, barbero, día, hora y precio. El pago del turno se hace en el local.

### 1.2 Ver o cancelar un turno

1. Bajá hasta **Mis turnos**, debajo del sistema de turnos.
2. Escribí tu teléfono y tocá **Buscar**. No importa si lo escribís con +54, espacios o guiones.
3. En un turno futuro, tocá **Cancelar** y confirmá.

Cancelar libera el horario para otro cliente.

### 1.3 Comprar en la tienda

1. En **Tienda** elegí entre **Todo**, **Ropa** o **Barbería**.
2. En las prendas, **elegí el talle** y tocá **Agregar**.
3. Abrí el **carrito** (la bolsa arriba a la derecha) para cambiar cantidades o quitar productos.
4. Tocá **Finalizar compra**:
   - **Entrega:** retiro en el local (gratis) o envío a domicilio. El envío es gratis desde cierto monto.
   - **Tus datos:** nombre, teléfono y email. Si elegiste envío, también la dirección.
   - **Pago:** tarjeta de crédito (en cuotas), tarjeta de débito, o efectivo/transferencia.
5. Con tarjeta, completá número, nombre, vencimiento y código de seguridad. La tarjeta se dibuja mientras escribís y se da vuelta al cargar el código.
6. Tocá **Pagar**. Si se aprueba, vas a ver el **comprobante**, que podés imprimir o mandar por WhatsApp.

Si el pago se rechaza, el mensaje explica el motivo y te deja **usar otra tarjeta**, **reintentar** (si fue un error de conexión) o **pagar en efectivo o por transferencia**. No se cobra nada.

También podés tocar **"o pedir por WhatsApp"** en el carrito para mandar el pedido armado por chat.

> **El pago con tarjeta es una simulación.** No ingreses los datos de una tarjeta real. Usá las tarjetas de prueba de la sección 4.

---

## 2. Para el personal de la barbería (panel)

### 2.1 Entrar

1. Abrí `admin.html`. También se llega desde **Panel de turnos**, al pie de la página principal.
2. Escribí el **PIN** y tocá **Entrar**.

La sesión dura mientras la pestaña esté abierta. **Salir** cierra la sesión.

### 2.2 Turnos

- Arriba están las **estadísticas**: turnos de hoy, de los próximos 7 días, facturación estimada del día, cancelaciones y ventas del día en la tienda.
- La tabla se puede **filtrar** por fecha (**Hoy** o **Todas las fechas**), por barbero y por estado.
- En cada turno:
  - **✓ Atendido** marca que el cliente vino.
  - **Cancelar** lo cancela. **Reactivar** lo vuelve a confirmar.
  - **✕** lo borra definitivamente (pide confirmación).
- El teléfono del cliente es un enlace que abre WhatsApp.
- **Exportar CSV** descarga todos los turnos en una planilla que se abre con Excel. Sirve como respaldo: conviene hacerlo una vez por semana.
- **Cargar turnos de ejemplo** agrega turnos ficticios, solo para mostrar el panel.

### 2.3 Ventas de la tienda

Debajo de los turnos está la tabla **Ventas de la tienda**, con el número de pedido, el cliente, los productos, la forma de entrega, el pago (marca y últimos 4 dígitos de la tarjeta, cuotas y autorización), el total y el estado:

- Los pagos en efectivo o por transferencia entran como **pendiente de pago**. Al cobrarlos, tocá **Marcar pagado**.
- Cuando el cliente retira o recibe el pedido, tocá **Entregado**.

> Mientras el sitio no tenga base de datos, el panel solo muestra los turnos y ventas hechos **en ese mismo navegador**. Ver la [sección 6.5 de la documentación técnica](DOCUMENTACION_TECNICA.md#65-limitaciones-tecnológicas).

---

## 3. Para quien mantiene el sitio

### 3.1 Ver el sitio en la computadora

Desde la carpeta del proyecto:

```bash
python -m http.server 5510
```

Después se abre `http://localhost:5510`. No funciona con doble clic sobre `index.html`.

### 3.2 Cambiar datos del negocio

Todo está en **`js/data.js`**, sin tocar el resto del código:

| Qué | Dónde |
|-----|-------|
| Número de WhatsApp | `CONFIG.whatsapp` (formato internacional sin "+", por ejemplo `5491123456789`) |
| Dirección y mapa | `CONFIG.direccion`, `CONFIG.mapsLink`, `CONFIG.mapsEmbed` |
| PIN del panel | `CONFIG.adminPin` |
| Horarios de atención | `CONFIG.horarios` (0 = domingo; `null` = cerrado) |
| Días que se pueden reservar | `CONFIG.diasReserva` |
| Costo de envío y mínimo para envío gratis | `CONFIG.envio` |
| Cuotas y recargos | `CONFIG.cuotas` |
| Horarios ocupados de demostración | `CONFIG.demoOcupados` (**poner `false` antes de publicar**) |
| Servicios y precios | `SERVICIOS` |
| Barberos | `BARBEROS` |
| Productos de la tienda | `PRODUCTOS` (para usar una foto real: agregar `foto: "img/productos/archivo.jpg"`) |

### 3.3 Volver a generar las piezas de marketing

Si cambian precios, horarios o la dirección del sitio, se vuelven a generar el tríptico, los QR y el resto de las piezas:

```bash
python marketing/generar.py
```

Requiere Python con Pillow y ReportLab, y Microsoft Edge o Chrome para exportar los PDF. Los textos del tríptico se editan en `marketing/triptico.html`.

### 3.4 Correr las pruebas

```bash
npm test
```

Tienen que pasar todas antes de subir cambios.

---

## 4. Tarjetas de prueba

Con cualquier vencimiento futuro y cualquier código de seguridad (3 dígitos, o 4 en American Express):

| Número | Resultado |
|--------|-----------|
| 4242 4242 4242 4242 | Aprobada (Visa) |
| 5555 5555 5555 4444 | Aprobada (Mastercard) |
| 3782 822463 10005 | Aprobada (American Express) |
| 4000 0000 0000 0002 | Rechazada por el banco |
| 4000 0000 0000 9995 | Saldo insuficiente |
| 4000 0000 0000 0119 | Error de conexión (permite reintentar) |

También están en el formulario de pago, en **"Usar una tarjeta de prueba"**, con un botón para cargarlas.

---

## 5. Problemas frecuentes

| Problema | Solución |
|----------|----------|
| El botón "Finalizar compra" no hace nada | El sitio se abrió con doble clic. Abrilo con el servidor (3.1) |
| No aparecen los turnos que reservó un cliente | Los datos se guardan en cada navegador hasta que haya base de datos. El cliente los ve en su celular, no en el panel del local |
| No hay horarios disponibles | Probá otro día u otro barbero. Si estás probando, puede ser por los horarios ocupados de demostración |
| El PIN no funciona | Revisá `CONFIG.adminPin` en `js/data.js` |
| Se borraron los turnos | Se borraron los datos del navegador. Restaurá desde el último CSV exportado |
| Los QR llevan a una página de error | El sitio todavía no está publicado en GitHub Pages ([sección 8.3](DOCUMENTACION_TECNICA.md#83-publicación-del-sistema)) |
