// src/brands.ts
var range = (start, end = start) => [start, end];
var BRANDS = [
  {
    name: "visa",
    displayName: "Visa",
    ranges: [range("4")],
    gaps: [4, 8, 12],
    lengths: [13, 16, 19],
    maskLength: 16,
    cvcLength: 3
  },
  {
    name: "mastercard",
    displayName: "Mastercard",
    ranges: [range("51", "55"), range("2221", "2720")],
    gaps: [4, 8, 12],
    lengths: [16],
    maskLength: 16,
    cvcLength: 3
  },
  {
    name: "amex",
    displayName: "American Express",
    ranges: [range("34"), range("37")],
    gaps: [4, 10],
    lengths: [15],
    maskLength: 15,
    cvcLength: 4
  },
  {
    name: "discover",
    displayName: "Discover",
    ranges: [range("6011"), range("644", "649"), range("65")],
    gaps: [4, 8, 12],
    lengths: [16, 19],
    maskLength: 16,
    cvcLength: 3
  },
  {
    name: "dinersclub",
    displayName: "Diners Club",
    ranges: [range("300", "305"), range("36"), range("38", "39")],
    gaps: [4, 10],
    lengths: [14, 16, 19],
    maskLength: 14,
    cvcLength: 3
  },
  {
    name: "jcb",
    displayName: "JCB",
    ranges: [range("3528", "3589")],
    gaps: [4, 8, 12],
    lengths: [16, 17, 18, 19],
    maskLength: 16,
    cvcLength: 3
  },
  {
    name: "unionpay",
    displayName: "UnionPay",
    ranges: [range("62")],
    gaps: [4, 8, 12],
    lengths: [16, 17, 18, 19],
    maskLength: 16,
    cvcLength: 3
  },
  {
    name: "maestro",
    displayName: "Maestro",
    ranges: [
      range("5018"),
      range("5020"),
      range("5038"),
      range("5893"),
      range("6304"),
      range("6759"),
      range("6761", "6763")
    ],
    gaps: [4, 8, 12],
    lengths: [12, 13, 14, 15, 16, 17, 18, 19],
    maskLength: 16,
    cvcLength: 3
  },
  {
    name: "elo",
    displayName: "Elo",
    ranges: [
      range("401178"),
      range("401179"),
      range("431274"),
      range("438935"),
      range("451416"),
      range("457393"),
      range("457631"),
      range("457632"),
      range("504175"),
      range("506699", "506778"),
      range("509000", "509999"),
      range("627780"),
      range("636297"),
      range("636368"),
      range("650031", "650051"),
      range("650405", "650439"),
      range("650485", "650538"),
      range("650541", "650598"),
      range("650700", "650718"),
      range("650720", "650727"),
      range("650901", "650978"),
      range("651652", "651679"),
      range("655000", "655058")
    ],
    gaps: [4, 8, 12],
    lengths: [16],
    maskLength: 16,
    cvcLength: 3
  },
  {
    name: "hipercard",
    displayName: "Hipercard",
    ranges: [range("606282")],
    gaps: [4, 8, 12],
    lengths: [16],
    maskLength: 16,
    cvcLength: 3
  }
];
var SPECS_BY_NAME = new Map(BRANDS.map((spec) => [spec.name, spec]));
function getBrandSpec(brand) {
  return SPECS_BY_NAME.get(brand);
}
function brandFromStripe(stripeBrand) {
  if (stripeBrand === "diners") return "dinersclub";
  return SPECS_BY_NAME.has(stripeBrand) ? stripeBrand : null;
}
function rangeMatchStrength(digits, [start, end]) {
  const compareLength = Math.min(digits.length, start.length);
  if (compareLength === 0) return 0;
  const value = Number(digits.slice(0, compareLength));
  const min = Number(start.slice(0, compareLength));
  const max = Number(end.slice(0, compareLength));
  if (value < min || value > max) return 0;
  return digits.length >= start.length ? start.length : 0.5;
}
function detectBrand(number) {
  const digits = number.replace(/\D/g, "");
  let best = null;
  let bestStrength = 0;
  for (const spec of BRANDS) {
    for (const r of spec.ranges) {
      const strength = rangeMatchStrength(digits, r);
      if (strength > bestStrength) {
        bestStrength = strength;
        best = spec.name;
      }
    }
  }
  return best;
}

