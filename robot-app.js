/* Espiga Social — conexión con el robot (GitHub Actions).
   El robot publica solo en Facebook. La app: muestra lo que hizo (datos/hoy.json), te sugiere anuncios,
   te prepara lo de grupos y le manda al robot tus fotos, frases, datos del negocio y promos.
   Se carga antes del script principal; usa S, render, toast, etc. al llamarse. */
"use strict";

/* ---------- Leer lo que hizo el robot ---------- */
/* El robot vive en un repositorio PRIVADO: todo se lee con tu clave de GitHub (guardada solo en este celular). */
const ROBOT_REPO_DEF = "LuisAvalos29/espigarobot";
async function ghRaw(ruta){
  const r = await fetch("https://api.github.com/repos/" + ghRepo() + "/contents/" + ruta + "?t=" + Date.now(), { headers: { Authorization: "Bearer " + S.gh.token, Accept: "application/vnd.github.raw" }, cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r;
}
async function robotCargar(){
  if (!S.gh || !S.gh.token) { S.robot = null; S.robotCargado = true; S.robotSinClave = true; return; }
  S.robotSinClave = false;
  try { S.robot = await (await ghRaw("datos/hoy.json")).json(); S.robotError = ""; }
  catch(e){ S.robotError = /401|403/.test(e.message) ? "clave" : /404/.test(e.message) ? "" : "red"; S.robot = S.robot || null; }
  S.robotCargado = true;
}
// Las fotos del robot son privadas: se bajan con la clave y se muestran desde la memoria del celular.
const robotImgs = {};
const robotFoto = ruta => ruta ? (robotImgs[ruta] || "data:image/gif;base64,R0lGODlhAQABAAAAACw=") + '" data-rfoto="' + esc(ruta) : "";
async function robotFotosCargar(){
  const imgs = [...document.querySelectorAll("img[data-rfoto]")].filter(i => !robotImgs[i.dataset.rfoto]);
  for (const img of imgs) {
    const ruta = img.dataset.rfoto;
    try { if (!robotImgs[ruta]) robotImgs[ruta] = URL.createObjectURL(await (await ghRaw(ruta.split("/").map(encodeURIComponent).join("/"))).blob()); document.querySelectorAll('img[data-rfoto="' + ruta + '"]').forEach(x => x.src = robotImgs[ruta]); } catch(e){}
  }
}
const ICO_TIPO = { foto: "🖼️ Publicación", texto: "💬 Pregunta", reel: "🎬 Reel", historia: "⭕ Historia" };

function vRobot(){
  const R = S.robot;
  if (!S.robotCargado) return '<div class="card muted">Revisando qué hizo el robot…</div>';
  if (S.robotSinClave) return '<div class="card"><h2>🤖 Robot de Facebook</h2><p class="small">Para ver lo que hace el robot, pega tu <b>clave de GitHub</b> en <b>Más → Conexiones</b>.</p></div>';
  if (S.robotError === "clave") return '<div class="card"><h2>🤖 Robot de Facebook</h2><div class="aviso err">La clave de GitHub no sirve o venció. Crea otra (Más → Conexiones → "Cómo sacar la clave").</div></div>';
  if (!R) return '<div class="card"><h2>🤖 Robot de Facebook</h2><p class="small">El robot todavía no ha trabajado. Revisa en <b>Más → Conexiones</b> que esté todo listo (clave de Facebook en GitHub y fotos enviadas).</p></div>';
  const cuando = new Date(R.generado).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  const viejo = Date.now() - new Date(R.generado).getTime() > 36 * 3600000;
  let h = '<div class="card"><h2>🤖 Robot de Facebook</h2>';
  if (R.estado === "token-vencido" || R.estado === "sin-token") h += '<div class="aviso err">⚠️ <b>El robot no pudo entrar a Facebook.</b> Ve a Más → Conexiones y sigue "Clave de Facebook para el robot".</div>';
  else if (R.estado === "pausado") h += '<div class="aviso">⏸️ El robot está en pausa (Más → Conexiones).</div>';
  else if (viejo) h += '<div class="aviso err">⚠️ El robot no ha trabajado desde el ' + esc(cuando) + '. Revisa la pestaña <b>Actions</b> de tu repositorio en GitHub.</div>';
  else h += '<p class="small">✅ Trabajando solo. Última vez: <b>' + esc(cuando) + '</b>' + (R.ia ? ' · con IA' : '') + '</p>';
  const hoy = (R.fecha === hoyStr() ? R.hoy : []) || [];
  if (hoy.length) {
    h += '<p class="small"><b>Hoy en Facebook:</b></p>';
    hoy.slice().sort((a, b) => a.hora.localeCompare(b.hora)).forEach(p => {
      h += '<div class="agenda lista" style="align-items:flex-start">' + (p.foto ? '<img src="' + robotFoto(p.foto) + '" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex:none">' : '<div style="width:52px;font-size:28px;text-align:center">💬</div>') +
        '<div class="bd"><b>' + esc(p.hora) + ' · ' + esc(ICO_TIPO[p.tipo] || p.tipo) + '</b><div class="muted small">' + esc((p.texto || "").split("\n")[0].slice(0, 90)) + '</div></div></div>';
    });
  } else if (R.estado === "ok") h += '<p class="muted small">Hoy todavía no hay nada publicado; el robot trabaja a las 5:47 am y a las 5:13 pm.</p>';
  const errs = (R.errores || []).concat(R.erroresAnteriores || []);
  if (errs.length) h += '<div class="aviso err small"><b>Avisos del robot:</b><br>' + errs.slice(0, 5).map(esc).join("<br>") + '</div>';
  h += '<p class="muted small">Plan actual: ' + R.plan.mezcla.feed + ' publicaciones, ' + R.plan.mezcla.reels + ' Reels y ' + (R.plan.historiasPorDia * 7) + ' historias por semana · horarios ' + esc(R.plan.horarios.join(", ")) + '. Fotos en el robot: ' + R.fotos + '.</p>';
  return h + '</div>';
}

/* ---------- Anuncios sugeridos (tú decides y pagas) ---------- */
function impulsosPendientes(){
  const R = S.robot; if (!R || !R.impulsos) return [];
  const vistos = S.mkt.impulsosVistos || {};
  return R.impulsos.filter(x => !vistos[x.fbId]);
}
function gastoMes(){ const mes = hoyStr().slice(0, 7); return (S.mkt.impulsosHechos || []).filter(x => x.fecha.startsWith(mes)).reduce((a, x) => a + x.monto * x.dias, 0); }
function vImpulsos(){
  const l = impulsosPendientes(); if (!l.length) return "";
  const tope = l[0].topeMes || 600, gasto = gastoMes();
  let h = '<div class="card"><h2>💰 Vale la pena impulsar</h2><p class="small">Estas publicaciones llegaron a mucha más gente de lo normal <b>sin pagar</b>. Si les pones poco dinero, rinden más. Tú decides: el robot nunca gasta solo.</p><p class="muted small">Gastado este mes: $' + gasto + ' de $' + tope + ' sugeridos.</p>';
  l.forEach((x, i) => {
    h += '<div class="card" style="margin:8px 0"><b>' + esc(x.texto) + '</b><p class="small">Llegó a <b>' + x.alcance + '</b> personas (' + x.veces + ' veces tu promedio).<br>Sugerencia: <b>$' + x.monto + ' al día por ' + x.dias + ' días</b> (total $' + (x.monto * x.dias) + '), público: personas en Macuspana, objetivo "Mensajes".</p>' +
      (gasto + x.monto * x.dias > tope ? '<p class="muted small">Ojo: con este pasarías tu tope del mes.</p>' : '') +
      '<a class="btn verde" href="' + esc(x.url) + '" target="_blank" rel="noopener">Abrir en Facebook → "Promocionar publicación"</a><div class="row"><button class="btn claro" data-imp-ok="' + i + '">✔ Lo promocioné</button><button class="btn borde" data-imp-no="' + i + '">Ahora no</button></div></div>';
  });
  return h + '</div>';
}
function bindImpulsos(){
  const l = impulsosPendientes();
  const marcar = async (x, hecho) => {
    S.mkt.impulsosVistos = Object.assign({}, S.mkt.impulsosVistos, { [x.fbId]: hoyStr() });
    if (hecho) S.mkt.impulsosHechos = (S.mkt.impulsosHechos || []).concat({ fecha: hoyStr(), fbId: x.fbId, monto: x.monto, dias: x.dias });
    await guardarMkt(); render();
  };
  $app.querySelectorAll("[data-imp-ok]").forEach(b => b.onclick = () => marcar(l[Number(b.dataset.impOk)], true));
  $app.querySelectorAll("[data-imp-no]").forEach(b => b.onclick = () => marcar(l[Number(b.dataset.impNo)], false));
}

/* ---------- Resultados ---------- */
function vRobotResultados(){
  const R = S.robot;
  if (!R) return '<div class="card muted">Aún no hay resultados del robot.</div>';
  let h = '<div class="card"><h2>📊 Últimos 7 días</h2><div class="row" style="text-align:center"><div><div style="font-size:26px;font-weight:700">' + R.semana.publicadas + '</div><div class="muted small">publicaciones</div></div><div><div style="font-size:26px;font-weight:700">' + R.semana.personas + '</div><div class="muted small">personas alcanzadas</div></div><div><div style="font-size:26px;font-weight:700">' + R.semana.interacciones + '</div><div class="muted small">reacciones y comentarios</div></div></div></div>';
  if (R.mejores && R.mejores.length) {
    h += '<div class="card"><h2>🏆 Lo que mejor funcionó (4 semanas)</h2>';
    R.mejores.forEach(p => h += '<div class="agenda" style="align-items:flex-start">' + (p.foto ? '<img src="' + robotFoto(p.foto) + '" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex:none">' : '') + '<div class="bd"><b>' + esc(p.texto) + '</b><div class="muted small">' + esc(fechaBonita(p.fecha)) + ' · ' + esc(ICO_TIPO[p.tipo] || p.tipo) + ' · ' + (p.alcance || 0) + ' personas · ' + ((p.reacciones || 0) + (p.comentarios || 0)) + ' reacciones/comentarios</div></div><a class="mini" href="' + esc(p.url) + '" target="_blank" rel="noopener">Ver</a></div>');
    h += '</div>';
  }
  if (R.decisiones && R.decisiones.length) h += '<div class="card"><h2>🧠 Lo que decidió el robot</h2>' + R.decisiones.map(d => '<p class="small">• <b>' + esc(fechaBonita(d.fecha)) + ':</b> ' + esc(d.texto) + '</p>').join("") + '</div>';
  return h;
}

/* ---------- Enviar al robot (GitHub) ---------- */
function ghRepo(){
  return (S.gh && S.gh.repo) || ROBOT_REPO_DEF;
}
async function ghApi(ruta, metodo = "GET", cuerpo){
  const r = await fetch("https://api.github.com/repos/" + ghRepo() + "/" + ruta, { method: metodo, headers: { Authorization: "Bearer " + S.gh.token, Accept: "application/vnd.github+json", "Content-Type": "application/json" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  if (r.status === 404 && metodo === "GET") return null;
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error("La clave de GitHub no sirve o venció. Crea otra.");
  if (r.status === 403 || r.status === 404) throw new Error("La clave de GitHub no tiene permiso de escribir en " + ghRepo() + ".");
  if (!r.ok) throw new Error("GitHub respondió: " + (j.message || r.status));
  return j;
}
const aBase64 = blob => new Promise((ok, mal) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1]); fr.onerror = mal; fr.readAsDataURL(blob); });
async function ghGuardar(ruta, base64, mensaje){
  const actual = await ghApi("contents/" + ruta);
  return ghApi("contents/" + ruta, "PUT", { message: mensaje, content: base64, sha: actual && actual.sha });
}
async function robotEnviar(){
  if (!S.gh || !S.gh.token) { toast("Primero pega la clave de GitHub"); return; }
  S.ghOcupado = true; render();
  const msg = t => { S.ghMsg = t; const el = document.getElementById("ghMsg"); if (el) el.textContent = t; };
  try {
    msg("Enviando datos del negocio, frases y promos…");
    const app = { actualizado: new Date().toISOString(), robotActivo: S.gh.activo !== false, negocio: { nombre: S.cfg.nombre, ciudad: S.cfg.ciudad, direccion: S.cfg.direccion, whatsapp: S.cfg.whatsapp, horario: S.cfg.horario, hashtags: S.cfg.hashtags }, banco: S.banco, promos: S.mkt.promos || [] };
    await ghGuardar("datos/app.json", btoa(unescape(encodeURIComponent(JSON.stringify(app, null, 1)))), "App: datos del negocio y frases");
    const subidas = S.gh.subidas || {}, nuevas = S.fotos.filter(f => !subidas[f.id]);
    for (let i = 0; i < nuevas.length; i++) {
      const f = nuevas[i], carpeta = (f.prod || "tienda").replace(/[^a-z0-9_-]/gi, "") || "tienda", ruta = "fotos/" + carpeta + "/" + f.id + ".jpg";
      msg("Enviando foto " + (i + 1) + " de " + nuevas.length + "…");
      await ghGuardar(ruta, await aBase64(f.blob), "App: foto " + (f.producto || carpeta));
      subidas[f.id] = ruta; S.gh.subidas = subidas; await kvSet("gh", S.gh);
    }
    // Fotos que borraste en la app: también se quitan del robot
    const ids = new Set(S.fotos.map(f => f.id));
    for (const [id, ruta] of Object.entries(subidas)) if (!ids.has(id)) {
      msg("Quitando fotos borradas…");
      const a = await ghApi("contents/" + ruta);
      if (a) await ghApi("contents/" + ruta, "DELETE", { message: "App: quitar foto", sha: a.sha });
      delete subidas[id];
    }
    S.gh.subidas = subidas; S.gh.ultimoEnvio = new Date().toISOString(); await kvSet("gh", S.gh);
    await robotCargar();
    toast("✅ Listo: el robot ya tiene tus fotos y frases", 4500);
  } catch(e){ toast(e.message, 7000); }
  S.ghOcupado = false; S.ghMsg = ""; render();
}
function vRobotConexion(){
  const g = S.gh || {}, n = Object.keys(g.subidas || {}).length, pend = S.fotos.filter(f => !(g.subidas || {})[f.id]).length;
  let h = '<div class="card"><h2>🤖 Robot (GitHub)</h2><p class="muted small">El robot vive en tu repositorio <b>privado</b> ' + esc(ghRepo()) + ' (nadie más ve tus fotos ni datos) y publica solo en Facebook todos los días. Desde aquí le mandas tus fotos, frases, datos del negocio y promos.</p>';
  h += '<label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="ghActivo" style="width:auto"' + (g.activo !== false ? " checked" : "") + '> Robot encendido</label><p class="muted small">Si lo apagas, toca "Enviar al robot" para que se entere.</p>';
  if (g.token) h += '<p class="small">Clave de GitHub guardada ✅. Fotos en el robot: <b>' + n + '</b>' + (pend ? ' · <b>' + pend + ' nuevas por enviar</b>' : '') + '.' + (g.ultimoEnvio ? '<br><span class="muted">Último envío: ' + esc(new Date(g.ultimoEnvio).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })) + '</span>' : '') + '</p>';
  h += '<label>Clave de GitHub ' + (g.token ? '(para cambiarla)' : '') + '</label><input id="ghToken" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…">';
  h += '<button class="btn borde" id="btnGhGuia">📖 Cómo sacar la clave de GitHub</button>';
  h += S.ghOcupado ? '<div class="aviso"><span id="ghMsg">' + esc(S.ghMsg || "Enviando…") + '</span><br><span class="small">No cierres la app.</span></div>' : '<button class="btn verde" id="btnGhEnviar">📤 Enviar fotos, frases y promos al robot</button>';
  return h + '</div>';
}
function ghGuia(){
  const m = modal('<h3 style="margin-top:0">📖 Clave de GitHub (una sola vez)</h3><ol class="small" style="padding-left:18px">' +
    '<li>Entra a <b>github.com</b> → tu foto → <b>Settings</b> → hasta abajo <b>Developer settings</b> → <b>Personal access tokens</b> → <b>Fine-grained tokens</b> → <b>Generate new token</b>.</li>' +
    '<li>Nombre: <i>Espiga app</i>. Expiración: <b>1 año</b> (o la más larga que deje).</li>' +
    '<li>Repository access: <b>Only select repositories</b> → elige <b>' + esc(ghRepo().split("/")[1]) + '</b>.</li>' +
    '<li>Permissions → Repository permissions → <b>Contents: Read and write</b>.</li>' +
    '<li><b>Generate token</b>, cópialo y pégalo aquí.</li></ol><p class="muted small">La clave se guarda solo en este celular y no va en los respaldos.</p><button class="btn borde">Cerrar</button>');
  m.querySelector(".btn").onclick = () => m.remove();
}
function bindRobotConexion(){
  const q = id => document.getElementById(id);
  q("btnGhGuia") && (q("btnGhGuia").onclick = ghGuia);
  q("ghActivo") && (q("ghActivo").onchange = async () => { S.gh = Object.assign({}, S.gh, { activo: q("ghActivo").checked }); await kvSet("gh", S.gh); toast("Toca \"Enviar al robot\" para aplicar el cambio"); });
  q("btnGhEnviar") && (q("btnGhEnviar").onclick = async () => {
    const t = limpiarClave(q("ghToken").value || "");
    if (t) { S.gh = Object.assign({}, S.gh, { token: t }); await kvSet("gh", S.gh); }
    await robotEnviar();
  });
  q("btnFbCopiar") && (q("btnFbCopiar").onclick = () => { copiar(S.fb.token); toast("Clave copiada. Pégala en GitHub como FB_PAGE_TOKEN", 5000); });
}
