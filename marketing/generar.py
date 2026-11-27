"""
Genera los recursos de la sección 10 (identidad institucional).

Uso:
    python marketing/generar.py

Requiere Python 3 con Pillow y ReportLab. Para exportar las páginas HTML a
PDF y PNG usa Microsoft Edge o Chrome en modo headless; si no encuentra
ninguno, saltea ese paso y avisa.
"""
from __future__ import annotations

import colorsys
import io
import math
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

from PIL import Image, ImageDraw, ImageFont
from reportlab.graphics.barcode import qrencoder

RAIZ = Path(__file__).resolve().parent.parent
MKT = RAIZ / "marketing"
DOCS = RAIZ / "docs" / "identidad"
LOGO = RAIZ / "img" / "logo.png"

# Dirección pública del sitio (GitHub Pages). Los QR apuntan acá:
# si el sitio se publica en otro dominio, cambiala y volvé a correr el script.
SITIO = "https://leandropereyra-arg.github.io/PolaBarberShop/"
MAPS = "https://www.google.com/maps/search/?api=1&query=General+Madariaga+186%2C+Malvinas+Argentinas%2C+Buenos+Aires"
INSTAGRAM = "https://www.instagram.com/polasbarbershop/"

NEGRO, BLANCO, MOSTAZA = "#0A0A0A", "#F6F4EF", "#EEB637"

COLORES = [
    # nombre, hex, uso, proporción sugerida (%)
    ("Negro Pola's", "#0A0A0A", "Fondos, textos y líneas del logo", 60),
    ("Blanco hueso", "#F6F4EF", "Fondos claros y cuerpo del sello", 30),
    ("Mostaza Pola's", "#EEB637", "Borde del logo y acentos (color de marca)", 10),
    ("Mostaza web", "#E8A21C", "Botones y detalles del sitio", None),
    ("Mostaza oscuro", "#B77C0C", "Sobre fondo claro, solo títulos grandes", None),
    ("Gris piedra", "#9A958B", "Textos secundarios sobre fondo negro", None),
]

QRS = [
    # archivo, título, sector del local donde va, destino
    ("turnos", "Reservá tu turno", "Vidriera y entrada", SITIO + "#turnos"),
    ("mis-turnos", "Mirá o cancelá tu turno", "Puestos de corte", SITIO + "#misTurnos"),
    ("tienda", "Ropa y productos", "Mostrador y exhibidor", SITIO + "#tienda"),
    ("servicios", "Servicios y precios", "Sala de espera", SITIO + "#servicios"),
    ("como-llegar", "Cómo llegar", "Tríptico y tarjeta personal", MAPS),
    ("instagram", "Seguinos en Instagram", "Caja", INSTAGRAM),
]

# Datos de transporte: © colaboradores de OpenStreetMap (ODbL), consulta del 26/11/2026.
UBICACION = (-34.8220717, -58.4359975)
REFERENCIAS = [
    ("Est. Luis Guillón", -34.803284, -58.448581),
    ("Est. Llavallol", -34.797118, -58.429391),
    ("Est. Monte Grande", -34.814477, -58.469676),
    ("Est. Turdera", -34.795065, -58.407635),
]
LOCAL_ANTERIOR = ("Local anterior\nAv. Pedro Suárez 2887", -34.8204324, -58.4367583)
COLECTIVOS = ["318 (La Noria – Monte Grande)", "514 ramal A (Barrio Lindo – Adrogué – Don Orione)"]


# ---------------------------------------------------------------- utilidades
def fuente(nombres: list[str], tam: int) -> ImageFont.FreeTypeFont:
    for carpeta in (Path("C:/Windows/Fonts"), Path("/usr/share/fonts/truetype/msttcorefonts"), Path("/Library/Fonts")):
        for n in nombres:
            if (carpeta / n).exists():
                return ImageFont.truetype(str(carpeta / n), tam)
    return ImageFont.load_default(tam)


def titulo(t: int):
    return fuente(["impact.ttf", "Impact.ttf", "arialbd.ttf"], t)


def texto(t: int, negrita: bool = False):
    return fuente(["arialbd.ttf", "Arial Bold.ttf"] if negrita else ["arial.ttf", "Arial.ttf"], t)


def rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def cmyk(c: tuple[int, int, int]) -> tuple[int, ...]:
    r, g, b = (v / 255 for v in c)
    k = 1 - max(r, g, b)
    if k >= 1:
        return (0, 0, 0, 100)
    return tuple(round(v * 100) for v in ((1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k))


def luminancia(c) -> float:
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255


def guardar(img: Image.Image, ruta: Path) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    img.save(ruta, optimize=True)
    print(f"  {ruta.relative_to(RAIZ)}")


def centrar(d: ImageDraw.ImageDraw, xy, txt, f, fill):
    x, y = xy
    caja = d.textbbox((0, 0), txt, font=f)
    d.text((x - (caja[2] - caja[0]) / 2, y), txt, font=f, fill=fill)


# ---------------------------------------------------------------- paleta
def paleta() -> None:
    W, H = 1200, 820
    img = Image.new("RGB", (W, H), rgb(BLANCO))
    d = ImageDraw.Draw(img)
    d.text((40, 30), "PALETA INSTITUCIONAL", font=titulo(48), fill=rgb(NEGRO))
    cw, ch, gap = 360, 250, 30
    for i, (nombre, hx, uso, _) in enumerate(COLORES):
        x, y = 40 + (i % 3) * (cw + gap), 110 + (i // 3) * (ch + gap)
        c = rgb(hx)
        d.rounded_rectangle((x, y, x + cw, y + ch), 18, fill=c, outline=(200, 196, 186) if luminancia(c) > .9 else None, width=2)
        tinta = (255, 255, 255) if luminancia(c) < .55 else rgb(NEGRO)
        d.text((x + 22, y + 20), nombre.upper(), font=titulo(30), fill=tinta)
        d.text((x + 22, y + 66), uso, font=texto(17), fill=tinta)
        d.text((x + 22, y + 150), f"HEX  {hx}", font=texto(19, True), fill=tinta)
        d.text((x + 22, y + 178), "RGB  {} {} {}".format(*c), font=texto(19), fill=tinta)
        d.text((x + 22, y + 206), "CMYK {} {} {} {}".format(*cmyk(c)), font=texto(19), fill=tinta)
    # proporción de uso
    y = 690
    d.text((40, y - 40), "PROPORCIÓN DE USO SUGERIDA", font=titulo(26), fill=rgb(NEGRO))
    x = 40
    for nombre, hx, _, pct in COLORES:
        if not pct:
            continue
        w = (W - 80) * pct / 100
        d.rectangle((x, y, x + w, y + 70), fill=rgb(hx), outline=(200, 196, 186))
        tinta = (255, 255, 255) if luminancia(rgb(hx)) < .55 else rgb(NEGRO)
        d.text((x + 14, y + 20), f"{pct}%", font=titulo(28), fill=tinta)
        x += w
    d.text((40, y + 86), "CMYK aproximado por conversión: confirmar con la imprenta antes de imprimir.", font=texto(16), fill=(110, 105, 95))
    guardar(img, DOCS / "paleta.png")


# ---------------------------------------------------------------- círculo cromático
def circulo_cromatico() -> None:
    W, H = 1200, 720
    img = Image.new("RGB", (W, H), rgb(BLANCO))
    d = ImageDraw.Draw(img)
    d.text((40, 30), "CÍRCULO CROMÁTICO", font=titulo(48), fill=rgb(NEGRO))
    cx, cy, R = 330, 400, 250
    for i in range(12):
        h = i * 30
        col = tuple(round(v * 255) for v in colorsys.hsv_to_rgb(h / 360, .85, .95))
        d.pieslice((cx - R, cy - R, cx + R, cy + R), h - 90 - 15, h - 90 + 15, fill=col, outline=rgb(BLANCO), width=3)
    # centro: neutros (acromáticos) de la marca
    d.pieslice((cx - 95, cy - 95, cx + 95, cy + 95), 90, 270, fill=rgb(NEGRO))
    d.pieslice((cx - 95, cy - 95, cx + 95, cy + 95), -90, 90, fill=(255, 255, 255))
    d.ellipse((cx - 95, cy - 95, cx + 95, cy + 95), outline=rgb(NEGRO), width=3)
    h_marca = colorsys.rgb_to_hsv(*(v / 255 for v in rgb(MOSTAZA)))[0] * 360

    def marca(h, etiqueta, color, radio=R + 22):
        a = math.radians(h - 90)
        x, y = cx + radio * math.cos(a), cy + radio * math.sin(a)
        d.ellipse((x - 16, y - 16, x + 16, y + 16), fill=color, outline=rgb(NEGRO), width=4)
        return x, y

    marca(h_marca, "", rgb(MOSTAZA))
    marca((h_marca + 180) % 360, "", (60, 110, 200))
    for delta in (-30, 30):
        marca((h_marca + delta) % 360, "", (255, 255, 255), R + 22)
    x0 = 680
    lineas = [
        ("Color de marca", f"Mostaza Pola's {MOSTAZA} · tono {h_marca:.0f}°", rgb(MOSTAZA)),
        ("Neutros (centro)", "Negro y blanco hueso: la base de la identidad", rgb(NEGRO)),
        ("Análogos (±30°)", "Naranja y amarillo verdoso: admitidos solo en fotos", (255, 255, 255)),
        ("Complementario", f"Azul ({(h_marca + 180) % 360:.0f}°): se evita para no competir", (60, 110, 200)),
    ]
    y = 160
    for t, s, col in lineas:
        d.ellipse((x0, y + 4, x0 + 30, y + 34), fill=col, outline=rgb(NEGRO), width=3)
        d.text((x0 + 48, y), t.upper(), font=titulo(26), fill=rgb(NEGRO))
        d.text((x0 + 48, y + 36), s, font=texto(18), fill=(70, 66, 60))
        y += 100
    d.text((x0, y + 10), "Armonía: neutros + un solo acento cálido.", font=texto(20, True), fill=rgb(NEGRO))
    d.text((x0, y + 40), "El mostaza ocupa poca superficie y marca lo importante.", font=texto(18), fill=(70, 66, 60))
    guardar(img, DOCS / "circulo-cromatico.png")


# ---------------------------------------------------------------- logo
def mascara_tinta(img: Image.Image) -> Image.Image:
    """Píxeles que llevan tinta en la versión de un color: líneas negras y borde mostaza."""
    m = Image.new("L", img.size, 0)
    src, dst = img.load(), m.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = src[x, y]
            if a < 100:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            sat = (mx - mn) / mx if mx else 0
            if luminancia((r, g, b)) < .55 or sat > .35:
                dst[x, y] = a
    return m


def logo_versiones() -> None:
    logo = Image.open(LOGO).convert("RGBA")
    tinta = mascara_tinta(logo)
    carpeta = MKT / "logo"
    guardar(logo, carpeta / "logo-color.png")
    for nombre, color in (("logo-monocromo-negro.png", rgb(NEGRO)), ("logo-monocromo-blanco.png", (255, 255, 255))):
        capa = Image.new("RGBA", logo.size, color + (0,))
        capa.putalpha(tinta)
        guardar(capa, carpeta / nombre)

    versiones = [
        ("Color · fondo claro", rgb(BLANCO), logo),
        ("Color · fondo negro", rgb(NEGRO), logo),
        ("Una tinta · negro", (255, 255, 255), Image.open(carpeta / "logo-monocromo-negro.png")),
        ("Una tinta · calado blanco", rgb(NEGRO), Image.open(carpeta / "logo-monocromo-blanco.png")),
    ]
    W, celda = 1200, 300
    img = Image.new("RGB", (W, 470), rgb(BLANCO))
    d = ImageDraw.Draw(img)
    d.text((40, 24), "VERSIONES DEL LOGO", font=titulo(44), fill=rgb(NEGRO))
    for i, (txt, fondo, l) in enumerate(versiones):
        x = i * celda
        d.rectangle((x + 10, 90, x + celda - 10, 400), fill=fondo, outline=(210, 205, 195))
        mini = l.copy()
        mini.thumbnail((220, 250))
        img.paste(mini, (x + (celda - mini.width) // 2, 110), mini)
        centrar(d, (x + celda / 2, 420), txt, texto(18, True), rgb(NEGRO))
    guardar(img, DOCS / "logo-versiones.png")

    # área de resguardo
    base = logo.copy()
    base.thumbnail((330, 390))
    u = base.width // 8
    W2, H2 = base.width + 6 * u + 360, base.height + 6 * u + 120
    img = Image.new("RGB", (W2, H2), rgb(BLANCO))
    d = ImageDraw.Draw(img)
    ox, oy = 3 * u, 3 * u + 80
    d.text((30, 20), "ÁREA DE RESGUARDO", font=titulo(40), fill=rgb(NEGRO))
    caja = (ox - u, oy - u, ox + base.width + u, oy + base.height + u)
    d.rectangle(caja, fill=(255, 255, 255))
    for i in range(caja[0], caja[2], 16):
        d.line((i, caja[1], min(i + 8, caja[2]), caja[1]), fill=(200, 60, 60), width=2)
        d.line((i, caja[3], min(i + 8, caja[2]), caja[3]), fill=(200, 60, 60), width=2)
    for j in range(caja[1], caja[3], 16):
        d.line((caja[0], j, caja[0], min(j + 8, caja[3])), fill=(200, 60, 60), width=2)
        d.line((caja[2], j, caja[2], min(j + 8, caja[3])), fill=(200, 60, 60), width=2)
    img.paste(base, (ox, oy), base)
    d.rectangle((ox - u, oy - u, ox, oy), outline=rgb(MOSTAZA), width=3)
    centrar(d, (ox - u / 2, oy - u / 2 - 12), "x", texto(20, True), rgb(NEGRO))
    tx = caja[2] + 40
    d.text((tx, oy + 10), "x = 1/8 del ancho del logo", font=texto(20, True), fill=rgb(NEGRO))
    d.text((tx, oy + 46), "Ningún texto, borde ni imagen", font=texto(18), fill=(70, 66, 60))
    d.text((tx, oy + 72), "puede entrar en esa zona.", font=texto(18), fill=(70, 66, 60))
    d.text((tx, oy + 130), "Tamaño mínimo", font=texto(20, True), fill=rgb(NEGRO))
    d.text((tx, oy + 166), "Impreso: 2,5 cm de ancho", font=texto(18), fill=(70, 66, 60))
    d.text((tx, oy + 192), "Pantalla: 80 px de ancho", font=texto(18), fill=(70, 66, 60))
    d.text((tx, oy + 218), "Más chico: usar el isotipo", font=texto(18), fill=(70, 66, 60))
    guardar(img, DOCS / "logo-resguardo.png")

    # usos incorrectos
    mini = logo.copy()
    mini.thumbnail((200, 235))
    r, g, b, a = mini.split()
    errores = [
        ("Deformarlo", mini.resize((int(mini.width * 1.45), int(mini.height * .7))), rgb(BLANCO)),
        ("Rotarlo", mini.rotate(18, expand=True, resample=Image.BICUBIC), rgb(BLANCO)),
        ("Cambiar sus colores", Image.merge("RGBA", (b, g, r, a)), rgb(BLANCO)),
        ("Fondos sin contraste", mini, rgb(MOSTAZA)),
    ]
    img = Image.new("RGB", (W, 440), rgb(BLANCO))
    d = ImageDraw.Draw(img)
    d.text((40, 24), "USOS INCORRECTOS", font=titulo(44), fill=rgb(NEGRO))
    for i, (txt, l, fondo) in enumerate(errores):
        x = i * celda
        d.rectangle((x + 10, 90, x + celda - 10, 370), fill=fondo, outline=(210, 205, 195))
        l = l.copy()
        l.thumbnail((250, 250))
        img.paste(l, (x + (celda - l.width) // 2, 90 + (280 - l.height) // 2), l)
        d.line((x + 30, 110, x + celda - 30, 350), fill=(200, 40, 40), width=8)
        d.line((x + celda - 30, 110, x + 30, 350), fill=(200, 40, 40), width=8)
        centrar(d, (x + celda / 2, 388), txt, texto(19, True), rgb(NEGRO))
    guardar(img, DOCS / "logo-usos-incorrectos.png")


# ---------------------------------------------------------------- isotipo (SVG)
def isotipo() -> None:
    puntos = "".join(
        f'<circle cx="{100 + 74 * math.cos(math.radians(a)):.1f}" cy="{100 + 74 * math.sin(math.radians(a)):.1f}" r="3.2"/>'
        for a in range(0, 360, 24)
    )
    peine = "".join(f'<line x1="{x}" y1="152" x2="{x}" y2="160"/>' for x in range(84, 118, 3))
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="600" height="600">
  <title>Isotipo de Pola's Barber Shop</title>
  <circle cx="100" cy="100" r="98" fill="{MOSTAZA}"/>
  <circle cx="100" cy="100" r="91" fill="{NEGRO}"/>
  <circle cx="100" cy="100" r="86" fill="{BLANCO}"/>
  <g fill="{NEGRO}">{puntos}</g>
  <g stroke="{NEGRO}" stroke-linecap="round" fill="none">
    <line x1="56" y1="56" x2="144" y2="144" stroke-width="2.6"/>
    <line x1="144" y1="56" x2="56" y2="144" stroke-width="2.6"/>
    <!-- tijera -->
    <line x1="52" y1="114" x2="66" y2="82" stroke-width="3.4"/>
    <line x1="66" y1="114" x2="52" y2="82" stroke-width="3.4"/>
    <circle cx="49" cy="120" r="6.5" stroke-width="2.6"/>
    <circle cx="69" cy="120" r="6.5" stroke-width="2.6"/>
    <!-- navaja -->
    <line x1="150" y1="122" x2="142" y2="104" stroke-width="7"/>
    <!-- peine -->
    <g stroke-width="1.6">{peine}</g>
  </g>
  <g fill="{NEGRO}">
    <circle cx="59" cy="98" r="2.2" fill="{BLANCO}" stroke="{NEGRO}" stroke-width="1.6"/>
    <path d="M142 104 L126 80 Q129 75 134 78 L146 100 Z"/>
    <circle cx="142" cy="104" r="2.6" fill="{MOSTAZA}"/>
    <rect x="82" y="145" width="36" height="8" rx="1.5"/>
  </g>
</svg>
"""
    ruta = MKT / "isotipo.svg"
    ruta.write_text(svg, encoding="utf-8")
    print(f"  {ruta.relative_to(RAIZ)}")


# ---------------------------------------------------------------- triangulación
def triangulacion() -> None:
    W, H = 1200, 900
    img = Image.new("RGB", (W, H), rgb(BLANCO))
    d = ImageDraw.Draw(img)
    lat0, lon0 = UBICACION

    def metros(lat, lon):
        return ((lon - lon0) * math.cos(math.radians(lat0)) * 111320, (lat - lat0) * 110540)

    def distancia(lat, lon):
        x, y = metros(lat, lon)
        return math.hypot(x, y)

    escala = 0.115  # px por metro
    cx, cy = 600, 560

    def px(lat, lon):
        x, y = metros(lat, lon)
        return cx + x * escala, cy - y * escala

    d.text((40, 30), "UBICACIÓN Y TRANSPORTE", font=titulo(46), fill=rgb(NEGRO))
    d.text((40, 88), "Distancias en línea recta desde Gral. Madariaga 186", font=texto(19), fill=(80, 75, 68))

    # Triangulación: un círculo por estación, con radio igual a su distancia al local.
    # Los tres círculos se cruzan en un único punto: la ubicación del local.
    for _, la, lo in REFERENCIAS[:3]:
        x, y = px(la, lo)
        r = distancia(la, lo) * escala
        d.ellipse((x - r, y - r, x + r, y + r), outline=rgb(MOSTAZA), width=3)
    for nombre, la, lo in REFERENCIAS:
        x, y = px(la, lo)
        d.line((cx, cy, x, y), fill=(120, 115, 105), width=2)
        mx, my = (cx + x) / 2, (cy + y) / 2
        etiqueta = f"{distancia(la, lo) / 1000:.1f} km".replace(".", ",")
        caja = d.textbbox((0, 0), etiqueta, font=texto(18, True))
        d.rounded_rectangle((mx - 6, my - 4, mx + caja[2] + 6, my + caja[3] + 6), 6, fill=(255, 255, 255), outline=(200, 195, 185))
        d.text((mx, my), etiqueta, font=texto(18, True), fill=rgb(NEGRO))
        d.ellipse((x - 14, y - 14, x + 14, y + 14), fill=(30, 90, 170), outline=(255, 255, 255), width=3)
        d.text((x - 7, y - 11), "T", font=texto(18, True), fill=(255, 255, 255))
        d.text((x + 20, y - 12), nombre, font=texto(20, True), fill=rgb(NEGRO))

    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((86, 100))
    img.paste(logo, (int(cx - logo.width / 2), int(cy - logo.height / 2)), logo)
    d.text((cx + 52, cy + 10), "Pola's Barber Shop", font=texto(20, True), fill=rgb(NEGRO))
    d.text((cx + 52, cy + 36), "Gral. Madariaga 186", font=texto(18), fill=(80, 75, 68))

    # norte y escala
    d.polygon(((1110, 150), (1095, 195), (1125, 195)), fill=rgb(NEGRO))
    centrar(d, (1110, 200), "N", titulo(26), rgb(NEGRO))
    largo = 1000 * escala
    d.line((60, 840, 60 + largo, 840), fill=rgb(NEGRO), width=5)
    d.text((60, 806), "1 km", font=texto(18, True), fill=rgb(NEGRO))

    _, la, lo = LOCAL_ANTERIOR
    d.text((700, 660), "COLECTIVOS A MENOS DE 700 m", font=titulo(24), fill=rgb(NEGRO))
    for i, c in enumerate(COLECTIVOS):
        d.text((700, 698 + i * 28), f"• {c}", font=texto(17), fill=(60, 56, 50))
    d.text((700, 762), f"A {distancia(la, lo):.0f} m del local anterior (Av. Pedro Suárez 2887).", font=texto(16, True), fill=(60, 56, 50))
    d.text((700, 796), "Círculos: centro en cada estación y radio igual a", font=texto(16), fill=(110, 105, 95))
    d.text((700, 820), "su distancia al local. Se cruzan en el local.", font=texto(16), fill=(110, 105, 95))
    d.text((60, 868), "Datos: © colaboradores de OpenStreetMap (ODbL), consulta del 26/11/2026.", font=texto(14), fill=(120, 115, 105))
    # el título va encima de los círculos
    d.rectangle((0, 0, W, 122), fill=rgb(BLANCO))
    d.text((40, 30), "UBICACIÓN Y TRANSPORTE", font=titulo(46), fill=rgb(NEGRO))
    d.text((40, 88), "Distancias en línea recta desde Gral. Madariaga 186", font=texto(19), fill=(80, 75, 68))
    guardar(img, DOCS / "triangulacion.png")


# ---------------------------------------------------------------- códigos QR
def qr_png(url: str, ruta: Path, modulo: int = 12) -> None:
    qr = qrencoder.QRCode(None, qrencoder.QRErrorCorrectLevel.M)
    qr.addData(url)
    qr.make()
    n, borde = qr.getModuleCount(), 4
    img = Image.new("1", ((n + 2 * borde) * modulo,) * 2, 1)
    d = ImageDraw.Draw(img)
    for r in range(n):
        for c in range(n):
            if qr.isDark(r, c):
                x, y = (c + borde) * modulo, (r + borde) * modulo
                d.rectangle((x, y, x + modulo - 1, y + modulo - 1), fill=0)
    guardar(img, ruta)


def codigos_qr() -> None:
    for archivo, _, _, url in QRS:
        qr_png(url, MKT / "qr" / f"{archivo}.png")


# ---------------------------------------------------------------- local (plano y Sweet Home 3D)
# Medidas en centímetros, ESTIMADAS a partir de las fotos (a validar en el local).
# Origen arriba a la izquierda; la vidriera está en y = 0.
ANCHO, FONDO, ALTO_MURO = 500, 900, 300
MUROS = [
    # id, x1, y1, x2, y2, espesor, color interior
    ("muro-frente-izq", 0, 0, 60, 0, 20, "FFF3F1EC"),
    ("muro-frente-der", 160, 0, ANCHO, 0, 20, "FFF3F1EC"),
    ("muro-derecho", ANCHO, 0, ANCHO, FONDO, 20, "FFF3F1EC"),
    ("muro-fondo", ANCHO, FONDO, 0, FONDO, 20, "FFF3F1EC"),
    ("muro-izquierdo", 0, FONDO, 0, 0, 20, "FF1A1A1A"),  # pared de listones negros
    ("muro-bano-a", 320, 740, 350, 740, 10, "FFFFFFFF"),
    ("muro-bano-b", 420, 740, ANCHO, 740, 10, "FFFFFFFF"),
    ("muro-bano-c", 320, 740, 320, FONDO, 10, "FFFFFFFF"),
    ("muro-deposito-a", 0, 760, 40, 760, 10, "FFFFFFFF"),
    ("muro-deposito-b", 110, 760, 150, 760, 10, "FFFFFFFF"),
    ("muro-deposito-c", 150, 760, 150, FONDO, 10, "FFFFFFFF"),
]
UNIONES = {  # muro: (unido al inicio, unido al final)
    "muro-frente-izq": ("muro-izquierdo", None),
    "muro-frente-der": (None, "muro-derecho"),
    "muro-derecho": ("muro-frente-der", "muro-fondo"),
    "muro-fondo": ("muro-derecho", "muro-izquierdo"),
    "muro-izquierdo": ("muro-fondo", "muro-frente-izq"),
}
AMBIENTES = [
    ("Salón", [(0, 0), (ANCHO, 0), (ANCHO, 740), (320, 740), (320, FONDO), (150, FONDO), (150, 760), (0, 760)], "FFE9E6E0"),
    ("Baño", [(320, 740), (ANCHO, 740), (ANCHO, FONDO), (320, FONDO)], "FFD9E0E4"),
    ("Depósito", [(0, 760), (150, 760), (150, FONDO), (0, FONDO)], "FFCFCAC0"),
]
MUEBLES = [
    # nombre, modelo del catálogo de Sweet Home 3D, x centro, y centro, ancho, profundidad, alto,
    # elevación, ángulo en grados (0 = el frente mira hacia la vidriera opuesta), color ARGB (None = el original)
    ("Puerta de entrada", "frontDoor.obj", 110, 0, 100, 23, 208, 0, 0, None),
    ("Vidriera", "sliderWindow126x200.obj", 250, 0, 132, 32, 210, 0, 0, None),
    ("Vidriera", "sliderWindow126x200.obj", 385, 0, 132, 32, 210, 0, 0, None),
    ("Planta", "plant.obj", 30, 45, 40, 36, 70, 0, 0, None),
    ("Sofá de espera", "sofa2.obj", 47, 225, 170, 72, 80, 0, 270, "FF1A1A1A"),
    ("Mesa ratona", "coffeeTable.obj", 125, 225, 90, 45, 40, 0, 270, None),
    ("Cartel iluminado con el logo", "texturableBox.obj", 12, 225, 4, 100, 100, 135, 0, None),
    ("Mostrador y caja", "desk.obj", 458, 185, 110, 60, 100, 0, 90, "FF111111"),
    ("Computadora de la caja", "laptop.obj", 462, 185, 33, 36, 19, 100, 90, None),
    ("Maniquí", "mannequin.obj", 410, 300, 44, 53, 175, 0, 90, None),
    ("Maniquí", "mannequin.obj", 410, 390, 44, 53, 175, 0, 90, None),
    ("Estantería de ropa", "filledBookcase.obj", 472, 345, 120, 35, 180, 0, 90, None),
    ("Vitrina de productos", "glassDoorCabinet.obj", 470, 500, 70, 39, 198, 0, 90, None),
    ("Vitrina de productos", "glassDoorCabinet.obj", 470, 575, 70, 39, 198, 0, 90, None),
    ("Lavacabezas", "washbasinWithCabinet.obj", 235, 861, 62, 57, 97, 0, 180, None),
    ("Sillón de lavado", "armchair2.obj", 235, 790, 70, 70, 85, 0, 180, "FF111111"),
    ("Inodoro", "toiletUnit.obj", 450, 850, 40, 80, 62, 0, 180, None),
    ("Lavabo del baño", "washbasin.obj", 350, 800, 56, 47, 97, 0, 270, None),
    ("Estantería del depósito", "bookcase.obj", 75, 870, 100, 40, 211, 0, 180, None),
]
for i, y in enumerate((420, 530, 640), start=1):
    MUEBLES += [
        (f"Espejo puesto {i}", "texturableBox.obj", 12, y, 3, 75, 100, 85, 0, "FFC9D6DC"),
        (f"Mesada puesto {i}", "kitchenCabinet.obj", 33, y, 90, 45, 85, 0, 270, "FF1A1A1A"),
        (f"Sillón de barbero {i}", "armchair2.obj", 120, y, 70, 72, 95, 0, 90, "FF0A0A0A"),
    ]
# Color en el plano 2D para los muebles que conservan sus colores originales
COLOR_PLANO = {
    "plant.obj": "FF6E8F4E", "toiletUnit.obj": "FFFFFFFF", "washbasin.obj": "FFFFFFFF",
    "washbasinWithCabinet.obj": "FFEDEDED", "glassDoorCabinet.obj": "FF8C6A4A", "bookcase.obj": "FF8C6A4A",
    "filledBookcase.obj": "FF8C6A4A", "coffeeTable.obj": "FF8C6A4A", "frontDoor.obj": "FF8C6A4A",
    "mannequin.obj": "FFD9C8B0", "laptop.obj": "FF9A958B", "sliderWindow126x200.obj": "FFB8D4E3",
}
ETIQUETAS = [("Entrada", 110, -40), ("Vidriera", 330, -40), ("Sala de espera", 160, 120),
             ("Puestos de corte", 230, 530), ("Caja", 360, 180), ("Ropa", 355, 345),
             ("Productos", 395, 540), ("Lavado", 235, 735)]

CUBO_OBJ = """# Cubo unitario: forma provisoria de los muebles (reemplazar por el catálogo de Sweet Home 3D)
v -0.5 0 -0.5
v 0.5 0 -0.5
v 0.5 0 0.5
v -0.5 0 0.5
v -0.5 1 -0.5
v 0.5 1 -0.5
v 0.5 1 0.5
v -0.5 1 0.5
f 4 3 2 1
f 5 6 7 8
f 1 2 6 5
f 3 4 8 7
f 2 3 7 6
f 4 1 5 8
"""


def plano_png() -> None:
    s, m, arriba = 0.95, 110, 170
    W, H = int(ANCHO * s + 2 * m + 230), int(FONDO * s + arriba + m)
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)

    def p(x, y):
        return (m + x * s, arriba + y * s)

    def argb(c):
        return rgb("#" + c[2:])

    d.text((30, 20), "PLANO PROPUESTO DEL LOCAL", font=titulo(34), fill=rgb(NEGRO))
    d.text((30, 62), "Medidas estimadas a partir de fotos — a validar", font=texto(16), fill=(150, 60, 60))
    for nombre, pts, color in AMBIENTES:
        d.polygon([p(*q) for q in pts], fill=argb(color))
    for _, x1, y1, x2, y2, esp, _ in MUROS:
        d.line((*p(x1, y1), *p(x2, y2)), fill=rgb(NEGRO), width=max(3, int(esp * s)))
    # los muebles van encima de los muros, y los muy finos (espejos, cartel) con un ancho mínimo visible
    for nombre, archivo, x, y, w, pr, h, el, ang, color in sorted(MUEBLES, key=lambda m: -min(m[4], m[5])):
        fw, fd = (pr, w) if ang % 180 == 90 else (w, pr)  # huella en planta según la rotación
        x0, y0 = p(x - fw / 2, y - fd / 2)
        x1, y1 = p(x + fw / 2, y + fd / 2)
        if x1 - x0 < 7:
            x0, x1 = x0 + 4, x0 + 11
        relleno = MOSTAZA if nombre.startswith("Cartel") else "#" + (color or COLOR_PLANO.get(archivo, "FF2A2A2A"))[2:]
        d.rectangle((x0, y0, x1, y1), fill=rgb(relleno), outline=rgb(NEGRO))
    # puerta de entrada: bisagra en (60, 0), abre hacia adentro
    d.arc((*p(-40, -100), *p(160, 100)), 0, 90, fill=(150, 60, 60), width=2)
    d.line((*p(60, 0), *p(60, 100)), fill=(150, 60, 60), width=3)
    for txt, x, y in ETIQUETAS:
        centrar(d, p(x, y), txt, texto(15, True), rgb(NEGRO))
    for nombre, pts, _ in AMBIENTES[1:]:
        xs, ys = zip(*pts)
        centrar(d, p(sum(xs) / len(xs), sum(ys) / len(ys) - 40), nombre, texto(15, True), (60, 60, 60))
    # cotas
    d.line((*p(0, FONDO + 40), *p(ANCHO, FONDO + 40)), fill=(90, 90, 90), width=2)
    centrar(d, p(ANCHO / 2, FONDO + 48), f"{ANCHO / 100:.1f} m".replace(".", ","), texto(16, True), rgb(NEGRO))
    d.line((*p(-50, 0), *p(-50, FONDO)), fill=(90, 90, 90), width=2)
    d.text(p(-100, FONDO / 2), f"{FONDO / 100:.1f} m".replace(".", ","), font=texto(16, True), fill=rgb(NEGRO))
    # referencias
    rx, ry = m + ANCHO * s + 40, m
    d.text((rx, ry), "REFERENCIAS", font=titulo(22), fill=rgb(NEGRO))
    refs = [("Pared de listones negros", "FF1A1A1A"), ("Cartel con el logo", "FFEEB637"),
            ("Espejos", "FFC9D6DC"), ("Vidriera", "FFB8D4E3"), ("Vitrinas y estanterías", "FF8C6A4A"),
            ("Sillones y muebles negros", "FF111111"), ("Maniquíes", "FFD9C8B0"), ("Plantas", "FF6E8F4E"),
            ("Piso símil mármol", "FFE9E6E0")]
    for i, (t, c) in enumerate(refs):
        y = ry + 40 + i * 34
        d.rectangle((rx, y, rx + 24, y + 22), fill=argb(c), outline=rgb(NEGRO))
        d.text((rx + 34, y + 2), t, font=texto(15), fill=rgb(NEGRO))
    d.text((rx, ry + 360), f"Superficie: {ANCHO * FONDO / 10000:.0f} m²", font=texto(16, True), fill=rgb(NEGRO))
    d.text((rx, ry + 386), "3 puestos de corte", font=texto(15), fill=rgb(NEGRO))
    guardar(img, DOCS / "plano-local.png")


RECURSOS_SH3D = "com/eteks/sweethome3d/io/resources"


def lib_sweet_home() -> Path | None:
    """Carpeta lib de Sweet Home 3D (instalación común o de Microsoft Store)."""
    candidatos = [Path(os.environ["SH3D_LIB"])] if os.environ.get("SH3D_LIB") else []
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-Command", "(Get-AppxPackage eTeks.SweetHome3D).InstallLocation"],
                           capture_output=True, text=True, timeout=30)
        if r.stdout.strip():
            candidatos.append(Path(r.stdout.strip()) / "Sweet Home 3D" / "lib")
    except (OSError, subprocess.SubprocessError):
        pass
    candidatos += [Path(r"C:\Program Files\Sweet Home 3D\lib"), Path(r"C:\Program Files (x86)\Sweet Home 3D\lib"),
                   Path("/Applications/Sweet Home 3D.app/Contents/Resources/Java")]
    return next((c for c in candidatos if (c / "Furniture.jar").exists()), None)


def leer_propiedades(z: zipfile.ZipFile, nombre: str) -> dict[str, str]:
    texto = z.read(nombre).decode("latin-1")
    texto = re.sub(r"\\\r?\n[ \t]*", "", texto)  # líneas que continúan en la siguiente
    datos = {}
    for linea in texto.splitlines():
        if "=" in linea and not linea.lstrip().startswith(("#", "!")):
            k, v = linea.split("=", 1)
            datos[k.strip()] = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), v.strip())
    return datos


def catalogo_sh3d(lib: Path) -> tuple[zipfile.ZipFile, dict[str, dict]]:
    """Catálogo de muebles de Sweet Home 3D, indexado por el nombre del archivo del modelo."""
    z = zipfile.ZipFile(lib / "Furniture.jar")
    base = leer_propiedades(z, "com/eteks/sweethome3d/io/DefaultFurnitureCatalog.properties")
    claves = ("id", "name", "width", "depth", "height", "icon", "modelRotation", "creator", "doorOrWindow",
              "doorOrWindowWallThickness", "doorOrWindowWallDistance", "doorOrWindowWallCutOutOnBothSides")
    catalogo, n = {}, 1
    while f"id#{n}" in base:
        datos = {k: base[f"{k}#{n}"] for k in claves if f"{k}#{n}" in base}
        datos["modelo"] = base.get(f"model#{n}", "").lstrip("/")
        catalogo.setdefault(datos["modelo"].rsplit("/", 1)[-1], datos)
        n += 1
    return z, catalogo


def copiar_modelo(z: zipfile.ZipFile, ruta: str, contenido: dict[str, bytes]) -> str:
    """Copia el modelo al archivo .sh3d; los de varias partes (con .mtl y texturas) van en su carpeta."""
    carpeta, archivo = ruta.rsplit("/", 1)
    if carpeta == RECURSOS_SH3D:
        contenido[f"modelos/{archivo}"] = z.read(ruta)
        return f"modelos/{archivo}"
    sub = carpeta.rsplit("/", 1)[-1]
    for n in z.namelist():
        if n.startswith(carpeta + "/") and not n.endswith("/"):
            contenido[f"modelos/{sub}/{n[len(carpeta) + 1:]}"] = z.read(n)
    return f"modelos/{sub}/{archivo}"


def textura_logo() -> bytes:
    fondo = Image.new("RGB", (512, 512), rgb(NEGRO))
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((440, 440))
    fondo.paste(logo, ((512 - logo.width) // 2, (512 - logo.height) // 2), logo)
    buf = io.BytesIO()
    fondo.save(buf, "PNG")
    return buf.getvalue()


def muebles_xml(a, contenido: dict[str, bytes]) -> list[str]:
    angulo = lambda g: f"{math.radians(g) % (2 * math.pi):.6f}" if g else None
    lib = lib_sweet_home()
    if not lib:
        print("  (no se encontró Sweet Home 3D: los muebles quedan como bloques)")
        contenido["cubo.obj"] = CUBO_OBJ.encode()
        return [f"  <pieceOfFurniture {a(name=n, x=x, y=y, elevation=el, width=w, depth=pr, height=h, angle=angulo(g), color=c or 'FF2A2A2A', model='cubo.obj', backFaceShown='true')}/>"
                for n, _, x, y, w, pr, h, el, g, c in MUEBLES]
    z, catalogo = catalogo_sh3d(lib)
    lineas, usados = [], {}
    for nombre, archivo, x, y, w, pr, h, el, g, color in MUEBLES:
        c = catalogo[archivo]
        if archivo not in usados:
            icono = f"iconos/{archivo.rsplit('.', 1)[0]}.png" if c.get("icon") else None
            if icono:
                contenido[icono] = z.read(c["icon"].lstrip("/"))
            usados[archivo] = (copiar_modelo(z, c["modelo"], contenido), icono)
        modelo, icono = usados[archivo]
        attrs = dict(name=nombre, catalogId=c.get("id"), creator=c.get("creator"), x=x, y=y, elevation=el,
                     width=w, depth=pr, height=h, angle=angulo(g), color=color, model=modelo, icon=icono,
                     modelRotation=c.get("modelRotation"))
        etiqueta = "pieceOfFurniture"
        if c.get("doorOrWindow") == "true":
            # En el archivo, el espesor de muro y la distancia se guardan como proporción de la profundidad
            prof = float(c["depth"])
            etiqueta = "doorOrWindow"
            attrs.update(wallThickness=f"{float(c.get('doorOrWindowWallThickness', prof)) / prof:.4f}",
                         wallDistance=f"{float(c.get('doorOrWindowWallDistance', 0)) / prof:.4f}",
                         wallCutOutOnBothSides=c.get("doorOrWindowWallCutOutOnBothSides"))
        if nombre.startswith("Cartel"):
            contenido["texturas/logo.png"] = textura_logo()
            textura = f'<texture {a(name="Logo Pola" + chr(39) + "s", image="texturas/logo.png", width=pr, height=h)}/>'
            lineas.append(f"  <{etiqueta} {a(**attrs)}>{textura}</{etiqueta}>")
        else:
            lineas.append(f"  <{etiqueta} {a(**attrs)}/>")
    return lineas


def sweet_home() -> None:
    def a(**kw):
        return " ".join(f"{k}={quoteattr(str(v))}" for k, v in kw.items() if v is not None)

    nombre_casa = "Pola's Barber Shop - Gral. Madariaga 186"
    xml = ['<?xml version="1.0" encoding="UTF-8"?>',
           f'<home {a(name=nombre_casa, camera="topCamera", wallHeight=ALTO_MURO)}>',
           '  <property name="com.eteks.sweethome3d.SweetHome3D.FrameMaximized" value="true"/>']
    contenido: dict[str, bytes] = {}
    xml += muebles_xml(a, contenido)
    for mid, x1, y1, x2, y2, esp, color in MUROS:
        ini, fin = UNIONES.get(mid, (None, None))
        xml.append(f"  <wall {a(id=mid, wallAtStart=ini, wallAtEnd=fin, xStart=x1, yStart=y1, xEnd=x2, yEnd=y2, height=ALTO_MURO, thickness=esp, leftSideColor=color, rightSideColor=color)}/>")
    for nombre, pts, color in AMBIENTES:
        puntos = "".join(f'<point x="{x}" y="{y}"/>' for x, y in pts)
        xml.append(f"  <room {a(name=nombre, areaVisible='true', floorColor=color, ceilingColor='FFFFFFFF')}>{puntos}</room>")
    xml.append(f'  <dimensionLine {a(xStart=0, yStart=FONDO + 60, xEnd=ANCHO, yEnd=FONDO + 60, offset=0)}/>')
    xml.append(f'  <dimensionLine {a(xStart=-60, yStart=0, xEnd=-60, yEnd=FONDO, offset=0)}/>')
    for txt, x, y in ETIQUETAS:
        xml.append(f"  <label {a(x=x, y=y)}><text>{escape(txt)}</text></label>")
    xml.append("</home>")

    ruta = MKT / "sweet-home" / "local-polas.sh3d"
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ruta, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("Home.xml", "\n".join(xml))
        for nombre, datos in contenido.items():
            z.writestr(nombre, datos)
    print(f"  {ruta.relative_to(RAIZ)} ({len(MUEBLES)} muebles, {sum(1 for n in contenido if n.endswith('.obj'))} modelos 3D)")


# ---------------------------------------------------------------- exportación de páginas HTML
def navegador() -> str | None:
    candidatos = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                  r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                  r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                  shutil.which("msedge"), shutil.which("google-chrome"), shutil.which("chromium")]
    return next((c for c in candidatos if c and Path(c).exists()), None)


def exportar(html: str, salida: Path, ancho: int = 0, alto: int = 0, pdf: bool = False, transparente: bool = False) -> None:
    nav = navegador()
    if not nav:
        print(f"  (sin Edge/Chrome: no se exportó {salida.name})")
        return
    salida.parent.mkdir(parents=True, exist_ok=True)
    perfil = tempfile.mkdtemp()
    args = [nav, "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
            f"--user-data-dir={perfil}", "--virtual-time-budget=10000"]
    if pdf:
        args += ["--no-pdf-header-footer", f"--print-to-pdf={salida}"]
    else:
        args += [f"--window-size={ancho},{alto}", f"--screenshot={salida}"]
        if transparente:
            args.append("--default-background-color=00000000")
    pagina, _, consulta = html.partition("?")
    url = (MKT / pagina).resolve().as_uri() + (f"?{consulta}" if consulta else "")
    subprocess.run(args + [url], timeout=120, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"  {salida.relative_to(RAIZ)}" if salida.exists() else f"  ERROR: no se generó {salida.name}")


def exportaciones() -> None:
    exportar("isotipo.svg", DOCS / "isotipo.png", 600, 600, transparente=True)
    exportar("aplicaciones.html", DOCS / "aplicaciones.png", 1200, 1236)
    exportar("merchandising.html", DOCS / "merchandising.png", 1200, 1176)
    exportar("triptico.html?pagina=1", DOCS / "triptico-exterior.png", 1123, 794)
    exportar("triptico.html?pagina=2", DOCS / "triptico-interior.png", 1123, 794)
    exportar("carteles-qr.html?vista=grilla", DOCS / "qr-sectores.png", 1200, 546)
    exportar("triptico.html", MKT / "triptico.pdf", pdf=True)
    exportar("carteles-qr.html", MKT / "carteles-qr.pdf", pdf=True)
    exportar("manual-identidad.html", MKT / "manual-identidad.pdf", pdf=True)


if __name__ == "__main__":
    print("Imágenes de identidad:")
    paleta()
    circulo_cromatico()
    logo_versiones()
    isotipo()
    print("Ubicación:")
    triangulacion()
    print("Códigos QR:")
    codigos_qr()
    print("Local:")
    plano_png()
    sweet_home()
    print("Páginas imprimibles:")
    exportaciones()
