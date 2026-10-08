/*
 * GRUPA 24 — animacja konstrukcji sygnetów (KRAMAT · MS WAY · HI-TEC).
 *
 * Cała scena jest czystą funkcją czasu: render(t). Dzięki temu oś czasu można
 * dowolnie przewijać, a eksport klatka-po-klatce daje identyczny obraz.
 *
 * Plan (klatki z Figmy, strona „Logo 1”):
 *  F1  ciężarówka jedzie, GRUPA · 24 · hasło rysują się szeroko
 *  F2  elementy schodzą się do środka, rysuje się pas konstrukcyjny
 *  F3  hasło odpala linie konstrukcyjne, wideo skaluje się do środka,
 *      po liniach rysują się obrysy emblematów: ścięta apla, kwadrat, koło
 *  F4  wideo zjeżdża do obrysów i jedzie dalej w masce logo — to wideo było aplą pod GRUPA
 *  F5–F7  „światła na skrzyżowaniu”: zapala się apla / 2 / 4, obok buduje się submarka
 *         (typografia → obrys sygnetu → kolor); „24” stoi, sygnety wymieniają się wokół niego
 *  F8–F10 ramka z wideo w kształcie sygnetu zmienia się razem ze światłami
 *  F11–F12 koło HI-TEC rozszerza się i wypycha wideo, logo GRUPY odjeżdża w lewo
 *  F13 zestawienie: kolumna submarek buduje się kaskadowo od góry do dołu
 *
 * Kamera przez cały czas bardzo powoli najeżdża na scenę, więc obraz nigdy nie stoi.
 */
(() => {
'use strict';

const D = window.G24_DATA;
const W = 1840, H = 928, CX = 920, CY = 464;
const DURATION = 28;
const ANCHORS = 24;                  // kotwice kątowe konturu (co 15°)
const N = ANCHORS * 30;              // punktów na kontur
const CAMERA = 0.08;                 // najazd kamery przez całą animację
const STROKE = 2;                    // obrysy konstrukcyjne sygnetów: zawsze 2 px
const SVGNS = 'http://www.w3.org/2000/svg';
const VIDEO_PARAM = new URLSearchParams(location.search).get('video');
// wideo z drona: WebM (Chrome/Firefox) i MP4 (Safari); zdjęcie assets/truck.jpg zostaje jako zapas
const VIDEO_SOURCES = VIDEO_PARAM ? [[VIDEO_PARAM, '']] : [['assets/truck.webm', 'video/webm'], ['assets/truck.mp4', 'video/mp4']];
/*
 * Czas wideo dla czasu animacji. Wideo jest widoczne w dwóch odcinkach
 * (0–8.8 s i 14.2–21.4 s), więc każdy dostaje własny start — bez cięcia w kadrze.
 */
const VIDEO_LEN = 10;
const params0 = new URLSearchParams(location.search);
const videoTime = t => Math.min(VIDEO_LEN - 0.05, Math.max(0, t < 11 ? t : t - 13));

/* ------------------------------------------------------------------ easing */

function cubicBezier(x1, y1, x2, y2) {
  const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const fx = t => ((ax * t + bx) * t + cx) * t;
  const fy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = fx(t) - x;
      if (Math.abs(err) < 1e-7) return fy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 40; i++) {
      if (fx(t) < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return fy(t);
  };
}

const E = {
  io: cubicBezier(0.4, 0, 0.1, 1),      // miękki start, długie, ciche dojście
  out: cubicBezier(0.22, 1, 0.36, 1),   // wejścia elementów
  open: cubicBezier(0.5, 0, 0.15, 1),   // otwieranie ramki
  glide: cubicBezier(0.3, 0, 0.2, 1),
  fly: cubicBezier(0.72, 0, 0.42, 1),   // ramka wideo nabiera prędkości i z rozpędu wpada w logo
  lin: t => t,
};

/* ---------------------------------------------------------------- keyframes */

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const C = {
  white: [255, 255, 255], black: [0, 0, 0], ink: hex('#1C1C1C'), grey: hex('#EBEBEB'),
  kramat: hex(D.brands.kramat.color), msway: hex(D.brands.msway.color), hitec: hex(D.brands.hitec.color),
};

function mix(a, b, e) {
  if (typeof a === 'number') return a + (b - a) * e;
  return a.map((v, i) => v + (b[i] - v) * e);
}

// seq(start, [t0, t1, value, ease], …) → klucze [[t, v, ease]]
function seq(v0, ...changes) {
  const keys = [[-1e9, v0]];
  let cur = v0;
  for (const [a, b, v, ease] of changes) {
    keys.push([a, cur], [b, v, ease || E.io]);
    cur = v;
  }
  return keys;
}

function at(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    if (t < k1[0]) {
      const k0 = keys[i - 1];
      const span = k1[0] - k0[0];
      return mix(k0[1], k1[1], span > 0 ? (k1[2] || E.io)((t - k0[0]) / span) : 1);
    }
  }
  return keys[keys.length - 1][1];
}

/*
 * Ruch po krzywej Hermite'a: klucze [t, wartość, przelot?].
 * Na kluczu „przelot” element nie zatrzymuje się (prędkość monotoniczna, bez przestrzeleń);
 * na zwykłym kluczu łagodnie hamuje do zera.
 */
function path(keys) {
  return keys.map((k, i) => {
    const vel = k[1].map((x, j) => {
      if (!k[2] || i === 0 || i === keys.length - 1) return 0;
      const a = keys[i - 1], b = keys[i + 1];
      const s0 = (x - a[1][j]) / (k[0] - a[0]), s1 = (b[1][j] - x) / (b[0] - k[0]);
      if (s0 * s1 <= 0) return 0;
      return 2 / (1 / s0 + 1 / s1);           // średnia harmoniczna — bez przestrzeleń
    });
    return [k[0], k[1], vel];
  });
}
function pathAt(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, p1, v1] = keys[i];
    if (t < t1) {
      const [t0, p0, v0] = keys[i - 1];
      const dt = t1 - t0;
      let s = (t - t0) / dt;
      if (v0.every(v => v === 0) && v1.every(v => v === 0)) s = (E.glide(s) * 2 + s) / 3;   // dłuższe wybrzmienie
      const s2 = s * s, s3 = s2 * s;
      const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = 3 * s2 - 2 * s3, h11 = s3 - s2;
      return p0.map((x, j) => h00 * x + h10 * dt * v0[j] + h01 * p1[j] + h11 * dt * v1[j]);
    }
  }
  return keys[keys.length - 1][1];
}

