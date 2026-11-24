/* Robot de Espiga Social — corre solo en GitHub Actions (ver .github/workflows/robot.yml).
   Corrida de la mañana: trae resultados, aprende (mezcla, horarios, productos), programa en Facebook
   las publicaciones y Reels del día, sube la historia de la mañana y prepara sugerencias de anuncios.
   Corrida de la tarde: sube la historia de la tarde y actualiza resultados.
   Lee:    automatico/config.json, datos/app.json (lo que manda la app: negocio, frases, promos), fotos/, videos/
   Escribe: datos/estado.json (memoria del robot) y datos/hoy.json (lo que muestra la app). */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GRAPH = (process.env.GRAPH_URL || "https://graph.facebook.com") + "/v25.0/";
const TOKEN = (process.env.FB_PAGE_TOKEN || "").trim();
const GEMINI = (process.env.GEMINI_API_KEY || "").trim();
const FORZAR = process.env.FORZAR === "true" || process.env.FORZAR === "1";
const MODO = process.env.MODO || "";             // "manana" | "tarde" | "" (automático por la hora)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "espiga-"));

/* ---------- Utilidades ---------- */
const leerJSON = (f, def) => { try { return JSON.parse(fs.readFileSync(path.join(RAIZ, f), "utf8")); } catch { return def; } };
const escribirJSON = (f, d) => { fs.mkdirSync(path.dirname(path.join(RAIZ, f)), { recursive: true }); fs.writeFileSync(path.join(RAIZ, f), JSON.stringify(d, null, 1) + "\n"); };
const pad = n => String(n).padStart(2, "0");
const mx = (d = new Date()) => new Date(d.getTime() - 6 * 3600000);          // Macuspana: UTC-6 todo el año
const hoyMX = () => mx().toISOString().slice(0, 10);
const horaMX = () => mx().toISOString().slice(11, 16);
const tsDe = (fecha, hora) => Math.floor(Date.parse(fecha + "T" + hora + ":00-06:00") / 1000);
const sumaDias = (f, n) => { const d = new Date(f + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diaSemana = f => new Date(f + "T12:00:00Z").getUTCDay();             // 0 = domingo
const pick = a => a[Math.floor(Math.random() * a.length)];
const mediana = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const log = (...a) => console.log("•", ...a);

/* ---------- Datos ---------- */
const CFG = leerJSON("automatico/config.json", {});
const APP = leerJSON("datos/app.json", {});
const NEG = Object.assign({}, CFG.negocio, APP.negocio || {});
const BANCO = (() => {
  if (APP.banco && APP.banco.ganchos) return APP.banco;
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, "banco.js"), "utf8") + "\n;this.BANCO_INICIAL = BANCO_INICIAL;", ctx);
  return ctx.BANCO_INICIAL;
})();
const E = Object.assign({
  publicaciones: [], usadosFotos: [], usadosFrases: [], mezcla: CFG.mezcla, horarios: CFG.horarios,
  retirados: {}, contadorTipos: 0, decisiones: [], ultimaRevision: "", hechos: {}, impulsosSugeridos: []
}, leerJSON("datos/estado.json", {}));
const HOY = leerJSON("datos/hoy.json", {});
const errores = [];

/* ---------- Fotos y videos del repositorio ---------- */
function listar(dir, ext){
  const base = path.join(RAIZ, dir), out = [];
  if (!fs.existsSync(base)) return out;
  const rec = d => fs.readdirSync(d, { withFileTypes: true }).forEach(x => {
    const p = path.join(d, x.name);
    if (x.isDirectory()) rec(p); else if (ext.test(x.name)) out.push(path.relative(RAIZ, p).split(path.sep).join("/"));
  });
  rec(base); return out.sort();
}
const FOTOS = listar("fotos", /\.(jpe?g|png|webp)$/i).map(ruta => {
  const partes = ruta.split("/"), prod = partes.length > 2 ? partes[1] : "tienda";
  return { ruta, prod };
}).filter(f => !(E.retirados[f.prod] > hoyMX()) || f.prod === "tortilla");
const VIDEOS = listar("videos", /\.(mp4|mov)$/i);
const prodDe = f => (f && BANCO.productos && BANCO.productos[f.prod]) || null;
function elegirFoto(prefs = [], evitar = []){
  let l = FOTOS.filter(f => !evitar.includes(f.ruta));
  if (prefs.length) { const x = l.filter(f => prefs.includes(f.prod)); if (x.length) l = x; }
  const libres = l.filter(f => !E.usadosFotos.includes(f.ruta));
  const f = pick(libres.length ? libres : l);
  if (f) { E.usadosFotos.push(f.ruta); E.usadosFotos = E.usadosFotos.slice(-Math.max(5, Math.floor(FOTOS.length * 0.7))); }
  return f;
}

