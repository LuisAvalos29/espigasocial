/* Espiga Social — conexión con la página de Facebook (Graph API de Meta).
   Se carga antes del script principal: aquí solo se definen funciones; usan S, render, toast, etc. al llamarse. */
"use strict";
const GRAPH = "https://graph.facebook.com/v25.0/";
const URL_SITIO = location.origin + location.pathname.replace(/[^/]*$/, "");

function fbMsgError(e){
  const code = e && e.code, msg = (e && (e.error_user_msg || e.message)) || "error desconocido";
  if (code === 190 || code === 102) return "La conexión con Facebook venció o no es válida. Vuelve a conectar en Más → Facebook.";
  if (code === 10 || (code >= 200 && code < 300)) return "A tu app de Meta le falta un permiso (" + msg + "). Revisa que tenga pages_manage_posts, pages_read_engagement, pages_show_list y read_insights.";
  if ([4, 17, 32, 613, 80001].includes(code)) return "Facebook pidió esperar un momento (límite de uso). Intenta en unos minutos.";
  if (code === 100 && /schedul/i.test(msg)) return "Facebook no aceptó la hora: debe ser entre 10 minutos y 30 días a futuro.";
  return "Facebook respondió: " + msg + (code ? " [código " + code + "]" : "");
}
async function fbApi(path, params = {}, metodo = "GET", form = null){
  const token = params.access_token || (S.fb && S.fb.token);
  const url = new URL(GRAPH + path), opts = { method: metodo };
  const p = Object.assign({}, params); delete p.access_token;
  if (form) { form.append("access_token", token); Object.entries(p).forEach(([k, v]) => form.append(k, v)); opts.body = form; }
  else if (metodo === "GET" || metodo === "DELETE") { Object.entries(p).forEach(([k, v]) => url.searchParams.set(k, v)); url.searchParams.set("access_token", token); }
  else { opts.body = new URLSearchParams(Object.assign(p, { access_token: token })); }
  let r;
  try { r = await fetch(url.toString(), opts); } catch(e){ throw new Error("No se pudo llegar a Facebook. Revisa tu internet."); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) { const err = new Error(fbMsgError(j.error || { message: "HTTP " + r.status })); err.code = j.error && j.error.code; throw err; }
  return j;
}

/* ---------- Conectar ---------- */
async function fbPaginasDeToken(token){
  // 1) ¿Es token de usuario? Sus páginas traen un token de página (que no vence si el de usuario es de larga duración).
  try { const j = await fbApi("me/accounts", { fields: "id,name,access_token", limit: "50", access_token: token }); if (j.data && j.data.length) return j.data; } catch(e){ if (e.code === 190) throw e; }
  // 2) ¿Es directamente un token de página? (las páginas tienen "category"; los usuarios no)
  const yo = await fbApi("me", { fields: "id,name,category", access_token: token });
  return [{ id: yo.id, name: yo.name, access_token: token }];
}
async function fbGuardarPagina(pg){
  S.fb = { pageId: pg.id, pageName: pg.name, token: pg.access_token, conectado: new Date().toISOString() };
  await kvSet("fb", S.fb);
  toast("✅ Conectado a la página: " + pg.name, 4000); render();
}
async function fbConectar(token){
  token = limpiarClave(token);
  if (!token) { toast("Pega el token de Facebook"); return; }
  S.fbOcupado = true; S.fbMsg = "Conectando…"; render();
  try {
    const paginas = await fbPaginasDeToken(token);
    S.fbOcupado = false; S.fbMsg = "";
    if (paginas.length === 1) return await fbGuardarPagina(paginas[0]);
    const m = modal('<h3 style="margin-top:0">¿Cuál página?</h3>' + paginas.map((p, i) => '<button class="btn claro" data-i="' + i + '">' + esc(p.name) + '</button>').join("") + '<button class="btn borde" data-x="c">Cancelar</button>');
    m.querySelector('[data-x="c"]').onclick = () => { m.remove(); render(); };
    m.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { m.remove(); fbGuardarPagina(paginas[Number(b.dataset.i)]); });
  } catch(e){
    S.fbOcupado = false; S.fbMsg = "";
    toast(e.code === 100 ? "Ese token no es de una página ni trae páginas. Revisa que al generarlo hayas elegido tu página La Espiga Dorada." : e.message, 7000);
  }
  render();
}