// src/format.ts
var DEFAULT_GAPS = [4, 8, 12];
var DEFAULT_LENGTH = 16;
var MASK_CHAR = "\u2022";
function normalizeDigits(value, maxLength) {
  const digits = value.replace(/\D/g, "");
  return maxLength === void 0 ? digits : digits.slice(0, maxLength);
}
function groupDigits(digits, gaps) {
  const parts = [];
  let previous = 0;
  for (const gap of gaps) {
    if (digits.length <= previous) break;
    parts.push(digits.slice(previous, gap));
    previous = gap;
  }
  if (digits.length > previous) parts.push(digits.slice(previous));
  return parts.join(" ");
}
function formatCardNumber(raw, brand) {
  const spec = brand ? getBrandSpec(brand) : void 0;
  const maxLength = spec ? spec.lengths[spec.lengths.length - 1] : DEFAULT_LENGTH;
  const digits = normalizeDigits(raw, maxLength);
  return groupDigits(digits, spec?.gaps ?? DEFAULT_GAPS);
}
function maskCardNumber(raw, brand, maskChar = MASK_CHAR) {
  const spec = brand ? getBrandSpec(brand) : void 0;
  const targetLength = spec ? spec.maskLength : DEFAULT_LENGTH;
  const maxLength = spec ? spec.lengths[spec.lengths.length - 1] : DEFAULT_LENGTH;
  const digits = normalizeDigits(raw, maxLength);
  const padded = digits.length >= targetLength ? digits : digits + maskChar.repeat(targetLength - digits.length);
  return groupDigits(padded, spec?.gaps ?? DEFAULT_GAPS);
}
function maskLast4(last4, brand, maskChar = MASK_CHAR) {
  const spec = brand ? getBrandSpec(brand) : void 0;
  const targetLength = spec ? spec.maskLength : DEFAULT_LENGTH;
  const digits = normalizeDigits(last4, 4);
  const masked = maskChar.repeat(Math.max(targetLength - digits.length, 0)) + digits;
  return groupDigits(masked, spec?.gaps ?? DEFAULT_GAPS);
}
function formatExpiry(raw, maskChar = MASK_CHAR) {
  const digits = normalizeDigits(raw, 6);
  let month = digits.slice(0, 2);
  let year = digits.slice(2);
  if (month.length === 1 && Number(month) > 1) {
    year = "";
    month = `0${month}`;
  }
  if (year.length === 4) year = year.slice(2);
  else year = year.slice(0, 2);
  const mm = month.padEnd(2, maskChar);
  const yy = year.padEnd(2, maskChar);
  return `${mm}/${yy}`;
}
function maskCvc(raw, brand, maskChar = MASK_CHAR) {
  const length = brand ? getBrandSpec(brand).cvcLength : 3;
  return normalizeDigits(raw, length).replace(/\d/g, maskChar).padEnd(length, maskChar);
}
function formatCvc(raw, brand) {
  const length = brand ? getBrandSpec(brand).cvcLength : 4;
  return normalizeDigits(raw, length);
}

// src/logos.ts
var wordmark = (text, options = {}) => {
  const size = text.length >= 7 ? 15 : 22;
  return `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><text x="118" y="28" text-anchor="end" font-family="'Avenir Next', 'Segoe UI', sans-serif" font-size="${size}" font-weight="700" letter-spacing="1" ${options.italic ? 'font-style="italic" ' : ""}fill="currentColor">${text}</text></svg>`;
};
var circles = `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><circle cx="85" cy="20" r="15" fill="currentColor" opacity="0.85"/><circle cx="103" cy="20" r="15" fill="currentColor" opacity="0.5"/></svg>`;
var LOGOS = {
  visa: wordmark("VISA", { italic: true }),
  mastercard: circles,
  amex: wordmark("AMEX"),
  discover: wordmark("DISCOVER"),
  dinersclub: wordmark("DINERS"),
  jcb: wordmark("JCB"),
  unionpay: wordmark("UNIONPAY"),
  maestro: circles,
  elo: wordmark("elo"),
  hipercard: wordmark("Hipercard")
};
var CHIP_SVG = `<svg viewBox="0 0 48 36" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><rect x="1" y="1" width="46" height="34" rx="6" fill="currentColor" opacity="0.9"/><path d="M1 13h14M1 23h14M33 13h14M33 23h14M24 1v10M24 25v10M15 11h18v14H15z" stroke="rgba(0,0,0,0.45)" stroke-width="1.6" fill="none"/></svg>`;