/* ---------- Textos (frases del banco, o IA si hay clave) ---------- */
function elegirFrase(lista){
  if (!lista || !lista.length) return "";
  const libres = lista.filter(t => !E.usadosFrases.includes(t)), t = pick(libres.length ? libres : lista);
  E.usadosFrases.push(t); E.usadosFrases = E.usadosFrases.slice(-60); return t;
}
const momento = h => { const n = Number(h.slice(0, 2)); return n < 10 ? "manana" : n < 14 ? "mediodia" : "tarde"; };
function pascua(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1; return new Date(Date.UTC(y, mes-1, dia)); }
function fechasActivas(fecha){
  const d = new Date(fecha + "T12:00:00Z"), md = fecha.slice(5), dia = d.getUTCDate(), ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return (BANCO.fechas || []).filter(f => {
    if (f.id === "quincena") return [14, 15, 16].includes(dia) || dia >= ultimo - 1 || dia === 1;
    if (f.id === "cuaresma") { const p = pascua(d.getUTCFullYear()), ini = new Date(p), fin = new Date(p); ini.setUTCDate(p.getUTCDate() - 46); fin.setUTCDate(p.getUTCDate() - 3); return d >= ini && d <= fin; }
    if (!f.desde || !f.hasta) return false;
    return f.desde <= f.hasta ? (md >= f.desde && md <= f.hasta) : (md >= f.desde || md <= f.hasta);
  });
}
function rellenar(t, f){
  const pr = prodDe(f);
  return String(t).replace(/\{producto\}/g, (pr && pr.nombre) || "nuestros productos").replace(/\{nombre\}/g, NEG.nombre)
    .replace(/\{ciudad\}/g, NEG.ciudad).replace(/\{direccion\}/g, NEG.direccion).replace(/\{whatsapp\}/g, NEG.whatsapp).replace(/\{horario\}/g, NEG.horario);
}
function gancho(fecha, hora, f){
  const pr = prodDe(f), generales = BANCO.ganchos.filter(g => g.m === momento(hora) || g.m === "*").map(g => g.t);
  return rellenar(pr && pr.ganchos && pr.ganchos.length && Math.random() < 0.6 ? elegirFrase(pr.ganchos) : elegirFrase(generales), f);
}
function componer(fecha, hora, f, { tags = true, pregunta } = {}){
  const pr = prodDe(f), cat = (pr && pr.cat) || "general", partes = [gancho(fecha, hora, f)];
  const esp = fechasActivas(fecha); if (esp.length && Math.random() < 0.7) partes.push(elegirFrase(pick(esp).frases));
  partes.push(elegirFrase(pr && pr.frases && pr.frases.length ? pr.frases : (BANCO.cuerpos[cat] && BANCO.cuerpos[cat].length ? BANCO.cuerpos[cat] : BANCO.cuerpos.general)));
  if (pregunta ?? Math.random() * 100 < (CFG.probPregunta ?? 30)) partes.push(elegirFrase(BANCO.preguntas));
  partes.push(elegirFrase(BANCO.cierres));
  const t = partes.filter(Boolean).map(x => rellenar(x, f)).join("\n\n");
  return tags ? t + "\n\n" + (NEG.hashtags + " " + ((pr && pr.tags) || "")).trim() : t;
}
function promoActiva(fecha){ return (APP.promos || []).find(p => p.desde <= fecha && p.hasta >= fecha) || null; }