/* ---------- Programar ---------- */
function fbElegible(p){
  if (!S.fb || p.estado !== "pendiente" || p.fbEstado === "programada" || p.formato === "historia") return false;
  const t = dt(p).getTime(), now = Date.now();
  return t > now + 12 * 60000 && t < now + 29 * 86400000 && (p.sinFoto || !!fotoById(p.fotoId));
}
function fbMsgEn(texto){ S.fbMsg = texto; const el = document.getElementById("fbMsg"); if (el) el.textContent = texto; }
async function fbProgramarUno(p, onMsg){
  const ts = String(Math.floor(dt(p).getTime() / 1000));
  if (p.formato === "reel") {
    let m = S.media[p.id];
    if (!m || !m.blob) {
      onMsg("Creando el video del Reel (no cambies de app)…");
      const blob = await crearVideoReel(p, x => onMsg("Creando el video del Reel… " + Math.round(x * 100) + "%"));
      m = S.media[p.id] = { blob, url: URL.createObjectURL(blob), tipo: "video" };
    }
    if (!/mp4/.test(m.blob.type)) throw new Error("Facebook necesita el Reel en MP4. Prográmalo desde el iPhone.");
    onMsg("Subiendo el video a Facebook…");
    const ini = await fbApi(S.fb.pageId + "/video_reels", { upload_phase: "start" }, "POST");
    let r;
    try { r = await fetch(ini.upload_url || ("https://rupload.facebook.com/video-upload/v25.0/" + ini.video_id), { method: "POST", headers: { Authorization: "OAuth " + S.fb.token, offset: "0", file_size: String(m.blob.size) }, body: m.blob }); }
    catch(e){ throw new Error("Facebook no dejó subir el video desde la app. Este Reel súbelo a mano con \"Compartir video\"."); }
    const ju = await r.json().catch(() => ({}));
    if (!r.ok || ju.error || ju.success === false) throw new Error(fbMsgError(ju.error || { message: "no se pudo subir el video" }));
    onMsg("Programando el Reel…");
    await fbApi(S.fb.pageId + "/video_reels", { upload_phase: "finish", video_id: ini.video_id, video_state: "SCHEDULED", scheduled_publish_time: ts, description: p.texto }, "POST");
    return { fbId: ini.video_id, fbTipo: "reel" };
  }
  if (p.sinFoto) {
    onMsg("Programando la publicación de texto…");
    const j = await fbApi(S.fb.pageId + "/feed", { message: p.texto, published: "false", scheduled_publish_time: ts }, "POST");
    return { fbId: j.id, fbTipo: "texto" };
  }
  const f = fotoById(p.fotoId), fd = new FormData();
  fd.append("source", new File([f.blob], "espiga.jpg", { type: "image/jpeg" }));
  onMsg("Subiendo la foto a Facebook…");
  const j = await fbApi(S.fb.pageId + "/photos", { message: p.texto, published: "false", scheduled_publish_time: ts }, "POST", fd);
  return { fbId: j.post_id || j.id, fbFoto: j.id, fbTipo: "foto" };
}
async function fbProgramarVarios(lista){
  if (!lista.length) { toast("No hay publicaciones para programar (deben ser entre 15 minutos y 29 días a futuro)", 4500); return; }
  S.fbOcupado = true; S.fbFallas = []; let ok = 0;
  render();
  for (let i = 0; i < lista.length; i++) {
    const p = lista[i], pre = "(" + (i + 1) + " de " + lista.length + ") ";
    fbMsgEn(pre + "Preparando…");
    try {
      const r = await fbProgramarUno(p, t => fbMsgEn(pre + t));
      Object.assign(p, r, { fbEstado: "programada", fbProgramadaEn: new Date().toISOString() });
      await guardarPosts(); ok++;
    } catch(e){
      S.fbFallas.push(fechaBonita(p.fecha) + " " + p.hora + (p.formato === "reel" ? " (Reel)" : "") + ": " + e.message);
      if (e.code === 190 || /permiso|venció/.test(e.message)) break;
    }
  }
  S.fbOcupado = false; S.fbMsg = "";
  toast(ok ? "✅ " + ok + " programadas en Facebook. Se publicarán solas." : "No se pudo programar. Revisa los errores en Semana.", 5000);
  render();
}
async function fbCancelar(p){
  if (!await confirmar("¿Quitar esta publicación de la programación de Facebook? Quedará pendiente en la app.", "Quitar de Facebook")) return;
  try { await fbApi(p.fbId, {}, "DELETE"); }
  catch(e){ if (!/does not exist|no existe|Unsupported/i.test(e.message)) { toast(e.message, 6000); return; } }
  delete p.fbId; delete p.fbFoto; delete p.fbTipo; delete p.fbEstado; delete p.fbProgramadaEn;
  await guardarPosts(); toast("Quitada de Facebook"); render();
}
async function fbActualizarEstados(){
  let cambio = false; const now = Date.now();
  for (const p of S.posts) if (p.fbEstado === "programada" && p.estado === "pendiente" && dt(p).getTime() < now - 60000) {
    p.estado = "publicada"; p.fbEstado = "publicada"; p.publicadaEn = dt(p).toISOString(); cambio = true;
  }
  if (cambio) await guardarPosts();
  return cambio;
}

