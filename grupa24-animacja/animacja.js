/*
 * GRUPA 24 — animacja konstrukcji sygnetów (KRAMAT · MS WAY · HI-TEC).
 *
 * Cała scena jest czystą funkcją czasu: render(t). Dzięki temu oś czasu można
 * dowolnie przewijać, a eksport klatka-po-klatce daje identyczny obraz.
 *
 * Plan (klatki z Figmy, strona „Logo 1”):
 *  F1  ciężarówka jedzie, GRUPA · 24 · hasło rysują się szeroko
 *  F2  elementy schodzą się do środka, rysuje się pas konstrukcyjny
 *  F3  hasło odpala linie konstrukcyjne, wideo skaluje się do środka, powstają apla i pola 2 / 4
 *  F4  wideo kurczy się w aplę pod GRUPA — to była ta apla
 *  F5–F7  „światła na skrzyżowaniu”: zapala się apla / 2 / 4, z kształtu rodzi się sygnet marki
 *  F8–F10 ramka z wideo w kształcie sygnetu zmienia się razem ze światłami
 *  F11–F12 koło HI-TEC rozszerza się i wypycha wideo, logo GRUPY odjeżdża w lewo
 *  F13 zestawienie wszystkich logotypów — każdy sygnet wylatuje ze „swojego” elementu GRUPY
 */