async function ia(prompt, fotoRuta){
  if (!GEMINI) return null;
  const parts = [];
  if (fotoRuta) { const b = fs.readFileSync(path.join(RAIZ, fotoRuta)); if (b.length < 4e6) parts.push({ inline_data: { mime_type: /png$/i.test(fotoRuta) ? "image/png" : "image/jpeg", data: b.toString("base64") } }); }
  parts.push({ text: prompt });
  const modelo = (APP.iaModelo || (CFG.ia && CFG.ia.modelo) || "gemini-2.5-flash");
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent?key=" + GEMINI, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.9 } })
    });
    const j = await r.json();
    const txt = j.candidates && j.candidates[0] && j.candidates[0].content.parts.map(p => p.text || "").join("");
    return txt ? JSON.parse(txt) : null;
  } catch(e){ log("IA no disponible:", e.message); return null; }
}
const CONTEXTO = () => "Eres la community manager de " + NEG.nombre + ", tortillería y abarrotes en " + NEG.ciudad + " (" + NEG.direccion + "; WhatsApp " + NEG.whatsapp + "; abre " + NEG.horario + "). Escribes como vecina de Tabasco: cálida, sencilla, con 2-4 emojis, sin precios, sin pedir likes ni compartir, sin sorteos.";
const ULTIMOS = () => E.publicaciones.slice(-8).map(p => "- " + (p.texto || "").split("\n")[0]).join("\n");
async function textoPublicacion(fecha, hora, f, tipo){
  const esp = fechasActivas(fecha).map(x => x.nombre), promo = promoActiva(fecha), pr = prodDe(f);
  if (tipo === "pregunta") {
    const r = await ia(CONTEXTO() + "\nEscribe una publicación de Facebook SOLO TEXTO para hacer conversar a los vecinos: una pregunta fácil de contestar sobre comida tabasqueña, tortillas o el día a día" + (esp.length ? " (hoy es " + esp.join(", ") + ")" : "") + ". 2 a 4 líneas, termina con la pregunta. No repitas estas ideas recientes:\n" + ULTIMOS() + '\nResponde JSON {"texto":"..."}');
    return (r && r.texto ? r.texto.trim() : rellenar(elegirFrase(BANCO.preguntas), null)) + "\n\n🌽 " + NEG.nombre;
  }
  if (tipo === "promo" && promo) return "🏷️ " + promo.nombre + "\n\n" + promo.descripcion + (promo.palabra ? "\n\n👉 Di la palabra *" + promo.palabra + "* en caja." : "") + "\n\n" + rellenar(elegirFrase(BANCO.cierres), f) + "\n\n" + NEG.hashtags;
  const r = await ia(CONTEXTO() + "\nEscribe una publicación de Facebook para esta foto" + (pr ? " (producto: " + pr.nombre + ")" : "") + ". Momento del día: " + momento(hora) + " (" + hora + ")." + (esp.length ? " Fecha especial: " + esp.join(", ") + "." : "") +
    (tipo === "comunidad" ? " Enfoque: comunidad y orgullo local, agradecer a los vecinos." : " Enfoque: antojar el producto y recordar que está a la vuelta.") +
    " Estructura: primera línea que enganche, 1-2 líneas de cuerpo, opcional una pregunta, y al final la ubicación y el WhatsApp. No repitas estas ideas recientes:\n" + ULTIMOS() + '\nResponde JSON {"texto":"..."} sin hashtags.', f && f.ruta);
  const base = r && r.texto ? r.texto.trim() : componer(fecha, hora, f, { tags: false });
  return base + "\n\n" + (NEG.hashtags + " " + ((pr && pr.tags) || "")).trim();
}

