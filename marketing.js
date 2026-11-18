/* Espiga Social — marketing multicanal y motor de decisiones.
   Las reglas (R1…R39) vienen de la investigación de noviembre de 2026 sobre Facebook, WhatsApp, Google y publicidad local en México.
   Este archivo solo define funciones; se cargan antes del script principal y usan S, render, toast, etc. al llamarse. */
"use strict";

const MKT_DEF = {
  mezcla: { reels: 5, feed: 3 },          // R1: por semana
  decisiones: [], razones: [], retirados: {}, evaluadas: [],
  impulsos: [], descartados: [], pausaImpulsosHasta: "", topeImpulsoMes: 600,  // R16
  difusiones: {}, topeDifusion: 35, diaDifusion: 4,                          // R23/R25 (jueves)
  diaGoogle: 1, diasGrupos: [2, 5], grupos: [],                              // R28 (lunes), R33 (martes y viernes)
  promos: [], linkResenas: "", ultimaRevision: "", reporteVisto: "", ultimoIntento: ""
};
const CANALES_CAJA = [["facebook", "📘 Facebook"], ["whatsapp", "💬 WhatsApp"], ["google", "📍 Google"], ["recomendacion", "🗣️ Recomendación"], ["pasaba", "🚶 Pasaba"], ["promo", "🏷️ Promo"]];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const PROHIBIDO_PROMO = /(comparte en tu (muro|biograf)|etiqueta a|etiquetar a|sorteo|rifa|dale like y comparte|comparte y gana)/i; // R35

const guardarMkt = () => kvSet("mkt", S.mkt);
const mediana = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function sumaDias(fecha, n){ const d = parseYmd(fecha); d.setDate(d.getDate() + n); return ymd(d); }
function ultimoDiaMes(fecha){ const d = parseYmd(fecha); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function esQuincena(fecha){ const d = parseYmd(fecha).getDate(), u = ultimoDiaMes(fecha); return (d >= 14 && d <= 16) || d >= u - 1 || d <= 2; }
function grupoFormato(p){ return p.formato === "reel" ? "reel" : "feed"; }
function conDatos(){ return S.posts.filter(p => p.estado === "publicada" && p.resultados && typeof p.resultados.alcance === "number").sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)); }
function interacciones(r){ return (r.reacciones || 0) + (r.comentarios || 0) + (r.compartidos || 0); }
function promoActiva(fecha = hoyStr()){ return (S.mkt.promos || []).find(p => p.desde <= fecha && p.hasta >= fecha) || null; }
function sim(a, b){
  const pal = t => new Set(String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter(w => w.length >= 3));
  const A = pal(a), B = pal(b); if (!A.size || !B.size) return 0;
  let c = 0; A.forEach(w => { if (B.has(w)) c++; }); return c / Math.min(A.size, B.size);
}
function subnav(main, subs, actual){ return '<div class="subnav">' + subs.map(([k, l]) => '<a href="#' + main + '-' + k + '" class="' + (k === actual ? "on" : "") + '">' + l + '</a>').join("") + '</div>'; }
function elegirArchivo(accept, multiple, fn){ const i = document.createElement("input"); i.type = "file"; i.accept = accept; i.multiple = !!multiple; i.onchange = () => fn([...i.files]); i.click(); }

/* ===================== Clasificación (R8, R9) ===================== */
function lineaBase(formato, antesDe){
  const l = conDatos().filter(p => grupoFormato(p) === formato && (!antesDe || (p.fecha + p.hora) < antesDe)).slice(-20).map(p => p.resultados.alcance);
  return l.length >= 3 ? mediana(l) : 0;
}
function clasificar(p){
  if (!p || !p.resultados || typeof p.resultados.alcance !== "number") return null;
  const base = lineaBase(grupoFormato(p), p.fecha + p.hora); if (!base) return null;
  const r = p.resultados.alcance / base;
  return { r, base, etiqueta: r >= 2 ? "Excelente" : r >= 1.5 ? "Buena" : r <= 0.5 ? "Floja" : "Normal" };
}
function pillClase(p){
  const c = clasificar(p); if (!c || c.etiqueta === "Normal") return "";
  return ' <span class="pill ' + (c.etiqueta === "Floja" ? "r" : "v") + '">' + (c.etiqueta === "Excelente" ? "🔥 " : "") + c.etiqueta + " " + c.r.toFixed(1) + 'x</span>';
}

/* ===================== Motor de decisiones (R4–R7, R10, R17) ===================== */
async function revisarMotor(forzar){
  const hoy = hoyStr();
  if (!forzar && S.mkt.ultimaRevision && sumaDias(S.mkt.ultimaRevision, 28) > hoy) return null;
  const desde = sumaDias(hoy, -28), ventana = conDatos().filter(p => p.fecha >= desde);
  const reels = ventana.filter(p => grupoFormato(p) === "reel").map(p => p.resultados.alcance);
  const feed = ventana.filter(p => grupoFormato(p) === "feed").map(p => p.resultados.alcance);
  const res = { cambio: false, textos: [] }, mz = S.mkt.mezcla;
  if (reels.length >= 6 && feed.length >= 6) {
    const razon = mediana(reels) / Math.max(1, mediana(feed));
    S.mkt.razones.push({ fecha: hoy, razon }); S.mkt.razones = S.mkt.razones.slice(-6);
    const ult = S.mkt.razones.slice(-2);
    if (ult.length === 2 && ult.every(x => x.razon >= 1.3) && mz.reels < 7) {
      mz.reels++; mz.feed = Math.max(2, mz.feed - 1); res.cambio = true;
      res.textos.push("Tus Reels llegan a " + razon.toFixed(1) + " veces más personas que tus fotos, dos meses seguidos. Subo a " + mz.reels + " Reels y " + mz.feed + " publicaciones por semana.");
    } else if (ult.length === 2 && ult.every(x => x.razon <= 0.8) && mz.reels > 3) {
      mz.reels--; res.cambio = true;
      res.textos.push("Tus Reels están llegando a menos gente que tus fotos dos meses seguidos. Bajo a " + mz.reels + " Reels por semana; prueba grabar video real (tortilla saliendo de la máquina) en lugar de solo fotos.");
    } else res.textos.push("Reels contra fotos: " + razon.toFixed(1) + "x. Todavía no hay una diferencia clara y repetida; mantengo " + mz.reels + " Reels y " + mz.feed + " publicaciones por semana.");
  } else res.textos.push("Aún no hay datos suficientes para cambiar la mezcla (necesito al menos 6 Reels y 6 publicaciones con resultados en 4 semanas; hay " + reels.length + " y " + feed.length + "). Mantengo el plan.");
  // R10: retirar 4 semanas un producto que salió flojo 3 veces sin ninguna buena
  const ocho = sumaDias(hoy, -56), porProd = {};
  conDatos().filter(p => p.fecha >= ocho).forEach(p => { const f = fotoById(p.fotoId); if (!f || !f.prod || f.prod === "tortilla" || f.prod === "tienda") return; const c = clasificar(p); if (!c) return; const x = porProd[f.prod] = porProd[f.prod] || { flojas: 0, buenas: 0 }; if (c.etiqueta === "Floja") x.flojas++; if (c.r >= 1.5) x.buenas++; });
  Object.entries(porProd).forEach(([k, x]) => { if (x.flojas >= 3 && !x.buenas && !(S.mkt.retirados[k] > hoy)) { S.mkt.retirados[k] = sumaDias(hoy, 28); const pr = S.banco.productos[k]; res.textos.push((pr ? pr.nombre : k) + " salió flojo 3 veces: lo descanso 4 semanas para dar espacio a lo que sí interesa."); } });
  S.mkt.ultimaRevision = hoy;
  res.textos.forEach(t => S.mkt.decisiones.push({ fecha: hoy, texto: t })); S.mkt.decisiones = S.mkt.decisiones.slice(-30);
  await guardarMkt();
  return res;
}
async function evaluarImpulsos(){
  const hoy = hoyStr(); let cambio = false;
  for (const im of S.mkt.impulsos) {
    const fin = sumaDias(im.fecha, im.dias);
    if (im.evaluado || fin > hoy) continue;
    let n = 0; for (let i = 0; i < im.dias; i++) { const c = S.caja[sumaDias(im.fecha, i)] || {}; n += (c.facebook || 0) + (c.promo || 0); }
    im.clientes = n; im.evaluado = true; cambio = true;
    if (n < 3) { S.mkt.pausaImpulsosHasta = sumaDias(hoy, 14); S.mkt.decisiones.push({ fecha: hoy, texto: "El impulso del " + fechaBonita(im.fecha) + " trajo solo " + n + " clientes registrados en caja. Pauso los anuncios 2 semanas (R17)." }); }
    else S.mkt.decisiones.push({ fecha: hoy, texto: "El impulso del " + fechaBonita(im.fecha) + " trajo " + n + " clientes registrados en caja (" + Math.round(im.monto * im.dias / Math.max(1, n)) + " pesos por cliente)." });
  }
  if (cambio) await guardarMkt();
}
function recomendacionesImpulso(){
  const hoy = hoyStr(), now = Date.now();
  if (S.mkt.pausaImpulsosHasta > hoy) return [];
  const mes = hoy.slice(0, 7), gasto = S.mkt.impulsos.filter(i => i.fecha.startsWith(mes)).reduce((a, i) => a + i.monto * i.dias, 0);
  const activos = S.mkt.impulsos.filter(i => sumaDias(i.fecha, i.dias) > hoy).length;
  if (gasto >= S.mkt.topeImpulsoMes || activos >= 2) return [];
  const umbral = [10, 11].includes(new Date().getMonth()) ? 2.5 : 2;   // R18
  const out = [];
  conDatos().forEach(p => {
    const t = dt(p).getTime();
    if (now - t > 48 * 3600000 || now - t < 12 * 3600000) return;
    if (S.mkt.impulsos.some(i => i.postId === p.id) || S.mkt.descartados.includes(p.id)) return;
    const c = clasificar(p); if (!c) return;
    const especial = esQuincena(p.fecha) || fechasActivas(p.fecha).length || promoActiva(p.fecha);
    if (c.r >= umbral || (c.r >= 1.5 && especial)) {
      const venta = !p.sinFoto && p.tipo !== "pregunta" && p.tipo !== "comunidad";
      out.push({ p, c, monto: c.r >= umbral ? 60 : 50, dias: 3, objetivo: venta ? "Mensajes de WhatsApp" : "Interacción" });
    }
  });
  return out.slice(0, 2 - activos);
}

