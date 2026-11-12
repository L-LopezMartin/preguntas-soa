// Cuestionario de pentesting — lógica de la página.
// Las preguntas vienen de preguntas.js (constante PREGUNTAS).

const SEC = {
  1: { nombre: 'Aplicaciones web', desc: 'Cuestionario de autoevaluación', color: 'var(--s1)' },
  2: { nombre: 'Aplicaciones móviles', desc: 'Autoevaluación – Pentesting de aplicaciones móviles', color: 'var(--s2)' },
};
const BLOQUES = Object.keys(SEC).map(Number);
const LETRAS = 'abcde';
const KEY = 'cuestionario-pentesting-errores';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const hero = $('.hero');

let cfg = { secs: [...BLOQUES], mode: 'practica', n: 25, onlyWrong: false };
let run = null;

// ---------- Persistencia de errores (solo en este navegador) ----------
function loadWrong() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
}
let wrong = loadWrong();
function saveWrong() {
  try { localStorage.setItem(KEY, JSON.stringify([...wrong])); } catch { /* sin almacenamiento */ }
}
function registrar(q, pick) {
  if (pick === q.a) wrong.delete(q.id); else wrong.add(q.id);
  saveWrong();
}

// ---------- Utilidades ----------
const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Pantalla de inicio ----------
function home() {
  run = null;
  hero.classList.remove('hide');
  const wc = PREGUNTAS.filter((q) => wrong.has(q.id) && cfg.secs.includes(q.s)).length;
  const total = PREGUNTAS.length;
  $('#sub').textContent = `${total} preguntas de las autoevaluaciones de aplicaciones web y móviles. Practicá con corrección inmediata o rendí un examen.`;

  app.innerHTML = `
    <h2>Bloques</h2>
    <div class="blocks">
      ${BLOQUES.map((k) => `
        <label class="blk" style="--c:${SEC[k].color}">
          <span class="bar"></span>
          <input type="checkbox" value="${k}" ${cfg.secs.includes(k) ? 'checked' : ''}>
          <span><b>${SEC[k].nombre}</b><small>${SEC[k].desc} · ${PREGUNTAS.filter((q) => q.s === k).length} preguntas</small></span>
        </label>`).join('')}
    </div>

    <h2>Modo</h2>
    <div class="opts" id="mode">
      <button class="chip" data-v="practica">Práctica (feedback inmediato)</button>
      <button class="chip" data-v="examen">Examen (nota al final)</button>
    </div>

    <h2>Cantidad</h2>
    <div class="opts" id="num">
      ${[10, 25, 50, 100, 0].map((n) => `<button class="chip" data-v="${n}">${n || 'Todas'}</button>`).join('')}
    </div>

    <h2>Repaso</h2>
    <div class="opts">
      <button class="chip" id="ow" ${wc ? '' : 'disabled'}>Solo mis errores anteriores (${wc})</button>
    </div>
    ${wrong.size ? `<p class="hint" style="text-align:left"><button class="link" id="reset">Borrar historial de errores</button></p>` : ''}

    <button class="go" id="go">Empezar</button>
    <p class="hint">Atajos: <kbd>1</kbd>–<kbd>4</kbd> o <kbd>A</kbd>–<kbd>D</kbd> para responder, <kbd>Enter</kbd> para avanzar, <kbd>←</kbd> para volver.</p>`;

  if (!wc) cfg.onlyWrong = false;

  const sync = () => {
    app.querySelectorAll('#mode .chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === cfg.mode));
    app.querySelectorAll('#num .chip').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.v) === cfg.n));
    $('#ow').setAttribute('aria-pressed', cfg.onlyWrong);
    $('#go').disabled = !cfg.secs.length || (cfg.onlyWrong && !wc);
  };

  app.querySelectorAll('.blk input').forEach((c) => {
    c.onchange = () => {
      cfg.secs = [...app.querySelectorAll('.blk input:checked')].map((x) => Number(x.value));
      home();
    };
  });
  app.querySelectorAll('#mode .chip').forEach((b) => (b.onclick = () => { cfg.mode = b.dataset.v; sync(); }));
  app.querySelectorAll('#num .chip').forEach((b) => (b.onclick = () => { cfg.n = Number(b.dataset.v); sync(); }));
  $('#ow').onclick = () => { cfg.onlyWrong = !cfg.onlyWrong; sync(); };
  const reset = $('#reset');
  if (reset) reset.onclick = () => {
    if (confirm('¿Borrar el historial de errores?')) { wrong.clear(); saveWrong(); cfg.onlyWrong = false; home(); }
  };
  $('#go').onclick = start;
  sync();
}

// ---------- Cuestionario ----------
function start() {
  let pool = PREGUNTAS.filter((q) => cfg.secs.includes(q.s) && (!cfg.onlyWrong || wrong.has(q.id)));
  pool = shuffle(pool);
  if (cfg.n) pool = pool.slice(0, cfg.n);
  if (!pool.length) return;
  run = {
    mode: cfg.mode,
    qs: pool.map((q) => ({ q, ord: shuffle(q.o.map((_, i) => i)), pick: null, locked: false })),
    i: 0,
  };
  hero.classList.add('hide');
  show();
}

