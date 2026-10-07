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
 *  F5–F7  „światła na skrzyżowaniu”: zapala się apla / 2 / 4, z kształtu rodzi się sygnet marki
 *  F8–F10 ramka z wideo w kształcie sygnetu zmienia się razem ze światłami
 *  F11–F12 koło HI-TEC rozszerza się i wypycha wideo, logo GRUPY odjeżdża w lewo
 *  F13 zestawienie wszystkich logotypów — każdy sygnet wylatuje ze „swojego” elementu GRUPY
 *
 * Kamera przez cały czas bardzo powoli najeżdża na scenę, więc obraz nigdy nie stoi.
 */
(() => {
'use strict';

const D = window.G24_DATA;
const W = 1840, H = 928, CX = 920, CY = 464;
const DURATION = 27;
const ANCHORS = 24;                  // kotwice kątowe konturu (co 15°)
const N = ANCHORS * 30;              // punktów na kontur
const CAMERA = 0.07;                 // najazd kamery przez całą animację
const SVGNS = 'http://www.w3.org/2000/svg';
const VIDEO_SRC = new URLSearchParams(location.search).get('video') || 'assets/truck.mp4';

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
  io: cubicBezier(0.45, 0, 0.25, 1),    // miękki start, długie dojście
  out: cubicBezier(0.22, 1, 0.36, 1),   // wejścia elementów
  open: cubicBezier(0.5, 0, 0.15, 1),   // otwieranie ramki
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
      const dt = t1 - t0, s = (t - t0) / dt, s2 = s * s, s3 = s2 * s;
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

addShape('rectFull', `M0 0L${W + 120} 0L${W + 120} ${H + 120}L0 ${H + 120}Z`);
addShape('rectF3', 'M0 0L1162 0L1162 480L0 480Z');
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

const bufA = new Float64Array(N * 2), bufB = new Float64Array(N * 2);
function blend(a, b, e, out) {
  if (e <= 0) return specPts(a, out);
  if (e >= 1) return specPts(b, out);
  specPts(a, bufA); specPts(b, bufB);
  for (let i = 0; i < N * 2; i++) out[i] = bufA[i] + (bufB[i] - bufA[i]) * e;
  return out;
}

const resolve = (state, t) => (typeof state === 'function' ? state(t) : state);

// segs: [[t0, t1, fromState, toState, ease]] — stan = lista konturów (spec)
function morphAt(segs, t, bufs) {
  let hold = segs[0][2];
  for (const [t0, t1, from, to, ease, stagger = 0] of segs) {
    if (t < t0) break;
    if (t <= t1) {
      const p = (t - t0) / (t1 - t0), A = resolve(from, t), B = resolve(to, t);
      const span = 1 - stagger * (A.length - 1);
      return A.map((a, i) => {
        const e = (ease || E.io)(Math.max(0, Math.min(1, (p - i * stagger) / span)));
        return { pts: blend(a, B[i], e, bufs[i]), hole: !!(B[i].hole || a.hole) };
      });
    }
    hold = to;
  }
  return resolve(hold, t).map((s, i) => ({ pts: specPts(s, bufs[i]), hole: !!s.hole }));
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
  [13.9, L5], [15.0, L8],
  [21.2, L8], [22.4, L12],
];
const POS = {};
for (const part of Object.keys(L1)) POS[part] = path(MOVES.map(([t, L, pass]) => [t, L[part], pass]));
const markPart = (part, t) => pathAt(POS[part], t);
// środek całego znaku (apla + 2 + 4)
const markCenter = t => { const [x, y, s] = markPart('plate', t); return [x + 257.9 * s, y + 31.5 * s]; };

/* ----------------------------------------------------------------- tracks */

const T = {
  // apla pod GRUPA (do F4 tę rolę gra wideo)
  plateFill: seq(C.black, [10.6, 11.2, C.grey], [14.4, 15.0, C.kramat], [16.2, 16.8, C.grey], [19.6, 20.2, C.black]),
  plateOp: seq(0, [8.3, 8.8, 1]),
  lettersFill: seq(C.white, [14.4, 15.0, C.ink], [19.6, 20.2, C.white]),
  regOp: seq(0, [7.3, 7.8, 1]),
  // pole „2”
  sqFill: seq(C.black, [8.4, 9.0, C.grey], [10.6, 11.2, C.black], [12.2, 12.8, C.grey], [16.2, 16.8, C.msway], [17.8, 18.4, C.grey], [19.6, 20.2, C.black]),
  sqOp: seq(0, [6.9, 7.5, 1]),
  d2Fill: seq(C.white, [14.4, 15.0, C.ink], [19.6, 20.2, C.white]),
  // pole „4”
  circFill: seq(C.black, [8.4, 9.0, C.grey], [12.2, 12.8, C.black], [14.4, 15.0, C.grey], [17.8, 18.4, C.hitec], [19.6, 20.2, C.black]),
  circOp: seq(0, [6.9, 7.5, 1]),
  d4Fill: seq(C.white, [14.4, 15.0, C.ink], [19.6, 20.2, C.white]),
  // hasło
  tagFill: seq(C.white, [5.5, 6.1, C.ink]),
  tagOp: seq(1, [6.6, 7.1, 0], [14.59, 14.6, 1, E.lin]),
  // F1: rysowanie napisów (odsłanianie od lewej)
  lettersWipe: seq(0, [0.35, 1.35, 1, E.out]),
  d2Wipe: seq(0, [0.7, 1.3, 1, E.out]),
  d4Wipe: seq(0, [0.8, 1.4, 1, E.out]),
  tagWipe: seq(0, [1.0, 1.85, 1, E.out], [13.8, 13.81, 0, E.lin], [14.6, 15.5, 1, E.out]),
  lettersDy: seq(14, [0.35, 1.35, 0, E.out]),
  d2Dy: seq(14, [0.7, 1.3, 0, E.out]),
  d4Dy: seq(14, [0.8, 1.4, 0, E.out]),
  tagDy: seq(14, [1.0, 1.85, 0, E.out]),

  // wideo: skala i środek; vidFollow = jak mocno wideo trzyma się znaku
  vidOp: seq(1, [8.3, 8.8, 0], [14.29, 14.3, 1, E.lin]),
  vidS: seq(1, [3.6, 5.0, 0.66], [5.4, 6.6, 0.38], [14.25, 14.3, 1, E.lin]),
  vidC: seq([CX, CY], [3.6, 5.0, [923, 464]], [14.25, 14.3, [CX, CY], E.lin]),
  vidFollow: seq(0, [5.4, 6.6, 1], [14.25, 14.3, 0, E.lin]),

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
  olOp: seq(1, [6.2, 6.8, 0]),
  olCol: [255, 255, 255, 0.9],

  camera: seq(0, [0, DURATION, 1, E.lin]),
  fade: seq(1, [0, 0.8, 0, E.out], [26.2, 27, 1]),
};

// pionowe linie: odpalane od hasła (prawa strona) w lewo
const VLINES = [1331.48, 1213.32, 1191.42, 1125.59, 1116.99, 1048.99, 1036.88, 675.55]
  .map((x, i) => ({ x, p: seq(0, [3.9 + i * 0.08, 4.7 + i * 0.08, 1, E.out], [5.9 + i * 0.03, 6.4 + i * 0.03, 0]) }));
const CAPLINES = [457.02, 489.52];

/* ------------------------------------------------------- shape states (clip) */

const PT = p => ({ point: p });
const partSpec = (part, shape) => t => { const [x, y, s] = markPart(part, t); return { shape, x, y, s }; };
const plateSpec = partSpec('plate', 'plate'), squareSpec = partSpec('square', 'square'), circleSpec = partSpec('circle', 'circle');
const centerOf = (spec, c) => PT([spec.x + c[0] * spec.s, spec.y + c[1] * spec.s]);
const plateShape = t => { const s = plateSpec(t); return [s, centerOf(s, [180.664, 31.482])]; };
const squareShape = t => { const s = squareSpec(t); return [s, centerOf(s, [34, 31.482])]; };
const circleShape = t => { const s = circleSpec(t); return [s, centerOf(s, [32.912, 32.912])]; };

const frame = (L, x, y, s) => [{ shape: L + '_outer', x, y, s }, { shape: L + '_inner', x, y, s, hole: true }];
const K_C = [743, 392.518], H_C = [790.544, 417.324];

// maska wideo: zawsze 3 kontury (suma kształtów)
const rectF3 = { shape: 'rectF3', x: 342, y: 224, s: 1 };
const S_full = [{ shape: 'rectFull', x: -60, y: -60, s: 1 }, PT([923, 464]), PT([923, 464])];
const S_rect = [rectF3, rectF3, rectF3];
const S_mask = t => [plateSpec(t), squareSpec(t), circleSpec(t)];   // wideo w masce logo
const S_K0 = (() => {
  const s = 0.45, o = { shape: 'K_outer', x: CX - K_C[0] * s, y: 464.52 - K_C[1] * s, s };
  return [o, { ...o, hole: true }, PT([CX, CY])];
})();
const S_K = [...frame('K', 177, 72, 1), PT([CX, CY])];
const S_M = [...frame('M', 122, -12, 1), PT([CX, CY])];
const S_H = [...frame('H', 130, 47, 1), PT([CX, CY])];
const S_Hcover = [...frame('H', 920.544 - H_C[0] * 3, 464.324 - H_C[1] * 3, 3), PT([CX, CY])];

const CLIP = [
  [3.6, 5.0, S_full, S_rect],
  [5.3, 6.7, S_rect, S_mask, E.io, 0.1],   // wideo zjeżdża kolejno do apli, kwadratu i koła
  [14.3, 15.7, S_K0, S_K, E.open],
  [16.2, 17.2, S_K, S_M],
  [17.8, 18.8, S_M, S_H],
  [19.4, 21.4, S_H, S_Hcover],
];

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
const SLOT_SYG = Object.fromEntries(BR.map(b => [b, sygnetState(b, SLOT[b][0], SLOT[b][1], BS)]));

// sygnet marki w F5–F7: rodzi się z apli GRUPA, potem przechodzi w kolejne kształty
const SLOT_MORPH = [
  [8.8, 10.0, plateShape, SLOT_SYG.kramat],
  [10.7, 11.7, SLOT_SYG.kramat, SLOT_SYG.msway],
  [12.3, 13.3, SLOT_SYG.msway, SLOT_SYG.hitec],
];
const SLOT_T = {
  fill: seq(C.black, [9.0, 9.9, C.kramat], [10.7, 11.7, C.msway], [12.3, 13.3, C.hitec]),
  op: seq(0, [8.79, 8.8, 1, E.lin], [13.8, 14.3, 0]),
  dx: seq(0, [13.8, 14.3, 24]),
  kramat: { op: seq(0, [9.7, 10.3, 1, E.out], [10.6, 11.0, 0]), dy: seq(14, [9.7, 10.3, 0, E.out], [10.6, 11.0, -14]) },
  msway: { op: seq(0, [11.2, 11.8, 1, E.out], [12.2, 12.6, 0]), dy: seq(14, [11.2, 11.8, 0, E.out], [12.2, 12.6, -14]) },
  hitec: { op: seq(0, [12.8, 13.4, 1, E.out], [13.8, 14.2, 0]), dy: seq(14, [12.8, 13.4, 0, E.out], [13.8, 14.2, -14]) },
};

// F13: zestawienie logotypów — sygnety wylatują z apli, z „2” i z „4”
const FIN = { kramat: [1153, 231], msway: [1153, 419], hitec: [1153, 607] };
const FIN_SRC = { kramat: plateShape, msway: squareShape, hitec: circleShape };
const FIN_T = Object.fromEntries(BR.map((b, i) => {
  const t0 = 22.2 + i * 0.15, w0 = 23.25 + i * 0.15;
  return [b, {
    morph: [[t0, t0 + 1.3, FIN_SRC[b], sygnetState(b, FIN[b][0], FIN[b][1], 1)]],
    fill: seq(C.black, [t0, t0 + 0.7, C[b]]),
    op: seq(0, [t0 - 0.01, t0, 1, E.lin]),
    wordOp: seq(0, [w0, w0 + 0.7, 1, E.out]),
    wordDx: seq(18, [w0, w0 + 0.8, 0, E.out]),
    digOp: seq(0, [w0 - 0.1, w0 + 0.4, 1, E.out]),
  }];
}));

/* ------------------------------------------------------------------ DOM */

const $ = id => document.getElementById(id);
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

const defs = $('defs'), gLines = $('lines'), gGhosts = $('ghosts'), gMark = $('mark'), gBrands = $('brands');
const G = D.grupa;

// odsłanianie (wipe) w lokalnych współrzędnych części
function wipeGroup(id, bb, d, parent) {
  const pad = 4;
  const cp = el('clipPath', { id: 'cl-' + id, clipPathUnits: 'userSpaceOnUse' }, defs);
  const rect = el('rect', { x: bb[0] - pad, y: bb[1] - 40, height: bb[3] - bb[1] + 80, width: 0 }, cp);
  const outer = el('g', {}, parent);
  const inner = el('g', { 'clip-path': `url(#cl-${id})` }, outer);
  const p = el('path', { d }, inner);
  return { outer, inner, path: p, rect, w: bb[2] - bb[0] + pad * 2 };
}
// tło + obrys elementu (obrys rysowany kreską o długości 0→1)
function boxPart(d, parent) {
  const g = el('g', {}, parent);
  return {
    g,
    fill: el('path', { d }, g),
    line: el('path', { d, fill: 'none', 'stroke-width': 1.5, pathLength: 1, 'stroke-dasharray': '0 2', 'stroke-linejoin': 'round' }, g),
  };
}

const M = {
  plate: boxPart(G.plate, gMark),
  square: boxPart(G.square, gMark),
  circle: boxPart(G.circle, gMark),
  letters: wipeGroup('letters', G.lettersBB, G.letters, gMark),
  reg: el('path', { d: G.reg }, el('g', {}, gMark)),
  d2: wipeGroup('d2', G.d2BB, G.d2, gMark),
  d4: wipeGroup('d4', G.d4BB, G.d4, gMark),
  tagline: wipeGroup('tagline', G.taglineBB, G.tagline, gMark),
};

// linie konstrukcyjne
const band = [el('line', {}, gLines), el('line', {}, gLines)];
const vlines = VLINES.map(() => el('line', {}, gLines));
const caplines = CAPLINES.map(() => el('line', {}, gLines));

// sygnety (pod logo GRUPA, żeby „wychodziły” spod elementów)
const slotSyg = el('path', {}, gGhosts);
const finSyg = Object.fromEntries(BR.map(b => [b, el('path', {}, gGhosts)]));

function brandGroup(b, parent) {
  const B = D.brands[b];
  const g = el('g', {}, parent);
  return {
    g,
    word: el('path', { d: B.word, fill: rgb(C.ink) }, el('g', {}, g)),
    digits: el('path', { d: B.digits, fill: B.color }, el('g', {}, g)),
    tagline: el('path', { d: B.tagline, fill: rgb(C.ink) }, el('g', {}, g)),
  };
}
const slot = Object.fromEntries(BR.map(b => [b, brandGroup(b, gBrands)]));
const fin = Object.fromEntries(BR.map(b => [b, brandGroup(b, gBrands)]));

const camera = $('camera'), vlayer = $('vlayer'), vinner = $('vinner'), fadeEl = $('fade');

/* ---------------------------------------------------------------- render */

const tf = (x, y, s) => `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(4)})`;
const setPart = (node, part, t, dy = 0) => {
  const [x, y, s] = markPart(part, t);
  node.setAttribute('transform', tf(x, y + dy, s));
};
const op = v => Math.max(0, Math.min(1, v)).toFixed(3);
const clipBufs = makeBufs(3), sygBufs = makeBufs(2);

function render(t) {
  /* kamera: stały, bardzo powolny najazd */
  const cam = 1 + CAMERA * at(T.camera, t);
  camera.style.transform = `translate(${CX}px,${CY}px) scale(${cam.toFixed(5)}) translate(${-CX}px,${-CY}px)`;

  /* wideo */
  const vOp = at(T.vidOp, t);
  vlayer.style.opacity = op(vOp);
  if (vOp > 0.001) {
    const s = at(T.vidS, t) * 1.06;
    const c = mix(at(T.vidC, t), markCenter(t), at(T.vidFollow, t));
    const drift = 28 - 56 * (t / DURATION);   // ciężarówka powoli „jedzie” w górę-lewo
    vinner.style.transform = `translate(${c[0].toFixed(2)}px,${c[1].toFixed(2)}px) scale(${s.toFixed(5)}) translate(${(-CX + drift).toFixed(2)}px,${(-CY + drift / 2).toFixed(2)}px)`;
    vlayer.style.clipPath = `path('${contoursD(morphAt(CLIP, t, clipBufs))}')`;
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
    b.fill.setAttribute('fill', rgb(at(fill, t)));
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

  const wipes = [
    ['letters', T.lettersFill, T.lettersWipe, T.lettersDy, null],
    ['d2', T.d2Fill, T.d2Wipe, T.d2Dy, null],
    ['d4', T.d4Fill, T.d4Wipe, T.d4Dy, null],
    ['tagline', T.tagFill, T.tagWipe, T.tagDy, T.tagOp],
  ];
  for (const [part, fill, wipe, dy, opk] of wipes) {
    const w = M[part];
    setPart(w.outer, part, t, at(dy, t));
    w.path.setAttribute('fill', rgb(at(fill, t)));
    w.rect.setAttribute('width', (w.w * at(wipe, t)).toFixed(2));
    if (opk) w.outer.setAttribute('opacity', op(at(opk, t)));
  }

  /* F5–F7: logotyp marki obok GRUPY */
  const sOp = at(SLOT_T.op, t);
  slotSyg.style.display = sOp > 0.001 ? '' : 'none';
  if (sOp > 0.001) {
    slotSyg.setAttribute('d', contoursD(morphAt(SLOT_MORPH, t, sygBufs)));
    slotSyg.setAttribute('fill', rgb(at(SLOT_T.fill, t)));
    slotSyg.setAttribute('opacity', op(sOp));
    slotSyg.setAttribute('transform', `translate(${at(SLOT_T.dx, t).toFixed(2)} 0)`);
  }
  for (const b of BR) {
    const o = at(SLOT_T[b].op, t), g = slot[b];
    g.g.style.display = o > 0.001 ? '' : 'none';
    if (o <= 0.001) continue;
    const [x, y] = SLOT[b], dy = at(SLOT_T[b].dy, t);
    g.word.parentNode.setAttribute('transform', tf(x, y + dy, BS));
    g.tagline.parentNode.setAttribute('transform', tf(x, y + dy, BS));
    g.digits.parentNode.setAttribute('transform', tf(x, y, BS));
    g.g.setAttribute('opacity', op(o));
  }

  /* F13: zestawienie */
  for (const b of BR) {
    const F = FIN_T[b], o = at(F.op, t);
    finSyg[b].style.display = o > 0.001 ? '' : 'none';
    fin[b].g.style.display = o > 0.001 ? '' : 'none';
    if (o <= 0.001) continue;
    finSyg[b].setAttribute('d', contoursD(morphAt(F.morph, t, sygBufs)));
    finSyg[b].setAttribute('fill', rgb(at(F.fill, t)));
    const [x, y] = FIN[b], dx = at(F.wordDx, t), wo = op(at(F.wordOp, t));
    fin[b].word.parentNode.setAttribute('transform', tf(x + dx, y, 1));
    fin[b].word.setAttribute('opacity', wo);
    fin[b].tagline.parentNode.setAttribute('transform', tf(x - dx, y, 1));
    fin[b].tagline.setAttribute('opacity', wo);
    fin[b].digits.parentNode.setAttribute('transform', tf(x, y, 1));
    fin[b].digits.setAttribute('opacity', op(at(F.digOp, t)));
  }

  fadeEl.style.opacity = op(at(T.fade, t));
}

/* ------------------------------------------------------------ odtwarzacz */

const stage = $('stage');
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(${((innerWidth - W * s) / 2).toFixed(1)}px, ${((innerHeight - H * s) / 2).toFixed(1)}px) scale(${s})`;
}
addEventListener('resize', fit);
fit();

// opcjonalne prawdziwe wideo: assets/truck.mp4 (albo ?video=ścieżka)
const video = document.createElement('video');
Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto' });
video.addEventListener('loadeddata', () => { vinner.classList.add('has-video'); syncVideo(); });
video.addEventListener('error', () => video.remove());
vinner.insertBefore(video, vinner.querySelector('.shade'));
video.src = VIDEO_SRC;
function syncVideo() {
  if (!video.duration) return;
  video.currentTime = time % video.duration;
  if (playing) video.play().catch(() => {}); else video.pause();
}

// klatki z Figmy (momenty, w których scena jest w danym układzie)
const FRAMES = [1.8, 3.4, 5.2, 7.9, 10.3, 12.0, 13.6, 15.8, 17.4, 19.0, 20.1, 22.3, 25.0];

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
  syncVideo();
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
    if (time >= DURATION) { time -= DURATION; syncVideo(); }
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
window.G24 = { render: t => { time = t; render(t); }, DURATION, FRAMES, pause: () => { playing = false; updateUI(); } };
})();