/* ---------- Resultados ---------- */
async function fbTraerResultados(silencioso){
  if (!S.fb) return;
  const now = Date.now(), lista = S.posts.filter(p => p.fbId && p.estado === "publicada" && dt(p).getTime() < now - 30 * 60000 && dt(p).getTime() > now - 28 * 86400000);
  if (!lista.length) { if (!silencioso) toast("Aún no hay publicaciones hechas por la app en Facebook para revisar."); return; }
  S.fbLeyendo = true; if (!silencioso) render();
  let n = 0, err = "";
  for (const p of lista) {
    const res = Object.assign({}, p.resultados || {});
    try {
      if (p.fbTipo === "reel") {
        const j = await fbApi(p.fbId, { fields: "likes.summary(true).limit(0),comments.summary(true).limit(0)" });
        res.reacciones = (j.likes && j.likes.summary && j.likes.summary.total_count) || 0;
        res.comentarios = (j.comments && j.comments.summary && j.comments.summary.total_count) || 0;
        try { const ins = await fbApi(p.fbId + "/video_insights", { metric: "blue_reels_play_count" }); const v = ins.data && ins.data[0] && ins.data[0].values && ins.data[0].values[0] && ins.data[0].values[0].value; if (typeof v === "number") res.alcance = v; } catch(e){}
      } else {
        const j = await fbApi(p.fbId, { fields: "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares" });
        res.reacciones = (j.reactions && j.reactions.summary && j.reactions.summary.total_count) || 0;
        res.comentarios = (j.comments && j.comments.summary && j.comments.summary.total_count) || 0;
        res.compartidos = (j.shares && j.shares.count) || 0;
        try { const ins = await fbApi(p.fbId + "/insights", { metric: "post_total_media_view_unique" }); const v = ins.data && ins.data[0] && ins.data[0].values && ins.data[0].values[0] && ins.data[0].values[0].value; if (typeof v === "number") res.alcance = v; } catch(e){ err = err || e.message; }
      }
      p.resultados = res; p.resultadosFB = new Date().toISOString(); n++;
    } catch(e){ err = e.message; if (e.code === 190) break; }
  }
  await guardarPosts(); S.fbUltima = Date.now(); await kvSet("fbUltima", S.fbUltima);
  S.fbLeyendo = false;
  if (!silencioso) toast(n ? "📊 Resultados actualizados de " + n + " publicaciones" + (err ? ". Aviso: " + err : "") : "No se pudieron leer resultados: " + err, 6000);
  render();
}

