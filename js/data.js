/* ============================================================
   POLA'S BARBER SHOP — Datos del sitio
   Editá este archivo para cambiar precios, barberos, horarios
   y productos. No hace falta tocar el resto del código.
   ============================================================ */

const CONFIG = {
  nombre: "Pola's Barber Shop",
  instagram: "https://www.instagram.com/polasbarbershop/",
  // Número de WhatsApp en formato internacional sin "+" ni espacios (REEMPLAZAR)
  whatsapp: "5491100000000",
  // Local nuevo, abierto desde el 04/09/2026.
  // OJO: el link de Maps de la bio de Instagram todavía apunta al local anterior.
  direccion: "Gral. Madariaga 186 — Barrio Lindo, Malvinas Argentinas (Alte. Brown)",
  direccionAnterior: "Av. Pedro Suárez 2887",
  mapsLink: "https://www.google.com/maps/search/?api=1&query=General+Madariaga+186%2C+Malvinas+Argentinas%2C+Buenos+Aires",
  mapsEmbed: "https://www.google.com/maps?q=-34.8220717,-58.4359975&z=17&output=embed",
  // PIN del panel de administración (admin.html). Cambialo.
  adminPin: "1234",
  // Días que se pueden reservar hacia adelante
  diasReserva: 14,
  // Horarios por día de la semana (0 = domingo). null = cerrado.
  horarios: {
    0: null,
    1: { abre: "10:00", cierra: "20:00" },
    2: { abre: "10:00", cierra: "20:00" },
    3: { abre: "10:00", cierra: "20:00" },
    4: { abre: "10:00", cierra: "20:00" },
    5: { abre: "10:00", cierra: "21:00" },
    6: { abre: "09:00", cierra: "21:00" },
  },
  // Duración de cada bloque de turno en minutos
  bloque: 30,
  // Simula horarios ya ocupados para que la demo se vea real.
  // Poné false cuando conectes una base de datos real.
  demoOcupados: true,
};

const SERVICIOS = [
  { id: "corte",        nombre: "Corte",               desc: "Fade, taper, clásico o tijera. Terminación con navaja.", precio: 9000,  duracion: 30, tag: "El más pedido" },
  { id: "corte-barba",  nombre: "Corte + Barba",       desc: "Corte completo + perfilado de barba con toalla caliente.", precio: 12000, duracion: 60 },
  { id: "barba",        nombre: "Barba",               desc: "Perfilado, rebaje y aceite. Navaja en contornos.",       precio: 5000,  duracion: 30 },
  { id: "diseno",       nombre: "Corte + Diseño",      desc: "Rayitas, freestyle o el diseño que traigas.",            precio: 10500, duracion: 30 },
  { id: "color",        nombre: "Color / Platinado",   desc: "Decoloración, fantasía o global. Consultá antes.",       precio: 25000, duracion: 120, tag: "Consultar" },
  { id: "nino",         nombre: "Corte Niño",          desc: "Hasta 12 años. Paciencia incluida.",                    precio: 7500,  duracion: 30 },
];

// Reemplazá los nombres por los barberos reales del local
const BARBEROS = [
  { id: "cualquiera", nombre: "El primero libre", rol: "Te asignamos al que esté disponible" },
  { id: "pola",       nombre: "Pola",             rol: "Fundador · Fades & diseños" },
  { id: "barbero2",   nombre: "Barbero 2",        rol: "Clásicos & barba" },
  { id: "barbero3",   nombre: "Barbero 3",        rol: "Texturas & color" },
  { id: "barbero4",   nombre: "Barbero 4",        rol: "Cortes a tijera" },
];

/* tipo: "ropa" | "barberia"
   ilustracion: tee | hoodie | cap | tee-white | pomada | cera | aceite | shampoo | navaja | polvo
   color: color base de la ilustración */
const PRODUCTOS = [
  // ---------- ROPA ----------
  { id: "remera-logo-negra",  tipo: "ropa", cat: "Remeras", nombre: "Remera Pola's Classic",   desc: "Algodón peinado 24/1, logo bordado en el pecho.", precio: 18000, ilustracion: "tee",       color: "#111111", talles: ["S","M","L","XL","XXL"], badge: "Nueva" },
  { id: "remera-logo-blanca", tipo: "ropa", cat: "Remeras", nombre: "Remera Pola's White",     desc: "Algodón peinado, logo al frente estampado.",      precio: 18000, ilustracion: "tee-white", color: "#f1efe9", talles: ["S","M","L","XL","XXL"] },
  { id: "buzo-oversize",      tipo: "ropa", cat: "Buzos",   nombre: "Buzo Oversize Barber",    desc: "Frisa invisible, capucha doble, logo espalda.",   precio: 38000, ilustracion: "hoodie",    color: "#151515", talles: ["M","L","XL","XXL"], badge: "Top" },
  { id: "buzo-gris",          tipo: "ropa", cat: "Buzos",   nombre: "Buzo Street Gris",        desc: "Frisa, corte oversize, logo chico al frente.",    precio: 36000, ilustracion: "hoodie",    color: "#5d5d5d", talles: ["M","L","XL"] },
  { id: "gorra-trucker",      tipo: "ropa", cat: "Gorras",  nombre: "Gorra Trucker Pola's",    desc: "Visera curva, red atrás, parche frontal.",       precio: 15000, ilustracion: "cap",       color: "#111111", talles: ["Único"] },
  { id: "gorra-dorada",       tipo: "ropa", cat: "Gorras",  nombre: "Gorra Gold Edition",      desc: "Edición limitada con detalle mostaza.",           precio: 16500, ilustracion: "cap",       color: "#e3a21f", talles: ["Único"], badge: "Limitada" },

  // ---------- BARBERÍA ----------
  { id: "pomada-mate",   tipo: "barberia", cat: "Styling",  nombre: "Pomada Mate",           desc: "Fijación fuerte, acabado seco sin brillo. 100g.",  precio: 9500,  ilustracion: "pomada",  color: "#111111", badge: "Más vendido" },
  { id: "cera-brillo",   tipo: "barberia", cat: "Styling",  nombre: "Cera Brillo Clásica",   desc: "Fijación media, look peinado old school. 100g.",  precio: 8500,  ilustracion: "cera",    color: "#e3a21f" },
  { id: "polvo-textura", tipo: "barberia", cat: "Styling",  nombre: "Polvo Texturizador",    desc: "Volumen instantáneo para texturas y crops. 20g.", precio: 7500,  ilustracion: "polvo",   color: "#f1efe9" },
  { id: "aceite-barba",  tipo: "barberia", cat: "Barba",    nombre: "Aceite para Barba",     desc: "Argán y jojoba. Suaviza y perfuma. 30ml.",        precio: 8000,  ilustracion: "aceite",  color: "#8a5a1b" },
  { id: "shampoo-barba", tipo: "barberia", cat: "Barba",    nombre: "Shampoo Barba & Pelo",  desc: "Limpieza profunda, uso diario. 250ml.",           precio: 9000,  ilustracion: "shampoo", color: "#111111" },
  { id: "navaja",        tipo: "barberia", cat: "Herramientas", nombre: "Navaja Clásica",    desc: "Acero inoxidable, hoja intercambiable.",          precio: 14000, ilustracion: "navaja",  color: "#1a1a1a" },
];