/* ===================== Plan semanal por mezcla (R1–R3, R11) ===================== */
function repartir(fechas, n, off = 0){ const out = []; for (let i = 0; i < n; i++) out.push(fechas[(Math.floor(i * fechas.length / n) + off) % fechas.length]); return out; }
function slotEn(fecha, preferida, ocupado){
  for (let k = 0; k < 7; k++) {
    const dia = k ? sumaDias(fecha, k) : fecha;
    const n = S.posts.filter(p => p.fecha === dia && !p.formato && p.estado !== "omitida").length + (ocupado[dia] || 0);
    if (n >= 2) continue;                                  // R2: máximo 2 de feed al día
    const h = horaLibre(dia, preferida) || horaLibre(dia, "07:00");
    if (h) return { fecha: dia, hora: h };
  }
  return null;
}
function fotoDe(pref){ const l = S.fotos.filter(f => pref.includes(f.prod)); return l.length ? pick(l) : elegirFotos(1)[0]; }
function cierreTexto(){ return elegirFrase(S.banco.cierres).replace(/\{(\w+)\}/g, (m, k) => ({ nombre: S.cfg.nombre, direccion: S.cfg.direccion, whatsapp: S.cfg.whatsapp, horario: S.cfg.horario, ciudad: S.cfg.ciudad })[k] || m); }
function textoPregunta(fecha){
  const esp = fechasActivas(fecha), q = rellenar(elegirFrase(S.banco.preguntas), null);
  return q + (esp.length && Math.random() < 0.5 ? "\n\n" + rellenar(elegirFrase(pick(esp).frases), null) : "") + "\n\n🌽 " + S.cfg.nombre;
}
function textoComunidad(fecha, hora, f){
  const g = elegirFrase(S.banco.ganchos.filter(x => x.m === momento(hora) || x.m === "*").map(x => x.t));
  const cuerpo = elegirFrase((S.banco.productos.tienda && S.banco.productos.tienda.frases) || S.banco.cuerpos.general);
  return [g, cuerpo, elegirFrase(S.banco.preguntas), cierreTexto()].map(t => rellenar(t, f)).join("\n\n") + "\n\n" + S.cfg.hashtags + " #ComercioLocal";
}
function textoPromo(pr){
  return "🏷️ " + pr.nombre + "\n\n" + pr.descripcion + "\n\n👉 Di la palabra *" + pr.palabra + "* en caja." + "\n🗓️ Válido del " + fechaBonita(pr.desde) + " al " + fechaBonita(pr.hasta) + "." + "\n\n" + cierreTexto() + "\n\n" + S.cfg.hashtags;
}
async function escribirReelsIA(items){
  if (!iaLista() || !items.length) return;
  try {
    const r = await iaLlamar("Eres la community manager de " + S.cfg.nombre + " en " + S.cfg.ciudad + ". Prepara " + items.length + " Reels de Facebook (video vertical de 12 a 15 segundos hecho con fotos). Para cada uno te digo las fotos en orden.\n\n" +
      items.map((p, i) => "Reel " + i + ": " + p.fotoIds.map(fid => nombreFoto(fotoById(fid))).join(" → ")).join("\n") +
      "\n\nPara CADA Reel responde:\n- pantalla: un texto corto por foto (máx. 45 caracteres, con emoji); el primero debe enganchar en 2 segundos.\n- texto: la descripción para Facebook (2 a 4 líneas, menciona Macuspana, sin precios, sin pedir likes ni compartir).\n- guion: por si el dueño prefiere grabarlo él con video real: 3 a 5 tomas cortas con lo que se graba y lo que se dice.\n\nResponde SOLO JSON así:\n{\"reels\":[{\"pantalla\":[\"...\"],\"texto\":\"...\",\"guion\":\"1. ...\\n2. ...\"}]}", { json: true });
    (r.reels || []).forEach((x, i) => { const p = items[i]; if (!p || !x) return;
      if (Array.isArray(x.pantalla) && x.pantalla.length) p.pantalla = p.fotoIds.map((_, j) => String(x.pantalla[j] || x.pantalla[x.pantalla.length - 1]).slice(0, 60));
      if (x.texto) p.texto = String(x.texto).trim() + "\n\n📍 " + S.cfg.direccion + "\n📲 WhatsApp: " + S.cfg.whatsapp + "\n\n" + S.cfg.hashtags + " #Reels";
      if (x.guion) p.guion = String(x.guion);
      p.porIA = true; });
  } catch(e){ toast("La IA no pudo escribir los Reels (" + e.message + "). Los armé con tus frases.", 5000); }
}
async function armarSemana(desde){
  if (!S.fotos.length) { toast("Primero agrega fotos en Más → Fotos"); return; }
  S.armando = true; render();
  const dec = await revisarMotor(false);
  let cambioH = null; if (!dec || !dec.cambio) cambioH = await ajustarHorarios();   // R6: un cambio a la vez
  const fechas = Array.from({ length: 7 }, (_, i) => sumaDias(desde, i)), fin = fechas[6];
  const exist = S.posts.filter(p => p.fecha >= desde && p.fecha <= fin && p.estado !== "omitida");
  const nReels = Math.max(0, S.mkt.mezcla.reels - exist.filter(p => p.formato === "reel").length);
  const nFeed = Math.max(0, S.mkt.mezcla.feed - exist.filter(p => !p.formato).length);
  const horas = (S.cfg.horarios.length ? S.cfg.horarios : ["11:30"]).slice().sort();
  const horaReel = horas.find(h => h >= "14:00") || horas[horas.length - 1];
  const tipos = ["producto", "pregunta", "comunidad"];
  const promo = fechas.map(promoActiva).find(Boolean);
  if (promo) { tipos[0] = "promo"; if (fechas.some(esQuincena) && nFeed >= 4) tipos.push("promo"); }   // R3: 1 de 5 venta (2 en quincena)
  while (tipos.length < nFeed) tipos.push(["producto", "comunidad", "pregunta"][tipos.length % 3]);
  const nuevos = [], ocupado = {};
  repartir(fechas, nFeed, 1).forEach((fecha, i) => {
    const s = slotEn(fecha, horas[i % horas.length], ocupado); if (!s) return;
    ocupado[s.fecha] = (ocupado[s.fecha] || 0) + 1;
    const tipo = tipos[i], p = { id: uid(), fecha: s.fecha, hora: s.hora, estado: "pendiente", resultados: null, tipo };
    if (tipo === "pregunta") Object.assign(p, { sinFoto: true, fotoId: null, texto: textoPregunta(s.fecha) });
    else if (tipo === "comunidad") { const f = fotoDe(["tienda", "tortilla"]); Object.assign(p, { fotoId: f.id, texto: textoComunidad(s.fecha, s.hora, f) }); }
    else if (tipo === "promo") { const f = fotoDe([]); Object.assign(p, { fotoId: f.id, texto: textoPromo(promoActiva(s.fecha) || promo) }); }
    else { const f = elegirFotos(1)[0]; Object.assign(p, { fotoId: f.id, texto: componer(s.fecha, s.hora, f) }); }
    nuevos.push(p);
  });
  const reels = [];
  S.posts.push(...nuevos);   // para que los Reels no choquen de hora con las publicaciones nuevas
  repartir(fechas, nReels).forEach(fecha => {
    let dia = fecha, hora = null;
    for (let k = 0; k < 7 && !hora; k++) { dia = sumaDias(fecha, k); hora = horaLibre(dia, horaReel); }
    if (!hora) return;
    const fotos = fotosVariadas(Math.min(4, Math.max(2, S.fotos.length)));
    const p = { id: uid(), fecha: dia, hora, fotoId: fotos[0].id, estado: "pendiente", resultados: null, formato: "reel", tipo: "reel", fotoIds: fotos.map(f => f.id), pantalla: fotos.map(pantallaDe), guion: guionPlantilla(fotos) };
    p.texto = componer(dia, hora, fotos[0]); reels.push(p);
  });
  if (reels.length && iaLista()) { S.armandoMsg = "La IA está escribiendo tus Reels…"; render(); await escribirReelsIA(reels); }
  S.posts.push(...reels); S.posts.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  await guardarPosts(); await kvSet("usados", S.usados);
  S.armando = false; S.armandoMsg = "";
  S.ultimoArmado = { reels: reels.length, feed: nuevos.length, dec: dec ? dec.textos : [], horarios: cambioH ? cambioH.despues : null };
  toast(nuevos.length + reels.length ? "✅ Semana armada: " + reels.length + " Reels y " + nuevos.length + " publicaciones" : "Tu semana ya estaba completa según tu plan", 4500);
  render();
}

/* ===================== Hoy: agenda multicanal ===================== */
function hecho(id, fecha = hoyStr()){ return !!(S.hechos[fecha] && S.hechos[fecha][id]); }
async function marcarHecho(id, v = true, fecha = hoyStr()){
  S.hechos[fecha] = S.hechos[fecha] || {}; if (v) S.hechos[fecha][id] = true; else delete S.hechos[fecha][id];
  const lim = sumaDias(hoyStr(), -90); Object.keys(S.hechos).forEach(k => { if (k < lim) delete S.hechos[k]; });
  await kvSet("hechos", S.hechos);
}
const FESTIVOS = [["01-01", "Año Nuevo"], ["05-10", "Día de las Madres"], ["09-16", "Día de la Independencia"], ["11-02", "Día de Muertos"], ["12-12", "Día de la Virgen de Guadalupe"], ["12-24", "Nochebuena"], ["12-25", "Navidad"], ["12-31", "Fin de año"]];
function proximoFestivo(){
  const hoy = hoyStr(), y = Number(hoy.slice(0, 4)), lista = [];
  [y, y + 1].forEach(a => { FESTIVOS.forEach(([md, n]) => lista.push([a + "-" + md, n])); const p = pascua(a); const j = new Date(p); j.setDate(p.getDate() - 3); const v = new Date(p); v.setDate(p.getDate() - 2); lista.push([ymd(j), "Jueves Santo"], [ymd(v), "Viernes Santo"]); });
  return lista.filter(([f]) => f >= hoy).sort()[0] || null;
}
function agendaHoy(){
  const hoy = hoyStr(), d = new Date(), dow = d.getDay(), it = [];
  const deHoy = S.posts.filter(p => p.fecha === hoy && p.estado !== "omitida"), pend = deHoy.filter(p => p.estado === "pendiente" && p.fbEstado !== "programada"), solas = deHoy.filter(p => p.fbEstado === "programada").length;
  if (deHoy.length) it.push({ id: "fb", ico: "📘", t: "Publicaciones de Facebook", s: pend.length ? pend.length + " por subir" + (solas ? " · " + solas + " se publican solas" : "") : (solas ? "Facebook las publica solo ✅" : "Todas listas ✅"), auto: !pend.length, btn: pend.length ? ["Ver", "verPub"] : null });
  else it.push({ id: "plan", ico: "🗓️", t: "Arma tu semana", s: "Hoy no hay publicaciones programadas", btn: ["Armar", "#plan"] });
  it.push({ id: "estado1", ico: "🟢", t: "Estado de WhatsApp + historia (mañana)", s: "Ideal a las 7:00 · \"ya hay tortilla caliente\"", btn: ["Preparar", "estado1"] });
  it.push({ id: "estado2", ico: "🟢", t: "Estado de WhatsApp + historia (mediodía)", s: "Ideal a las 12:00 · producto o promo", btn: ["Preparar", "estado2"] });
  const extraQ = esQuincena(hoy) && (d.getDate() === 15 || d.getDate() === ultimoDiaMes(hoy));
  if (dow === S.mkt.diaDifusion || extraQ) it.push({ id: "difusion", ico: "📣", t: "Mensaje de difusión por WhatsApp", s: "Entre 7:00 y 11:00 · " + difusionesMes() + " de " + S.mkt.topeDifusion + " este mes", btn: ["Preparar", "difusion"] });
  if (dow === S.mkt.diaGoogle) it.push({ id: "google", ico: "📍", t: "Publicación en tu perfil de Google", s: "Novedad u oferta con foto (sin teléfono en el texto)", btn: ["Preparar", "google"] });
  if (dow === S.mkt.diaGoogle && d.getDate() <= 7) it.push({ id: "gfotos", ico: "📸", t: "Sube 2 a 4 fotos nuevas a Google", s: "Fotos reales del local, productos y equipo", btn: ["Cómo", "#canales-google"] });
  if (S.mkt.diasGrupos.includes(dow)) it.push({ id: "grupos", ico: "👥", t: "Comparte en grupos de Macuspana", s: S.mkt.grupos.length ? "Hasta 3 grupos, texto distinto en cada uno" : "Primero agrega tus grupos", btn: ["Preparar", "grupos"] });
  it.push({ id: "responder", ico: "💭", t: "Responde comentarios y mensajes", s: "Meta: en menos de 1 hora, de 6:00 a 18:30", btn: ["Ayuda", "#canales-respuestas"] });
  if (dow === 6) it.push({ id: "resenas", ico: "⭐", t: "Pide reseñas en Google a 3 clientes", s: "A todos por igual, sin regalar nada a cambio", btn: ["Cómo", "#canales-google"] });
  if (dow === 3) it.push({ id: "video", ico: "🎥", t: "Graba un video real corto", s: "La tortilla saliendo de la máquina: Facebook premia lo grabado por ti", btn: ["Ideas", "video"] });
  if (recomendacionesImpulso().length) it.push({ id: "impulso", ico: "💰", t: "Una publicación está funcionando muy bien", s: "Vale la pena impulsarla con poco dinero", btn: ["Ver", "#canales-anuncios"] });
  if (dow === 1 && S.mkt.reporteVisto !== hoy) it.push({ id: "reporte", ico: "📊", t: "Lee tu reporte de la semana", s: "Qué funcionó y qué hará la app esta semana", btn: ["Leer", "#resultados-resumen"] });
  const fest = proximoFestivo();
  if (fest && fest[0] <= sumaDias(hoy, 3)) it.push({ id: "festivo-" + fest[0], ico: "🗓️", t: "Revisa tu horario para " + fest[1], s: "En Google y Facebook (" + fechaBonita(fest[0]) + ")", btn: null });
  const tareasPend = (S.tareas || []).filter(t => t.semana >= lunesDe(new Date()) && progresoTarea(t).hechas < progresoTarea(t).total);
  if (tareasPend.length) it.push({ id: "tareasfb", ico: "📋", t: "Tareas de Facebook pendientes: " + tareasPend.length, s: "Las tienes en Plan", btn: ["Ver", "#plan"], auto: false });
  return it;
}
function vAgenda(){
  const it = agendaHoy(), ok = x => x.auto || hecho(x.id), n = it.filter(ok).length;
  let h = '<div class="card"><h2>✅ Tu día de marketing</h2><div class="barra"><div style="width:' + Math.round(n / Math.max(1, it.length) * 100) + '%"></div></div><p class="muted small" style="margin-top:4px">' + n + ' de ' + it.length + ' hechas</p>';
  it.forEach(x => {
    const listo = ok(x);
    h += '<div class="agenda' + (listo ? " lista" : "") + '"><button class="chk" data-chk="' + esc(x.id) + '"' + (x.auto !== undefined && x.auto !== false || x.id === "tareasfb" ? " disabled" : "") + '>' + (listo ? "✔" : "") + '</button><div class="bd"><b>' + x.ico + " " + esc(x.t) + '</b><div class="muted small">' + esc(x.s) + '</div></div>' + (x.btn && !listo ? '<button class="mini" data-go="' + esc(x.btn[1]) + '">' + esc(x.btn[0]) + '</button>' : "") + '</div>';
  });
  return h + '</div>';
}

