/* Ilustraciones SVG de productos con el logo de Pola's.
   Cuando tengan fotos reales, agregá `foto: "img/productos/xxx.jpg"`
   al producto en data.js y se usará la foto en lugar del dibujo. */
function productArt(p, uid = "") {
  if (p.foto) return `<img src="${p.foto}" alt="${escapeHtml(p.nombre)}" loading="lazy">`;

  const id = "a" + uid + p.id.replace(/[^a-z0-9]/gi, "");
  const c = p.color;
  const logo = (x, y, w) => `<image href="img/logo.png" x="${x}" y="${y}" width="${w}" height="${(w * 1.177).toFixed(1)}"/>`;
  const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="7" fill="#000" opacity=".16"/>`;
  const shade = `url(#${id}s)`;
  const wrap = inner => `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
    <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".24"/></linearGradient>
    <linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f6f6"/><stop offset=".55" stop-color="#bdbdbd"/><stop offset="1" stop-color="#8a8a8a"/></linearGradient>
  </defs>${inner}</svg>`;

  switch (p.ilustracion) {
    case "tee":
    case "tee-white": {
      const w = p.ilustracion === "tee-white";
      const seam = w ? "#d6cfbf" : "#2a2a2a";
      const d = "M86 36 Q120 54 154 36 L200 58 L220 104 L186 116 L176 96 L176 206 Q120 214 64 206 L64 96 L54 116 L20 104 L40 58 Z";
      return wrap(`${shadow(120, 218, 70)}
        <path d="${d}" fill="${c}" stroke="${w ? "#c9c1b0" : "#000"}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="${d}" fill="${shade}"/>
        <path d="M86 36 Q120 64 154 36" fill="none" stroke="${seam}" stroke-width="6" stroke-linecap="round"/>
        <path d="M64 96 L72 44 M176 96 L168 44 M66 196 Q120 204 174 196" stroke="${seam}" stroke-width="1.5" fill="none"/>
        ${logo(97, 72, 46)}`);
    }
    case "hoodie": {
      const body = "M80 58 Q120 72 160 58 L196 78 L224 178 L196 188 L178 130 L178 212 Q120 220 62 212 L62 130 L44 188 L16 178 L44 78 Z";
      const hood = "M84 62 Q84 22 120 20 Q156 22 156 62 Q142 88 120 90 Q98 88 84 62 Z";
      return wrap(`${shadow(120, 222, 76)}
        <path d="${body}" fill="${c}" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="${body}" fill="${shade}"/>
        <path d="${hood}" fill="${c}" stroke="#000" stroke-width="1.5"/>
        <path d="M97 62 Q98 36 120 34 Q142 36 143 62 Q134 78 120 80 Q106 78 97 62 Z" fill="#000" opacity=".45"/>
        <path d="M112 88 L111 104 M128 88 L129 100" stroke="#e8a21c" stroke-width="3" stroke-linecap="round"/>
        <path d="M84 162 L156 162 L168 202 L72 202 Z" fill="#000" opacity=".2"/>
        <path d="M62 204 Q120 212 178 204" stroke="#000" stroke-width="6" opacity=".25" fill="none"/>
        ${logo(101, 110, 38)}`);
    }
    case "cap": {
      const crown = "M50 150 Q48 70 120 64 Q192 70 190 150 Z";
      const visor = "M38 148 Q120 132 210 152 Q220 176 190 182 Q120 170 56 178 Q30 172 38 148 Z";
      const patch = c === "#111111" ? "#f3f0e8" : "#111";
      return wrap(`${shadow(122, 200, 88)}
        <path d="${crown}" fill="${c}" stroke="#000" stroke-width="1.5"/>
        <path d="${crown}" fill="${shade}"/>
        <path d="M120 64 V140 M86 72 Q72 108 76 146 M154 72 Q168 108 164 146" stroke="#000" stroke-opacity=".25" stroke-width="1.5" fill="none"/>
        <circle cx="120" cy="65" r="6" fill="${c}" stroke="#000" stroke-width="1.5"/>
        <path d="${visor}" fill="${c}" stroke="#000" stroke-width="1.5"/>
        <path d="${visor}" fill="#000" opacity=".22"/>
        <rect x="91" y="78" width="58" height="60" rx="12" fill="${patch}"/>
        ${logo(97, 80, 46)}`);
    }
    case "pomada":
    case "cera": {
      const cera = p.ilustracion === "cera";
      const ridges = Array.from({ length: 17 }, (_, i) => `M${58 + i * 7.5} 86 V116`).join(" ");
      return wrap(`${shadow(120, 202, 76)}
        <rect x="58" y="108" width="124" height="88" rx="12" fill="#1b1b1b"/>
        <rect x="58" y="108" width="124" height="88" rx="12" fill="${shade}"/>
        <rect x="50" y="80" width="140" height="40" rx="10" fill="${cera ? "#e8a21c" : "#111"}"/>
        <path d="${ridges}" stroke="#000" stroke-opacity=".22" stroke-width="2"/>
        <rect x="50" y="80" width="140" height="40" rx="10" fill="${shade}"/>
        <rect x="68" y="130" width="104" height="54" rx="6" fill="#f4f1ea"/>
        ${logo(74, 133, 40)}
        <text x="145" y="156" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="13" fill="#111">${cera ? "CERA" : "POMADA"}</text>
        <text x="145" y="171" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="700" font-size="8" letter-spacing="1.5" fill="#c98a0f">${cera ? "BRILLO" : "MATE"}</text>`);
    }
    case "polvo":
      return wrap(`${shadow(120, 206, 50)}
        <rect x="84" y="84" width="72" height="116" rx="16" fill="#f4f1ea" stroke="#cfc8b8" stroke-width="1.5"/>
        <rect x="84" y="84" width="72" height="116" rx="16" fill="${shade}"/>
        <rect x="90" y="56" width="60" height="34" rx="7" fill="#111"/>
        <path d="M90 66 H150" stroke="#e8a21c" stroke-width="2"/>
        <rect x="84" y="118" width="72" height="62" fill="#111"/>
        ${logo(99, 120, 42)}`);
    case "aceite":
      return wrap(`${shadow(120, 206, 48)}
        <path d="M108 84 Q106 42 120 38 Q134 42 132 84 Z" fill="#111"/>
        <rect x="102" y="78" width="36" height="24" rx="4" fill="#1d1d1d"/>
        <rect x="80" y="98" width="80" height="104" rx="18" fill="${c}"/>
        <rect x="80" y="98" width="80" height="104" rx="18" fill="${shade}"/>
        <rect x="88" y="108" width="7" height="82" rx="3.5" fill="#fff" opacity=".3"/>
        <rect x="96" y="124" width="54" height="62" rx="4" fill="#f4f1ea"/>
        ${logo(102, 127, 42)}`);
    case "shampoo":
      return wrap(`${shadow(120, 208, 54)}
        <path d="M112 76 V50 H162 V60 H124 V76 Z" fill="#222"/>
        <rect x="104" y="72" width="32" height="22" rx="3" fill="#2a2a2a"/>
        <rect x="76" y="90" width="88" height="112" rx="20" fill="#111"/>
        <rect x="76" y="90" width="88" height="112" rx="20" fill="${shade}"/>
        <rect x="76" y="118" width="88" height="64" fill="#e8a21c"/>
        ${logo(99, 121, 42)}
        <rect x="84" y="100" width="7" height="92" rx="3.5" fill="#fff" opacity=".16"/>`);
    case "navaja":
      return wrap(`${shadow(120, 196, 84)}
        <g transform="rotate(-24 120 120)">
          <rect x="22" y="110" width="128" height="24" rx="12" fill="#161616"/>
          <rect x="36" y="119" width="98" height="6" rx="3" fill="#e8a21c" opacity=".9"/>
          <path d="M142 108 L212 104 Q228 108 226 124 L214 138 L142 136 Z" fill="url(#${id}m)" stroke="#6d6d6d" stroke-width="1"/>
          <path d="M146 132 L214 134" stroke="#fff" stroke-width="1.5" opacity=".8"/>
          <circle cx="146" cy="122" r="6" fill="#e8a21c" stroke="#111" stroke-width="2"/>
        </g>`);
    default:
      return wrap(logo(78, 70, 84));
  }
}