// src/card.ts
var TEMPLATE = `
<div class="crd__inner">
  <div class="crd__front">
    <div class="crd__chip">${CHIP_SVG}</div>
    <div class="crd__logo"></div>
    <div class="crd__number"></div>
    <div class="crd__meta">
      <span class="crd__meta-item">
        <span class="crd__meta-label crd__meta-label--exp"></span>
        <span class="crd__meta-expiry"></span>
      </span>
      <span class="crd__meta-item">
        <span class="crd__meta-label crd__meta-label--cvc"></span>
        <span class="crd__meta-cvc"></span>
      </span>
    </div>
    <div class="crd__footer">
      <div class="crd__name"></div>
      <div class="crd__expiry">
        <span class="crd__expiry-label"></span>
        <span class="crd__expiry-value"></span>
      </div>
    </div>
    <div class="crd__ring"></div>
  </div>
  <div class="crd__back">
    <div class="crd__stripe"></div>
    <div class="crd__signature"><span class="crd__cvc"></span></div>
    <div class="crd__logo crd__logo--back"></div>
  </div>
</div>
<div class="crd__glare"></div>`;
function createCard(container, options = {}) {
  const state = {
    number: options.number ?? "",
    name: options.name ?? "",
    expiry: options.expiry ?? "",
    cvc: options.cvc ?? "",
    focused: options.focused ?? null,
    variant: options.variant ?? "sunset",
    tilt: options.tilt ?? false,
    brand: options.brand,
    last4: options.last4 ?? "",
    layout: options.layout ?? "form",
    copyable: options.copyable ?? false,
    classNames: options.classNames
  };
  const namePlaceholder = options.placeholders?.name ?? "FULL NAME";
  const validThru = options.locale?.validThru ?? "valid thru";
  const expLabel = options.locale?.exp ?? "Exp";
  const cvcLabel = options.locale?.cvc ?? "CVC";
  const copyLabel = options.locale?.copy ?? "Click to copy";
  const copiedLabel = options.locale?.copied ?? "Copied";
  const onCopy = options.onCopy;
  const logos = { ...LOGOS, ...options.logos };
  const COPY_ARIA = {
    number: "Copy card number",
    expiry: "Copy expiry date",
    cvc: "Copy security code"
  };
  const root = document.createElement("div");
  root.setAttribute("role", "img");
  root.innerHTML = TEMPLATE;
  container.appendChild(root);
  const query = (selector) => root.querySelector(selector);
  const refs = {
    number: query(".crd__number"),
    name: query(".crd__name"),
    expiry: query(".crd__expiry"),
    expiryLabel: query(".crd__expiry-label"),
    expiryValue: query(".crd__expiry-value"),
    cvc: query(".crd__cvc"),
    metaExpiry: query(".crd__meta-expiry"),
    metaCvc: query(".crd__meta-cvc"),
    logoFront: query(".crd__logo"),
    logoBack: query(".crd__logo--back"),
    ring: query(".crd__ring"),
    inner: query(".crd__inner"),
    front: query(".crd__front"),
    back: query(".crd__back"),
    chip: query(".crd__chip"),
    footer: query(".crd__footer"),
    meta: query(".crd__meta")
  };
  const slotTargets = {
    inner: { el: refs.inner, base: "crd__inner" },
    front: { el: refs.front, base: "crd__front" },
    back: { el: refs.back, base: "crd__back" },
    chip: { el: refs.chip, base: "crd__chip" },
    logo: { el: refs.logoFront, base: "crd__logo" },
    number: { el: refs.number, base: "crd__number" },
    footer: { el: refs.footer, base: "crd__footer" },
    expiry: { el: refs.expiry, base: "crd__expiry" },
    expiryLabel: { el: refs.expiryLabel, base: "crd__expiry-label" },
    expiryValue: { el: refs.expiryValue, base: "crd__expiry-value" },
    meta: { el: refs.meta, base: "crd__meta" },
    metaExpiry: { el: refs.metaExpiry, base: "crd__meta-expiry" },
    metaCvc: { el: refs.metaCvc, base: "crd__meta-cvc" },
    cvc: { el: refs.cvc, base: "crd__cvc" }
  };
  const withSlot = (base, slot) => {
    const extra = state.classNames?.[slot];
    return extra ? `${base} ${extra}` : base;
  };
  refs.expiryLabel.textContent = validThru;
  query(".crd__meta-label--exp").textContent = expLabel;
  query(".crd__meta-label--cvc").textContent = cvcLabel;
  let ringHideTimer;
  function updateRing() {
    const targets = { number: refs.number, name: refs.name, expiry: refs.expiry };
    const target = state.focused && state.focused !== "cvc" ? targets[state.focused] : void 0;
    const width = target?.offsetWidth ?? 0;
    if (!target || !width) {
      if (!ringHideTimer && refs.ring.classList.contains("crd__ring--on")) {
        ringHideTimer = setTimeout(() => {
          ringHideTimer = void 0;
          refs.ring.classList.remove("crd__ring--on");
        }, 90);
      }
      return;
    }
    if (ringHideTimer) {
      clearTimeout(ringHideTimer);
      ringHideTimer = void 0;
    }
    const wasOn = refs.ring.classList.contains("crd__ring--on");
    if (!wasOn) refs.ring.classList.add("crd__ring--instant");
    refs.ring.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
    refs.ring.style.width = `${width}px`;
    refs.ring.style.height = `${target.offsetHeight}px`;
    refs.ring.classList.add("crd__ring--on");
    if (!wasOn) {
      void refs.ring.offsetWidth;
      refs.ring.classList.remove("crd__ring--instant");
    }
  }
  const TILT_MAX = 12;
  let tiltHover = false;
  function onTiltMove(event) {
    if (!state.tilt) return;
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    tiltHover = true;
    root.classList.add("crd--tilt-hover");
    root.style.setProperty("--crd-tilt-ry", `${((px - 0.5) * TILT_MAX).toFixed(2)}deg`);
    root.style.setProperty("--crd-tilt-rx", `${((0.5 - py) * TILT_MAX).toFixed(2)}deg`);
    root.style.setProperty("--crd-tilt-gx", `${(px * 100).toFixed(1)}%`);
    root.style.setProperty("--crd-tilt-gy", `${(py * 100).toFixed(1)}%`);
  }
  function onTiltLeave() {
    tiltHover = false;
    root.classList.remove("crd--tilt-hover");
    root.style.setProperty("--crd-tilt-rx", "0deg");
    root.style.setProperty("--crd-tilt-ry", "0deg");
  }
  root.addEventListener("pointermove", onTiltMove);
  root.addEventListener("pointerleave", onTiltLeave);
  const copyTimers = /* @__PURE__ */ new Map();
  function markCopyable(el, field, on) {
    if (on) {
      el.dataset.crdCopy = field;
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", COPY_ARIA[field]);
      el.dataset.copyLabel = copyLabel;
      el.dataset.copiedLabel = copiedLabel;
    } else if (el.dataset.crdCopy) {
      delete el.dataset.crdCopy;
      delete el.dataset.copyLabel;
      delete el.dataset.copiedLabel;
      delete el.dataset.copied;
      el.removeAttribute("role");
      el.removeAttribute("tabindex");
      el.removeAttribute("aria-label");
    }
  }
  function copyRawValue(field) {
    if (field === "number") return normalizeDigits(state.number);
    if (field === "expiry") return formatExpiry(state.expiry);
    return formatCvc(state.cvc, brand);
  }
  function doCopy(el) {
    const field = el.dataset.crdCopy;
    if (!field) return;
    const value = copyRawValue(field);
    if (!value) return;
    const clipboard = navigator?.clipboard;
    const done = () => {
      el.dataset.copied = "";
      const prev = copyTimers.get(el);
      if (prev) clearTimeout(prev);
      copyTimers.set(
        el,
        setTimeout(() => {
          delete el.dataset.copied;
          copyTimers.delete(el);
        }, 1200)
      );
      onCopy?.(field, value);
    };
    if (clipboard?.writeText) {
      clipboard.writeText(value).then(done, () => {
      });
    } else {
      done();
    }
  }
  root.addEventListener("click", (event) => {
    const el = event.target?.closest("[data-crd-copy]");
    if (el && root.contains(el)) doCopy(el);
  });
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const el = event.target?.closest("[data-crd-copy]");
    if (el && root.contains(el)) {
      event.preventDefault();
      doCopy(el);
    }
  });
  let brand = null;
  let renderedLogoBrand;
  let flipped = (options.focused ?? null) === "cvc";
  let flipping = false;
  root.addEventListener("animationend", (event) => {
    if (event.animationName === "crd-lift" && event.target === root) {
      flipping = false;
      root.classList.remove("crd--flipping");
    }
  });
  function render() {
    brand = state.brand !== void 0 ? state.brand : detectBrand(state.number);
    const nowFlipped = state.focused === "cvc" && state.layout !== "display";
    if (nowFlipped !== flipped) {
      flipped = nowFlipped;
      if (flipping) {
        root.classList.remove("crd--flipping");
        void root.offsetWidth;
      }
      flipping = true;
    }
    if (!state.tilt && tiltHover) onTiltLeave();
    root.className = [
      "crd",
      brand ? `crd--brand-${brand}` : "crd--unknown",
      state.variant && state.variant !== "gradient" ? `crd--v-${state.variant}` : "",
      state.layout === "display" ? "crd--l-display" : "",
      state.tilt ? "crd--tilt" : "",
      tiltHover ? "crd--tilt-hover" : "",
      flipped ? "crd--flipped" : "",
      flipping ? "crd--flipping" : "",
      state.focused ? `crd--focus-${state.focused}` : "",
      state.classNames?.root ?? ""
    ].filter(Boolean).join(" ");
    for (const [slot, target] of Object.entries(slotTargets)) {
      if (target) target.el.className = withSlot(target.base, slot);
    }
    refs.number.textContent = !state.number && state.last4 ? maskLast4(state.last4, brand) : maskCardNumber(state.number, brand);
    const name = state.name.trim();
    refs.name.textContent = name || (state.layout === "display" ? "" : namePlaceholder);
    refs.name.className = withSlot(
      name ? "crd__name" : "crd__name crd__name--placeholder",
      "name"
    );
    refs.expiryValue.textContent = formatExpiry(state.expiry);
    refs.cvc.textContent = state.cvc ? formatCvc(state.cvc, brand) : maskCvc("", brand);
    refs.metaExpiry.textContent = formatExpiry(state.expiry);
    refs.metaCvc.textContent = state.cvc ? formatCvc(state.cvc, brand) : maskCvc("", brand);
    const canCopy = state.layout === "display" && !!state.copyable;
    markCopyable(refs.number, "number", canCopy && !!state.number.trim());
    markCopyable(refs.metaExpiry, "expiry", canCopy && !!state.expiry.trim());
    markCopyable(refs.metaCvc, "cvc", canCopy && !!state.cvc.trim());
    if (brand !== renderedLogoBrand) {
      const logo = brand ? logos[brand] : "";
      refs.logoFront.innerHTML = logo;
      refs.logoBack.innerHTML = logo;
      renderedLogoBrand = brand;
    }
    const brandLabel = brand ? getBrandSpec(brand).displayName : "Payment";
    root.setAttribute("aria-label", `${brandLabel} card preview`);
    updateRing();
  }
  render();
  return {
    update(data) {
      Object.assign(state, data);
      render();
    },
    get brand() {
      return brand;
    },
    get element() {
      return root;
    },
    destroy() {
      if (ringHideTimer) clearTimeout(ringHideTimer);
      for (const timer of copyTimers.values()) clearTimeout(timer);
      root.remove();
    }
  };
}

export {
  BRANDS,
  getBrandSpec,
  brandFromStripe,
  detectBrand,
  normalizeDigits,
  formatCardNumber,
  maskCardNumber,
  maskLast4,
  formatExpiry,
  maskCvc,
  formatCvc,
  LOGOS,
  createCard
};
//# sourceMappingURL=chunk-WXZLRHND.js.map