/* ===================== Contador de caja (R38) ===================== */
function cajaDia(f = hoyStr()){ return S.caja[f] || {}; }
function cajaRango(desde, hasta){ const t = {}; Object.entries(S.caja).forEach(([f, c]) => { if (f >= desde && f <= hasta) Object.entries(c).forEach(([k, v]) => t[k] = (t[k] || 0) + v); }); return t; }
function vCajaMini(){
  const c = cajaDia(), pr = promoActiva();
  let h = '<div class="card"><h3>🧾 ¿Cómo llegó este cliente?</h3><p class="muted small">Pregúntalo en caja y toca un botón. Así la app sabe qué canal trae clientes de verdad, no solo "me gusta".</p>' + (pr ? '<p class="small">🏷️ Promo activa: <b>' + esc(pr.nombre) + '</b> · palabra clave <b>' + esc(pr.palabra) + '</b></p>' : "") + '<div class="caja">';
  CANALES_CAJA.forEach(([k, l]) => h += '<button data-caja="' + k + '">' + l + '<b>' + (c[k] || 0) + '</b></button>');
  return h + '</div>' + (S.cajaUlt ? '<button class="btn borde" id="btnCajaUndo" style="padding:8px">↩️ Deshacer el último (' + esc((CANALES_CAJA.find(x => x[0] === S.cajaUlt) || ["", ""])[1]) + ')</button>' : "") + '</div>';
}
async function sumarCaja(k, delta = 1){
  const f = hoyStr(); S.caja[f] = S.caja[f] || {}; S.caja[f][k] = Math.max(0, (S.caja[f][k] || 0) + delta);
  const lim = sumaDias(f, -400); Object.keys(S.caja).forEach(x => { if (x < lim) delete S.caja[x]; });
  S.cajaUlt = delta > 0 ? k : null; await kvSet("caja", S.caja);
  if (delta > 0) toast("+1 " + (CANALES_CAJA.find(x => x[0] === k) || ["", ""])[1], 1200);
  render();
}

/* ===================== Estados de WhatsApp / historias ===================== */
function fotoEstado(cual){
  const pr = promoActiva();
  if (cual === 1) { const l = S.fotos.filter(f => f.prod === "tortilla"); return l.length ? pick(l) : pick(S.fotos); }
  const l = S.fotos.filter(f => f.prod !== "tortilla" && !(S.mkt.retirados[f.prod] > hoyStr()));
  return pr || !l.length ? pick(S.fotos) : pick(l);
}
function textoEstado(cual, f){
  const pr = promoActiva();
  if (cual === 1) return pick(["🔥 ¡Ya hay tortilla caliente!", "☀️ ¡Buenos días! Ya abrimos", "🌽 Tortillas recién hechas", "🫓 Calientitas desde temprano"]);
  if (pr) return "🏷️ " + pr.nombre + " · di " + pr.palabra;
  return pantallaDe(f);
}
async function abrirEstado(cual){
  if (!S.fotos.length) { toast("Primero agrega fotos en Más → Fotos"); return; }
  let f = fotoEstado(cual), texto = textoEstado(cual, f), media = null;
  const m = modal('<h3 style="margin-top:0">🟢 Estado de WhatsApp + historia de Facebook</h3><div id="estPrev" class="muted small">Creando imagen…</div><label>Texto en la imagen</label><input id="estTxt"><div class="row"><button class="btn borde" data-x="otra">🔄 Otra foto</button><button class="btn borde" data-x="re">Aplicar texto</button></div><button class="btn verde" data-x="comp">Compartir imagen</button><p class="muted small">En el menú de compartir elige <b>WhatsApp → Mi estado</b>. Luego vuelve a compartir y elige <b>Facebook → Historia</b>. La misma imagen sirve para los dos.</p><button class="btn" data-x="ok">✔ Hecho</button><button class="btn borde" data-x="c">Cerrar</button>');
  const pinta = async () => { m.querySelector("#estTxt").value = texto; media = { blob: await crearImagenHistoria({ fotoId: f.id, pantalla: [texto] }), tipo: "img" }; m.querySelector("#estPrev").innerHTML = '<img src="' + URL.createObjectURL(media.blob) + '" style="width:100%;max-height:50vh;object-fit:contain;border-radius:12px;background:#000">'; };
  m.querySelector('[data-x="otra"]').onclick = () => { f = fotoEstado(cual); texto = textoEstado(cual, f); pinta(); };
  m.querySelector('[data-x="re"]').onclick = () => { texto = m.querySelector("#estTxt").value.trim() || texto; pinta(); };
  m.querySelector('[data-x="comp"]').onclick = () => compartirMedia(media, "historia");
  m.querySelector('[data-x="ok"]').onclick = async () => { await marcarHecho("estado" + cual); m.remove(); render(); };
  m.querySelector('[data-x="c"]').onclick = () => m.remove();
  pinta();
}

/* ===================== Difusión por WhatsApp (R23–R26) ===================== */
function difusionesMes(){ return S.mkt.difusiones[hoyStr().slice(0, 7)] || 0; }
function textoDifusion(){
  const pr = promoActiva(), hoy = hoyStr(), f = elegirFotos(1)[0], prod = prodDe(f);
  let cuerpo;
  if (pr) cuerpo = "🏷️ *" + pr.nombre + "*\n" + pr.descripcion + "\n👉 Di la palabra *" + pr.palabra + "* en caja.";
  else if (esQuincena(hoy)) cuerpo = rellenar(elegirFrase((S.banco.fechas.find(x => x.id === "quincena") || { frases: ["💰 ¡Llegó la quincena!"] }).frases), f) + "\n" + rellenar(elegirFrase(prod && prod.frases && prod.frases.length ? prod.frases : S.banco.cuerpos.general), f);
  else cuerpo = rellenar(elegirFrase(prod && prod.ganchos && prod.ganchos.length ? prod.ganchos : ["🌽 Esto tenemos para ti esta semana:"]), f) + "\n" + rellenar(elegirFrase(prod && prod.frases && prod.frases.length ? prod.frases : S.banco.cuerpos.general), f);
  return "¡Hola! 👋 Te saluda *" + S.cfg.nombre + "*.\n\n" + cuerpo + "\n\n📍 " + S.cfg.direccion + "\n🕕 Abrimos " + S.cfg.horario + "\n📲 Contesta este mensaje y te tenemos tu pedido listo.\n\n💾 Guarda este número para seguir recibiendo nuestros avisos.";
}
function abrirDifusion(){
  const n = difusionesMes(), tope = S.mkt.topeDifusion;
  const m = modal('<h3 style="margin-top:0">📣 Mensaje de difusión</h3><p class="muted small">Llevas <b>' + n + ' de ' + tope + '</b> este mes. Recomendado: 1 por semana (2 en quincena), entre 7:00 y 11:00. Solo les llega a quienes guardaron tu número.</p>' + (n >= tope ? '<div class="aviso err">Ya llegaste al tope del mes. Mejor espera al próximo para no gastar ni molestar.</div>' : "") + '<textarea id="difTxt" style="min-height:230px"></textarea><div class="row"><button class="btn borde" data-x="otro">🔄 Otro texto</button>' + (iaLista() ? '<button class="btn borde" data-x="ia">✨ Con IA</button>' : "") + '</div><button class="btn verde" data-x="cop">Copiar mensaje</button><p class="muted small">En <b>WhatsApp Business</b>: Chats → <b>Nueva difusión</b> (o ⋯ → Difusiones) → elige tu lista → pega y envía. Cada lista admite hasta 256 contactos.</p><button class="btn" data-x="ok">✔ Ya la envié</button><button class="btn borde" data-x="c">Cerrar</button>');
  const ta = m.querySelector("#difTxt"); ta.value = textoDifusion();
  m.querySelector('[data-x="otro"]').onclick = () => ta.value = textoDifusion();
  const bIA = m.querySelector('[data-x="ia"]');
  bIA && (bIA.onclick = async () => { bIA.disabled = true; bIA.textContent = "Escribiendo…"; try { ta.value = await iaLlamar("Escribe un mensaje de difusión de WhatsApp para los clientes de " + S.cfg.nombre + " en " + S.cfg.ciudad + ". Hoy es " + fechaBonita(hoyStr()) + (esQuincena(hoyStr()) ? " (quincena)" : "") + ". " + (promoActiva() ? "Promo activa: " + promoActiva().nombre + ": " + promoActiva().descripcion + ". Palabra clave en caja: " + promoActiva().palabra + "." : "No hay promo: ofrece algo útil (producto de temporada, recordatorio).") + "\nReglas: corto (máx. 8 líneas), cálido, de barrio, con 2-4 emojis, usa *negritas* de WhatsApp, sin inventar precios. Incluye: 📍 " + S.cfg.direccion + ", 🕕 abrimos " + S.cfg.horario + ", que contesten el mensaje para pedir, y al final: \"💾 Guarda este número para seguir recibiendo nuestros avisos.\" Responde solo el mensaje."); } catch(e){ toast(e.message, 5000); } bIA.disabled = false; bIA.textContent = "✨ Con IA"; });
  m.querySelector('[data-x="cop"]').onclick = () => copiar(ta.value);
  m.querySelector('[data-x="ok"]').onclick = async () => { const k = hoyStr().slice(0, 7); S.mkt.difusiones[k] = (S.mkt.difusiones[k] || 0) + 1; await guardarMkt(); await marcarHecho("difusion"); m.remove(); render(); };
  m.querySelector('[data-x="c"]').onclick = () => m.remove();
}

