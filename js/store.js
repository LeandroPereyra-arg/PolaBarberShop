/* ============================================================
   Almacenamiento de turnos.
   Hoy guarda en localStorage (sirve para demo / un solo equipo).
   Para producción, reemplazá read/write por llamadas a tu
   backend (Firebase, Supabase, PHP + MySQL, etc.) manteniendo
   la misma interfaz pública.
   ============================================================ */
const Turnos = (() => {
  const KEY = "polas_turnos_v1";

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  };
  const write = list => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* sin storage */ }
  };

  const toMin = h => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
  const toHora = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const realBarbers = () => BARBEROS.filter(b => b.id !== "cualquiera");

  // Ocupación simulada y estable (mismo resultado cada vez que se carga)
  function demoBusy(barberId, fecha, min) {
    if (!CONFIG.demoOcupados) return false;
    let h = 2166136261;
    const s = barberId + fecha + min;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 100 < 28;
  }

  const activos = () => read().filter(t => t.estado !== "cancelado");

  function barberFree(barberId, fecha, start, dur) {
    const end = start + dur;
    for (let m = start; m < end; m += CONFIG.bloque) if (demoBusy(barberId, fecha, m)) return false;
    return !activos().some(t =>
      t.barberoId === barberId && t.fecha === fecha &&
      toMin(t.hora) < end && toMin(t.hora) + t.duracion > start);
  }

  function slots(fecha, barberId, dur) {
    const d = parseFecha(fecha);
    const h = CONFIG.horarios[d.getDay()];
    if (!h) return [];
    const open = toMin(h.abre), close = toMin(h.cierra);
    const now = new Date();
    const limite = ymd(now) === fecha ? now.getHours() * 60 + now.getMinutes() + 15 : -1;
    const out = [];
    for (let m = open; m + dur <= close; m += CONFIG.bloque) {
      let libre = m > limite;
      let asignado = null;
      if (libre) {
        if (barberId === "cualquiera") {
          const b = realBarbers().find(b => barberFree(b.id, fecha, m, dur));
          libre = !!b;
          asignado = b ? b.id : null;
        } else {
          libre = barberFree(barberId, fecha, m, dur);
          asignado = barberId;
        }
      }
      out.push({ hora: toHora(m), min: m, libre, barberoId: asignado });
    }
    return out;
  }

  function add(data) {
    const list = read();
    const t = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      codigo: "PB-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      estado: "confirmado",
      creado: new Date().toISOString(),
      ...data,
    };
    list.push(t);
    write(list);
    return t;
  }

  function update(id, patch) {
    const list = read();
    const i = list.findIndex(t => t.id === id);
    if (i < 0) return null;
    list[i] = { ...list[i], ...patch };
    write(list);
    return list[i];
  }

  const remove = id => write(read().filter(t => t.id !== id));

  function byPhone(tel) {
    const n = normTel(tel);
    if (n.length < 6) return [];
    const tail = n.slice(-8);
    return read().filter(t => normTel(t.telefono).endsWith(tail));
  }

  return { read, add, update, remove, slots, byPhone, barberFree, ymd, toMin, toHora };
})();