const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const rgba = c => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`;

/* --------------------------------------------------------- shapes & morphing */

function parseD(d) {
  const toks = [];
  const re = /([MLHVCZmlhvcz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  let m;
  while ((m = re.exec(d))) toks.push(m[1] || parseFloat(m[2]));
  const contours = [];
  let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = null, i = 0;
  const num = () => toks[i++];
  const line = (nx, ny) => { cur.push({ L: [x, y, nx, ny] }); x = nx; y = ny; };
  while (i < toks.length) {
    if (typeof toks[i] === 'string') cmd = toks[i++].toUpperCase();
    switch (cmd) {
      case 'M':
        x = sx = num(); y = sy = num();
        cur = []; contours.push(cur); cmd = 'L';
        break;
      case 'L': line(num(), num()); break;
      case 'H': line(num(), y); break;
      case 'V': line(x, num()); break;
      case 'C': {
        const p = [x, y, num(), num(), num(), num(), num(), num()];
        cur.push({ C: p }); x = p[6]; y = p[7];
        break;
      }
      case 'Z':
        if (Math.hypot(x - sx, y - sy) > 1e-6) line(sx, sy);
        x = sx; y = sy;
        if (typeof toks[i] === 'number') i++;
        break;
      default: i++;
    }
  }
  return contours;
}

function cubicAt(p, u) {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]];
}

/*
 * Próbkowanie konturu z kotwicami kątowymi.
 * Kontur dzielimy promieniami ze środka (w proporcjach bbox) co 360°/ANCHORS.
 * Każdy wycinek dostaje tyle samo punktów, więc punkt „góra-lewo” jednego kształtu
 * zawsze przechodzi w „górę-lewo” drugiego — morf jest regularny, bez skręcania.
 * Wewnątrz wycinka punkty idą równo po długości, z zachowaniem narożników.
 */
function sampleAnchored(segs) {
  // 1. gęsta łamana z zaznaczonymi wierzchołkami
  let pts = [];
  for (const s of segs) {
    if (s.L) {
      const [x0, y0, x1, y1] = s.L;
      if (Math.hypot(x1 - x0, y1 - y0) < 1e-3) continue;
      pts.push({ x: x0, y: y0, v: true });
    } else {
      const steps = 64;
      for (let k = 0; k < steps; k++) {
        const q = cubicAt(s.C, k / steps);
        pts.push({ x: q[0], y: q[1], v: k === 0 });
      }
    }
  }
  // usuń duplikaty
  pts = pts.filter((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return Math.hypot(p.x - q.x, p.y - q.y) > 1e-4;
  });

  // 2. kierunek obiegu: zgodnie z kątem (ekran, oś y w dół)
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  if (area < 0) pts.reverse();

  // 3. narożniki = wierzchołki ze zmianą kierunku
  const n = pts.length;
  pts.forEach((p, i) => {
    if (!p.v) return;
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const d1 = Math.atan2(p.y - a.y, p.x - a.x), d2 = Math.atan2(b.y - p.y, b.x - p.x);
    let d = Math.abs(d2 - d1);
    if (d > Math.PI) d = 2 * Math.PI - d;
    p.corner = d > 0.09;
  });

  // 4. długość łuku
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    cum[i + 1] = cum[i] + Math.hypot(b.x - a.x, b.y - a.y);
  }
  const P = cum[n];
  const pointAt = s => {
    s = ((s % P) + P) % P;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[(lo + 1) % n], f = (s - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1);
    return [a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f];
  };

  // 5. przecięcia promieni kotwic (w przestrzeni znormalizowanej do bbox)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = x1 - x0, h = y1 - y0;
  const nx = p => (p.x - cx) / w, ny = p => (p.y - cy) / h;
  const anchorS = [];
  for (let k = 0; k < ANCHORS; k++) {
    const th = Math.PI + (2 * Math.PI * k) / ANCHORS;    // start: kierunek w lewo, dalej zgodnie z ruchem wskazówek
    const dx = Math.cos(th), dy = Math.sin(th);
    let bestR = -1, bestS = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const ax = nx(a), ay = ny(a), ex = nx(b) - ax, ey = ny(b) - ay;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const r = (ax * ey - ay * ex) / den, u = (ax * dy - ay * dx) / den;
      if (r > 0 && u >= 0 && u <= 1 && r > bestR) { bestR = r; bestS = cum[i] + u * (cum[i + 1] - cum[i]); }
    }
    anchorS.push(bestS);
  }

  // 6. punkty w wycinkach
  const per = N / ANCHORS;
  const corners = pts.map((p, i) => (p.corner ? cum[i] : null)).filter(s => s !== null);
  const out = new Float64Array(N * 2);
  let o = 0;
  for (let k = 0; k < ANCHORS; k++) {
    const sA = anchorS[k];
    let len = anchorS[(k + 1) % ANCHORS] - sA;
    if (len <= 0) len += P;
    // podział wycinka na odcinki między narożnikami
    const cuts = [0];
    for (const c of corners) {
      let d = c - sA;
      if (d < 0) d += P;
      if (d > 1e-6 && d < len - 1e-6) cuts.push(d);
    }
    cuts.sort((a, b) => a - b);
    cuts.push(len);
    const parts = cuts.slice(1).map((c, j) => c - cuts[j]);
    const counts = parts.map(l => Math.floor((per * l) / len));
    let rest = per - counts.reduce((a, c) => a + c, 0);
    const order = parts.map((l, j) => [(per * l) / len - counts[j], j]).sort((a, b) => b[0] - a[0]);
    for (let j = 0; rest > 0; j = (j + 1) % order.length, rest--) counts[order[j][1]]++;
    parts.forEach((l, j) => {
      for (let q = 0; q < counts[j]; q++) {
        const p = pointAt(sA + cuts[j] + (l * q) / Math.max(1, counts[j]));
        out[o++] = p[0]; out[o++] = p[1];
      }
    });
  }
  return out;
}

const SHAPES = {};
function addShape(name, d) { SHAPES[name] = sampleAnchored(parseD(d)[0]); }

addShape('plate', D.grupa.plate);
addShape('square', D.grupa.square);
addShape('circle', D.grupa.circle);
for (const [k, v] of Object.entries(D.frames)) addShape(k, v.d);

// spec: { shape, x, y, s, hole? } albo { point: [x, y] }
function specPts(spec, out) {
  if (spec.point) {
    for (let j = 0; j < N; j++) { out[2 * j] = spec.point[0]; out[2 * j + 1] = spec.point[1]; }
    return out;
  }
  const p = SHAPES[spec.shape];
  for (let j = 0; j < N; j++) {
    out[2 * j] = spec.x + p[2 * j] * spec.s;
    out[2 * j + 1] = spec.y + p[2 * j + 1] * spec.s;
  }
  return out;
}

// otwory rysowane w przeciwnym kierunku → reguła nonzero daje sumę kształtów z otworami
function contoursD(list) {
  let d = '';
  for (const { pts, hole } of list) {
    const parts = new Array(N);
    for (let j = 0; j < N; j++) {
      const k = hole ? N - 1 - j : j;
      parts[j] = pts[2 * k].toFixed(1) + ' ' + pts[2 * k + 1].toFixed(1);
    }
    d += 'M' + parts.join('L') + 'Z';
  }
  return d;
}
const makeBufs = n => Array.from({ length: n }, () => new Float64Array(N * 2));

/* ------------------------------------------------------------------ layout */

// Pozycje części logo GRUPA 24 (współrzędne sceny 1840×928, wymiary z Figmy).
const GLYPH = { d2: [25.084, 20.723], d4: [23.553, 22.507] };
function markLayout(ox, oy, s) {
  const plate = [ox, oy + 1.512 * s, s];
  const square = [ox + 373.444 * s, oy + 1.433 * s, s];
  const circle = [ox + 450.046 * s, oy, s];
  return { plate, letters: plate, square, d2: square, circle, d4: circle, tagline: [ox + 537.769 * s, oy + 15.96 * s, s] };
}
// F1–F2: napisy jeszcze „luzem”, cyfry w wysokości liter
function looseLayout(lettersX, d2, d4, tagX) {
  const ds = 1.6;
  const letters = [lettersX, 441.73, 1];
  const p2 = [d2[0] - GLYPH.d2[0] * ds, d2[1] - GLYPH.d2[1] * ds, ds];
  const p4 = [d4[0] - GLYPH.d4[0] * ds, d4[1] - GLYPH.d4[1] * ds, ds];
  return { plate: letters, letters, square: p2, d2: p2, circle: p4, d4: p4, tagline: [tagX, 456.18, 1] };
}

const L1 = looseLayout(204.18, [927, 456], [962, 457], 1508);
const L2 = looseLayout(313, [754, 456], [929, 457], 1213.32);
const L3 = markLayout(675.55, 440.22, 1);
const L4 = markLayout(106.55, 442.22, 1);
const L5 = markLayout(103.91, 427.59, 1.0545);
const L8 = markLayout(606.55, 427.22, 1);
const L12 = markLayout(263.55, 429.22, 1);

// [czas, układ, przelot?] — F1→F2→F3 to jeden ciągły przejazd
const MOVES = [
  [1.9, L1], [3.4, L2, true], [4.6, L3],
  [6.6, L3], [7.8, L4],
  [8.2, L4], [9.2, L5],
  [13.9, L5], [15.2, L8],
  [21.8, L8], [23.0, L12],
];
// apla, 2 i 4 to jedna maska — jadą razem; hasło lekko się spóźnia, co ożywia ruch
const LAG = { plate: 0, letters: 0, square: 0, d2: 0, circle: 0, d4: 0, tagline: 0.12 };
const POS = {};
for (const part of Object.keys(L1)) POS[part] = path(MOVES.map(([t, L, pass]) => [t + LAG[part], L[part], pass]));
const markPart = (part, t) => pathAt(POS[part], t);
// środek całego znaku (apla + 2 + 4)
const markCenter = t => { const [x, y, s] = markPart('plate', t); return [x + 257.9 * s, y + 31.5 * s]; };

/* ----------------------------------------------------------------- tracks */

/*
 * F3→F4: ramka wideo i obraz skalują się razem (liniowo, bez dopasowania do kształtów).
 * Ramka przyspiesza; gdy zmaleje do rozmiaru logo, z rozpędu „wpada” w nie —
 * od tej chwili maską są kształty logo, a obraz dalej hamuje w tej samej skali.
 */
const FLY = [5.75, 6.95];
const FLY_END_S = 0.30;          // skala obrazu w logo
const HIT_S = 0.36;              // skala ramki, przy której wpada w logo
const FLY_HIT = (() => {         // moment uderzenia wyliczony z krzywej ruchu
  const target = (0.66 - HIT_S) / (0.66 - FLY_END_S);
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (E.fly(m) < target) lo = m; else hi = m; }
  return FLY[0] + (FLY[1] - FLY[0]) * lo;
})();

const T = {
  // apla pod GRUPA. F4: wideo, F5–F7: światła, F8–F10: aktywna część w kolorze marki, reszta w masce wideo
  plateFill: seq(C.black, [10.6, 11.2, C.grey], [14.6, 15.3, C.kramat], [19.9, 19.91, C.black, E.lin]),
  plateOp: seq(0, [8.3, 8.8, 1], [16.6, 17.3, 0], [20.4, 21.0, 1]),
  lettersFill: seq(C.white, [14.6, 15.3, C.ink], [16.6, 17.3, C.white]),
  regOp: seq(0, [7.3, 7.8, 1]),
  // pole „2”
  sqFill: seq(C.black, [8.4, 9.0, C.grey], [10.6, 11.2, C.black], [12.2, 12.8, C.grey], [16.0, 16.01, C.msway, E.lin], [19.9, 19.91, C.black, E.lin]),
  sqOp: seq(0, [6.9, 7.5, 1], [14.4, 15.0, 0], [16.6, 17.3, 1], [18.4, 19.1, 0], [20.4, 21.0, 1]),
  d2Fill: seq(C.white, [16.6, 17.3, C.ink], [18.4, 19.1, C.white]),
  // pole „4”
  circFill: seq(C.black, [8.4, 9.0, C.grey], [12.2, 12.8, C.black], [17.6, 17.61, C.hitec, E.lin], [20.4, 21.0, C.black]),
  circOp: seq(0, [6.9, 7.5, 1], [14.4, 15.0, 0], [18.4, 19.1, 1]),
  d4Fill: seq(C.white, [18.4, 19.1, C.ink], [20.4, 21.0, C.white]),
  // hasło
  tagFill: seq(C.white, [5.75, 5.95, C.ink]),
  tagOp: seq(1, [6.6, 7.1, 0], [14.59, 14.6, 1, E.lin]),

  // wideo: skala i środek; vidFollow = jak mocno wideo trzyma się znaku
  vidOp: seq(1, [8.3, 8.8, 0], [14.2, 15.0, 1], [21.0, 21.4, 0]),
  vidS: seq(1, [3.6, 5.0, 0.66], [FLY[0], FLY[1], FLY_END_S, E.fly]),
  vidC: seq([CX, CY], [3.6, 5.0, [923, 464]]),
  vidFollow: seq(0, [FLY[0], FLY[1], 1, E.fly]),

  // linie konstrukcyjne
  bandP: seq(0, [2.1, 3.3, 1, E.out], [5.9, 6.5, 0]),
  bandTop: seq(423, [3.8, 4.6, 440]),
  bandBot: seq(525, [3.8, 4.6, 505]),
  lineCol: seq([255, 255, 255, 0.45], [3.9, 4.8, [160, 160, 160, 0.75]]),
  capP: seq(0, [4.1, 5.0, 1, E.out], [5.9, 6.4, 0]),
  // obrysy emblematów rysowane po liniach
  olPlate: seq(0, [4.6, 5.6, 1, E.io]),
  olSquare: seq(0, [4.8, 5.6, 1, E.io]),
  olCircle: seq(0, [4.95, 5.75, 1, E.io]),
  olOp: seq(1, [6.3, 6.9, 0]),
  olCol: [255, 255, 255, 0.9],


  camera: seq(0, [0, DURATION, 1, E.lin]),
  fade: seq(1, [0, 1.0, 0, E.out], [27.2, 28, 1]),
};

// F1: litery GRUPA, cyfry i hasło wjeżdżają po kolei (unoszą się i pojawiają)
// ścieżki składowe są sklejone spacją przed „M” (wewnątrz glifu „ZM” bez spacji)
const glyphs = d => d.split(' M').map((p, i) => (i ? 'M' + p : p));
const RISE = 22;
const rise = (start, dur = 1.0) => ({ dy: seq(RISE, [start, start + dur, 0, E.out]), op: seq(0, [start, start + dur * 0.6, 1, E.out]) });
const LETTERS_IN = glyphs(D.grupa.letters).map((_, i) => rise(0.3 + i * 0.07));
const D2_IN = [rise(0.72)], D4_IN = [rise(0.8)];
// hasło wchodzi dwa razy: F1 i F8
const TAG_IN = glyphs(D.grupa.tagline).map((_, i) => {
  const a = 1.0 + i * 0.022, b = 14.7 + i * 0.022;
  return {
    dy: seq(RISE / 2, [a, a + 0.8, 0, E.out], [13.8, 13.81, RISE / 2, E.lin], [b, b + 0.8, 0, E.out]),
    op: seq(0, [a, a + 0.5, 1, E.out], [13.8, 13.81, 0, E.lin], [b, b + 0.5, 1, E.out]),
  };
});

// pionowe linie: odpalane od hasła (prawa strona) w lewo
const VLINES = [1331.48, 1213.32, 1191.42, 1125.59, 1116.99, 1048.99, 1036.88, 675.55]
  .map((x, i) => ({ x, p: seq(0, [3.9 + i * 0.08, 4.7 + i * 0.08, 1, E.out], [5.9 + i * 0.03, 6.4 + i * 0.03, 0]) }));
const CAPLINES = [457.02, 489.52];

/* ------------------------------------------------------- shape states (clip) */

const partSpec = (part, shape) => t => { const [x, y, s] = markPart(part, t); return { shape, x, y, s }; };
const plateSpec = partSpec('plate', 'plate'), squareSpec = partSpec('square', 'square'), circleSpec = partSpec('circle', 'circle');

const frame = (L, x, y, s) => [{ shape: L + '_outer', x, y, s }, { shape: L + '_inner', x, y, s, hole: true }];

// maska logo: apla + kwadrat + koło jako jeden kształt
const S_mask = t => [plateSpec(t), squareSpec(t), circleSpec(t)];

/*
 * F8–F11: wielkie kształty bez morfingu. Każdy rysuje się po ścieżce (trim path)
 * w docelowej skali, potem znika tak samo, a w jego miejsce rysuje się następny.
 * head = koniec rysowanego odcinka, tail = początek (0→1 przy znikaniu).
 */
const BIG = [
  { L: 'K', x: 177, y: 72, color: C.kramat, head: [14.4, 15.6], tail: [16.3, 17.1] },
  { L: 'M', x: 122, y: -12, color: C.msway, head: [16.6, 17.8], tail: [18.1, 18.9] },
  { L: 'H', x: 130, y: 47, color: C.hitec, head: [18.4, 19.6], tail: [20.3, 21.1] },
].map(b => ({ ...b, headK: seq(0, [...b.head, 1, E.io]), tailK: seq(0, [...b.tail, 1, E.io]) }));

/* --------------------------------------------------------------- brands */

const BR = ['kramat', 'msway', 'hitec'];
const FRAME_OF = { kramat: 'K', msway: 'M', hitec: 'H' };
const BS = 1.373;                       // skala logotypu marki w F5–F7
const SYG_X = 1221;                     // sygnety w F5–F7 stoją w jednym miejscu

function brandOrigin(b) {
  const s = D.brands[b].sygnetBB;
  return [SYG_X - (s[0] + s[2]) / 2 * BS, CY - (s[1] + s[3]) / 2 * BS];
}
function sygnetState(b, ox, oy, scale) {
  const s = D.brands[b].sygnetBB, f = D.frames[FRAME_OF[b] + '_outer'].bb;
  const k = (s[2] - s[0]) / (f[2] - f[0]) * scale;
  return frame(FRAME_OF[b], ox + s[0] * scale, oy + s[1] * scale, k);
}
const SLOT = Object.fromEntries(BR.map(b => [b, brandOrigin(b)]));

/*
 * Submarki budują się obok GRUPY przez konstrukcję:
 * wjeżdża typografia → sygnet rysuje się obrysem (z lekkim najazdem) → wypełnia się kolorem.
 * W F5–F7 „24” stoi w miejscu, a wokół niego wymieniają się elementy:
 * stary sygnet przybliża się i szybko gaśnie, na jego miejsce wjeżdża następny.
 */
function logoTracks(a, sygDelay, exit = null) {
  const s = a + sygDelay;
  const typeOp = [[a, a + 0.7, 1, E.out]], wordDx = [[a, a + 0.9, 0, E.out]];
  const zoom = [[s, s + 1.0, 1, E.out]], sOp = [[s - 0.01, s, 1, E.lin]];
  if (exit !== null) {
    const o = exit;
    typeOp.push([o, o + 0.4, 0]); wordDx.push([o, o + 0.4, -18]);
    zoom.push([o, o + 0.4, 1.22]); sOp.push([o, o + 0.4, 0]);
  }
  return {
    typeOp: seq(0, ...typeOp), wordDx: seq(-26, ...wordDx),
    draw: seq(0, [s, s + 0.9, 1]), fill: seq(0, [s + 0.6, s + 1.1, 1]),
    zoom: seq(0.86, ...zoom), sOp: seq(0, ...sOp),
  };
}

// F5–F7: jedna marka naraz obok GRUPY
const SLOT_T = {
  kramat: logoTracks(8.8, 0.55, 10.6),
  msway: logoTracks(10.85, 0.1, 12.2),
  hitec: logoTracks(12.45, 0.1, 13.8),
  // „24” zostaje w miejscu, zmienia tylko kolor
  digOp: seq(0, [9.25, 9.75, 1, E.out], [13.8, 14.15, 0]),
  digFill: seq(C.kramat, [10.7, 11.2, C.msway], [12.3, 12.8, C.hitec]),
};

// F13: kolumna submarek buduje się kaskadowo od góry do dołu
const FIN = { kramat: [1153, 231], msway: [1153, 419], hitec: [1153, 607] };
const FIN_T = Object.fromEntries(BR.map((b, i) => {
  const t0 = 22.9 + i * 0.4;
  return [b, { ...logoTracks(t0, 0.4), digOp: seq(0, [t0 + 0.35, t0 + 0.8, 1, E.out]) }];
}));

/* ------------------------------------------------------------------ DOM */

const $ = id => document.getElementById(id);
const tf = (x, y, s) => `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(4)})`;
const op = v => Math.max(0, Math.min(1, v)).toFixed(3);
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

const defs = $('defs'), gLines = $('lines'), gMark = $('mark'), gBrands = $('brands');
const G = D.grupa;

// napis rozbity na glify (każdy może mieć własny ruch)
function glyphGroup(d, parent) {
  const outer = el('g', {}, parent);
  return { outer, glyphs: glyphs(d).map(gd => el('path', { d: gd }, outer)) };
}
// obrys o stałej grubości niezależnie od skali (szerokość ustawiana co klatkę)
const strokeAttrs = extra => ({ fill: 'none', 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...extra });
const drawAttrs = { pathLength: 1, 'stroke-dasharray': '0 2' };
const STROKED = [];          // [element, grubość w px]
const stroked = (node, px) => { STROKED.push([node, px]); return node; };

// tło + obrys elementu (obrys rysowany kreską o długości 0→1)
function boxPart(d, parent) {
  const g = el('g', {}, parent);
  // wypełnienie ma kontur w swoim kolorze, który przykrywa krawędź wideo pod spodem (bez ciemnej obwódki)
  const fill = stroked(el('path', { d, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, g), 1.5);
  return { g, fill, line: stroked(el('path', { d, ...strokeAttrs(drawAttrs) }, g), STROKE) };
}

// linie konstrukcyjne i wielkie kształty (pod znakiem)
const band = [el('line', {}, gLines), el('line', {}, gLines)];
const vlines = VLINES.map(() => el('line', {}, gLines));
const caplines = CAPLINES.map(() => el('line', {}, gLines));
[...band, ...vlines, ...caplines].forEach(l => { l.setAttribute('vector-effect', 'non-scaling-stroke'); stroked(l, 1); });
const bigNodes = BIG.map(b => frame(b.L, b.x, b.y, 1).map(spec => stroked(el('path', {
  d: contoursD([{ pts: specPts(spec, new Float64Array(N * 2)), hole: false }]),
  stroke: rgb(b.color), ...strokeAttrs({ pathLength: 1 }),
}, gLines), STROKE)));

const M = {
  plate: boxPart(G.plate, gMark),
  square: boxPart(G.square, gMark),
  circle: boxPart(G.circle, gMark),
  letters: glyphGroup(G.letters, gMark),
  reg: el('path', { d: G.reg }, el('g', {}, gMark)),
  d2: glyphGroup(G.d2, gMark),
  d4: glyphGroup(G.d4, gMark),
  tagline: glyphGroup(G.tagline, gMark),
};

// sygnet: wypełnienie + dwa obrysy 2 px (zewnętrzny i otwór) rysowane jednocześnie od lewej
function sygnetNode(b, ox, oy, scale, parent) {
  const st = sygnetState(b, ox, oy, scale), color = D.brands[b].color;
  const A = specPts(st[0], new Float64Array(N * 2)), B = specPts(st[1], new Float64Array(N * 2));
  const sb = D.brands[b].sygnetBB;
  const g = el('g', {}, parent);
  return {
    g,
    c: [ox + (sb[0] + sb[2]) / 2 * scale, oy + (sb[1] + sb[3]) / 2 * scale],
    fill: el('path', { d: contoursD([{ pts: A, hole: false }, { pts: B, hole: true }]), fill: color }, g),
    lines: [A, B].map(pts => stroked(el('path', { d: contoursD([{ pts, hole: false }]), stroke: color, ...strokeAttrs(drawAttrs) }, g), STROKE)),
  };
}

function brandGroup(b, parent, withDigits = true) {
  const B = D.brands[b];
  const g = el('g', {}, parent);
  return {
    g,
    word: glyphGroup(B.word, g),
    tagline: glyphGroup(B.tagline, g),
    digits: withDigits ? el('path', { d: B.digits, fill: B.color }, el('g', {}, g)) : null,
  };
}
const slot = Object.fromEntries(BR.map(b => [b, { type: brandGroup(b, gBrands, false), syg: sygnetNode(b, SLOT[b][0], SLOT[b][1], BS, gBrands) }]));
const slotDigits = el('path', { d: D.brands.kramat.digits }, el('g', { transform: tf(SLOT.kramat[0], SLOT.kramat[1], BS) }, gBrands));
const fin = Object.fromEntries(BR.map(b => [b, { type: brandGroup(b, gBrands), syg: sygnetNode(b, FIN[b][0], FIN[b][1], 1, gBrands) }]));
for (const n of [...Object.values(slot), ...Object.values(fin)]) {
  n.type.word.outer.setAttribute('fill', rgb(C.ink));
  n.type.tagline.outer.setAttribute('fill', rgb(C.ink));
}

const camera = $('camera'), vlayer = $('vlayer'), vinner = $('vinner'), fadeEl = $('fade');

/* ---------------------------------------------------------------- render */

const setPart = (node, part, t, dy = 0) => {
  const [x, y, s] = markPart(part, t);
  node.setAttribute('transform', tf(x, y + dy, s));
};
const clipBufs = makeBufs(3);
let fitScale = 1;

function updateSygnet(n, K, t) {
  const o = at(K.sOp, t);
  n.g.style.display = o > 0.001 ? '' : 'none';
  if (o <= 0.001) return;
  const z = at(K.zoom, t), [cx, cy] = n.c;
  n.g.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${z.toFixed(4)}) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})`);
  n.g.setAttribute('opacity', op(o));
  const d = at(K.draw, t).toFixed(4);
  for (const l of n.lines) l.setAttribute('stroke-dasharray', `${d} 2`);
  n.fill.setAttribute('opacity', op(at(K.fill, t)));
}
// typografia marki: litery wjeżdżają kaskadowo w stronę sygnetu
function updateType(g, x, y, s, K, t) {
  let any = false;
  const glyphRun = (grp, lag, dir) => {
    grp.outer.setAttribute('transform', tf(x, y, s));
    grp.glyphs.forEach((p, i) => {
      const tt = t - i * lag, o = at(K.typeOp, tt);
      if (o > 0.001) any = true;
      p.setAttribute('opacity', op(o));
      p.setAttribute('transform', `translate(${(dir * at(K.wordDx, tt) / s).toFixed(2)} 0)`);
    });
  };
  glyphRun(g.word, 0.035, 1);
  glyphRun(g.tagline, 0.012, -1);
  g.g.style.display = any ? '' : 'none';
}
function updateGlyphs(grp, part, t, keys, fill) {
  setPart(grp.outer, part, t);
  grp.outer.setAttribute('fill', rgb(at(fill, t)));
  grp.glyphs.forEach((p, i) => {
    const k = keys[i];
    p.setAttribute('transform', `translate(0 ${at(k.dy, t).toFixed(2)})`);
    p.setAttribute('opacity', op(at(k.op, t)));
  });
}