/* ---------- Facebook ---------- */
let PAGE = (process.env.FB_PAGE_ID || "").trim();
class FbError extends Error { constructor(e){ super((e && (e.error_user_msg || e.message)) || "error de Facebook"); this.code = e && e.code; } }
const fatal = e => e && (e.code === 190 || e.code === 102 || e.code === 10 || (e.code >= 200 && e.code < 300));
async function fb(ruta, params = {}, metodo = "GET", form = null){
  const url = new URL(GRAPH + ruta), opts = { method: metodo };
  if (form) { Object.entries(params).forEach(([k, v]) => form.append(k, String(v))); form.append("access_token", TOKEN); opts.body = form; }
  else if (metodo === "GET") { Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v)); url.searchParams.set("access_token", TOKEN); }
  else opts.body = new URLSearchParams(Object.assign({}, params, { access_token: TOKEN }));
  const r = await fetch(url, opts), j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new FbError(j.error || { message: "HTTP " + r.status });
  return j;
}
const archivo = (ruta, tipo) => new Blob([fs.readFileSync(ruta)], { type: tipo });
const programable = ts => ts > Date.now() / 1000 + 12 * 60;
async function publicarFoto(rutaAbs, texto, ts){
  const fd = new FormData(); fd.append("source", archivo(rutaAbs, "image/jpeg"), "espiga.jpg");
  const p = programable(ts) ? { message: texto, published: "false", scheduled_publish_time: ts } : { message: texto };
  const j = await fb(PAGE + "/photos", p, "POST", fd); return j.post_id || j.id;
}
async function publicarTexto(texto, ts){
  const p = programable(ts) ? { message: texto, published: "false", scheduled_publish_time: ts } : { message: texto };
  return (await fb(PAGE + "/feed", p, "POST")).id;
}
async function publicarHistoria(rutaAbs){
  const fd = new FormData(); fd.append("source", archivo(rutaAbs, "image/jpeg"), "historia.jpg");
  const foto = await fb(PAGE + "/photos", { published: "false" }, "POST", fd);
  const j = await fb(PAGE + "/photo_stories", { photo_id: foto.id }, "POST"); return j.post_id || foto.id;
}
async function publicarReel(rutaAbs, texto, ts){
  const ini = await fb(PAGE + "/video_reels", { upload_phase: "start" }, "POST");
  const buf = fs.readFileSync(rutaAbs);
  const r = await fetch(ini.upload_url || ("https://rupload.facebook.com/video-upload/v25.0/" + ini.video_id), { method: "POST", headers: { Authorization: "OAuth " + TOKEN, offset: "0", file_size: String(buf.length) }, body: buf });
  const ju = await r.json().catch(() => ({}));
  if (!r.ok || ju.error || ju.success === false) throw new FbError(ju.error || { message: "no se pudo subir el video" });
  const fin = programable(ts) ? { video_state: "SCHEDULED", scheduled_publish_time: ts } : { video_state: "PUBLISHED" };
  await fb(PAGE + "/video_reels", Object.assign({ upload_phase: "finish", video_id: ini.video_id, description: texto }, fin), "POST");
  return ini.video_id;
}

