# Pola's Barber Shop — Sitio web

Sitio web para la barbería **Pola's Barber Shop**, ubicada en Gral. Madariaga 186, Barrio Lindo, Malvinas Argentinas (Almirante Brown). Incluye un sistema de turnos online y una tienda de indumentaria y productos de barbería.

Proyecto individual de **Leandro Pereyra**.

La documentación del proyecto (asignación de tareas, identidad de la empresa, problemática y posible resolución) está en [docs/PROYECTO.md](docs/PROYECTO.md).

## Funcionalidades

- **Turnos online.** El cliente elige servicio, barbero, día y horario, y carga sus datos. Los horarios ocupados se muestran bloqueados y se calcula la disponibilidad según la duración de cada servicio.
- **Confirmación del turno.** Se genera un código de reserva, con botones para avisar por WhatsApp y para agendarlo en el calendario.
- **Mis turnos.** El cliente busca sus reservas con su teléfono y puede cancelarlas.
- **Tienda.** Catálogo de ropa (con talles) y productos de barbería, con carrito.
- **Módulo de pago (simulado).** Desde el carrito: forma de entrega (retiro o envío), datos del comprador y pago con tarjeta de crédito (en cuotas), débito, o efectivo/transferencia. La tarjeta se muestra con [crd-ui](https://github.com/JuandaGarcia/crd-ui) y se valida número (algoritmo de Luhn y largo por marca), vencimiento y código de seguridad. Termina con un comprobante imprimible. **No se conecta con ningún banco y los datos de la tarjeta no se guardan ni se envían**; el resultado depende de tarjetas de prueba para mostrar pagos aprobados y rechazados.
- **Panel de administración** (`admin.html`). Listado de turnos con filtros por fecha, barbero y estado; acciones de atendido/cancelado y exportación a CSV.
- **Institucional.** Servicios con precios, galería de cortes, historia de la mudanza al nuevo local, horarios y mapa.

## Cómo ejecutarlo

No necesita compilación ni dependencias. Desde la carpeta del proyecto:

```bash
python -m http.server 5510
```

Después abrir `http://localhost:5510` en el navegador.

## Estructura

```
index.html        Sitio principal
admin.html        Panel de turnos (acceso con PIN)
css/styles.css    Estilos e identidad visual
js/data.js        Configuración: datos del local, servicios, barberos y productos
js/utils.js       Funciones compartidas (formatos, fechas, avisos)
js/store.js       Guardado y disponibilidad de turnos
js/booking.js     Sistema de turnos
js/shop.js        Tienda y carrito
js/checkout.js    Módulo de pago (entrega, datos, tarjeta, comprobante)
js/art.js         Ilustraciones de los productos
js/main.js        Navegación, servicios y horarios
js/admin.js       Panel de administración
img/              Logo y fotos
vendor/crd-ui/    Componente de tarjeta crd-ui 0.13.2 (licencia MIT)
```

## Tarjetas de prueba

El pago es una simulación. Usá estas tarjetas (cualquier vencimiento futuro y cualquier código de seguridad):

| Número | Resultado |
|--------|-----------|
| 4242 4242 4242 4242 | Aprobada (Visa) |
| 5555 5555 5555 4444 | Aprobada (Mastercard) |
| 3782 822463 10005 | Aprobada (American Express) |
| 4000 0000 0000 0002 | Rechazada por el banco |
| 4000 0000 0000 9995 | Saldo insuficiente |
| 4000 0000 0000 0119 | Error de conexión (permite reintentar) |

## Configuración

Todo lo editable está en `js/data.js`: número de WhatsApp, dirección, horarios de atención, PIN del panel, servicios con precios y duración, barberos y productos.

## Estado del proyecto

Pendientes conocidos:

- **Los turnos se guardan en el navegador de cada visitante** (`localStorage`), así que todavía no se comparten entre el cliente y el local. Para producción hay que reemplazar el guardado de `js/store.js` por una base de datos.
- **El PIN del panel se valida en el navegador**, por lo que sirve solo como demostración. Con un servidor, esa validación debe hacerse del lado del servidor.
- Precios, horarios, nombres de los barberos y productos son datos de ejemplo, pendientes de confirmar con la barbería.
- La opción `demoOcupados` de `js/data.js` simula horarios ocupados para la demostración y debe apagarse antes de publicar.