function render(t) {
  /* kamera: stały, powolny najazd + ledwie odczuwalne „oddychanie” */
  const cam = 1 + CAMERA * at(T.camera, t);
  const bx = 7 * Math.sin((2 * Math.PI * t) / 17), by = 4 * Math.sin((2 * Math.PI * t) / 23 + 1);
  camera.style.transform = `translate(${(CX + bx).toFixed(2)}px,${(CY + by).toFixed(2)}px) scale(${cam.toFixed(5)}) translate(${-CX}px,${-CY}px)`;
  const px = 1 / (fitScale * cam);
  for (const [node, w] of STROKED) node.setAttribute('stroke-width', (w * px).toFixed(3));

  /* wideo */
  const vOp = at(T.vidOp, t);
  vlayer.style.opacity = op(vOp);
  if (vOp > 0.001) {
    const s = at(T.vidS, t) * 1.06;
    const c = mix(at(T.vidC, t), markCenter(t), at(T.vidFollow, t));
    const drift = hasVideo ? 0 : 28 - 56 * (t / DURATION);   // na samym zdjęciu: powolny ruch kamery
    vinner.style.transform = `translate(${c[0].toFixed(2)}px,${c[1].toFixed(2)}px) scale(${s.toFixed(5)}) translate(${(-CX + drift).toFixed(2)}px,${(-CY + drift / 2).toFixed(2)}px)`;
    if (t < FLY_HIT) {
      // ramka = dokładne granice obrazu
      const x0 = c[0] + (-CX + drift) * s, y0 = c[1] + (-CY + drift / 2) * s;
      vlayer.style.clipPath = `path('M${x0.toFixed(1)} ${y0.toFixed(1)}H${(x0 + W * s).toFixed(1)}V${(y0 + H * s).toFixed(1)}H${x0.toFixed(1)}Z')`;
    } else {
      vlayer.style.clipPath = `path('${contoursD(S_mask(t).map((spec, i) => ({ pts: specPts(spec, clipBufs[i]), hole: false })))}')`;
    }
  }

  /* linie konstrukcyjne */
  const lc = rgba(at(T.lineCol, t));
  const bp = at(T.bandP, t), yT = at(T.bandTop, t), yB = at(T.bandBot, t);
  [yT, yB].forEach((y, i) => {
    const l = band[i];
    l.setAttribute('x1', CX - (CX + 80) * bp); l.setAttribute('x2', CX + (CX + 80) * bp);
    l.setAttribute('y1', y); l.setAttribute('y2', y);
    l.setAttribute('stroke', lc); l.style.display = bp > 0.001 ? '' : 'none';
  });
  VLINES.forEach((v, i) => {
    const p = at(v.p, t), l = vlines[i];
    l.setAttribute('x1', v.x); l.setAttribute('x2', v.x);
    l.setAttribute('y1', CY - (CY + 60) * p); l.setAttribute('y2', CY + (CY + 60) * p);
    l.setAttribute('stroke', lc); l.style.display = p > 0.001 ? '' : 'none';
  });
  const cp = at(T.capP, t);
  CAPLINES.forEach((y, i) => {
    const l = caplines[i];
    l.setAttribute('x1', 1509 - (1509 - 626) * cp); l.setAttribute('x2', 1509);
    l.setAttribute('y1', y); l.setAttribute('y2', y);
    l.setAttribute('stroke', lc); l.style.display = cp > 0.001 ? '' : 'none';
  });

  /* F8–F11: wielkie kształty — rysowanie i znikanie po ścieżce */
  BIG.forEach((b, i) => {
    const head = at(b.headK, t), tail = at(b.tailK, t), len = head - tail;
    for (const l of bigNodes[i]) {
      l.style.display = len > 0.0005 ? '' : 'none';
      l.setAttribute('stroke-dasharray', `${len.toFixed(4)} 2`);
      l.setAttribute('stroke-dashoffset', (-tail).toFixed(4));
    }
  });

  /* GRUPA 24: tła i obrysy */
  const olOp = at(T.olOp, t);
  const boxes = [
    ['plate', T.plateFill, T.plateOp, T.olPlate],
    ['square', T.sqFill, T.sqOp, T.olSquare],
    ['circle', T.circFill, T.circOp, T.olCircle],
  ];
  for (const [part, fill, fop, draw] of boxes) {
    const b = M[part];
    setPart(b.g, part, t);
    const fc = rgb(at(fill, t));
    b.fill.setAttribute('fill', fc);
    b.fill.setAttribute('stroke', fc);
    b.fill.setAttribute('opacity', op(at(fop, t)));
    const d = at(draw, t);
    b.line.style.display = d > 0.001 && olOp > 0.001 ? '' : 'none';
    b.line.setAttribute('stroke-dasharray', `${d.toFixed(4)} 2`);
    b.line.setAttribute('stroke', rgba(T.olCol));
    b.line.setAttribute('opacity', op(olOp));
  }
  setPart(M.reg.parentNode, 'plate', t);
  M.reg.setAttribute('fill', rgb(C.ink));
  M.reg.setAttribute('opacity', op(at(T.regOp, t)));

  updateGlyphs(M.letters, 'letters', t, LETTERS_IN, T.lettersFill);
  updateGlyphs(M.d2, 'd2', t, D2_IN, T.d2Fill);
  updateGlyphs(M.d4, 'd4', t, D4_IN, T.d4Fill);
  updateGlyphs(M.tagline, 'tagline', t, TAG_IN, T.tagFill);
  M.tagline.outer.setAttribute('opacity', op(at(T.tagOp, t)));

  /* F5–F7: submarka obok GRUPY */
  for (const b of BR) {
    updateType(slot[b].type, SLOT[b][0], SLOT[b][1], BS, SLOT_T[b], t);
    updateSygnet(slot[b].syg, SLOT_T[b], t);
  }
  const dOp = at(SLOT_T.digOp, t);
  slotDigits.style.display = dOp > 0.001 ? '' : 'none';
  slotDigits.setAttribute('opacity', op(dOp));
  slotDigits.setAttribute('fill', rgb(at(SLOT_T.digFill, t)));

  /* F13: kolumna submarek */
  for (const b of BR) {
    const F = FIN_T[b], g = fin[b].type;
    updateType(g, FIN[b][0], FIN[b][1], 1, F, t);
    updateSygnet(fin[b].syg, F, t);
    g.digits.parentNode.setAttribute('transform', tf(FIN[b][0], FIN[b][1], 1));
    g.digits.setAttribute('opacity', op(at(F.digOp, t)));
  }

  fadeEl.style.opacity = op(at(T.fade, t));
}