/* ---------- Vistas ---------- */
function fbBox(p){
  return '<div class="aviso" style="margin-top:10px">✅ <b>Programada en Facebook</b> para el ' + esc(fechaBonita(p.fecha)) + ' a las ' + esc(p.hora) + '. Se publicará sola; no tienes que hacer nada.</div><button class="btn rojo" data-act="fbCancelar">Quitar de Facebook</button>';
}
function fbBotonUno(p){ return fbElegible(p) ? '<button class="btn verde" data-act="fbUno"' + (S.fbOcupado ? " disabled" : "") + '>📘 Programar en Facebook (se publica sola)</button>' : ""; }
function vFacebookSemana(){
  if (!S.fb) return '<div class="card"><h3>📘 Publicar solo en Facebook</h3><p class="muted small">Conecta tu página en <b>Más → Conectar Facebook</b> y tus publicaciones y Reels se programarán directo en Facebook: se publican solas aunque tengas el celular apagado.</p></div>';
  const elegibles = S.posts.filter(fbElegible), nReels = elegibles.filter(p => p.formato === "reel").length;
  const prog = S.posts.filter(p => p.fbEstado === "programada" && p.estado === "pendiente").length;
  const hist = S.posts.filter(p => p.formato === "historia" && p.estado === "pendiente" && p.fecha >= hoyStr()).length;
  let h = '<div class="card"><h3>📘 Facebook: ' + esc(S.fb.pageName) + '</h3>';
  h += '<p class="small">Ya programadas en Facebook: <b>' + prog + '</b>. Listas para mandar: <b>' + elegibles.length + '</b>' + (nReels ? ' (' + nReels + ' Reels)' : "") + '.</p>';
  if (S.fbOcupado) h += '<div class="aviso"><span id="fbMsg">' + esc(S.fbMsg || "Trabajando…") + '</span><br><span class="small">No cambies de app ni bloquees el celular.</span></div>';
  else if (elegibles.length) h += '<button class="btn verde" id="btnFbTodo">📘 Programar ' + elegibles.length + ' en Facebook</button>' + (nReels ? '<p class="muted small">Los Reels se crean y suben uno por uno (unos 20 s cada uno).</p>' : "");
  else h += '<p class="muted small">Programa tu semana (botón ✨ Programar) y aquí podrás mandarla a Facebook. Facebook acepta publicaciones de 15 minutos a 29 días a futuro.</p>';
  if (hist) h += '<p class="muted small">📱 Las historias no se pueden programar en Facebook; esas te aparecen en Hoy para subirlas tú.</p>';
  if (S.fbFallas && S.fbFallas.length) h += '<div class="aviso err" style="margin-top:8px"><b>No se pudieron programar:</b><br>' + S.fbFallas.map(esc).join("<br>") + '</div>';
  return h + '</div>';
}
function vFacebookMas(){
  let h = '<div class="card"><h2>📘 Conectar Facebook</h2>';
  if (S.fb) {
    h += '<p class="small">✅ Conectado a <b>' + esc(S.fb.pageName) + '</b> desde el ' + esc(fechaBonita(S.fb.conectado.slice(0, 10))) + '.</p>';
    h += '<p class="muted small">Últimos resultados: ' + (S.fbUltima ? esc(new Date(S.fbUltima).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })) : "aún no") + '. El robot los revisa solo dos veces al día.</p>';
    h += '<div class="aviso small"><b>Clave de Facebook para el robot</b> (una vez, o cuando el robot diga que venció):<br>1. Toca el botón de abajo para copiarla.<br>2. En GitHub, abre tu repositorio → <b>Settings → Secrets and variables → Actions → New repository secret</b> (o edita el que ya existe).<br>3. Nombre: <b>FB_PAGE_TOKEN</b>, pega la clave y guarda.</div><button class="btn verde" id="btnFbCopiar">📋 Copiar clave para el robot</button>';
    h += '<button class="btn rojo" id="btnFbQuitar">Desconectar Facebook</button>';
  } else {
    h += '<p class="muted small">Con tu página conectada, la app programa tus publicaciones y Reels directo en Facebook (se publican solas) y trae los resultados sin que los escribas. El token se guarda <b>solo en este celular</b> y no va en los respaldos.</p>';
    h += '<button class="btn claro" id="btnFbGuia">📖 Ver pasos para obtener el token</button>';
    h += '<label>Token de Facebook</label><input id="fbToken" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Pega aquí el token (empieza con EAA…)">';
    h += S.fbOcupado ? '<button class="btn" disabled>Conectando…</button>' : '<button class="btn verde" id="btnFbConectar">Conectar mi página</button>';
  }
  return h + '</div>';
}
function fbGuia(){
  const priv = URL_SITIO + "privacidad.html";
  const m = modal('<h3 style="margin-top:0">📖 Conectar tu página (una sola vez)</h3><p class="muted small">Hazlo de preferencia en computadora, con tu perfil de <b>Luis Avalos</b> (el que administra la página). Los nombres de los botones pueden variar un poco.</p><ol class="small" style="padding-left:18px">' +
    '<li><b>Crea la app de Meta:</b> entra a <b>developers.facebook.com</b> → <b>Mis apps</b> → <b>Crear app</b>. Nombre: <i>Espiga Social</i>. Caso de uso: <b>"Administrar todo en tu página"</b> (Manage everything on your Page). Si pide portafolio comercial, puedes omitirlo.</li>' +
    '<li><b>Permisos:</b> en <b>Casos de uso → Personalizar</b>, agrega: <b>pages_show_list, pages_read_engagement, pages_manage_posts</b> y <b>read_insights</b>.</li>' +
    '<li><b>Datos básicos:</b> en <b>Configuración de la app → Básica</b> pon:<br>• URL de política de privacidad y de eliminación de datos: <b style="word-break:break-all">' + esc(priv) + '</b><br>• Categoría: Negocios y páginas. Guarda.</li>' +
    '<li><b>Pásala a modo "En vivo" (Live / Publicar).</b> ⚠️ Importante: en modo desarrollo, lo que se publica <b>solo lo ves tú</b>.</li>' +
    '<li><b>Saca el token:</b> <b>Herramientas → Explorador de la API Graph</b>. Elige tu app → <b>Obtener token de acceso de usuario</b> → marca los 4 permisos → <b>Generate Access Token</b> → acepta y <b>elige tu página La Espiga Dorada</b>.</li>' +
    '<li><b>Hazlo de larga duración:</b> copia el token → <b>Herramientas → Depurador de token de acceso</b> → pégalo → <b>Depurar</b> → hasta abajo <b>"Ampliar token de acceso"</b> → copia el token nuevo.</li>' +
    '<li><b>Pégalo aquí</b> en "Token de Facebook" → <b>Conectar mi página</b>. La app lo cambia por un token de página que <b>no vence</b>.</li></ol>' +
    '<p class="muted small">Si algo no aparece igual, mándale captura a Claude y te dice dónde tocar.</p><button class="btn borde">Cerrar</button>');
  m.querySelector(".btn").onclick = () => m.remove();
}
function bindFacebookMas(){
  const q = id => document.getElementById(id);
  q("btnFbGuia") && (q("btnFbGuia").onclick = fbGuia);
  q("btnFbConectar") && (q("btnFbConectar").onclick = () => fbConectar(q("fbToken").value));
  q("btnFbRes") && (q("btnFbRes").onclick = () => fbTraerResultados(false));
  q("btnFbQuitar") && (q("btnFbQuitar").onclick = async () => {
    if (!await confirmar("¿Desconectar Facebook? Lo que ya está programado en Facebook se queda allá.", "Desconectar")) return;
    S.fb = null; await kvSet("fb", null); render();
  });
}
function bindFacebookSemana(){
  const b = document.getElementById("btnFbTodo");
  b && (b.onclick = () => fbProgramarVarios(S.posts.filter(fbElegible)));
}
