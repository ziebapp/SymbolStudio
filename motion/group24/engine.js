// GROUP 24 motion system — prototype engine.
// Immediate-mode: frame(scene, t) returns the full SVG markup for time t (seconds).
// Same function drives the realtime preview (index.html) and the offline render (render.js).

(function () {
  const W = 1920, H = 1080;
  const UNIT = 128; // every logo is normalised to 128 units tall

  const BRANDS = {
    hitec:  { file: 'hitec24',  tagline: 'IN THE RIGHT TEMPERATURE.', grad: ['#74E4D5', '#2C8783'] },
    kramat: { file: 'kramat24', tagline: 'IN THE RIGHT HANDS.',       grad: ['#EA6420', '#A1151A'] },
    msway:  { file: 'msway24',  tagline: 'IN THE RIGHT TIME.',        grad: ['#AEF1A3', '#4CA563'] },
  };
  const ORDER = ['hitec', 'kramat', 'msway'];
  const LIGHT = '#E4E8E9';
  const INK = [10, 10, 10], WHITE = [255, 255, 255];

  // ---------- easing / helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const expoOut = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const quintInOut = x => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2);
  const ease = { out: expoOut, io: quintInOut };
  const rgb = c => `rgb(${c.map(Math.round).join(',')})`;
  const mixC = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
  const f = n => +n.toFixed(2);

  // ---------- parse brand SVGs ----------
  function parseBrands() {
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px';
    document.body.appendChild(host);
    for (const key of ORDER) {
      const b = BRANDS[key];
      const doc = new DOMParser().parseFromString(window.LOGOS[b.file], 'image/svg+xml');
      const svg = doc.documentElement;
      const vw = +svg.getAttribute('width'), vh = +svg.getAttribute('height');
      b.w = vw; b.h = vh; b.k = UNIT / vh;
      const parts = [];
      for (const p of svg.querySelectorAll('path')) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.setAttribute('d', p.getAttribute('d'));
        host.appendChild(el);
        const bb = el.getBBox();
        parts.push({ d: p.getAttribute('d'), stroke: p.hasAttribute('stroke') ? +p.getAttribute('stroke-width') : 0,
                     x: bb.x, y: bb.y, w: bb.width, h: bb.height });
        el.remove();
      }
      const isMarker = q => q.w <= 25 && q.h <= 17 && (q.y < 2 || q.y + q.h > vh - 2);
      const markers = parts.filter(isMarker);
      const rest = parts.filter(q => !isMarker(q));
      // columns: left / middle / right
      const xs = [...new Set(markers.map(m => Math.round(m.x)))].sort((a, c) => a - c);
      const midX = xs[1];
      b.markers = markers.map(m => {
        const col = xs.indexOf(Math.round(m.x));
        const top = m.y < vh / 2;
        return { col, top, slot: col * 2 + (top ? 0 : 1), x: m.x, y: m.y, w: m.w, h: m.h };
      }).sort((a, c) => a.slot - c.slot);
      b.digits = rest.filter(q => q.x > midX).sort((a, c) => a.x - c.x || a.y - c.y);
      b.name = rest.filter(q => q.x < midX).sort((a, c) => a.x - c.x);
      // marker corner radii [tl,tr,br,bl] in svg units
      b.markers.forEach(m => {
        if (key === 'hitec') m.r = [m.w / 2, m.w / 2, m.w / 2, m.w / 2];
        else if (key === 'kramat') m.r = [0, 0, 0, 0];
        else {
          const R = m.w; const right = m.col === 2;
          m.r = m.top ? (right ? [0, R, 0, 0] : [R, 0, 0, 0]) : (right ? [0, 0, R, 0] : [0, 0, 0, R]);
        }
      });
      const nx = b.name.map(q => q.x), nr = b.name.map(q => q.x + q.w);
      b.nameBox = [Math.min(...nx) - 4, Math.max(...nr) + 4];
    }
    host.remove();
  }

  // ---------- layouts ----------
  // layout = { ox, oy, s } where s multiplies svg units of that brand (includes k)
  function centerLayout(key, S = 1.25, dy = -30) {
    const b = BRANDS[key]; const s = S * b.k;
    return { ox: W / 2 - (b.w * s) / 2, oy: H / 2 - (UNIT * S) / 2 + dy, s };
  }
  function trioLayout(key, S = 0.82) {
    const i = ORDER.indexOf(key);
    const maxW = Math.max(...ORDER.map(k => BRANDS[k].w * BRANDS[k].k)) * S;
    const b = BRANDS[key]; const s = S * b.k;
    const right = W / 2 + maxW / 2;
    const cy = H / 2 + (i - 1) * 200;
    return { ox: right - b.w * s, oy: cy - (UNIT * S) / 2, s };
  }
  const lerpLayout = (a, c, p) => ({ ox: lerp(a.ox, c.ox, p), oy: lerp(a.oy, c.oy, p), s: lerp(a.s, c.s, p) });

  // ---------- markers ----------
  function markerGeom(key, slot, L) {
    const m = BRANDS[key].markers[slot];
    return { x: L.ox + m.x * L.s, y: L.oy + m.y * L.s, w: m.w * L.s, h: m.h * L.s, r: m.r.map(v => v * L.s) };
  }
  // notch = the cut-out bottom-right quadrant of the group's middle signet shape (▛); it appears late, disappears early
  const lerpGeom = (a, c, p) => {
    const na = a.notch || 0, nc = c.notch || 0;
    const np = nc > na ? clamp((p - 0.6) / 0.4) : clamp(p * 2.5);
    return { x: lerp(a.x, c.x, p), y: lerp(a.y, c.y, p), w: lerp(a.w, c.w, p), h: lerp(a.h, c.h, p),
             r: a.r.map((v, i) => lerp(v, c.r[i], p)), notch: lerp(na, nc, np) };
  };
  function rr(g) {
    let { x, y, w, h } = g; if (w <= 0.01 || h <= 0.01) return '';
    const m = Math.min(w, h);
    let [tl, tr, br, bl] = g.r.map(v => clamp(v, 0, m));
    let d = `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}` + (tr ? `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}` : '') +
      `V${f(y + h - br)}` + (br ? `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}` : '') +
      `H${f(x + bl)}` + (bl ? `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}` : '') +
      `V${f(y + tl)}` + (tl ? `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}` : '') + 'Z';
    const n = g.notch || 0;
    if (n > 0.001) {
      const nx = x + w * (1 - 0.564 * n), ny = y + h * (1 - 0.541 * n);
      d += `M${f(nx)} ${f(ny)}H${f(x + w)}V${f(y + h)}H${f(nx)}Z`;
    }
    return d;
  }
  const shape = (g, extra = '') => `<path fill-rule="evenodd" d="${rr(g)}"${extra}/>`;

  // ---------- group lockup: GROUP 24 ■ ▛ ● LEADING ALL THE WAY. ----------
  const GS = 0.95, CY = H / 2 - 30;
  const GRP = {};
  function parseGroup() {
    const doc = new DOMParser().parseFromString(window.LOGOS.group24, 'image/svg+xml');
    const ds = [...doc.querySelectorAll('path')].map(p => p.getAttribute('d'));
    const x0 = d => parseFloat(d.slice(1));
    GRP.word = ds.filter(d => x0(d) < 520 || (x0(d) > 520 && x0(d) < 720));   // GROUP + thin "24"
    GRP.tag = ds.filter(d => x0(d) > 1080);
    GRP.ox = W / 2 - 696.5 * GS; GRP.oy = CY - 135.6 * GS;
    GRP.dx = W / 2 - (GRP.ox + 901.85 * GS); // shift that centres the signet alone
  }
  // signet shape i (0 ■, 1 ▛, 2 ●); shift 0 = lockup position, 1 = signet centred alone
  function sigGeom(i, shift = 1) {
    const S = GS, X = GRP.ox + GRP.dx * shift, Y = GRP.oy;
    if (i === 0) return { x: X + 762.38 * S, y: Y + 98.05 * S, w: 96.24 * S, h: 77.37 * S, r: [0, 0, 0, 0] };
    if (i === 1) return { x: X + 871.91 * S, y: Y + 96.98 * S, w: 81.78 * S, h: 77.81 * S, r: [35.19 * S, 0, 0, 0], notch: 1 };
    const R = 40.73 * S;
    return { x: X + 959.87 * S, y: Y + 94.92 * S, w: 81.46 * S, h: 81.46 * S, r: [R, R, R, R] };
  }
  // wordmark is pulled out of the square (clipped left of it), tagline out of the circle (clipped right of it)
  function groupType(shift, color) {
    if (shift >= 0.999) return '';
    const S = GS, sq = sigGeom(0, shift), ci = sigGeom(2, shift), dx = GRP.dx * shift;
    const push = (sigGeom(0, 0).x - (GRP.ox + 47 * S)) * shift;
    const pushT = ((GRP.ox + 1347 * S) - (sigGeom(2, 0).x + sigGeom(2, 0).w)) * shift;
    let o = `<clipPath id="gw"><rect x="-200" y="0" width="${f(sq.x + 200)}" height="${H}"/></clipPath>`;
    o += `<g clip-path="url(#gw)"><g transform="translate(${f(GRP.ox + dx + push)} ${f(GRP.oy)}) scale(${S})" fill="${color}">${GRP.word.map(d => `<path d="${d}"/>`).join('')}</g></g>`;
    o += `<clipPath id="gt"><rect x="${f(ci.x + ci.w)}" y="0" width="${W}" height="${H}"/></clipPath>`;
    o += `<g clip-path="url(#gt)"><g transform="translate(${f(GRP.ox + dx - pushT)} ${f(GRP.oy)}) scale(${S})" fill="${color}">${GRP.tag.map(d => `<path d="${d}"/>`).join('')}</g></g>`;
    return o;
  }
  const SIGNET_OF = { kramat: 0, msway: 1, hitec: 2 }; // which signet shape seeds which brand

  // ---------- logo (name + digits) ----------
  let clipId = 0;
  function logo(key, L, st, color) {
    const b = BRANDS[key];
    let out = `<g transform="translate(${f(L.ox)} ${f(L.oy)}) scale(${L.s.toFixed(5)})" fill="${color}">`;
    // name: letters rise in from below a clip line, exit upward
    const id = 'c' + (clipId++);
    out += `<clipPath id="${id}"><rect x="${b.nameBox[0]}" y="22" width="${b.nameBox[1] - b.nameBox[0]}" height="84"/></clipPath><g clip-path="url(#${id})">`;
    const n = b.name.length, stg = 0.09;
    b.name.forEach((q, i) => {
      const pin = ease.out(clamp((st.nameIn - i * stg) / (1 - (n - 1) * stg)));
      const pout = ease.io(clamp((st.nameOut - i * stg) / (1 - (n - 1) * stg)));
      const dy = (1 - pin) * 84 - pout * 84;
      if (pin <= 0 || pout >= 1) return;
      out += `<path transform="translate(0 ${f(dy)})" d="${q.d}"${q.stroke ? ` stroke="${color}" stroke-width="${q.stroke}"` : ''}/>`;
    });
    out += '</g>';
    // digits: each segment is drawn out of the previous one (overlapping wipes, like a pen stroke);
    // horizontal segments grow left→right, vertical ones top→bottom; exit retracts toward the end.
    const N = b.digits.length, ov = 0.45, D = 1 / (1 + (N - 1) * ov);
    b.digits.forEach((q, i) => {
      const pin = ease.out(clamp((st.digitsIn - i * ov * D) / D));
      const pout = ease.io(clamp((st.digitsOut - i * ov * D) / D));
      if (pin <= 0 || pout >= 1) return;
      const id2 = 'd' + (clipId++);
      const horiz = q.w >= q.h, m = 2;
      const r = horiz
        ? { x: q.x - m + q.w * pout, y: q.y - m, w: (q.w + 2 * m) * (pin - pout), h: q.h + 2 * m }
        : { x: q.x - m, y: q.y - m + q.h * pout, w: q.w + 2 * m, h: (q.h + 2 * m) * (pin - pout) };
      out += `<clipPath id="${id2}"><rect x="${f(r.x)}" y="${f(r.y)}" width="${f(Math.max(0, r.w))}" height="${f(Math.max(0, r.h))}"/></clipPath><path clip-path="url(#${id2})" d="${q.d}"/>`;
    });
    return out + '</g>';
  }

  // ---------- construction grid ----------
  const LABELS = ['033', 'I—8', '025', '8—7'];
  function grid(key, L, p, alpha, color) {
    if (p <= 0 || alpha <= 0) return '';
    const b = BRANDS[key];
    const cols = [0, 2, 4].map(sl => markerGeom(key, sl, L));
    const bot = markerGeom(key, 1, L);
    const x0 = L.ox - 90, x1 = L.ox + b.w * L.s + 90;
    const ys = [cols[0].y, L.oy + 30 * L.s, L.oy + 96 * L.s, bot.y + bot.h];
    const y0 = L.oy - 70, y1 = bot.y + bot.h + 70;
    const e = ease.out(p);
    let o = `<g stroke="${color}" stroke-width="1" opacity="${f(alpha * 0.35)}" fill="none">`;
    ys.forEach((y, i) => { const q = ease.out(clamp(p * 1.4 - i * 0.12)); o += `<line x1="${f(x0)}" y1="${f(y)}" x2="${f(lerp(x0, x1, q))}" y2="${f(y)}"/>`; });
    cols.forEach((c, i) => { const q = ease.out(clamp(p * 1.4 - 0.15 - i * 0.12)); const x = c.x + c.w / 2; o += `<line x1="${f(x)}" y1="${f(y0)}" x2="${f(x)}" y2="${f(lerp(y0, y1, q))}"/>`; });
    o += '</g>';
    o += `<g fill="${color}" opacity="${f(alpha * 0.55 * e)}" font-family="DejaVu Sans Mono, monospace" font-size="13" letter-spacing="1">`;
    const lx = [x0, cols[0].x + 30, cols[1].x - 70, cols[2].x - 50];
    LABELS.forEach((t, i) => { o += `<text x="${f(lx[i])}" y="${f(y1 + 22)}">${t}</text>`; });
    return o + '</g>';
  }

  // ---------- tagline (typed, mono) ----------
  function tagline(text, x, y, p, color, del = 0) {
    const n = Math.floor(text.length * clamp(p)) - Math.floor(text.length * clamp(del));
    if (n <= 0 && p <= 0) return '';
    const shown = text.slice(0, Math.max(0, n));
    const typing = (p > 0 && p < 1) || (del > 0 && del < 1);
    return `<text x="${f(x)}" y="${f(y)}" fill="${color}" font-family="DejaVu Sans Mono, monospace" font-size="22" letter-spacing="4">${shown}${typing ? '▌' : ''}</text>`;
  }

  // ---------- background ----------
  function background(weights, lightW) {
    let o = `<defs>${ORDER.map(k => `<linearGradient id="g_${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BRANDS[k].grad[0]}"/><stop offset="1" stop-color="${BRANDS[k].grad[1]}"/></linearGradient>`).join('')}</defs>`;
    o += `<rect width="${W}" height="${H}" fill="${LIGHT}"/>`;
    ORDER.forEach(k => { const w = weights[k] || 0; if (w > 0) o += `<rect width="${W}" height="${H}" fill="url(#g_${k})" opacity="${f(w)}"/>`; });
    return o;
  }

  const svgWrap = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${inner}</svg>`;

  // =====================================================================
  // SCENE: single-brand sting (light background), 3.4 s
  // =====================================================================
  function sting(key, t, dark = false) {
    clipId = 0;
    const L = centerLayout(key);
    const color = dark ? '#fff' : rgb(INK);
    let o = dark ? background({ [key]: 1 }) : background({});
    o += grid(key, L, seg(t, 0.45, 1.15), 1 - seg(t, 1.9, 2.3), color);
    // seed shape: brand marker shape, large, centred
    const base = markerGeom(key, 0, L);
    const big = { ...base, w: base.w * 4, h: base.h * 4, r: base.r.map(v => v * 4) };
    big.x = W / 2 - big.w / 2; big.y = L.oy + (UNIT * 1.25) / 2 - big.h / 2;
    const pIn = ease.out(seg(t, 0, 0.35));
    let mk = '';
    for (let sl = 0; sl < 6; sl++) {
      const p = ease.io(seg(t, 0.35 + sl * 0.025, 0.95 + sl * 0.025));
      const from = { ...big, x: big.x + big.w / 2 * (1 - pIn), y: big.y + big.h / 2 * (1 - pIn), w: big.w * pIn, h: big.h * pIn, r: big.r.map(v => v * pIn) };
      mk += shape(lerpGeom(from, markerGeom(key, sl, L), p));
    }
    o += `<g fill="${color}">${mk}</g>`;
    o += logo(key, L, { nameIn: seg(t, 1.05, 1.7), nameOut: 0, digitsIn: seg(t, 0.8, 1.35), digitsOut: 0 }, color);
    const ml = markerGeom(key, 1, L);
    o += tagline(BRANDS[key].tagline, ml.x, ml.y + ml.h + 64, seg(t, 1.65, 2.25), color);
    return svgWrap(o);
  }

  // =====================================================================
  // SCENE: system film — one continuous chain, nothing appears from nowhere:
  // dot → line → signet → (pulls out) GROUP 24 lockup → signet emits 3 brand rows →
  // the 24-box expands into the next scene (×3) → gradient collapses back into ■ → lockup
  // =====================================================================
  const F = { line: 0.18, split: 0.58, out1: 1.25, back: 2.75, trio: 3.25, x1: 5.45, c1: 7.65, c2: 9.85, out: 12.05, end: 15.2 };
  const FULL = { x: -W * 0.06, y: -H * 0.06, w: W * 1.12, h: H * 1.12, r: [0, 0, 0, 0] };

  function shiftAt(t) {
    if (t < F.out) return clamp(1 - ease.io(seg(t, F.out1, F.out1 + 0.9)) + ease.io(seg(t, F.back, F.back + 0.6)));
    return 1 - ease.io(seg(t, F.out + 1.0, F.out + 1.9));
  }
  const CAM = [[0, 1], [F.back, 1.05], [F.trio + 0.7, 1], [F.x1, 1.03], [F.x1 + 1.3, 1], [F.c1, 1.03], [F.c1 + 1.3, 1],
               [F.c2, 1.03], [F.c2 + 1.3, 1], [F.out, 1.03], [F.out + 1.0, 1], [F.end, 1.045]];
  function camAt(t) {
    for (let i = 1; i < CAM.length; i++) if (t <= CAM[i][0]) {
      const [a, sa] = CAM[i - 1], [b, sb] = CAM[i]; const p = seg(t, a, b);
      return lerp(sa, sb, p * p * (3 - 2 * p));
    }
    return CAM[CAM.length - 1][1];
  }
  const camWrap = (s, inner) => `<g transform="translate(${W / 2} ${CY}) scale(${s.toFixed(5)}) translate(${-W / 2} ${-CY})">${inner}</g>`;

  function box24(key, L) {
    const a = markerGeom(key, 2, L), c = markerGeom(key, 5, L);
    return { x: a.x, y: a.y, w: c.x + c.w - a.x, h: c.y + c.h - a.y, r: [0, 0, 0, 0] };
  }
  // where markers park while the frame is full-screen: the four screen corners, brand shape ×2.4
  function cornerGeom(key, slot) {
    const m = BRANDS[key].markers[slot], k = BRANDS[key].k * 2.4, inset = 64;
    const w = m.w * k, h = m.h * k, right = m.col === 2;
    return { x: right ? W - inset - w : inset, y: m.top ? inset : H - inset - h, w, h, r: m.r.map(v => v * k) };
  }
  const tagPos = (key, L) => { const a = markerGeom(key, 1, L); return [a.x, a.y + a.h + 64]; };

  // opening + trio, all on the light ground
  function openingAndTrio(t, skipHitecMarkers) {
    let o = '';
    const shift = shiftAt(t);
    const s0 = sigGeom(0, 1), s2 = sigGeom(2, 1);
    const lx0 = s0.x, lx1 = s2.x + s2.w, ly = s0.y + s0.h / 2, Lw = lx1 - lx0;
    // hairline left behind by the line, stretching to the screen edges and fading
    if (t > F.split) {
      const ph = ease.out(seg(t, F.split, F.split + 0.9)), fade = 1 - seg(t, F.out1, F.out1 + 0.8);
      if (fade > 0) o += `<line x1="${f(lerp(lx0, 0, ph))}" x2="${f(lerp(lx1, W, ph))}" y1="${f(ly)}" y2="${f(ly)}" stroke="${rgb(INK)}" stroke-width="1" opacity="${f(0.4 * fade)}"/>`;
    }
    let mk = '';
    if (t < F.split) {
      const dr = 7 * ease.out(seg(t, 0, 0.28)), pl = ease.io(seg(t, F.line, F.split));
      const w = lerp(2 * dr, Lw, pl), h = lerp(2 * dr, 3, pl);
      mk += shape({ x: W / 2 - w / 2, y: ly - h / 2, w, h, r: [h / 2, h / 2, h / 2, h / 2] });
    } else if (t < F.trio) {
      for (let i = 0; i < 3; i++) {
        const piece = { x: lx0 + i * Lw / 3, y: ly - 1.5, w: Lw / 3, h: 3, r: [0, 0, 0, 0] };
        const ps = ease.io(seg(t, F.split + i * 0.07, F.split + 0.6 + i * 0.07));
        mk += shape(lerpGeom(piece, sigGeom(i, shift), ps));
      }
    }
    if (t < F.trio + 0.2) o += groupType(shift, rgb(INK));
    // signet shapes each emit one brand row (6 markers out of 1 shape)
    if (t >= F.trio) {
      for (const key of ORDER) {
        const i = ORDER.indexOf(key), L = trioLayout(key), sg = SIGNET_OF[key];
        if (!(skipHitecMarkers && key === 'hitec')) {
          for (let sl = 0; sl < 6; sl++) {
            const p = ease.io(seg(t, F.trio + i * 0.07 + sl * 0.025, F.trio + 0.8 + i * 0.07 + sl * 0.025));
            mk += shape(lerpGeom(sigGeom(sg, 1), markerGeom(key, sl, L), p));
          }
        }
        o += grid(key, L, seg(t, F.trio + 0.35 + i * 0.1, F.trio + 1.15 + i * 0.1), 1 - seg(t, F.x1 - 0.5, F.x1), rgb(INK));
        o += logo(key, L, { nameIn: seg(t, F.trio + 0.9 + i * 0.1, F.trio + 1.55 + i * 0.1), nameOut: 0,
                            digitsIn: seg(t, F.trio + 0.6 + i * 0.1, F.trio + 1.25 + i * 0.1), digitsOut: 0 }, rgb(INK));
      }
    }
    return o + `<g fill="${rgb(INK)}">${mk}</g>`;
  }

  // a brand on its own gradient, fully built (what the next expansion covers)
  function brandStill(key) {
    const L = centerLayout(key), [tx, ty] = tagPos(key, L);
    let o = shape(FULL, ` fill="url(#g_${key})"`);
    o += logo(key, L, { nameIn: 1, nameOut: 0, digitsIn: 1, digitsOut: 0 }, '#fff');
    o += tagline(BRANDS[key].tagline, tx, ty, 1, '#fff');
    let mk = ''; for (let sl = 0; sl < 6; sl++) mk += shape(markerGeom(key, sl, L));
    return o + `<g fill="#fff">${mk}</g>`;
  }

  function film(t) {
    clipId = 0;
    const bg = background({});
    let o = '';

    if (t < F.x1) {
      o = openingAndTrio(t, false);
    } else if (t < F.out) {
      const stages = [{ x: F.x1, from: null, to: 'hitec' }, { x: F.c1, from: 'hitec', to: 'kramat' }, { x: F.c2, from: 'kramat', to: 'msway' }];
      const st = stages.filter(s => t >= s.x).pop(), x0 = st.x;
      const fromKey = st.from || 'hitec';
      const fromL = st.from ? centerLayout(st.from) : trioLayout('hitec');
      const toL = centerLayout(st.to);
      const pe = ease.io(seg(t, x0, x0 + 0.7));
      // under: whatever the frame is about to cover
      if (pe < 1) o += st.from ? brandStill(st.from).replace(/<g fill="#fff">[^]*<\/g>$/, '') : openingAndTrio(t, true);
      // the 24-box of the current logo grows to full screen in the next brand's gradient
      o += shape(lerpGeom(box24(fromKey, fromL), FULL, pe), ` fill="url(#g_${st.to})"`);
      // new logo builds inside it
      o += logo(st.to, toL, { nameIn: seg(t, x0 + 0.75, x0 + 1.35), nameOut: 0, digitsIn: seg(t, x0 + 0.6, x0 + 1.2), digitsOut: 0 }, '#fff');
      const [tx, ty] = tagPos(st.to, toL);
      o += tagline(BRANDS[st.to].tagline, tx, ty, seg(t, x0 + 1.05, x0 + 1.55), '#fff');
      // markers ride the frame's corners out to the screen corners, morphing shape, then fly back as the new logo
      let mk = '';
      for (let sl = 0; sl < 6; sl++) {
        const p1 = ease.io(seg(t, x0 + sl * 0.015, x0 + 0.7 + sl * 0.015));
        const p2 = ease.io(seg(t, x0 + 0.66 + sl * 0.02, x0 + 1.4 + sl * 0.02));
        const g = p2 > 0 ? lerpGeom(cornerGeom(st.to, sl), markerGeom(st.to, sl, toL), p2)
                         : lerpGeom(markerGeom(fromKey, sl, fromL), cornerGeom(st.to, sl), p1);
        const c = st.from ? '#fff' : rgb(mixC(INK, WHITE, p1));
        mk += shape(g, ` fill="${c}"`);
      }
      o += mk;
    } else {
      // outro: gradient collapses into the signet square, markers fold into ▛ and ●, then GROUP is pulled out again
      const L = centerLayout('msway'), shift = shiftAt(t);
      const pc = ease.io(seg(t, F.out + 0.2, F.out + 1.05));
      const sq = lerpGeom(FULL, sigGeom(0, shift), pc);
      o += shape(sq, ` fill="${rgb(INK)}"`);
      o += shape(sq, ` fill="url(#g_msway)" opacity="${f(1 - seg(pc, 0.55, 0.95))}"`);
      o += logo('msway', L, { nameIn: 1, nameOut: seg(t, F.out, F.out + 0.45), digitsIn: 1, digitsOut: seg(t, F.out, F.out + 0.4) }, '#fff');
      const [tx, ty] = tagPos('msway', L);
      o += tagline(BRANDS.msway.tagline, tx, ty, 1, '#fff', seg(t, F.out, F.out + 0.3));
      for (let sl = 0; sl < 6; sl++) {
        const col = Math.floor(sl / 2);
        const p = ease.io(seg(t, F.out + 0.15 + col * 0.06, F.out + 1.0 + col * 0.06));
        o += shape(lerpGeom(markerGeom('msway', sl, L), sigGeom(col, shift), p), ` fill="${rgb(mixC(WHITE, INK, seg(p, 0.3, 0.8)))}"`);
      }
      o += groupType(shift, rgb(INK));
    }
    return svgWrap(bg + camWrap(camAt(t), o));
  }

  const SCENES = {
    film: { dur: F.end, fn: film },
    'sting-hitec': { dur: 3.4, fn: t => sting('hitec', t) },
    'sting-kramat': { dur: 3.4, fn: t => sting('kramat', t) },
    'sting-msway': { dur: 3.4, fn: t => sting('msway', t) },
    'sting-hitec-color': { dur: 3.4, fn: t => sting('hitec', t, true) },
    'sting-kramat-color': { dur: 3.4, fn: t => sting('kramat', t, true) },
    'sting-msway-color': { dur: 3.4, fn: t => sting('msway', t, true) },
  };

  let ready = false;
  window.G24 = {
    SCENES,
    init() { if (!ready) { parseBrands(); parseGroup(); ready = true; } },
    frame(scene, t) { this.init(); return SCENES[scene].fn(t); },
  };
})();