/* ------------------------------------------------------------ odtwarzacz */

const stage = $('stage');
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  fitScale = s;
  stage.style.transform = `translate(${((innerWidth - W * s) / 2).toFixed(1)}px, ${((innerHeight - H * s) / 2).toFixed(1)}px) scale(${s})`;
}
addEventListener('resize', fit);
fit();

/*
 * Tryb eksportu (?frames=katalog): zamiast <video> podstawiamy klatki JPG
 * (f0001.jpg… z ffmpeg, 30 fps), bo przeglądarka bez okna nie odświeża
 * pewnie obrazu wideo po przewinięciu. W zwykłym podglądzie gra <video>.
 */
const FRAMES_DIR = params0.get('frames');
const VIDEO_FPS = 30;
const frameImg = vinner.querySelector('img');
const frameNo = t => Math.max(1, Math.min(Math.round(VIDEO_LEN * VIDEO_FPS), Math.floor(videoTime(t) * VIDEO_FPS) + 1));

// wideo (gdy się nie wczyta, zostaje zdjęcie)
let hasVideo = !!FRAMES_DIR;
const video = document.createElement('video');
Object.assign(video, { muted: true, playsInline: true, preload: 'auto' });
if (!FRAMES_DIR) for (const [src, type] of VIDEO_SOURCES) {
  const so = document.createElement('source');
  so.src = src;
  if (type) so.type = type;
  video.appendChild(so);
}
video.addEventListener('loadeddata', () => { hasVideo = true; vinner.classList.add('has-video'); syncVideo(true); render(time); });
vinner.insertBefore(video, vinner.querySelector('.shade'));
// trzyma wideo w zgodzie z osią czasu (przy przewijaniu, pętli i przejściu między odcinkami)
function syncVideo(force = false) {
  if (!hasVideo || FRAMES_DIR) return;
  const vt = videoTime(time);
  if (force || Math.abs(video.currentTime - vt) > 0.25) video.currentTime = vt;
  if (playing) video.play().catch(() => {}); else video.pause();
}
// eksport klatka po klatce: ustaw wideo dokładnie na klatkę i poczekaj na nią
// (po „seeked” czekamy jeszcze, aż nowa klatka wideo zostanie faktycznie wyświetlona)
function seekVideoExact(t) {
  if (FRAMES_DIR) {
    frameImg.src = `${FRAMES_DIR}/f${String(frameNo(t)).padStart(4, '0')}.jpg`;
    return frameImg.decode().catch(() => {});
  }
  if (!hasVideo) return Promise.resolve();
  video.pause();
  const target = videoTime(t);
  if (Math.abs(video.currentTime - target) < 1e-4) return Promise.resolve();
  return new Promise(res => {
    let finished = false;
    const finish = () => { if (!finished) { finished = true; res(); } };
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(() => finish());
        setTimeout(finish, 250);           // ta sama klatka co poprzednio — nie będzie callbacku
      } else requestAnimationFrame(() => requestAnimationFrame(finish));
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = target;
  });
}