/* ===================== Google (R28–R32) ===================== */
function textoGoogle(f){
  const pr = promoActiva(), prod = prodDe(f);
  const limpia = t => t.replace(/📲[^\n]*/g, "").replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, "").replace(/@\w+/g, "").replace(/#\w+/g, "").trim();
  const cuerpo = pr ? pr.nombre + ". " + pr.descripcion + " Di la palabra " + pr.palabra + " en caja." : limpia(rellenar(elegirFrase(prod && prod.frases && prod.frases.length ? prod.frases : S.banco.cuerpos.general), f));
  const g = pr ? "🏷️ ¡Promoción de la semana en " + S.cfg.nombre + "!" : limpia(rellenar(elegirFrase(prod && prod.ganchos && prod.ganchos.length ? prod.ganchos : ["🌽 Lo de todos los días, en un solo lugar."]), f));
  return g + "\n\n" + cuerpo + "\n\nTe esperamos en " + S.cfg.direccion + ", " + S.cfg.ciudad + ". Abrimos " + S.cfg.horario + ".";
}
function abrirGoogle(){
  if (!S.fotos.length) { toast("Primero agrega fotos"); return; }
  let f = elegirFotos(1)[0];
  const m = modal('<h3 style="margin-top:0">📍 Publicación de la semana en Google</h3><img id="gImg" style="width:100%;border-radius:12px;max-height:40vh;object-fit:cover"><textarea id="gTxt" style="min-height:160px;margin-top:8px"></textarea><p class="muted small">Sin teléfonos ni @ en el texto: Google puede quitar la publicación. Para que te llamen o escriban, elige el <b>botón</b> "Llamar" o "Pedir" al publicar.</p><div class="row"><button class="btn borde" data-x="otro">🔄 Otra</button><button class="btn claro" data-x="foto">Compartir foto</button></div><button class="btn verde" data-x="cop">Copiar texto</button><a class="btn" href="https://business.google.com/" target="_blank" rel="noopener">Abrir mi perfil de Google</a><p class="muted small">También desde la app de <b>Google Maps</b> → tu foto → <b>Tu perfil de negocio</b> → <b>Agregar novedad</b>.</p><button class="btn" data-x="ok">✔ Ya la publiqué</button><button class="btn borde" data-x="c">Cerrar</button>');
  const pinta = () => { m.querySelector("#gImg").src = urlFoto(f); m.querySelector("#gTxt").value = textoGoogle(f); };
  m.querySelector('[data-x="otro"]').onclick = () => { f = elegirFotos(1)[0]; pinta(); };
  m.querySelector('[data-x="foto"]').onclick = () => compartirFoto({ fotoId: f.id });
  m.querySelector('[data-x="cop"]').onclick = () => copiar(m.querySelector("#gTxt").value);
  m.querySelector('[data-x="ok"]').onclick = async () => { await marcarHecho("google"); m.remove(); render(); };
  m.querySelector('[data-x="c"]').onclick = () => m.remove();
  pinta();
}

