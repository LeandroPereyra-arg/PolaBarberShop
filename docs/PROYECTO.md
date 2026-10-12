# Documentación del proyecto

Sitio web con sistema de turnos y tienda para **Pola's Barber Shop**.
Proyecto individual de **Leandro Pereyra** (GitHub: [@LeandroPereyra-arg](https://github.com/LeandroPereyra-arg)).

> **Nota sobre las fuentes.** La información de la barbería se obtuvo de su cuenta pública de Instagram ([@polasbarbershop](https://www.instagram.com/polasbarbershop/)). Los puntos marcados como *(a validar)* son supuestos míos que todavía no confirmé con el dueño del local.

---

## 1. Asignación de tareas

Las tareas se gestionan como **issues del repositorio**, asignadas y etiquetadas:

**→ [Ver todas las tareas](https://github.com/LeandroPereyra-arg/PolaBarberShop/issues?q=is%3Aissue)**

- [Tareas terminadas](https://github.com/LeandroPereyra-arg/PolaBarberShop/issues?q=is%3Aissue+is%3Aclosed) (cerradas)
- [Tareas pendientes](https://github.com/LeandroPereyra-arg/PolaBarberShop/issues?q=is%3Aissue+is%3Aopen) (abiertas)

Al ser un proyecto individual, todas están asignadas a [@LeandroPereyra-arg](https://github.com/LeandroPereyra-arg). Las etiquetas distinguen el tipo de trabajo (`frontend`, `funcionalidad`, `documentacion`) y el estado (`hecho`, `pendiente`).

---

## 2. Identidad de la empresa

**Nombre:** Pola's Barber Shop
**Rubro:** barbería y venta de indumentaria masculina y productos de peluquería.
**Ubicación:** Gral. Madariaga 186, Barrio Lindo, Malvinas Argentinas, partido de Almirante Brown, Buenos Aires.
**Redes:** Instagram [@polasbarbershop](https://www.instagram.com/polasbarbershop/), con alrededor de 1.050 seguidores.

### Historia

La barbería funcionó casi diez años en Av. Pedro Suárez 2887. En agosto de 2026 cerró ese local para mudarse a unas cuadras, a Gral. Madariaga 186, y reabrió el 4 de septiembre de 2026 después de varias semanas de refacciones que fueron mostrando en sus redes.

### Público

Hombres del barrio: adolescentes y jóvenes que piden cortes de moda (fades, diseños, color), adultos que van por corte y barba, y chicos acompañados por sus padres *(a validar)*.

### Valores y tono

En sus publicaciones aparecen de forma recurrente el agradecimiento a los clientes, el orgullo por el crecimiento del local y la idea de comodidad y buena atención. El trato es cercano y barrial, hablando de "amigos" y "vecinos". El sitio toma ese tono: tutea, es directo y evita el lenguaje formal.

### Identidad visual

- **Logo:** sello circular con el nombre "Pola's" en letra manuscrita sobre "BARBER SHOP" en imprenta gruesa, con tijera, navaja y peine cruzados, borde mostaza y círculo de puntos.
- **Colores:** negro como base, blanco y un mostaza dorado tomado del contorno del logo.
- **Texturas del local:** paredes de listones negros, mármol blanco con vetas doradas y luces LED detrás del cartel.
- **Fotografía:** blanco y negro para el local y la vida del barrio; color para los cortes terminados.
- **Tipografía:** títulos en mayúscula condensada y palabras sueltas en manuscrita, replicando la composición del logo.

Todo esto se trasladó al sitio: fondo negro con listones, secciones sobre mármol, detalles en mostaza, títulos gruesos con una palabra en manuscrita arriba y galería en blanco y negro que toma color al pasar el mouse.

---

## 3. Problemática

### Los turnos se coordinan a mano

La barbería no tiene sistema de turnos: los clientes escriben por mensaje directo o WhatsApp y alguien tiene que responder, proponer horarios y anotarlos *(a validar)*. Eso trae varios problemas:

- Se corta el trabajo para contestar mensajes mientras se está atendiendo.
- Los clientes esperan la respuesta y, si tardan, se van a otra barbería.
- Riesgo de superponer dos turnos o de anotar mal un horario.
- No queda registro ordenado de qué se hizo, cuándo ni cuánto se facturó.
- Solo se puede reservar en el horario en que alguien lee los mensajes.

### Toda la presencia online depende de Instagram

No tienen sitio web. Quien busca "barbería en Malvinas Argentinas" en un buscador no los encuentra, y la información básica (precios, horarios, qué servicios hacen) no está publicada en ningún lado: hay que preguntarla.

### La mudanza dejó datos desactualizados

Se mudaron en septiembre de 2026, pero el enlace de Google Maps de su biografía de Instagram **todavía apunta al local anterior** de Av. Pedro Suárez. Un cliente que lo use llega a la dirección equivocada.

### La venta de ropa y productos no tiene vidriera

Venden indumentaria y productos de barbería, pero no hay catálogo ni precios publicados: el cliente se entera solo si va al local *(a validar)*.

---

## 4. Posible resolución

Un sitio web propio que funcione como vidriera y como herramienta de trabajo.

### Lo que ya resuelve el sitio

| Problema | Cómo se resuelve |
|----------|------------------|
| Turnos coordinados a mano | Reserva online en cuatro pasos, con horarios ocupados bloqueados y disponibilidad calculada según la duración del servicio. El cliente reserva solo, a cualquier hora. |
| Superposición de turnos | El sistema no ofrece un horario si el barbero ya está ocupado, y vuelve a verificar la disponibilidad justo antes de confirmar. |
| Falta de registro | Panel de administración con los turnos del día, filtros por fecha, barbero y estado, estimado de facturación y exportación a CSV. |
| Ausencias sin aviso | Cada cliente consulta y cancela su turno con su teléfono, liberando el lugar. |
| Información dispersa | Servicios con precios y duración, horarios de atención y mapa, publicados en la página. |
| Dirección desactualizada | Aviso de mudanza con la dirección anterior tachada, mapa y datos del negocio cargados para los buscadores. |
| Ropa y productos sin vidriera | Catálogo con talles y precios, carrito y pedido que llega armado por WhatsApp. |

### Decisiones técnicas

Se hizo con HTML, CSS y JavaScript sin dependencias, porque es un sitio chico que debe cargar rápido desde el celular y poder publicarse en cualquier hosting, incluso gratuito. La configuración (precios, horarios, barberos y productos) está separada en un único archivo para que se pueda actualizar sin tocar el código.

### Limitaciones actuales

El guardado de turnos usa el almacenamiento del navegador, así que **cada reserva queda solo en el dispositivo de quien la hizo**: todavía no es un sistema compartido entre el cliente y el local. Del mismo modo, el PIN del panel se valida en el navegador y sirve únicamente como demostración.

### Próximas etapas

1. Conectar los turnos a una base de datos (Firebase, Supabase o PHP con MySQL), reemplazando solo el archivo `js/store.js`.
2. Mover la validación del panel al servidor, con usuario y contraseña reales.
3. Recordatorio automático por WhatsApp el día anterior al turno, para reducir ausencias.
4. Confirmar con la barbería precios, horarios, nombres de los barberos y catálogo real, con fotos de los productos.
5. Publicar el sitio en un dominio propio y enlazarlo desde la biografía de Instagram.