// klatki z Figmy (momenty, w których scena jest w danym układzie)
const FRAMES = [1.8, 3.4, 5.2, 7.9, 10.4, 12.0, 13.6, 16.2, 18.0, 19.8, 21.0, 22.9, 26.0];

const params = new URLSearchParams(location.search);
if (params.has('clean')) document.body.classList.add('clean');
let time = parseFloat(params.get('t')) || 0;
let playing = !params.has('paused');
let last = null;

const ui = $('ui'), scrub = $('scrub'), timeEl = $('time'), playBtn = $('play'), marks = $('marks');
scrub.max = DURATION;
FRAMES.forEach((f, i) => {
  const b = document.createElement('button');
  b.textContent = i + 1;
  b.title = `Klatka ${i + 1} (${f.toFixed(1)} s)`;
  b.addEventListener('click', () => seek(f, false));
  marks.appendChild(b);
});

function updateUI() {
  scrub.value = time;
  timeEl.textContent = time.toFixed(2) + ' s';
  playBtn.textContent = playing ? '❚❚' : '▶';
  let cur = -1;
  FRAMES.forEach((f, i) => { if (time >= f - 0.05) cur = i; });
  [...marks.children].forEach((b, i) => b.classList.toggle('on', i === cur));
}
function seek(t, keepPlaying = playing) {
  time = Math.max(0, Math.min(DURATION, t));
  playing = keepPlaying;
  syncVideo(true);
  render(time);
  updateUI();
}
function toggle() { playing = !playing; if (time >= DURATION) time = 0; syncVideo(); updateUI(); }