/* ===================== Grupos (R33, R34) ===================== */
function gruposDisponibles(){ const hoy = hoyStr(); return S.mkt.grupos.filter(g => !(g.excluidoHasta > hoy) && !(g.ult && sumaDias(g.ult, 7) > hoy)); }
function abrirGrupos(){
  if (!S.mkt.grupos.length) { location.hash = "#canales-grupos"; toast("Agrega primero los grupos donde publicas"); return; }
  const lista = gruposDisponibles().slice(0, 3);
  if (!lista.length) { toast("Ya publicaste esta semana en todos tus grupos 👍"); marcarHecho("grupos").then(render); return; }
  const piezas = lista.map(g => { const f = elegirFotos(1)[0]; return { g, f, texto: componer(hoyStr(), ahoraHM(), f).replace(/#\w+/g, "").trim() }; });
  const m = modal('<h3 style="margin-top:0">👥 Grupos de hoy</h3><p class="muted small">Un texto y una foto distintos para cada grupo. Respeta las reglas de cada grupo y no pongas enlaces.</p>' + piezas.map((x, i) => '<div class="card" style="margin-bottom:10px"><b>' + esc(x.g.nombre) + '</b><img src="' + urlFoto(x.f) + '" style="width:100%;border-radius:10px;max-height:28vh;object-fit:cover;margin-top:6px"><div class="small" style="white-space:pre-wrap;margin-top:6px">' + esc(x.texto) + '</div><div class="row"><button class="btn claro" data-cp="' + i + '">Copiar texto</button><button class="btn claro" data-ft="' + i + '">Compartir foto</button></div><div class="row"><button class="btn verde" data-ok="' + i + '">✔ Publicado</button><button class="btn rojo" data-no="' + i + '">Me lo borraron</button></div></div>').join("") + '<button class="btn borde" data-x="c">Cerrar</button>');
  m.querySelectorAll("[data-cp]").forEach(b => b.onclick = () => copiar(piezas[b.dataset.cp].texto));
  m.querySelectorAll("[data-ft]").forEach(b => b.onclick = () => compartirFoto({ fotoId: piezas[b.dataset.ft].f.id }));
  m.querySelectorAll("[data-ok]").forEach(b => b.onclick = async () => { piezas[b.dataset.ok].g.ult = hoyStr(); await guardarMkt(); b.closest(".card").style.opacity = .5; b.disabled = true; if (!gruposDisponibles().length || piezas.every(x => x.g.ult === hoyStr())) await marcarHecho("grupos"); });
  m.querySelectorAll("[data-no]").forEach(b => b.onclick = async () => { piezas[b.dataset.no].g.excluidoHasta = sumaDias(hoyStr(), 30); await guardarMkt(); toast("Ese grupo descansa 30 días"); b.closest(".card").style.opacity = .4; });
  m.querySelector('[data-x="c"]').onclick = () => { m.remove(); render(); };
}

/* ===================== Video real (sugerencia semanal) ===================== */
function abrirIdeaVideo(){
  const ideas = ["La máquina sacando tortillas, de cerca, con el vapor (5 s) → alguien llevándose su kilo (3 s) → tu letrero (2 s).", "Tus manos contando tortillas calientitas y envolviéndolas en papel (8 s). Texto en pantalla: \"Así salen cada mañana\".", "La fila de la mañana o el mostrador lleno (5 s) → \"Gracias, Macuspana\" escrito en pantalla.", "Un taco armado con tortilla recién salida: sal, salsa y listo (10 s).", "El maíz en costal → la masa → la tortilla (3 tomas de 3 s): \"De aquí sale tu tortilla\"."];
  const m = modal('<h3 style="margin-top:0">🎥 Idea de video real</h3><p class="small">' + esc(pick(ideas)) + '</p><ul class="small"><li>Graba <b>vertical</b>, con buena luz, de 7 a 30 segundos.</li><li>Lo más llamativo en los primeros 2 segundos, sin logotipo al inicio.</li><li>Súbelo el <b>mismo día</b> como Reel desde la app de Facebook y usa música de la biblioteca de Facebook.</li><li>No uses videos de otras cuentas ni con marca de agua de otras apps.</li></ul><button class="btn" data-x="ok">✔ Lo grabé</button><button class="btn borde" data-x="c">Cerrar</button>');
  m.querySelector('[data-x="ok"]').onclick = async () => { await marcarHecho("video"); m.remove(); render(); };
  m.querySelector('[data-x="c"]').onclick = () => m.remove();
}

/* ===================== Vista y eventos de Hoy ===================== */
function vHoyNuevo(){
  let h = "";
  if (!S.fotos.length) h += '<div class="aviso">👋 ¡Bienvenido! Empieza en <b>Más → Fotos</b> agregando fotos de tus productos. Luego ve a <b>Plan</b> y toca "Armar mi semana".</div>';
  if (S.renovando) h += '<div class="aviso">✨ Renovando tus frases de este mes con IA… ' + esc(S.iaMsg || "") + '<br><span class="small">Puedes seguir usando la app.</span></div>';
  h += vAgenda();
  h += '<div id="pubHoy"></div>' + vHoy().replace(/<div class="aviso">👋[\s\S]*?<\/div>/, "");
  h += vCajaMini();
  return h;
}
function bindHoyNuevo(){
  const acciones = { verPub: () => document.getElementById("pubHoy").scrollIntoView({ behavior: "smooth" }), estado1: () => abrirEstado(1), estado2: () => abrirEstado(2), difusion: abrirDifusion, google: abrirGoogle, grupos: abrirGrupos, video: abrirIdeaVideo };
  $app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { const g = b.dataset.go; if (g.startsWith("#")) location.hash = g; else if (acciones[g]) acciones[g](); });
  $app.querySelectorAll("[data-chk]").forEach(b => b.onclick = async () => { const id = b.dataset.chk; await marcarHecho(id, !hecho(id)); render(); });
  bindCaja();
}
function bindCaja(){
  $app.querySelectorAll("[data-caja]").forEach(b => b.onclick = () => sumarCaja(b.dataset.caja, 1));
  const u = document.getElementById("btnCajaUndo"); u && (u.onclick = () => sumarCaja(S.cajaUlt, -1));
}

/* ===================== Renovación mensual automática ===================== */
async function renovarSiToca(){
  const mes = hoyStr().slice(0, 7);
  if (!iaLista() || S.iaOcupada || S.mkt.ultimoIntento === hoyStr()) return;
  const hist = (await kvGet("paquetes")) || [];
  if (hist.some(x => (x.fecha || "").startsWith(mes) && x.nuevas > 0)) return;
  S.mkt.ultimoIntento = hoyStr(); await guardarMkt();
  S.renovando = true; S.iaOcupada = true; render();
  try { const n = await paqueteMesIA(mes, 5); toast("✨ Frases del mes renovadas: " + n + " nuevas", 5000); }
  catch(e){ toast("No se pudieron renovar las frases hoy (" + e.message + "). Lo intento mañana.", 6000); }
  S.renovando = false; S.iaOcupada = false; S.iaMsg = ""; render();
}

/* ===================== Reporte semanal (R37, R38) ===================== */
function datosSemana(lunes){
  const dom = sumaDias(lunes, 6), ps = S.posts.filter(p => p.fecha >= lunes && p.fecha <= dom), pub = ps.filter(p => p.estado === "publicada"), con = pub.filter(p => p.resultados && typeof p.resultados.alcance === "number");
  const caja = cajaRango(lunes, dom), clientes = Object.values(caja).reduce((a, v) => a + v, 0);
  const gasto = S.mkt.impulsos.filter(i => i.fecha >= lunes && i.fecha <= dom).reduce((a, i) => a + i.monto * i.dias, 0);
  return { lunes, publicadas: pub.length, conDatos: con.length, personas: con.reduce((a, p) => a + p.resultados.alcance, 0), inter: con.reduce((a, p) => a + interacciones(p.resultados), 0), mensajes: con.reduce((a, p) => a + (p.resultados.mensajes || 0), 0), caja, clientes, gasto, mejor: con.slice().sort((a, b) => b.resultados.alcance - a.resultados.alcance)[0] || null };
}
function flecha(v, base){ if (!base) return ""; const d = Math.round((v - base) / base * 100); return d === 0 ? ' <span class="muted small">(igual)</span>' : ' <span class="small" style="color:' + (d > 0 ? "var(--verde)" : "var(--rojo)") + '">' + (d > 0 ? "▲ +" : "▼ ") + d + '%</span>'; }
function vReporte(){
  const lunes = sumaDias(lunesDe(new Date()), -7), a = datosSemana(lunes), prev = [1, 2, 3, 4].map(k => datosSemana(sumaDias(lunes, -7 * k)));
  const med = k => mediana(prev.map(x => x[k]));
  if (new Date().getDay() === 1 && S.mkt.reporteVisto !== hoyStr()) { S.mkt.reporteVisto = hoyStr(); guardarMkt(); }
  let h = '<div class="card"><h2>📊 Reporte de la semana pasada</h2><p class="muted small">Del ' + esc(fechaBonita(lunes)) + ' al ' + esc(fechaBonita(sumaDias(lunes, 6))) + ', comparado con tu mediana de las 4 semanas anteriores.</p>';
  h += '<div class="kpis"><div><b>' + a.publicadas + '</b><span>publicadas' + flecha(a.publicadas, med("publicadas")) + '</span></div><div><b>' + a.personas + '</b><span>personas las vieron' + flecha(a.personas, med("personas")) + '</span></div><div><b>' + a.inter + '</b><span>interacciones' + flecha(a.inter, med("inter")) + '</span></div><div><b>' + a.clientes + '</b><span>clientes registrados en caja' + flecha(a.clientes, med("clientes")) + '</span></div></div>';
  if (a.conDatos < a.publicadas) h += '<p class="small">⚠️ ' + (a.publicadas - a.conDatos) + ' publicaciones no tienen resultados. ' + (S.fb ? "Toca \"Traer resultados\" en Más → Conexiones." : "Súbelos con una captura en Resultados → Leer captura.") + '</p>';
  if (a.clientes) h += '<p class="small"><b>Por dónde llegaron:</b> ' + CANALES_CAJA.filter(([k]) => a.caja[k]).map(([k, l]) => l + " " + a.caja[k]).join(" · ") + '</p>';
  if (a.gasto) h += '<p class="small">💰 Gastaste <b>$' + a.gasto + '</b> en anuncios' + ((a.caja.facebook || 0) + (a.caja.promo || 0) ? ' · unos <b>$' + Math.round(a.gasto / ((a.caja.facebook || 0) + (a.caja.promo || 0))) + '</b> por cliente de Facebook/promo' : "") + '.</p>';
  if (a.mejor) { const f = fotoById(a.mejor.fotoId); h += '<p class="small">🏆 <b>La mejor:</b> ' + esc((a.mejor.texto || "").split("\n")[0].slice(0, 70)) + ' (' + a.mejor.resultados.alcance + ' personas' + (f ? ", " + esc(nombreFoto(f)) : "") + ').</p>'; }
  const c4 = cajaRango(sumaDias(hoyStr(), -28), hoyStr()), top = Object.entries(c4).sort((x, y) => y[1] - x[1])[0];
  if (top && top[1] >= 30) h += '<p class="small">🧭 En 4 semanas, el canal que más clientes trae es <b>' + esc((CANALES_CAJA.find(x => x[0] === top[0]) || ["", top[0]])[1]) + '</b> (' + top[1] + ' clientes). Dale prioridad a sus tareas de Hoy.</p>';
  else h += '<p class="muted small">Con 30 clientes registrados por canal la app podrá decirte cuál te conviene más (llevas ' + (top ? top[1] : 0) + ' en el canal principal).</p>';
  h += '<p class="small"><b>Esta semana:</b> ' + S.mkt.mezcla.reels + ' Reels, ' + S.mkt.mezcla.feed + ' publicaciones, 2 estados diarios, 1 difusión' + (S.mkt.grupos.length ? ", grupos 2 días" : "") + ' y 1 publicación en Google.</p>';
  if (iaLista()) h += '<button class="btn claro" id="btnRepIA"' + (S.iaOcupada ? " disabled" : "") + '>' + (S.repIA === "…" ? "✨ Pensando…" : "✨ Explícamelo con IA") + '</button>' + (S.repIA && S.repIA !== "…" ? '<div class="aviso" style="margin-top:8px;white-space:pre-wrap">' + esc(S.repIA) + '</div>' : "");
  return h + '</div>';
}
function vMotor(){
  const hoy = hoyStr(), ret = Object.entries(S.mkt.retirados).filter(([, v]) => v > hoy);
  let h = '<div class="card"><h2>🧠 Lo que decidió la app</h2><p class="small">Plan actual: <b>' + S.mkt.mezcla.reels + ' Reels</b> y <b>' + S.mkt.mezcla.feed + ' publicaciones</b> por semana. Se revisa cada 4 semanas y solo cambia una cosa a la vez.' + (S.mkt.ultimaRevision ? " Última revisión: " + esc(fechaBonita(S.mkt.ultimaRevision)) + "." : "") + '</p>';
  if (ret.length) h += '<p class="small">💤 Descansando: ' + ret.map(([k, v]) => esc((S.banco.productos[k] || {}).nombre || k) + " (hasta " + esc(fechaBonita(v)) + ")").join(", ") + '.</p>';
  if (S.mkt.pausaImpulsosHasta > hoy) h += '<p class="small">⏸️ Anuncios en pausa hasta el ' + esc(fechaBonita(S.mkt.pausaImpulsosHasta)) + '.</p>';
  const dec = S.mkt.decisiones.slice(-6).reverse();
  h += dec.length ? dec.map(d => '<div class="frase"><span><b>' + esc(fechaBonita(d.fecha)) + ':</b> ' + esc(d.texto) + '</span></div>').join("") : '<p class="muted small">Todavía no hay decisiones: la primera revisión ocurre al armar tu semana.</p>';
  h += '<details style="margin-top:8px"><summary class="small" style="font-weight:700;cursor:pointer">Cambiar el plan a mano</summary><div class="row"><div><label>Reels por semana</label><select id="mzR">' + [3, 4, 5, 6, 7].map(n => '<option' + (n === S.mkt.mezcla.reels ? " selected" : "") + '>' + n + '</option>').join("") + '</select></div><div><label>Publicaciones</label><select id="mzF">' + [2, 3, 4, 5].map(n => '<option' + (n === S.mkt.mezcla.feed ? " selected" : "") + '>' + n + '</option>').join("") + '</select></div></div><button class="btn claro" id="btnMz">Guardar plan</button><button class="btn borde" id="btnMotor">Revisar ahora</button></details>';
  return h + '</div>';
}

/* ===================== Resultados por captura de pantalla ===================== */
const PROMPT_CAPTURA = "Estas capturas son de las estadísticas de publicaciones de una página de Facebook (Meta Business Suite, Panel profesional o la publicación). Desde junio de 2026 Meta usa \"Espectadores\" (antes alcance/personas alcanzadas) y \"Visualizaciones\" (antes impresiones).\nExtrae CADA publicación visible con: fecha (YYYY-MM-DD si se puede deducir, si no el texto tal cual), texto (las primeras palabras de la publicación, máx. 80 caracteres), tipo (\"reel\", \"foto\" o \"texto\"), espectadores, visualizaciones, reacciones, comentarios, compartidos. Usa null si un dato no aparece. No inventes números.\nResponde SOLO JSON así: {\"publicaciones\":[{\"fecha\":\"...\",\"texto\":\"...\",\"tipo\":\"foto\",\"espectadores\":0,\"visualizaciones\":0,\"reacciones\":0,\"comentarios\":0,\"compartidos\":0}]}";
function numero(v){ if (v == null || v === "") return null; if (typeof v === "number") return v; const s = String(v).toLowerCase().replace(/,/g, "").trim(); const n = parseFloat(s); if (isNaN(n)) return null; return Math.round(/k|mil/.test(s) ? n * 1000 : /m/.test(s) ? n * 1e6 : n); }
function aplicarNumeros(p, x){
  const r = Object.assign({}, p.resultados || {}), esp = numero(x.espectadores), vis = numero(x.visualizaciones);
  if (esp != null) r.alcance = esp; else if (vis != null && r.alcance == null) r.alcance = vis;
  if (vis != null) r.vistas = vis;
  ["reacciones", "comentarios", "compartidos"].forEach(k => { const n = numero(x[k]); if (n != null) r[k] = n; });
  p.resultados = r; p.resultadosCaptura = new Date().toISOString();
}
function emparejar(x){
  const cand = S.posts.filter(p => p.estado === "publicada" || p.fbEstado);
  let mejor = null, ms = 0;
  cand.forEach(p => { let sc = sim(x.texto, (p.texto || "").slice(0, 120)); if (x.fecha && /^\d{4}-\d{2}-\d{2}$/.test(x.fecha)) sc += p.fecha === x.fecha ? 0.4 : (Math.abs(parseYmd(p.fecha) - parseYmd(x.fecha)) <= 86400000 ? 0.15 : -0.2); if (x.tipo === "reel" && p.formato === "reel") sc += 0.1; if (sc > ms) { ms = sc; mejor = p; } });
  return ms >= 0.35 ? mejor : null;
}
async function leerCapturas(files){
  if (!iaLista()) { toast("Conecta una IA en Más → Conexiones para leer capturas"); return; }
  S.capOcupada = true; S.capFilas = null; render();
  try {
    const imgs = []; for (const f of files.slice(0, 3)) imgs.push(await comprimir(f));
    const r = await iaLlamar(PROMPT_CAPTURA, { images: imgs, json: true });
    S.capFilas = (r.publicaciones || []).map(x => ({ x, pid: (emparejar(x) || {}).id || "" }));
    if (!S.capFilas.length) toast("No encontré publicaciones con números en la captura. Prueba con otra.", 5000);
  } catch(e){ toast(e.message, 6000); }
  S.capOcupada = false; render();
}
async function leerCapturaDe(pid){
  if (!iaLista()) { toast("Conecta una IA en Más → Conexiones"); return; }
  elegirArchivo("image/*", false, async files => {
    if (!files.length) return; toast("📷 La IA está leyendo la captura…", 3000);
    try {
      const r = await iaLlamar(PROMPT_CAPTURA + "\nSi hay varias publicaciones, devuelve solo la principal.", { images: [await comprimir(files[0])], json: true });
      const x = (r.publicaciones || [])[0]; if (!x) throw new Error("No encontré números en la captura.");
      const p = S.posts.find(y => y.id === pid); aplicarNumeros(p, x); await guardarPosts();
      toast("📊 Resultados leídos: " + (p.resultados.alcance ?? "?") + " personas", 4000); render(); pintarModal();
    } catch(e){ toast(e.message, 6000); }
  });
}
function vCaptura(){
  let h = '<div class="card"><h2>📷 Leer resultados de una captura</h2><p class="muted small">En Meta Business Suite (o en el Panel profesional) abre la lista de publicaciones con sus números, toma 1 a 3 capturas y súbelas. La IA lee espectadores, reacciones, comentarios y compartidos, y los pone en cada publicación. Así el motor decide con datos reales.' + (S.fb ? " Como ya tienes Facebook conectado, los resultados de lo que programó la app llegan solos; esto sirve para lo que subiste a mano." : "") + '</p>';
  h += S.capOcupada ? '<button class="btn" disabled>⏳ Leyendo…</button>' : '<button class="btn verde" id="btnCap"' + (iaLista() ? "" : " disabled") + '>📷 Subir capturas</button>';
  if (!iaLista()) h += '<p class="small">Necesitas una IA conectada (Más → Conexiones). Sin IA, escribe los números en cada publicación (botón "¿Cómo le fue?").</p>';
  h += '</div>';
  if (S.capFilas && S.capFilas.length) {
    const opts = S.posts.filter(p => p.estado === "publicada" || p.fbEstado).slice(-40).reverse();
    h += '<div class="card"><h3>Revisa y guarda</h3><p class="muted small">Revisa que cada fila esté unida a la publicación correcta.</p>';
    S.capFilas.forEach((c, i) => {
      h += '<div style="border-top:1px solid var(--linea);padding:8px 0"><div class="small"><b>' + esc(c.x.fecha || "") + '</b> · ' + esc((c.x.texto || "").slice(0, 70)) + '</div><div class="small muted">👁 ' + (c.x.espectadores ?? "–") + ' espectadores · ' + (c.x.visualizaciones ?? "–") + ' visualizaciones · 👍 ' + (c.x.reacciones ?? "–") + ' · 💬 ' + (c.x.comentarios ?? "–") + ' · ↗ ' + (c.x.compartidos ?? "–") + '</div><select data-capsel="' + i + '"><option value="">— No guardar —</option>' + opts.map(p => '<option value="' + p.id + '"' + (p.id === c.pid ? " selected" : "") + '>' + esc(fechaBonita(p.fecha) + " " + p.hora + " · " + (p.texto || "").split("\n")[0].slice(0, 40)) + '</option>').join("") + '</select></div>';
    });
    h += '<button class="btn verde" id="btnCapGuardar">Guardar resultados</button></div>';
  }
  return h;
}
function vCajaResultados(){
  const hoy = hoyStr(), d28 = cajaRango(sumaDias(hoy, -27), hoy), tot = Object.values(d28).reduce((a, v) => a + v, 0);
  let h = vCajaMini() + '<div class="card"><h3>Últimas 4 semanas: ' + tot + ' clientes registrados</h3>';
  const max = Math.max(1, ...Object.values(d28));
  CANALES_CAJA.forEach(([k, l]) => h += '<div class="small" style="margin:5px 0"><b>' + l + '</b> · ' + (d28[k] || 0) + '<div style="height:8px;border-radius:4px;background:var(--oro2);width:' + Math.max(2, Math.round((d28[k] || 0) / max * 100)) + '%"></div></div>');
  h += '<p class="muted small">Para comparar canales con confianza hacen falta unos 30 registros por canal y al menos 2 semanas completas (incluida una quincena).</p></div>';
  (S.mkt.promos || []).slice(-3).reverse().forEach(p => { const c = cajaRango(p.desde, p.hasta); h += '<div class="card"><h3>🏷️ ' + esc(p.nombre) + '</h3><p class="small">Del ' + esc(fechaBonita(p.desde)) + ' al ' + esc(fechaBonita(p.hasta)) + ': <b>' + (c.promo || 0) + '</b> clientes dijeron la palabra <b>' + esc(p.palabra) + '</b>.</p></div>'; });
  return h;
}
function vResultados(sub){
  if (sub === "captura") return vCaptura();
  if (sub === "caja") return vCajaResultados();
  return vReporte() + vMotor() + vResultadosEstadisticas();
}
function bindResultados(sub){
  bindCaja();
  const q = id => document.getElementById(id);
  q("btnCap") && (q("btnCap").onclick = () => elegirArchivo("image/*", true, leerCapturas));
  q("btnCapGuardar") && (q("btnCapGuardar").onclick = async () => {
    let n = 0; $app.querySelectorAll("[data-capsel]").forEach(s => { const c = S.capFilas[Number(s.dataset.capsel)], p = S.posts.find(x => x.id === s.value); if (p) { aplicarNumeros(p, c.x); n++; } });
    await guardarPosts(); S.capFilas = null; toast("📊 Resultados guardados en " + n + " publicaciones", 4000); render();
  });
  q("btnMz") && (q("btnMz").onclick = async () => { S.mkt.mezcla = { reels: Number(q("mzR").value), feed: Number(q("mzF").value) }; S.mkt.decisiones.push({ fecha: hoyStr(), texto: "Cambiaste el plan a mano: " + S.mkt.mezcla.reels + " Reels y " + S.mkt.mezcla.feed + " publicaciones por semana." }); await guardarMkt(); toast("Plan guardado"); render(); });
  q("btnMotor") && (q("btnMotor").onclick = async () => { const r = await revisarMotor(true); toast(r.textos[0] || "Revisado", 6000); render(); });
  q("btnRepIA") && (q("btnRepIA").onclick = async () => {
    S.repIA = "…"; render();
    const lunes = sumaDias(lunesDe(new Date()), -7), a = datosSemana(lunes), prev = [1, 2, 3, 4].map(k => datosSemana(sumaDias(lunes, -7 * k)));
    try { S.repIA = await iaLlamar("Eres el asesor de marketing de " + S.cfg.nombre + " (tortillería y abarrotes en " + S.cfg.ciudad + "). Explica al dueño, que no sabe de marketing, cómo le fue la semana pasada y qué hacer esta semana. Datos de la semana: " + JSON.stringify({ publicadas: a.publicadas, personas: a.personas, interacciones: a.inter, clientesCaja: a.caja, gastoAnuncios: a.gasto, mejor: a.mejor ? (a.mejor.texto || "").slice(0, 80) : null }) + ". Semanas anteriores: " + JSON.stringify(prev.map(x => ({ personas: x.personas, inter: x.inter, clientes: x.clientes }))) + ". Decisiones de la app: " + JSON.stringify(S.mkt.decisiones.slice(-3).map(d => d.texto)) + ".\nEn 4-6 frases sencillas y 3 acciones concretas con •. Si hay pocos datos, dilo y no exageres. Texto plano."); }
    catch(e){ S.repIA = ""; toast(e.message, 5000); }
    render();
  });
}

/* ===================== Canales ===================== */
const SUB_CANALES = [["whatsapp", "💬 WhatsApp"], ["google", "📍 Google"], ["grupos", "👥 Grupos"], ["anuncios", "💰 Anuncios"], ["respuestas", "💭 Respuestas"], ["promos", "🏷️ Promos"]];
function selDia(id, val){ return '<select id="' + id + '">' + DIAS.map((d, i) => '<option value="' + i + '"' + (i === val ? " selected" : "") + '>' + d + '</option>').join("") + '</select>'; }
function textosAutomaticosWA(){
  const c = S.cfg;
  return [
    ["Mensaje de bienvenida", "¡Hola! 👋 Gracias por escribir a *" + c.nombre + "*. ¿Qué te preparamos hoy? Dinos tu pedido y te lo tenemos listo. 🌽\n🕕 Abrimos " + c.horario + "."],
    ["Mensaje de ausencia (fuera de horario)", "¡Gracias por escribirnos! 🌙 Ahorita estamos cerrados; abrimos " + c.horario + ". Déjanos tu pedido y te lo apartamos para mañana temprano. 🌽"],
    ["Respuesta rápida /horario", "🕕 Abrimos " + c.horario + ". ¡Te esperamos!"],
    ["Respuesta rápida /ubicacion", "📍 Estamos en " + c.direccion + ", " + c.ciudad + "."],
    ["Respuesta rápida /pedido", "¡Claro! 🙌 Dime qué necesitas y a qué hora pasas, y te lo tenemos listo."],
    ["Respuesta rápida /gracias", "¡Gracias por tu preferencia! 💚 Aquí te esperamos siempre."],
    ["Letrero para la tienda", "📲 ¡Guarda nuestro WhatsApp " + c.whatsapp + " y recibe avisos de promociones y tortilla caliente!"]
  ];
}
function vCanal(sub){
  const c = S.cfg, mk = S.mkt;
  if (sub === "google") {
    const fest = proximoFestivo();
    return '<div class="card"><h2>📍 Google (tu perfil en Maps)</h2><p class="small">Cuando alguien busca "tortillería cerca de mí", Google mira sobre todo que tu <b>perfil esté completo</b> (categoría, horario, fotos) y tus <b>reseñas</b>. Las publicaciones informan a quien te encuentra, pero casi no te suben de lugar.</p><button class="btn verde" id="btnG">📝 Preparar publicación de la semana</button><label>Día de la publicación semanal</label>' + selDia("gDia", mk.diaGoogle) + '</div>' +
      '<div class="card"><h3>⭐ Reseñas</h3><ul class="small"><li>Pídela a <b>todos</b> tus clientes por igual. Google prohíbe ofrecer descuentos o regalos a cambio, y pedir solo reseñas buenas.</li><li>En tu perfil de Google toca <b>"Pedir reseñas"</b>: te da un enlace y un <b>código QR</b> para imprimir y pegar en la caja.</li><li>Responde todas las reseñas en menos de 48 horas (te ayudo en Respuestas).</li><li>Meta: al menos 1 reseña nueva por semana.</li></ul><label>Tu enlace para reseñas (opcional)</label><input id="gLink" placeholder="Pega el enlace de Pedir reseñas" value="' + esc(mk.linkResenas || "") + '"><button class="btn claro" id="btnGLink">Guardar enlace</button><button class="btn" id="btnGPedir">Copiar mensaje para pedir reseña</button></div>' +
      '<div class="card"><h3>📸 Fotos y horario</h3><ul class="small"><li>Sube <b>2 a 4 fotos reales</b> al mes: fachada, mostrador, tortillas, productos.</li><li>Ten tu <b>horario siempre exacto</b>: "abierto ahora" pesa mucho en Google.' + (fest ? " Próximo festivo: <b>" + esc(fest[1]) + "</b> (" + esc(fechaBonita(fest[0])) + "); revisa tu horario 3 días antes." : "") + '</li><li>Revisa que tu categoría principal sea <b>Tortillería</b>.</li></ul><a class="btn claro" href="https://business.google.com/" target="_blank" rel="noopener">Abrir mi perfil de Google</a></div>';
  }
  if (sub === "grupos") {
    const hoy = hoyStr();
    let h = '<div class="card"><h2>👥 Grupos de Facebook de Macuspana</h2><p class="small">Grupos de compra-venta y avisos de tu ciudad. Regla de la app: máximo <b>1 vez por semana por grupo</b>, <b>3 grupos por día</b>, texto distinto en cada uno y <b>sin enlaces</b>. Si un grupo te borra algo, descansa 30 días.</p><div class="row"><input id="grNom" placeholder="Nombre del grupo"><button class="btn verde" id="btnGrAdd" style="flex:none;width:auto;margin:0">＋</button></div>';
    mk.grupos.forEach((g, i) => h += '<div class="frase"><span><b>' + esc(g.nombre) + '</b><br><span class="muted small">' + (g.excluidoHasta > hoy ? "🚫 Descansa hasta " + esc(fechaBonita(g.excluidoHasta)) : g.ult ? "Última vez: " + esc(fechaBonita(g.ult)) : "Sin publicar") + '</span></span><button data-grdel="' + i + '">✕</button></div>');
    h += '<label>Días para publicar en grupos</label><div class="dias">' + DIAS_CORTOS.map((d, i) => '<label><input type="checkbox" data-grdia="' + i + '"' + (mk.diasGrupos.includes(i) ? " checked" : "") + '> ' + d + '</label>').join("") + '</div><button class="btn" id="btnGrHoy">Preparar publicaciones para grupos</button>';
    h += '<p class="muted small" style="margin-top:8px">En <b>Marketplace</b> conviene publicar lo que la gente busca: maíz, frijol o azúcar por bulto, carbón, con precio claro.</p>';
    return h + '</div>';
  }
  if (sub === "anuncios") {
    const recs = recomendacionesImpulso(), mes = hoyStr().slice(0, 7), gasto = mk.impulsos.filter(i => i.fecha.startsWith(mes)).reduce((a, i) => a + i.monto * i.dias, 0);
    let h = '<div class="card"><h2>💰 Anuncios con poco dinero</h2><p class="small">La app solo recomienda pagar cuando una publicación <b>ya funcionó sola</b> (el doble de lo normal en 24-48 horas, o 1.5 veces si es quincena o fecha especial). Así no tiras dinero.</p><p class="small">Este mes: <b>$' + gasto + '</b> de <b>$' + mk.topeImpulsoMes + '</b> · máximo 2 anuncios a la vez.' + (mk.pausaImpulsosHasta > hoyStr() ? " ⏸️ En pausa hasta el " + esc(fechaBonita(mk.pausaImpulsosHasta)) + " porque el último no trajo clientes." : "") + '</p><label>Tope mensual (pesos)</label><div class="row"><input id="adTope" type="number" inputmode="numeric" value="' + mk.topeImpulsoMes + '"><button class="btn claro" id="btnAdTope" style="flex:none;width:auto;margin:0">Guardar</button></div></div>';
    if (!recs.length) h += '<div class="card muted small">Por ahora no hay ninguna publicación que valga la pena impulsar. ' + (conDatos().length < 5 ? "Primero necesito resultados de tus publicaciones (Resultados → Leer captura" + (S.fb ? ", o se traen solos de Facebook" : "") + ")." : "Te aviso en Hoy cuando haya una.") + '</div>';
    recs.forEach(r => {
      h += '<div class="card"><h3>🔥 Impulsa esta publicación</h3>' + filaPost(r.p) + '<p class="small">Llegó a <b>' + r.c.r.toFixed(1) + ' veces</b> más personas de lo normal.</p><ol class="small"><li>En Facebook abre la publicación y toca <b>Impulsar publicación</b>.</li><li>Objetivo: <b>' + r.objetivo + '</b>.</li><li>Público → <b>Crear nuevo</b> → Ubicación: tu dirección con <b>radio de 3 km</b>. <b>Desactiva</b> "Llegar a más personas…". Edad 18-65.</li><li>Presupuesto: <b>$' + r.monto + ' al día</b> por <b>' + r.dias + ' días</b> (total $' + r.monto * r.dias + ').</li><li>Si Facebook dice que tu público es muy pequeño, sube a 5 km.</li></ol><div class="row"><button class="btn verde" data-imp="' + r.p.id + '" data-monto="' + r.monto + '" data-dias="' + r.dias + '">✔ Lo impulsé</button><button class="btn borde" data-impno="' + r.p.id + '">Ahora no</button></div></div>';
    });
    if (mk.impulsos.length) h += '<div class="card"><h3>Historial</h3>' + mk.impulsos.slice(-8).reverse().map(i => '<div class="frase"><span>' + esc(fechaBonita(i.fecha)) + ' · $' + i.monto + ' × ' + i.dias + ' días' + (i.evaluado ? ' · <b>' + i.clientes + ' clientes</b> en caja' : ' · en curso') + '</span></div>').join("") + '<p class="muted small">Durante un anuncio, registra en caja a quien diga que te vio en Facebook: así la app sabe si conviene repetir.</p></div>';
    return h;
  }
  if (sub === "respuestas") {
    let h = '<div class="card"><h2>💭 Responder comentarios, mensajes y reseñas</h2><p class="small">Responde en <b>menos de 1 hora</b> dentro de tu horario (como máximo 24 horas). Si es una queja en público: responde con amabilidad ahí mismo y sigue la plática por mensaje privado.</p><label>¿Qué es?</label><select id="rTipo"><option value="comentario">Comentario en Facebook</option><option value="mensaje">Mensaje (Messenger o WhatsApp)</option><option value="resena">Reseña de Google</option></select><label>Pega lo que te escribieron</label><textarea id="rTxt" style="min-height:90px" placeholder="Ej.: ¿A cómo el kilo de tortilla? ¿Tienen servicio a domicilio?">' + esc(S.respTxt || "") + '</textarea>';
    h += iaLista() ? '<div class="row"><button class="btn verde" id="btnResp"' + (S.respOcupada ? " disabled" : "") + '>' + (S.respOcupada ? "Pensando…" : "✨ Sugerir respuesta") + '</button><button class="btn claro" id="btnRespCap">📷 Desde captura</button></div>' : '<p class="muted small">Con IA conectada te escribo la respuesta exacta. Mientras, usa las respuestas listas de abajo.</p>';
    if (S.respRes) { const r = S.respRes; h += (r.queja ? '<div class="aviso err"><b>⚠️ Es una queja.</b> ' + esc(r.consejo || "Respóndela tú con calma; no la dejes sin contestar.") + '</div>' : (r.consejo ? '<p class="small">💡 ' + esc(r.consejo) + '</p>' : "")) + (r.respuestas || []).map((t, i) => '<div class="aviso" style="white-space:pre-wrap">' + esc(t) + '<button class="btn claro" data-rcop="' + i + '" style="padding:8px">Copiar</button></div>').join(""); }
    h += '</div><div class="card"><h3>⚡ Respuestas listas</h3>';
    const rapidas = [["Precio", "¡Hola! 😊 El precio del día te lo damos por WhatsApp al " + c.whatsapp + " o aquí en la tienda. ¡Te esperamos!"], ["Horario", "¡Hola! Abrimos " + c.horario + ". 🌽"], ["Ubicación", "Estamos en " + c.direccion + ", " + c.ciudad + ". 📍"], ["Pedido", "¡Claro! Escríbenos por WhatsApp al " + c.whatsapp + " con tu pedido y te lo tenemos listo. 🙌"], ["Gracias", "¡Gracias por tu preferencia! 💚 Aquí te esperamos siempre."], ["Queja (público)", "Lamentamos mucho lo que pasó. 🙏 Queremos solucionarlo: te escribimos por mensaje privado para atenderte personalmente."], ["Reseña buena", "¡Muchas gracias por tu reseña! 💚 Nos alegra que te guste. ¡Te esperamos pronto en " + c.nombre + "!"], ["Reseña mala", "Gracias por decírnoslo y lamentamos tu experiencia. 🙏 Queremos mejorar: escríbenos por WhatsApp al " + c.whatsapp + " para atenderte."]];
    S.rapidas = rapidas;
    rapidas.forEach(([t, txt], i) => h += '<div class="frase"><span><b>' + esc(t) + ':</b> ' + esc(txt) + '</span><button data-rap="' + i + '" style="background:#DCEBDD;color:var(--verde)">Copiar</button></div>');
    return h + '</div>';
  }
  if (sub === "promos") {
    const hoy = hoyStr();
    let h = '<div class="card"><h2>🏷️ Promociones</h2><p class="small">Las promos que mejor se miden son <b>descuentos directos con palabra clave</b>: "di ESPIGA en caja y llévate…". Así sabes cuántos vinieron por la promo.</p><p class="small">⚠️ <b>La app no arma sorteos ni rifas:</b> en México un sorteo al azar necesita permiso de Gobernación (SEGOB) y aviso a PROFECO. Facebook tampoco permite pedir "comparte en tu muro" o "etiqueta amigos" para participar.</p></div>';
    h += '<div class="card"><h3>＋ Nueva promo</h3><label>Tipo</label><select id="prTipo"><option value="descuento">Descuento directo</option><option value="combo">Combo</option><option value="lealtad">Tarjeta de lealtad (sellos)</option><option value="concurso">Concurso de habilidad (sin azar)</option></select><label>Nombre</label><input id="prNom" placeholder="Ej.: Martes de salsa"><label>¿Qué gana el cliente? (con precio si aplica)</label><textarea id="prDesc" style="min-height:70px" placeholder="Ej.: En la compra de 2 kg de tortilla, la salsa San Luis a mitad de precio."></textarea><div class="row"><div><label>Palabra clave</label><input id="prPal" value="ESPIGA"></div><div><label>Desde</label><input id="prDesde" type="date" value="' + hoy + '"></div><div><label>Hasta</label><input id="prHasta" type="date" value="' + sumaDias(hoy, 6) + '"></div></div>' + (iaLista() ? '<button class="btn claro" id="btnPrIA">✨ Dame una idea</button>' : '<p class="muted small">Ideas: 2x1 en salsa con 2 kg de tortilla los martes · combo desayuno (huevo + leche + tortilla) · tarjeta: el 10º kilo con descuento · combo de quincena por bulto.</p>') + '<div id="prAviso"></div><button class="btn verde" id="btnPrAdd">Guardar promo</button></div>';
    (mk.promos || []).slice().reverse().forEach((p, iRev) => {
      const i = mk.promos.length - 1 - iRev, act = p.desde <= hoy && p.hasta >= hoy, c = cajaRango(p.desde, p.hasta);
      h += '<div class="card"><h3>' + (act ? "🟢 " : "") + esc(p.nombre) + '</h3><p class="small">' + esc(p.descripcion) + '</p><p class="muted small">Palabra: <b>' + esc(p.palabra) + '</b> · ' + esc(fechaBonita(p.desde)) + ' a ' + esc(fechaBonita(p.hasta)) + ' · ' + (c.promo || 0) + ' clientes en caja</p>' + (p.tipo === "concurso" ? '<div class="aviso small"><b>Concurso:</b> publica bases claras (quién participa, cómo se elige al ganador por habilidad, premio y fechas) y agrega: "Esta promoción no está patrocinada, avalada ni administrada por Facebook". Presenta el <b>aviso a PROFECO</b> al menos 3 días hábiles antes (es gratis).</div>' : "") + '<button class="btn rojo" data-prdel="' + i + '" style="padding:8px">Borrar</button></div>';
    });
    return h;
  }
  // WhatsApp (por defecto)
  const n = difusionesMes();
  let h = '<div class="card"><h2>💬 WhatsApp</h2><p class="small">Es tu canal de cierre: aquí te hacen los pedidos. Solo le llega lo tuyo a quien <b>guardó tu número</b>, por eso todos tus mensajes invitan a guardarlo.</p><div class="row"><button class="btn verde" id="btnWE1">🟢 Estado de mañana</button><button class="btn verde" id="btnWE2">🟢 Estado de mediodía</button></div><p class="muted small">2 estados al día (máximo 4). La misma imagen sirve como historia de Facebook.</p></div>';
  h += '<div class="card"><h3>📣 Difusión</h3><p class="small">Llevas <b>' + n + '</b> este mes. Recomendado: <b>1 por semana</b> por lista (2 en quincena), entre 7:00 y 11:00. Si mucha gente pide que ya no le mandes, la app baja la frecuencia.</p><button class="btn" id="btnWD">Preparar mensaje de difusión</button><div class="row"><div><label>Día de difusión</label>' + selDia("wDia", mk.diaDifusion) + '</div><div><label>Tope al mes</label><input id="wTope" type="number" inputmode="numeric" value="' + mk.topeDifusion + '"></div></div><button class="btn claro" id="btnWGuardar">Guardar</button><p class="muted small">WhatsApp está poniendo en algunos países un límite de difusiones gratis al mes (por ejemplo 35). Revísalo en WhatsApp → Ajustes → Difusiones y ponlo aquí.</p></div>';
  h += '<div class="card"><h3>🤖 Mensajes automáticos de WhatsApp Business</h3><p class="small">Se configuran una sola vez en <b>WhatsApp Business → Herramientas para la empresa</b>: mensaje de bienvenida, mensaje de ausencia (fuera de tu horario) y respuestas rápidas. Aquí están listos para copiar:</p>';
  textosAutomaticosWA().forEach(([t, txt], i) => h += '<div class="frase"><span><b>' + esc(t) + ':</b><br>' + esc(txt) + '</span><button data-wa="' + i + '" style="background:#DCEBDD;color:var(--verde)">Copiar</button></div>');
  return h + '<p class="muted small" style="margin-top:8px">También arma tu <b>Catálogo</b> en WhatsApp Business con tus productos principales (tortilla, bultos, refrescos).</p></div>';
}
function bindCanal(sub){
  const q = id => document.getElementById(id);
  if (sub === "whatsapp") {
    q("btnWE1").onclick = () => abrirEstado(1); q("btnWE2").onclick = () => abrirEstado(2); q("btnWD").onclick = abrirDifusion;
    q("btnWGuardar").onclick = async () => { S.mkt.diaDifusion = Number(q("wDia").value); S.mkt.topeDifusion = Math.max(1, Number(q("wTope").value) || 35); await guardarMkt(); toast("Guardado"); render(); };
    $app.querySelectorAll("[data-wa]").forEach(b => b.onclick = () => copiar(textosAutomaticosWA()[Number(b.dataset.wa)][1]));
  }
  if (sub === "google") {
    q("btnG").onclick = abrirGoogle;
    q("gDia").onchange = async e => { S.mkt.diaGoogle = Number(e.target.value); await guardarMkt(); toast("Guardado"); };
    q("btnGLink").onclick = async () => { S.mkt.linkResenas = q("gLink").value.trim(); await guardarMkt(); toast("Enlace guardado"); };
    q("btnGPedir").onclick = () => copiar("¡Hola! 😊 Gracias por comprar en *" + S.cfg.nombre + "*. ¿Nos ayudas con una reseña en Google? Nos ayuda mucho a que más vecinos nos encuentren. 🙏" + (S.mkt.linkResenas ? "\n👉 " + S.mkt.linkResenas : "\n(Busca \"" + S.cfg.nombre + "\" en Google Maps → Escribir una reseña)"));
  }
  if (sub === "grupos") {
    q("btnGrAdd").onclick = async () => { const n = q("grNom").value.trim(); if (!n) return; S.mkt.grupos.push({ id: uid(), nombre: n, ult: "", excluidoHasta: "" }); await guardarMkt(); render(); };
    $app.querySelectorAll("[data-grdel]").forEach(b => b.onclick = async () => { S.mkt.grupos.splice(Number(b.dataset.grdel), 1); await guardarMkt(); render(); });
    $app.querySelectorAll("[data-grdia]").forEach(b => b.onchange = async () => { S.mkt.diasGrupos = [...$app.querySelectorAll("[data-grdia]")].filter(x => x.checked).map(x => Number(x.dataset.grdia)); await guardarMkt(); });
    q("btnGrHoy").onclick = abrirGrupos;
  }
  if (sub === "anuncios") {
    q("btnAdTope").onclick = async () => { S.mkt.topeImpulsoMes = Math.max(0, Number(q("adTope").value) || 0); await guardarMkt(); toast("Guardado"); render(); };
    $app.querySelectorAll("[data-imp]").forEach(b => b.onclick = () => {
      const m = modal('<h3 style="margin-top:0">¿Cuánto pusiste?</h3><div class="row"><div><label>Pesos al día</label><input id="iM" type="number" inputmode="numeric" value="' + b.dataset.monto + '"></div><div><label>Días</label><input id="iD" type="number" inputmode="numeric" value="' + b.dataset.dias + '"></div></div><button class="btn verde" data-x="ok">Guardar</button><button class="btn borde" data-x="c">Cancelar</button>');
      m.querySelector('[data-x="c"]').onclick = () => m.remove();
      m.querySelector('[data-x="ok"]').onclick = async () => { S.mkt.impulsos.push({ id: uid(), postId: b.dataset.imp, fecha: hoyStr(), monto: Math.max(0, Number(m.querySelector("#iM").value) || 0), dias: Math.max(1, Number(m.querySelector("#iD").value) || 1) }); await guardarMkt(); await marcarHecho("impulso"); m.remove(); toast("Registrado. Anota en caja a quien llegue por Facebook."); render(); };
    });
    $app.querySelectorAll("[data-impno]").forEach(b => b.onclick = async () => { S.mkt.descartados.push(b.dataset.impno); S.mkt.descartados = S.mkt.descartados.slice(-50); await guardarMkt(); render(); });
  }
  if (sub === "respuestas") {
    $app.querySelectorAll("[data-rap]").forEach(b => b.onclick = () => copiar(S.rapidas[Number(b.dataset.rap)][1]));
    $app.querySelectorAll("[data-rcop]").forEach(b => b.onclick = () => copiar(S.respRes.respuestas[Number(b.dataset.rcop)]));
    const pedir = async (texto, imgs) => {
      S.respTxt = texto; S.respOcupada = true; S.respRes = null; render();
      const tipo = (q("rTipo") || {}).value || "comentario";
      try { S.respRes = await iaLlamar("Eres quien atiende las redes de " + S.cfg.nombre + " (tortillería y abarrotes en " + S.cfg.ciudad + "). Datos: horario " + S.cfg.horario + ", ubicación " + S.cfg.direccion + ", WhatsApp " + S.cfg.whatsapp + ". Productos: " + Object.values(S.banco.productos).map(p => p.nombre).join(", ") + ".\nTe llegó un(a) " + ({ comentario: "comentario público en Facebook", mensaje: "mensaje privado", resena: "reseña de Google" })[tipo] + (imgs ? " (está en la captura adjunta)" : "") + ":\n" + (texto || "") + "\n\nReglas: responde cálido, corto y de barrio; nunca inventes precios (si preguntan precio, invita a WhatsApp o a la tienda); no prometas entregas a domicilio si no se mencionan en los datos; si es queja, discúlpate sin discutir y pasa a mensaje privado o WhatsApp; en reseñas de Google no pongas teléfono si es positiva.\nResponde SOLO JSON: {\"queja\":false,\"consejo\":\"1 frase para el dueño\",\"respuestas\":[\"opción 1\",\"opción 2\",\"opción 3\"]}", { json: true, images: imgs || [] }); }
      catch(e){ toast(e.message, 5000); }
      S.respOcupada = false; render();
    };
    q("btnResp") && (q("btnResp").onclick = () => { const t = q("rTxt").value.trim(); if (!t) { toast("Pega el comentario o mensaje"); return; } pedir(t); });
    q("btnRespCap") && (q("btnRespCap").onclick = () => elegirArchivo("image/*", false, async files => { if (files.length) pedir(q("rTxt") ? q("rTxt").value.trim() : "", [await comprimir(files[0])]); }));
  }
  if (sub === "promos") {
    const avisar = () => { const t = (q("prNom").value + " " + q("prDesc").value); q("prAviso").innerHTML = PROHIBIDO_PROMO.test(t) ? '<div class="aviso err">⚠️ Eso parece un sorteo o pide compartir/etiquetar. Cámbialo por un descuento directo o un concurso de habilidad.</div>' : ""; };
    q("prNom").oninput = avisar; q("prDesc").oninput = avisar;
    q("btnPrAdd").onclick = async () => {
      const p = { id: uid(), tipo: q("prTipo").value, nombre: q("prNom").value.trim(), descripcion: q("prDesc").value.trim(), palabra: (q("prPal").value.trim() || "ESPIGA").toUpperCase(), desde: q("prDesde").value, hasta: q("prHasta").value };
      if (!p.nombre || !p.descripcion) { toast("Escribe el nombre y qué gana el cliente"); return; }
      if (PROHIBIDO_PROMO.test(p.nombre + " " + p.descripcion)) { toast("La app no guarda sorteos ni promos que pidan compartir o etiquetar", 5000); return; }
      if (p.hasta < p.desde) { toast("La fecha final va después de la inicial"); return; }
      S.mkt.promos.push(p); await guardarMkt(); toast("🏷️ Promo guardada: aparecerá en tus publicaciones, estados y difusión"); render();
    };
    $app.querySelectorAll("[data-prdel]").forEach(b => b.onclick = async () => { if (!await confirmar("¿Borrar esta promo?", "Borrar")) return; S.mkt.promos.splice(Number(b.dataset.prdel), 1); await guardarMkt(); render(); });
    q("btnPrIA") && (q("btnPrIA").onclick = async () => {
      const b = q("btnPrIA"); b.disabled = true; b.textContent = "Pensando…";
      try { const r = await iaLlamar("Propón UNA promoción sencilla para " + S.cfg.nombre + " (tortillería y abarrotes en " + S.cfg.ciudad + ") para esta semana (" + fechaBonita(hoyStr()) + (esQuincena(hoyStr()) ? ", quincena" : "") + "). Productos: " + Object.values(S.banco.productos).map(p => p.nombre).join(", ") + ".\nReglas: descuento directo, combo o tarjeta de lealtad; NADA de sorteos, rifas ni pedir compartir o etiquetar; sin inventar precios exactos (usa \"a mitad de precio\", \"2x1\", \"de regalo\"); fácil de aplicar en caja.\nResponde SOLO JSON: {\"tipo\":\"descuento|combo|lealtad\",\"nombre\":\"...\",\"descripcion\":\"...\",\"palabra\":\"UNA PALABRA\"}", { json: true });
        q("prTipo").value = ["descuento", "combo", "lealtad"].includes(r.tipo) ? r.tipo : "descuento"; q("prNom").value = r.nombre || ""; q("prDesc").value = r.descripcion || ""; q("prPal").value = (r.palabra || "ESPIGA").toUpperCase(); avisar(); }
      catch(e){ toast(e.message, 5000); }
      b.disabled = false; b.textContent = "✨ Dame una idea";
    });
  }
}