function show() {
  const r = run;
  const it = r.qs[r.i];
  const q = it.q;
  const prac = r.mode === 'practica';
  const answered = it.pick !== null;
  const c = SEC[q.s].color;
  const last = r.i === r.qs.length - 1;
  const doneCount = r.qs.filter((x) => x.pick !== null).length;

  app.innerHTML = `
    <div class="top">
      <span>Pregunta ${r.i + 1} de ${r.qs.length}${prac ? '' : ` · ${doneCount} respondidas`}</span>
      <button class="btn sm" id="x">Salir</button>
    </div>
    <div class="prog" style="--c:${c}"><div style="width:${(doneCount / r.qs.length) * 100}%"></div></div>
    <div class="tag" style="--c:${c}">${SEC[q.s].nombre}</div>
    <h1 class="q">${esc(q.q)}</h1>
    <div id="ops">
      ${it.ord.map((oi, k) => {
        let cl = '';
        if (prac && it.locked) {
          if (oi === q.a) cl = 'ok';
          else if (oi === it.pick) cl = 'bad';
        } else if (oi === it.pick) cl = 'sel';
        return `<button class="o ${cl}" data-k="${oi}" ${prac && it.locked ? 'disabled' : ''}>
          <span class="l">${LETRAS[k]}</span><span>${esc(q.o[oi])}</span></button>`;
      }).join('')}
    </div>
    ${prac && it.locked
      ? `<p class="fb" style="color:var(${it.pick === q.a ? '--ok' : '--bad'})">${
          it.pick === q.a ? 'Correcto.' : 'Incorrecto. La respuesta correcta está marcada en verde.'}</p>`
      : ''}
    <div class="nav">
      <button class="btn" id="pv" ${r.i ? '' : 'disabled'}>Anterior</button>
      <button class="btn p" id="nx" ${answered ? '' : 'disabled'}>${last ? 'Ver resultado' : 'Siguiente'}</button>
    </div>`;

  $('#x').onclick = () => { if (confirm('¿Salir? Se pierde el avance.')) home(); };
  $('#pv').onclick = prev;
  $('#nx').onclick = next;
  app.querySelectorAll('.o').forEach((b) => (b.onclick = () => pick(Number(b.dataset.k))));
}

function pick(oi) {
  const it = run.qs[run.i];
  if (run.mode === 'practica') {
    if (it.locked) return;
    it.pick = oi;
    it.locked = true;
    registrar(it.q, oi);
  } else {
    it.pick = oi; // en examen se puede cambiar hasta ver el resultado
  }
  show();
  const nx = $('#nx');
  if (nx) nx.focus({ preventScroll: true });
}

function next() {
  const it = run.qs[run.i];
  if (it.pick === null) return;
  if (run.i === run.qs.length - 1) result();
  else { run.i++; show(); window.scrollTo(0, 0); }
}

function prev() {
  if (run.i > 0) { run.i--; show(); }
}

// ---------- Resultado ----------
function result() {
  const r = run;
  if (r.mode === 'examen') r.qs.forEach((x) => registrar(x.q, x.pick));
  const ok = r.qs.filter((x) => x.pick === x.q.a).length;
  const pc = Math.round((ok / r.qs.length) * 100);
  const bad = r.qs.filter((x) => x.pick !== x.q.a);

  app.innerHTML = `
    <h2 style="margin-top:8px">Resultado</h2>
    <div class="score">${pc}%</div>
    <p>${ok} de ${r.qs.length} correctas</p>
    <div class="stats">
      ${BLOQUES.filter((k) => r.qs.some((x) => x.q.s === k)).map((k) => {
        const a = r.qs.filter((x) => x.q.s === k);
        return `<div style="border-left:4px solid ${SEC[k].color}"><b>${a.filter((x) => x.pick === x.q.a).length}/${a.length}</b>${SEC[k].nombre}</div>`;
      }).join('')}
    </div>
    ${bad.length
      ? `<h2>Para repasar (${bad.length})</h2>${bad.map((x) => `
          <div class="rev">
            <b>${esc(x.q.q)}</b>
            <small class="b">Tu respuesta: ${esc(x.q.o[x.pick])}</small>
            <small class="a">Correcta: ${esc(x.q.o[x.q.a])}</small>
          </div>`).join('')}`
      : '<p><b>Sin errores. Muy bien.</b></p>'}
    <div class="nav">
      <button class="btn" id="h">Inicio</button>
      ${bad.length ? '<button class="btn" id="rw">Repetir errores</button>' : ''}
      <button class="btn p" id="again">Nuevo intento</button>
    </div>`;

  run = null;
  $('#h').onclick = home;
  $('#again').onclick = start;
  const rw = $('#rw');
  if (rw) rw.onclick = () => {
    run = {
      mode: cfg.mode,
      qs: shuffle(bad.map((x) => x.q)).map((q) => ({ q, ord: shuffle(q.o.map((_, i) => i)), pick: null, locked: false })),
      i: 0,
    };
    show();
  };
  window.scrollTo(0, 0);
}

// ---------- Teclado ----------
document.addEventListener('keydown', (e) => {
  if (!run || e.ctrlKey || e.metaKey || e.altKey) return;
  const it = run.qs[run.i];
  const k = e.key.toLowerCase();
  let idx = -1;
  if (/^[1-5]$/.test(k)) idx = Number(k) - 1;
  else if (LETRAS.includes(k) && k.length === 1) idx = LETRAS.indexOf(k);
  if (idx >= 0 && idx < it.ord.length) { e.preventDefault(); pick(it.ord[idx]); return; }
  if (k === 'enter' || k === 'arrowright') {
    const a = document.activeElement;
    if (a && a.tagName === 'BUTTON' && a.id !== 'nx') return; // dejar que el botón enfocado actúe
    e.preventDefault(); next();
  } else if (k === 'arrowleft') { e.preventDefault(); prev(); }
});

home();