(() => {
'use strict';

const D = window.G24_DATA;
const W = 1840, H = 928, CX = 920, CY = 464;
const DURATION = 30;
const N = 600;                       // liczba punktów konturu przy morfingu
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
  io: cubicBezier(0.65, 0, 0.35, 1),    // główne przejazdy
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
  const line = (nx, ny) => { cur.segs.push({ L: [x, y, nx, ny] }); x = nx; y = ny; };
  while (i < toks.length) {
    if (typeof toks[i] === 'string') cmd = toks[i++].toUpperCase();
    switch (cmd) {
      case 'M':
        x = sx = num(); y = sy = num();
        cur = { segs: [] }; contours.push(cur); cmd = 'L';
        break;
      case 'L': line(num(), num()); break;
      case 'H': line(num(), y); break;
      case 'V': line(x, num()); break;
      case 'C': {
        const p = [x, y, num(), num(), num(), num(), num(), num()];
        cur.segs.push({ C: p }); x = p[6]; y = p[7];
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

// Punkty rozłożone równomiernie po długości, z zachowaniem wierzchołków ścieżki.
function sampleContour(contour, n) {
  const segs = contour.segs.map(s => {
    if (s.L) {
      const [x0, y0, x1, y1] = s.L;
      return { len: Math.hypot(x1 - x0, y1 - y0), at: u => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u] };
    }
    const p = s.C, steps = 48, cum = [0];
    let prev = cubicAt(p, 0);
    for (let k = 1; k <= steps; k++) {
      const q = cubicAt(p, k / steps);
      cum.push(cum[k - 1] + Math.hypot(q[0] - prev[0], q[1] - prev[1]));
      prev = q;
    }
    const len = cum[steps];
    return {
      len,
      at: u => {
        const target = u * len;
        let k = 1;
        while (k < steps && cum[k] < target) k++;
        const f = (target - cum[k - 1]) / ((cum[k] - cum[k - 1]) || 1);
        return cubicAt(p, (k - 1 + f) / steps);
      },
    };
  }).filter(s => s.len > 1e-3);

  const total = segs.reduce((a, s) => a + s.len, 0);
  const counts = segs.map(s => Math.max(1, Math.floor(n * s.len / total)));
  let diff = n - counts.reduce((a, c) => a + c, 0);
  const order = segs.map((s, k) => [n * s.len / total - Math.floor(n * s.len / total), k]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; diff > 0; j = (j + 1) % order.length, diff--) counts[order[j][1]]++;
  for (let j = 0; diff < 0; j = (j + 1) % segs.length) {
    const k = counts.indexOf(Math.max(...counts));
    counts[k]--; diff++;
  }

  const pts = new Float64Array(n * 2);
  let o = 0;
  segs.forEach((s, k) => {
    for (let j = 0; j < counts[k]; j++) {
      const q = s.at(j / counts[k]);
      pts[o++] = q[0]; pts[o++] = q[1];
    }
  });

  // jednolity kierunek obiegu
  let area = 0;
  for (let j = 0; j < n; j++) {
    const a = j * 2, b = ((j + 1) % n) * 2;
    area += pts[a] * pts[b + 1] - pts[b] * pts[a + 1];
  }
  if (area < 0) {
    for (let j = 0; j < n / 2; j++) {
      const a = j * 2, b = (n - 1 - j) * 2;
      [pts[a], pts[b]] = [pts[b], pts[a]];
      [pts[a + 1], pts[b + 1]] = [pts[b + 1], pts[a + 1]];
    }
  }
  return pts;
}

const SHAPES = {};
function addShape(name, d) {
  const pts = sampleContour(parseD(d)[0], N);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let j = 0; j < N; j++) {
    x0 = Math.min(x0, pts[2 * j]); x1 = Math.max(x1, pts[2 * j]);
    y0 = Math.min(y0, pts[2 * j + 1]); y1 = Math.max(y1, pts[2 * j + 1]);
  }
  const norm = new Float64Array(N * 2);
  for (let j = 0; j < N; j++) {
    norm[2 * j] = (pts[2 * j] - (x0 + x1) / 2) / (x1 - x0);
    norm[2 * j + 1] = (pts[2 * j + 1] - (y0 + y1) / 2) / (y1 - y0);
  }
  SHAPES[name] = { pts, norm, bb: [x0, y0, x1, y1] };
}

// prostokąty w realnych proporcjach — równy rozkład punktów = gładki morf do apli
addShape('rectFull', `M0 0L${W + 120} 0L${W + 120} ${H + 120}L0 ${H + 120}Z`);
addShape('rectF3', 'M0 0L1162 0L1162 480L0 480Z');
addShape('plate', D.grupa.plate);
addShape('square', D.grupa.square);
addShape('circle', D.grupa.circle);
for (const [k, v] of Object.entries(D.frames)) addShape(k, v.d);

// Przesunięcie indeksów, przy którym dwa kontury najlepiej do siebie pasują
const SHIFTS = new Map();
function shiftFor(a, b) {
  const key = a + '>' + b;
  if (SHIFTS.has(key)) return SHIFTS.get(key);
  const na = SHAPES[a].norm, nb = SHAPES[b].norm;
  let best = 0, bestVal = Infinity;
  for (let k = 0; k < N; k++) {
    let s = 0;
    for (let i = 0; i < N && s < bestVal; i += 2) {
      const j = ((i + k) % N) * 2;
      const dx = na[2 * i] - nb[j], dy = na[2 * i + 1] - nb[j + 1];
      s += dx * dx + dy * dy;
    }
    if (s < bestVal) { bestVal = s; best = k; }
  }
  SHIFTS.set(key, best);
  return best;
}

// spec: { shape, x, y, s | sx, sy } albo { point: [x, y] }
function specPts(spec, out) {
  if (spec.point) {
    for (let j = 0; j < N; j++) { out[2 * j] = spec.point[0]; out[2 * j + 1] = spec.point[1]; }
    return out;
  }
  const p = SHAPES[spec.shape].pts;
  const sx = spec.sx ?? spec.s, sy = spec.sy ?? spec.s;
  for (let j = 0; j < N; j++) {
    out[2 * j] = spec.x + p[2 * j] * sx;
    out[2 * j + 1] = spec.y + p[2 * j + 1] * sy;
  }
  return out;
}

const bufA = new Float64Array(N * 2), bufB = new Float64Array(N * 2);
function blend(a, b, e, out) {
  if (e <= 0) return specPts(a, out);
  if (e >= 1) return specPts(b, out);
  specPts(a, bufA); specPts(b, bufB);
  const k = a.shape && b.shape ? shiftFor(a.shape, b.shape) : 0;
  for (let i = 0; i < N; i++) {
    const j = ((i + k) % N) * 2;
    out[2 * i] = bufA[2 * i] + (bufB[j] - bufA[2 * i]) * e;
    out[2 * i + 1] = bufA[2 * i + 1] + (bufB[j + 1] - bufA[2 * i + 1]) * e;
  }
  return out;
}

const resolve = (state, t) => (typeof state === 'function' ? state(t) : state);

// segs: [[t0, t1, fromState, toState, ease]] — stan = { outer: spec, inner: spec }
function morphAt(segs, t, outO, outI) {
  let hold = segs[0][2];
  for (const [t0, t1, from, to, ease] of segs) {
    if (t < t0) break;
    if (t <= t1) {
      const e = (ease || E.io)((t - t0) / (t1 - t0));
      const A = resolve(from, t), B = resolve(to, t);
      blend(A.outer, B.outer, e, outO);
      blend(A.inner, B.inner, e, outI);
      return;
    }
    hold = to;
  }
  const S = resolve(hold, t);
  specPts(S.outer, outO);
  specPts(S.inner, outI);
}

function contourD(pts) {
  const parts = new Array(N);
  for (let j = 0; j < N; j++) parts[j] = pts[2 * j].toFixed(1) + ' ' + pts[2 * j + 1].toFixed(1);
  return 'M' + parts.join('L') + 'Z';
}

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

const MOVES = [[2.4, 3.8, L2], [4.0, 5.0, L3], [7.6, 8.6, L4], [9.2, 10.2, L5], [16.1, 17.2, L8], [24.2, 25.4, L12]];
const POS = {};
for (const part of Object.keys(L1)) POS[part] = seq(L1[part], ...MOVES.map(([a, b, L]) => [a, b, L[part]]));

const plateCenter = L => [L.plate[0] + 180.664 * L.plate[2], L.plate[1] + 31.482 * L.plate[2]];

/* ----------------------------------------------------------------- tracks */

const T = {
  // apla pod GRUPA
  plateFill: seq(C.white, [7.7, 7.71, C.black, E.lin], [12.0, 12.6, C.grey], [16.6, 17.2, C.kramat], [18.6, 19.2, C.grey], [22.4, 23.0, C.black]),
  plateOp: seq(0, [5.0, 5.6, 1], [7.1, 7.7, 0], [9.2, 9.7, 1]),
  lettersFill: seq(C.white, [5.0, 5.6, C.ink], [6.9, 7.5, C.white], [16.6, 17.2, C.ink], [22.4, 23.0, C.white]),
  regOp: seq(0, [7.4, 7.9, 1]),
  // pole „2”
  sqFill: seq(C.white, [6.8, 7.4, C.black], [9.3, 9.9, C.grey], [12.0, 12.6, C.black], [14.0, 14.6, C.grey], [18.6, 19.2, C.msway], [20.4, 21.0, C.grey], [22.4, 23.0, C.black]),
  sqOp: seq(0, [5.0, 5.6, 1]),
  d2Fill: seq(C.white, [5.0, 5.6, C.ink], [6.8, 7.4, C.white], [16.6, 17.2, C.ink], [22.4, 23.0, C.white]),
  // pole „4”
  circFill: seq(C.white, [6.8, 7.4, C.black], [9.3, 9.9, C.grey], [14.0, 14.6, C.black], [16.6, 17.2, C.grey], [20.4, 21.0, C.hitec], [22.4, 23.0, C.black]),
  circOp: seq(0, [5.0, 5.6, 1]),
  d4Fill: seq(C.white, [5.0, 5.6, C.ink], [6.8, 7.4, C.white], [16.6, 17.2, C.ink], [22.4, 23.0, C.white]),
  // hasło
  tagFill: seq(C.white, [16.0, 16.01, C.ink, E.lin]),
  tagOp: seq(1, [6.3, 6.8, 0], [16.79, 16.8, 1, E.lin]),
  // F1: rysowanie napisów (odsłanianie od lewej)
  lettersWipe: seq(0, [0.45, 1.45, 1, E.out]),
  d2Wipe: seq(0, [0.8, 1.4, 1, E.out]),
  d4Wipe: seq(0, [0.9, 1.5, 1, E.out]),
  tagWipe: seq(0, [1.15, 2.0, 1, E.out], [16.0, 16.01, 0, E.lin], [16.8, 17.7, 1, E.out]),
  lettersDy: seq(14, [0.45, 1.45, 0, E.out]),
  d2Dy: seq(14, [0.8, 1.4, 0, E.out]),
  d4Dy: seq(14, [0.9, 1.5, 0, E.out]),
  tagDy: seq(14, [1.15, 2.0, 0, E.out]),

  // wideo
  vidOp: seq(1, [9.2, 9.7, 0], [16.49, 16.5, 1, E.lin]),
  vidS: seq(1, [4.6, 5.8, 0.66], [6.6, 7.6, 0.24], [16.45, 16.5, 1, E.lin]),
  vidC: seq([CX, CY], [4.6, 5.8, [923, 464]], [6.6, 7.6, plateCenter(L3)], [7.6, 8.6, plateCenter(L4)],
    [9.2, 10.2, plateCenter(L5)], [16.45, 16.5, [CX, CY], E.lin]),

  // linie konstrukcyjne
  bandP: seq(0, [2.6, 3.8, 1, E.out], [6.3, 6.9, 0]),
  bandTop: seq(423, [4.2, 5.0, 440]),
  bandBot: seq(525, [4.2, 5.0, 505]),
  lineCol: seq([255, 255, 255, 0.45], [4.4, 5.4, [150, 150, 150, 0.6]]),
  capP: seq(0, [4.6, 5.5, 1, E.out], [6.25, 6.75, 0]),

  fade: seq(1, [0, 0.8, 0, E.out], [29.2, 30, 1]),
};

// pionowe linie: odpalane od hasła (prawa strona) w lewo
const VLINES = [1331.48, 1213.32, 1191.42, 1125.59, 1116.99, 1048.99, 1036.88, 675.55]
  .map((x, i) => ({ x, p: seq(0, [4.45 + i * 0.09, 5.3 + i * 0.09, 1, E.out], [6.25 + i * 0.03, 6.75 + i * 0.03, 0]) }));
const CAPLINES = [457.02, 489.52];

/* ------------------------------------------------------- shape states (clip) */

const markPart = (part, t) => at(POS[part], t);
const partShape = (part, shape, cx, cy) => t => {
  const [x, y, s] = markPart(part, t);
  return { outer: { shape, x, y, s }, inner: { point: [x + cx * s, y + cy * s] } };
};
const plateShape = partShape('plate', 'plate', 180.664, 31.482);
const squareShape = partShape('square', 'square', 34, 31.482);
const circleShape = partShape('circle', 'circle', 32.912, 32.912);

const frameState = (L, x, y, s) => ({ outer: { shape: L + '_outer', x, y, s }, inner: { shape: L + '_inner', x, y, s } });
const K_C = [743, 392.518], H_C = [790.544, 417.324];

const S_full = { outer: { shape: 'rectFull', x: -60, y: -60, s: 1 }, inner: { point: [CX, CY] } };
const S_rect = { outer: { shape: 'rectF3', x: 342, y: 224, s: 1 }, inner: { point: [923, 464] } };
const S_K0 = (() => {
  const s = 0.45, o = { shape: 'K_outer', x: CX - K_C[0] * s, y: 464.52 - K_C[1] * s, s };
  return { outer: o, inner: o };
})();
const S_K = frameState('K', 177, 72, 1);
const S_M = frameState('M', 122, -12, 1);
const S_H = frameState('H', 130, 47, 1);
const S_Hcover = frameState('H', 920.544 - H_C[0] * 3, 464.324 - H_C[1] * 3, 3);

const CLIP = [
  [4.6, 5.8, S_full, S_rect],
  [6.6, 7.6, S_rect, plateShape],
  [16.5, 17.9, S_K0, S_K, E.open],
  [18.6, 19.6, S_K, S_M],
  [20.4, 21.4, S_M, S_H],
  [22.2, 24.2, S_H, S_Hcover],
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
  return frameState(FRAME_OF[b], ox + s[0] * scale, oy + s[1] * scale, k);
}
const SLOT = Object.fromEntries(BR.map(b => [b, brandOrigin(b)]));
const SLOT_SYG = Object.fromEntries(BR.map(b => [b, sygnetState(b, SLOT[b][0], SLOT[b][1], BS)]));

// sygnet marki w F5–F7: rodzi się z apli GRUPA, potem przechodzi w kolejne kształty
const SLOT_MORPH = [
  [9.8, 11.0, plateShape, SLOT_SYG.kramat],
  [12.1, 13.1, SLOT_SYG.kramat, SLOT_SYG.msway],
  [14.1, 15.1, SLOT_SYG.msway, SLOT_SYG.hitec],
];
const SLOT_T = {
  fill: seq(C.black, [10.0, 10.9, C.kramat], [12.1, 13.1, C.msway], [14.1, 15.1, C.hitec]),
  op: seq(0, [9.79, 9.8, 1, E.lin], [16.0, 16.5, 0]),
  dx: seq(0, [16.0, 16.5, 24]),
  kramat: { op: seq(0, [10.7, 11.3, 1, E.out], [12.0, 12.4, 0]), dy: seq(14, [10.7, 11.3, 0, E.out], [12.0, 12.4, -14]) },
  msway: { op: seq(0, [12.6, 13.2, 1, E.out], [14.0, 14.4, 0]), dy: seq(14, [12.6, 13.2, 0, E.out], [14.0, 14.4, -14]) },
  hitec: { op: seq(0, [14.6, 15.2, 1, E.out], [16.0, 16.4, 0]), dy: seq(14, [14.6, 15.2, 0, E.out], [16.0, 16.4, -14]) },
};

// F13: zestawienie logotypów — sygnety wylatują z apli, z „2” i z „4”
const FIN = { kramat: [1153, 231], msway: [1153, 419], hitec: [1153, 607] };
const FIN_SRC = { kramat: plateShape, msway: squareShape, hitec: circleShape };
const FIN_T = Object.fromEntries(BR.map((b, i) => {
  const t0 = 25.2 + i * 0.15, w0 = 26.25 + i * 0.15;
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
  const path = el('path', { d }, inner);
  return { outer, inner, path, rect, w: bb[2] - bb[0] + pad * 2 };
}

const M = {
  plate: el('path', { d: G.plate }, el('g', {}, gMark)),
  square: el('path', { d: G.square }, el('g', {}, gMark)),
  circle: el('path', { d: G.circle }, el('g', {}, gMark)),
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
const slotSyg = el('path', { 'fill-rule': 'evenodd' }, gGhosts);
const finSyg = Object.fromEntries(BR.map(b => [b, el('path', { 'fill-rule': 'evenodd' }, gGhosts)]));

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

const vlayer = $('vlayer'), vinner = $('vinner'), fadeEl = $('fade');

/* ---------------------------------------------------------------- render */

const tf = (x, y, s) => `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(4)})`;
const setPart = (node, part, t, dy = 0) => {
  const [x, y, s] = markPart(part, t);
  node.setAttribute('transform', tf(x, y + dy, s));
};
const op = v => Math.max(0, Math.min(1, v)).toFixed(3);
const oPts = new Float64Array(N * 2), iPts = new Float64Array(N * 2);

function render(t) {
  /* wideo */
  const vOp = at(T.vidOp, t);
  vlayer.style.opacity = op(vOp);
  if (vOp > 0.001) {
    const s = at(T.vidS, t) * 1.06, c = at(T.vidC, t);
    const drift = 28 - 56 * (t / DURATION);   // ciężarówka powoli „jedzie” w górę-lewo
    vinner.style.transform = `translate(${c[0].toFixed(2)}px,${c[1].toFixed(2)}px) scale(${s.toFixed(5)}) translate(${(-CX + drift).toFixed(2)}px,${(-CY + drift / 2).toFixed(2)}px)`;
    morphAt(CLIP, t, oPts, iPts);
    vlayer.style.clipPath = `path(evenodd, '${contourD(oPts)} ${contourD(iPts)}')`;
  }

  /* linie konstrukcyjne */
  const lc = rgba(at(T.lineCol, t));
  const bp = at(T.bandP, t), yT = at(T.bandTop, t), yB = at(T.bandBot, t);
  [yT, yB].forEach((y, i) => {
    const l = band[i];
    l.setAttribute('x1', CX - (CX + 20) * bp); l.setAttribute('x2', CX + (CX + 20) * bp);
    l.setAttribute('y1', y); l.setAttribute('y2', y);
    l.setAttribute('stroke', lc); l.style.display = bp > 0.001 ? '' : 'none';
  });
  VLINES.forEach((v, i) => {
    const p = at(v.p, t), l = vlines[i];
    l.setAttribute('x1', v.x); l.setAttribute('x2', v.x);
    l.setAttribute('y1', CY - (CY + 20) * p); l.setAttribute('y2', CY + (CY + 20) * p);
    l.setAttribute('stroke', lc); l.style.display = p > 0.001 ? '' : 'none';
  });
  const cp = at(T.capP, t);
  CAPLINES.forEach((y, i) => {
    const l = caplines[i];
    l.setAttribute('x1', 1509 - (1509 - 626) * cp); l.setAttribute('x2', 1509);
    l.setAttribute('y1', y); l.setAttribute('y2', y);
    l.setAttribute('stroke', lc); l.style.display = cp > 0.001 ? '' : 'none';
  });

  /* GRUPA 24 */
  setPart(M.plate.parentNode, 'plate', t);
  M.plate.setAttribute('fill', rgb(at(T.plateFill, t)));
  M.plate.setAttribute('opacity', op(at(T.plateOp, t)));
  setPart(M.reg.parentNode, 'plate', t);
  M.reg.setAttribute('fill', rgb(C.ink));
  M.reg.setAttribute('opacity', op(at(T.regOp, t)));
  setPart(M.square.parentNode, 'square', t);
  M.square.setAttribute('fill', rgb(at(T.sqFill, t)));
  M.square.setAttribute('opacity', op(at(T.sqOp, t)));
  setPart(M.circle.parentNode, 'circle', t);
  M.circle.setAttribute('fill', rgb(at(T.circFill, t)));
  M.circle.setAttribute('opacity', op(at(T.circOp, t)));

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
    morphAt(SLOT_MORPH, t, oPts, iPts);
    slotSyg.setAttribute('d', contourD(oPts) + contourD(iPts));
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
    morphAt(F.morph, t, oPts, iPts);
    finSyg[b].setAttribute('d', contourD(oPts) + contourD(iPts));
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

// klatki z Figmy (momenty, w których scena stoi w danym układzie)
const FRAMES = [1.9, 4.0, 6.0, 8.9, 11.6, 13.6, 15.6, 18.2, 20.0, 21.8, 23.0, 25.0, 28.6];

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