playBtn.addEventListener('click', toggle);
scrub.addEventListener('input', () => seek(parseFloat(scrub.value), false));
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  else if (e.key === 'ArrowRight') seek(FRAMES.find(f => f > time + 0.05) ?? DURATION, false);
  else if (e.key === 'ArrowLeft') seek([...FRAMES].reverse().find(f => f < time - 0.05) ?? 0, false);
  else if (e.key === 'Home' || e.key === 'r') seek(0, true);
});

let idleTimer;
addEventListener('mousemove', () => {
  ui.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => ui.classList.add('idle'), 2200);
});

function tick(now) {
  if (last !== null && playing) {
    time += Math.min(0.1, (now - last) / 1000);
    if (time >= DURATION) time -= DURATION;
    syncVideo();
    render(time);
    updateUI();
  }
  last = now;
  requestAnimationFrame(tick);
}

render(time);
updateUI();
requestAnimationFrame(tick);

// do eksportu klatka po klatce (np. Playwright → ffmpeg)
window.G24 = {
  render: t => { time = t; render(t); },
  renderExact: async t => { playing = false; time = t; await seekVideoExact(t); render(t); },
  hasVideo: () => hasVideo,
  DURATION, FRAMES,
  pause: () => { playing = false; updateUI(); },
};
})();