/* ---------- Imágenes y video con ffmpeg ---------- */
const FUENTE = (() => { try { return execFileSync("fc-match", ["-f", "%{file}", "DejaVu Sans:bold"]).toString().trim(); } catch { return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; } })();
const sinEmoji = t => String(t).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}]/gu, "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
function partirLineas(t, n = 22){ const out = []; let l = ""; for (const w of sinEmoji(t).replace(/[:,;]$/, "").split(" ")) { if ((l + " " + w).trim().length > n && l) { out.push(l); l = w; } else l = (l + " " + w).trim(); } if (l) out.push(l); return out.slice(0, 4).join("\n"); }
let nTmp = 0;
function textoArchivo(t){ const f = path.join(TMP, "t" + (nTmp++) + ".txt"); fs.writeFileSync(f, t); return f; }
const ff = args => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "pipe"] });
const caja = (archivoTexto, tam, y) => "drawtext=fontfile=" + FUENTE + ":textfile=" + archivoTexto + ":expansion=none:fontcolor=white:fontsize=" + tam + ":line_spacing=10:box=1:boxcolor=black@0.5:boxborderw=24:x=(w-text_w)/2:y=" + y;
function imagenHistoria(fotoRel, texto){
  const out = path.join(TMP, "historia" + (nTmp++) + ".jpg");
  ff(["-i", path.join(RAIZ, fotoRel), "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920," + caja(textoArchivo(partirLineas(texto, 20)), 64, "h*0.70"), "-frames:v", "1", "-q:v", "3", out]);
  return out;
}
function videoReel(fotos, textos){
  const segs = [];
  fotos.forEach((f, i) => {
    const s = path.join(TMP, "seg" + i + ".mp4");
    ff(["-loop", "1", "-framerate", "30", "-t", "3.2", "-i", path.join(RAIZ, f.ruta), "-vf",
      "scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560,zoompan=z='1+0.0009*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x1280:fps=30," + caja(textoArchivo(partirLineas(textos[i] || "", 20)), 46, "h*0.68") + ",format=yuv420p",
      "-c:v", "libx264", "-preset", "veryfast", "-r", "30", s]);
    segs.push(s);
  });
  const cierre = path.join(TMP, "cierre.mp4");
  ff(["-f", "lavfi", "-i", "color=c=0x2F5D3A:s=720x1280:d=2.8:r=30", "-vf",
    caja(textoArchivo(partirLineas(NEG.nombre, 18)), 50, "h*0.33") + "," + caja(textoArchivo("WhatsApp " + NEG.whatsapp), 40, "h*0.55") + "," + caja(textoArchivo(sinEmoji(NEG.ciudad)), 36, "h*0.65") + ",format=yuv420p",
    "-c:v", "libx264", "-preset", "veryfast", cierre]);
  segs.push(cierre);
  const lista = path.join(TMP, "lista.txt"); fs.writeFileSync(lista, segs.map(s => "file '" + s + "'").join("\n"));
  const out = path.join(TMP, "reel" + (nTmp++) + ".mp4");
  ff(["-f", "concat", "-safe", "0", "-i", lista, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest", "-c:v", "copy", "-c:a", "aac", "-movflags", "+faststart", out]);
  return out;
}

/* ---------- Resultados y aprendizaje ---------- */
async function traerResultados(){
  const ahora = Date.now() / 1000;
  const lista = E.publicaciones.filter(p => p.fbId && p.tipo !== "historia" && p.ts < ahora - 6 * 3600 && p.ts > ahora - 28 * 86400);
  let n = 0;
  for (const p of lista) {
    try {
      const r = p.resultados || {};
      if (p.tipo === "reel") {
        const j = await fb(p.fbId, { fields: "likes.summary(true).limit(0),comments.summary(true).limit(0)" });
        r.reacciones = j.likes?.summary?.total_count || 0; r.comentarios = j.comments?.summary?.total_count || 0;
        try { const ins = await fb(p.fbId + "/video_insights", { metric: "blue_reels_play_count" }); const v = ins.data?.[0]?.values?.[0]?.value; if (typeof v === "number") r.alcance = v; } catch {}
      } else {
        const j = await fb(p.fbId, { fields: "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares" });
        r.reacciones = j.reactions?.summary?.total_count || 0; r.comentarios = j.comments?.summary?.total_count || 0; r.compartidos = j.shares?.count || 0;
        try { const ins = await fb(p.fbId + "/insights", { metric: "post_total_media_view_unique" }); const v = ins.data?.[0]?.values?.[0]?.value; if (typeof v === "number") r.alcance = v; } catch {}
      }
      p.resultados = r; n++;
    } catch(e){ if (fatal(e)) throw e; }
  }
  log("Resultados actualizados:", n);
}
const conAlcance = (desde, filtro = () => true) => E.publicaciones.filter(p => p.fecha >= desde && p.resultados && typeof p.resultados.alcance === "number" && filtro(p));
function decidir(texto){ E.decisiones.push({ fecha: hoyMX(), texto }); E.decisiones = E.decisiones.slice(-30); log("Decisión:", texto); }
function aprender(){
  const hoy = hoyMX();
  if (!FORZAR && E.ultimaRevision && sumaDias(E.ultimaRevision, 7) > hoy) return;
  E.ultimaRevision = hoy;
  const desde = sumaDias(hoy, -28), reels = conAlcance(desde, p => p.tipo === "reel").map(p => p.resultados.alcance), feed = conAlcance(desde, p => p.tipo === "foto" || p.tipo === "texto").map(p => p.resultados.alcance);
  const mz = E.mezcla;
  // 1) Mezcla Reels / publicaciones
  if (reels.length >= 4 && feed.length >= 6) {
    const razon = mediana(reels) / Math.max(1, mediana(feed));
    if (razon >= 1.3 && mz.reels < 5) { mz.reels++; mz.feed = Math.max(3, mz.feed - 1); decidir("Los Reels llegan a " + razon.toFixed(1) + " veces más personas que las fotos. Subo a " + mz.reels + " Reels y " + mz.feed + " publicaciones por semana."); }
    else if (razon <= 0.8 && mz.reels > 1) { mz.reels--; mz.feed = Math.min(7, mz.feed + 1); decidir("Las fotos están llegando a más gente que los Reels. Bajo a " + mz.reels + " Reels y subo a " + mz.feed + " publicaciones por semana."); }
    else decidir("Reels contra fotos: " + razon.toFixed(1) + "x. Sin diferencia clara; mantengo " + mz.reels + " Reels y " + mz.feed + " publicaciones.");
  } else decidir("Aún junto datos (" + reels.length + " Reels y " + feed.length + " publicaciones con resultados en 4 semanas). Mantengo el plan.");
  // 2) Horarios: cambiar el peor por uno que no se ha probado (una cosa a la vez)
  const porHora = {}; conAlcance(sumaDias(hoy, -42), p => p.tipo === "foto" || p.tipo === "texto").forEach(p => { (porHora[p.hora] = porHora[p.hora] || []).push(p.resultados.alcance); });
  const medidas = E.horarios.filter(h => (porHora[h] || []).length >= 3);
  if (medidas.length === E.horarios.length && E.horarios.length > 1) {
    const peor = medidas.slice().sort((a, b) => mediana(porHora[a]) - mediana(porHora[b]))[0];
    const mejorMed = Math.max(...medidas.map(h => mediana(porHora[h])));
    const nuevo = (CFG.horariosPosibles || []).find(h => !E.horarios.includes(h) && !(porHora[h] && porHora[h].length >= 3 && mediana(porHora[h]) < mediana(porHora[peor])));
    if (nuevo && mediana(porHora[peor]) < mejorMed * 0.7) { E.horarios = E.horarios.filter(h => h !== peor).concat(nuevo).sort(); decidir("A las " + peor + " te ven menos. Pruebo publicar a las " + nuevo + "."); }
  }
  // 3) Productos que salen flojos 3 veces: descansan 4 semanas
  const med = mediana(feed), porProd = {};
  conAlcance(sumaDias(hoy, -56), p => p.prod && p.prod !== "tortilla" && p.prod !== "tienda").forEach(p => { const x = porProd[p.prod] = porProd[p.prod] || { flojas: 0, buenas: 0 }; if (p.resultados.alcance < med * 0.6) x.flojas++; if (p.resultados.alcance >= med * 1.5) x.buenas++; });
  Object.entries(porProd).forEach(([k, x]) => { if (x.flojas >= 3 && !x.buenas && !(E.retirados[k] > hoy)) { E.retirados[k] = sumaDias(hoy, 28); decidir((BANCO.productos[k]?.nombre || k) + " salió flojo 3 veces: lo descanso 4 semanas."); } });
}
function sugerirImpulsos(){
  const ahora = Date.now() / 1000, hoy = hoyMX(), mes = hoy.slice(0, 7);
  const feed = conAlcance(sumaDias(hoy, -28), p => p.tipo !== "historia").map(p => p.resultados.alcance), med = mediana(feed);
  if (feed.length < 4 || !med) return [];
  const umbral = [11, 12].includes(Number(mes.slice(5))) ? 2.5 : 2;
  const imp = CFG.impulsos || {};
  return E.publicaciones.filter(p => p.resultados && typeof p.resultados.alcance === "number" && p.ts < ahora - 12 * 3600 && p.ts > ahora - 60 * 3600 && p.tipo !== "historia" && p.tipo !== "texto")
    .filter(p => p.resultados.alcance >= med * umbral).slice(0, 2)
    .map(p => ({ fbId: p.fbId, url: "https://www.facebook.com/" + p.fbId, texto: (p.texto || "").split("\n")[0].slice(0, 90), alcance: p.resultados.alcance, veces: Math.round(p.resultados.alcance / med * 10) / 10, monto: imp.monto || 50, dias: imp.dias || 3, topeMes: imp.topeMes || 600 }));
}

/* ---------- Plan del día ---------- */
const cuantosHoy = (n, f) => { const d = (diaSemana(f) + 6) % 7; return Math.floor((d + 1) * n / 7) - Math.floor(d * n / 7); };
const TIPOS = ["producto", "comunidad", "producto", "pregunta", "producto"];
function guardarPub(p){ E.publicaciones.push(p); E.publicaciones = E.publicaciones.slice(-250); }

async function corridaManana(){
  const hoy = hoyMX(), ahora = horaMX();
  if (!FORZAR && E.hechos[hoy] && E.hechos[hoy].manana) { log("La corrida de la mañana ya se hizo hoy."); return; }
  if (!FOTOS.length) { errores.push("No hay fotos en la carpeta fotos/. Mándalas desde la app (Más → Conexiones → Enviar al robot)."); return; }
  aprender();
  const nFeed = cuantosHoy(E.mezcla.feed, hoy), nReel = cuantosHoy(E.mezcla.reels, hoy);
  const horas = E.horarios.slice().sort().filter(h => tsDe(hoy, h) > Date.now() / 1000 + 15 * 60);
  log("Plan de hoy:", nFeed, "publicaciones,", nReel, "Reels. Horarios libres:", horas.join(", "));
  const usadasHoy = [];
  // Publicaciones
  for (let i = 0; i < Math.min(nFeed, horas.length); i++) {
    const hora = horas[i], ts = tsDe(hoy, hora);
    let tipo = TIPOS[E.contadorTipos++ % TIPOS.length];
    if (promoActiva(hoy) && i === 0) tipo = "promo";
    try {
      let fbId, f = null, texto;
      if (tipo === "pregunta") { texto = await textoPublicacion(hoy, hora, null, tipo); fbId = await publicarTexto(texto, ts); }
      else {
        f = elegirFoto(tipo === "comunidad" ? ["tienda", "tortilla"] : [], usadasHoy); usadasHoy.push(f.ruta);
        texto = await textoPublicacion(hoy, hora, f, tipo);
        fbId = await publicarFoto(path.join(RAIZ, f.ruta), texto, ts);
      }
      guardarPub({ fbId, tipo: f ? "foto" : "texto", pilar: tipo, fecha: hoy, hora, ts, texto, foto: f && f.ruta, prod: f && f.prod });
      log("Programada", tipo, hora);
    } catch(e){ errores.push("Publicación de las " + hora + ": " + e.message); if (fatal(e)) throw e; }
  }
  // Reels
  for (let i = 0; i < nReel; i++) {
    let hora = CFG.horaReel || "17:00"; if (i) hora = pad(Number(hora.slice(0, 2)) + i) + hora.slice(2);
    const ts = tsDe(hoy, hora);
    try {
      let ruta, fotos = [], pantalla = [], texto;
      const video = VIDEOS.length ? (VIDEOS.filter(v => !E.usadosFotos.includes(v))[0] || pick(VIDEOS)) : null;
      if (video) { ruta = path.join(RAIZ, video); E.usadosFotos.push(video); }
      else {
        for (let k = 0; k < Math.min(4, Math.max(2, FOTOS.length)); k++) { const f = elegirFoto([], usadasHoy.concat(fotos.map(x => x.ruta))); if (f) fotos.push(f); }
        const r = await ia(CONTEXTO() + "\nPrepara un Reel de Facebook hecho con estas " + fotos.length + " fotos (en orden: " + fotos.map(f => prodDe(f)?.nombre || f.prod).join(", ") + '). Devuelve JSON {"pantalla":["texto corto por foto, máx 40 caracteres, el primero engancha en 2 segundos"],"texto":"descripción de 2 a 4 líneas, menciona Macuspana"}');
        pantalla = (r && Array.isArray(r.pantalla) && r.pantalla.length) ? r.pantalla : fotos.map((f, k) => k === 0 ? gancho(hoy, hora, f) : (prodDe(f)?.nombre || "Aquí cerquita"));
        texto = r && r.texto;
        ruta = videoReel(fotos, pantalla);
      }
      texto = (texto || componer(hoy, hora, fotos[0] || null, { tags: false, pregunta: false })).trim() + (texto ? "\n\n📍 " + NEG.direccion + "\n📲 WhatsApp: " + NEG.whatsapp : "") + "\n\n" + NEG.hashtags + " #Reels";
      const fbId = await publicarReel(ruta, texto, ts);
      guardarPub({ fbId, tipo: "reel", fecha: hoy, hora, ts, texto, foto: fotos[0] && fotos[0].ruta, prod: fotos[0] && fotos[0].prod, video: video || null });
      log("Reel programado", hora);
    } catch(e){ errores.push("Reel de las " + hora + ": " + e.message); if (fatal(e)) throw e; }
  }
  await historia(hoy, ahora, usadasHoy);
  (E.hechos[hoy] = E.hechos[hoy] || {}).manana = true;
}
async function historia(hoy, hora, evitar = []){
  try {
    const f = elegirFoto(momento(hora) === "manana" ? ["tortilla", "tienda"] : [], evitar);
    const r = await ia(CONTEXTO() + "\nEscribe el texto corto que va encima de una historia de Facebook con esta foto, hora " + hora + ' (máx 60 caracteres, sin emojis). JSON {"texto":"..."}', f.ruta);
    const t = r && r.texto ? r.texto : gancho(hoy, hora, f);
    const fbId = await publicarHistoria(imagenHistoria(f.ruta, t));
    guardarPub({ fbId, tipo: "historia", fecha: hoy, hora, ts: Math.floor(Date.now() / 1000), texto: t, foto: f.ruta, prod: f.prod });
    log("Historia publicada", hora);
  } catch(e){ errores.push("Historia de las " + hora + ": " + e.message); if (fatal(e)) throw e; }
}
async function corridaTarde(){
  const hoy = hoyMX();
  if (!FORZAR && E.hechos[hoy] && E.hechos[hoy].tarde) { log("La corrida de la tarde ya se hizo hoy."); return; }
  if ((CFG.historiasPorDia ?? 2) >= 2 && FOTOS.length) await historia(hoy, horaMX());
  (E.hechos[hoy] = E.hechos[hoy] || {}).tarde = true;
}

/* ---------- Principal ---------- */
async function main(){
  const hoy = hoyMX(), modo = MODO || (Number(horaMX().slice(0, 2)) < 12 ? "manana" : "tarde");
  log("Robot Espiga Social ·", hoy, horaMX(), "· corrida de la", modo, "·", FOTOS.length, "fotos,", VIDEOS.length, "videos", GEMINI ? "· con IA" : "· sin IA");
  let estadoRobot = "ok";
  if (CFG.activo === false || APP.robotActivo === false) { log("El robot está pausado."); estadoRobot = "pausado"; }
  else if (!TOKEN) { errores.push("Falta la clave de Facebook (secreto FB_PAGE_TOKEN en GitHub)."); estadoRobot = "sin-token"; }
  else {
    try {
      if (!PAGE) PAGE = (await fb("me", { fields: "id,name" })).id;
      await traerResultados();
      if (modo === "manana") await corridaManana(); else await corridaTarde();
    } catch(e){ errores.push(e.message); if (fatal(e)) { estadoRobot = "token-vencido"; errores.push("La clave de Facebook venció o le faltan permisos. Saca una nueva en la app (Más → Conexiones) y cámbiala en GitHub."); } }
  }
  // Limpiar memoria vieja
  Object.keys(E.hechos).forEach(f => { if (f < sumaDias(hoy, -14)) delete E.hechos[f]; });
  E.impulsosSugeridos = sugerirImpulsos();
  escribirJSON("datos/estado.json", E);
  const semana = E.publicaciones.filter(p => p.fecha >= sumaDias(hoy, -6)), conR = semana.filter(p => p.resultados && typeof p.resultados.alcance === "number");
  escribirJSON("datos/hoy.json", {
    generado: new Date().toISOString(), fecha: hoy, estado: estadoRobot, errores,
    erroresAnteriores: HOY.fecha === hoy ? (HOY.errores || []).concat(HOY.erroresAnteriores || []).slice(0, 10) : [],
    hoy: E.publicaciones.filter(p => p.fecha === hoy).map(p => ({ tipo: p.tipo, hora: p.hora, texto: p.texto, foto: p.foto })),
    plan: { mezcla: E.mezcla, horarios: E.horarios, historiasPorDia: CFG.historiasPorDia ?? 2 },
    semana: { publicadas: semana.length, personas: conR.reduce((a, p) => a + p.resultados.alcance, 0), interacciones: conR.reduce((a, p) => a + (p.resultados.reacciones || 0) + (p.resultados.comentarios || 0) + (p.resultados.compartidos || 0), 0) },
    mejores: E.publicaciones.filter(p => p.resultados && typeof p.resultados.alcance === "number" && p.fecha >= sumaDias(hoy, -28)).sort((a, b) => b.resultados.alcance - a.resultados.alcance).slice(0, 5)
      .map(p => ({ fecha: p.fecha, tipo: p.tipo, texto: (p.texto || "").split("\n")[0].slice(0, 90), foto: p.foto, url: "https://www.facebook.com/" + p.fbId, ...p.resultados })),
    impulsos: E.impulsosSugeridos,
    decisiones: E.decisiones.slice(-8).reverse(),
    fotos: FOTOS.length, videos: VIDEOS.length, ia: !!GEMINI
  });
  if (!process.env.GUARDAR_TMP) fs.rmSync(TMP, { recursive: true, force: true }); else log("Archivos temporales en", TMP);
  errores.forEach(e => console.error("⚠️ ", e));
  if (estadoRobot === "token-vencido" || estadoRobot === "sin-token") process.exitCode = 1;   // GitHub te manda un correo
}
main();
