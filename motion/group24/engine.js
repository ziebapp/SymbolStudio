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

  const bboxOf = qs => {
    const x0 = Math.min(...qs.map(q => q.x)), y0 = Math.min(...qs.map(q => q.y));
    return { x: x0, y: y0, w: Math.max(...qs.map(q => q.x + q.w)) - x0, h: Math.max(...qs.map(q => q.y + q.h)) - y0 };
  };

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
      b.dbb = bboxOf(b.digits); b.nbb = bboxOf(b.name);
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
    GRP.grp = ds.filter(d => x0(d) < 520);                     // GROUP
    GRP.d24 = ds.filter(d => x0(d) > 520 && x0(d) < 720);      // thin "24"
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

  // =====================================================================
  // SCENE: reveal (Figma storyboard) — GROUP 24 lockup → signet folds into one block →
  // block grows into a photo strip, then a square on the construction grid → the "24" cycles
  // through its forms (group / KRAMAT / MS WAY / HI-TEC) → the HI-TEC 24 flies right, stretching
  // its plate, and the name rides in → logo settles, plate turns brand colour → KRAMAT and
  // MS WAY slide in (staggered layers, parallax) → last plate becomes ▛, ■ and ● grow out of it
  // → GROUP 24 lockup in sub-brand colours → black, small.
  // =====================================================================
  const K = 0.5523; // cubic handle length for a quarter circle
  // no holds: every phase starts while the previous one is still moving
  const PH = { merge: 0.1, strip: 0.7, square: 1.4, f1: 2.45, f2: 3.15, f3: 3.85, fly: 4.55, name: 4.85, down: 5.4,
               s1: 6.25, s2: 7.35, out: 8.5, end: 12.3 };
  const flow = x => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2); // cubic in-out: short tails, chains without stalls
  // proportions: Figma values, then scaled down for a quieter, more technical frame —
  // the grid scene to 70 % around (640, 540), the lockup to 80 % around the frame centre
  const GS2 = 0.7, LS = 0.8;
  const gRect = r => ({ x: 640 + (r.x - 582) * GS2, y: 540 + (r.y - 540.5) * GS2, w: r.w * GS2, h: r.h * GS2 });
  const lx = x => 960 + (x - 960) * LS, ly = y => 540 + (y - 540) * LS;
  const lRect = r => ({ ...r, x: lx(r.x), y: ly(r.y), w: r.w * LS, h: r.h * LS, r: r.r.map(v => v * LS) });
  const BOX = gRect({ x: 265, y: 396, w: 632, h: 287 });  // the 24 on the grid (two 5×5-cell digits)
  const GRID = (r => ({ x: r.x, y: r.y, s: r.w, n: 13 }))(gRect({ x: 208, y: 166, w: 747, h: 747 }));
  const CELL = GRID.s / GRID.n;
  const DIG4 = 345 * GS2;                                   // x offset of the "4" inside the box
  const FLY = 770 * GS2;                                    // how far the 24 travels right
  const SQ = gRect({ x: 33, y: 39, w: 1098, h: 1003 });
  const STRIP = lRect({ x: 461, y: 471, w: 705, h: 141, r: [0, 0, 0, 0] });
  const INSET = { x: 200, y: 140, w: 1520, h: 800 };
  const PHOTO_SQ = [SQ.x - 400, SQ.y - 520];                // photo offset while the plate is square
  const TXT_X = 1170;                                       // right-hand copy column
  const TRUCK = { x: 866, y: 578, w: 311, h: 151, dir: [0.9496, -0.3134], v: 38, t0: 3.2 }; // sprite in photo space
  const D24 = { x: 543.47, y: 101.83, w: 167.96, h: 69.82 }; // thin 24 inside group24.svg
  const TAG_X = 1090.19;                                    // tagline left edge inside group24.svg

  const C0 = { dx: 0, dy: 0, k: 0 };
  const cr = (d, k = K) => ({ dx: d, dy: d, k });
  const CORNERS = {
    rect: [C0, C0, C0, C0],
    kramat: [C0, cr(130, 0), C0, cr(130, 0)],               // chamfered TR / BL
    msway: [cr(36), cr(36), cr(36), cr(36)],
    hitec: [0, 1, 2, 3].map(() => ({ dx: SQ.w / 2, dy: SQ.h / 2, k: K })),
  };
  const pill = b => [0, 1, 2, 3].map(() => cr(Math.min(b.w, b.h) / 2));
  const FULLPILL = { x: 48, y: 48, w: W - 96, h: H - 96, c: pill({ w: W - 96, h: H - 96 }) };
  const SLIDE = {
    hitec: { ...INSET, c: pill(INSET) },
    kramat: { ...INSET, c: CORNERS.rect },
    msway: { ...INSET, c: [0, 1, 2, 3].map(() => cr(56)) },
  };
  const lerpAp = (a, b, p) => ({
    x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p),
    c: a.c.map((q, i) => ({ dx: lerp(q.dx, b.c[i].dx, p), dy: lerp(q.dy, b.c[i].dy, p), k: lerp(q.k, b.c[i].k, p) })),
    notch: lerp(a.notch || 0, b.notch || 0, p),
  });
  const toAp = g => ({ x: g.x, y: g.y, w: g.w, h: g.h, c: g.r.map(r => cr(r)), notch: g.notch || 0 });
  // plate outline: per corner a cubic from edge to edge; k = 0 → chamfer, k = K → round, d = 0 → sharp
  function apPath(g) {
    const { x, y, w, h } = g; if (w < 0.01 || h < 0.01) return '';
    const [tl, tr, br, bl] = g.c.map(q => ({ dx: clamp(q.dx, 0, w / 2), dy: clamp(q.dy, 0, h / 2), k: q.k }));
    const cub = (a, c, b, k) => `C${f(a[0] + (c[0] - a[0]) * k)} ${f(a[1] + (c[1] - a[1]) * k)} ${f(b[0] + (c[0] - b[0]) * k)} ${f(b[1] + (c[1] - b[1]) * k)} ${f(b[0])} ${f(b[1])}`;
    let d = `M${f(x + tl.dx)} ${f(y)}L${f(x + w - tr.dx)} ${f(y)}` + cub([x + w - tr.dx, y], [x + w, y], [x + w, y + tr.dy], tr.k);
    d += `L${f(x + w)} ${f(y + h - br.dy)}` + cub([x + w, y + h - br.dy], [x + w, y + h], [x + w - br.dx, y + h], br.k);
    d += `L${f(x + bl.dx)} ${f(y + h)}` + cub([x + bl.dx, y + h], [x, y + h], [x, y + h - bl.dy], bl.k);
    d += `L${f(x)} ${f(y + tl.dy)}` + cub([x, y + tl.dy], [x, y], [x + tl.dx, y], tl.k) + 'Z';
    const n = seg(g.notch || 0, 0.6, 1);
    if (n > 0.001) {
      const nx = x + w * (1 - 0.564 * n), ny = y + h * (1 - 0.541 * n);
      d += `M${f(nx)} ${f(ny)}H${f(x + w)}V${f(y + h)}H${f(nx)}Z`;
    }
    return d;
  }
  const ap = (g, extra = '') => `<path fill-rule="evenodd" d="${apPath(g)}"${extra}/>`;

  // group lockup at Figma position (svg origin 251,405, scale 1)
  const LK = [
    { x: 1013.38, y: 503.05, w: 96.24, h: 77.37, r: [0, 0, 0, 0] },
    { x: 1122.91, y: 501.98, w: 81.78, h: 77.81, r: [35.19, 0, 0, 0], notch: 1 },
    { x: 1210.87, y: 499.92, w: 81.46, h: 81.46, r: [40.73, 40.73, 40.73, 40.73] },
  ].map(lRect);
  const MERGED = lRect({ x: 1013, y: 503, w: 153, h: 77, r: [0, 0, 0, 0] });
  const TUCK = [null, lRect({ x: 1021.78, y: 510.34, w: 64.22, h: 61.1, r: [27.6, 0, 0, 0], notch: 1 }),
                      lRect({ x: 1033, y: 512, w: 57, h: 57, r: [28.5, 28.5, 28.5, 28.5] })];
  const LOCK = `translate(${f(lx(251))} ${f(ly(405))}) scale(${LS})`; // group24.svg → screen

  const finalLayout = key => { const b = BRANDS[key], s = 64 / b.h; return { ox: W / 2 - b.w * s / 2, oy: H / 2 - b.h * s / 2, s }; };
  const fitT = (bb, box) => { const s = Math.min(box.w / bb.w, box.h / bb.h);
    return { s, tx: box.x + (box.w - bb.w * s) / 2 - bb.x * s, ty: box.y + (box.h - bb.h * s) / 2 - bb.y * s }; };
  const lerpT = (a, b, p) => ({ s: lerp(a.s, b.s, p), tx: lerp(a.tx, b.tx, p), ty: lerp(a.ty, b.ty, p) });
  const paths = (qs, color) => qs.map(q => `<path d="${q.d}"${q.stroke ? ` stroke="${color}" stroke-width="${q.stroke}"` : ''}/>`).join('');
  const thin24 = (box, color) => `<g transform="translate(${f(box.x - D24.x * box.w / D24.w)} ${f(box.y - D24.y * box.h / D24.h)}) scale(${(box.w / D24.w).toFixed(5)} ${(box.h / D24.h).toFixed(5)})" fill="${color}">${GRP.d24.map(d => `<path d="${d}"/>`).join('')}</g>`;
  const brand24 = (key, T, color) => `<g transform="translate(${f(T.tx)} ${f(T.ty)}) scale(${T.s.toFixed(5)})" fill="${color}">${paths(BRANDS[key].digits, color)}</g>`;

  function defs() {
    let o = '<defs>';
    for (const k of ORDER) o += `<linearGradient id="ag_${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BRANDS[k].grad[0]}"/><stop offset="1" stop-color="${BRANDS[k].grad[1]}"/></linearGradient>`;
    o += `<linearGradient id="bg_hitec" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#80E3D8"/><stop offset="0.6" stop-color="#4BC3D2"/><stop offset="1" stop-color="#2EA7C4"/></linearGradient>`;
    o += `<radialGradient id="bg_hitec2" cx="1" cy="0" r="0.75"><stop offset="0" stop-color="#08495A"/><stop offset="1" stop-color="#08495A" stop-opacity="0"/></radialGradient>`;
    o += `<linearGradient id="bg_kramat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A1151A"/><stop offset="1" stop-color="#F97526"/></linearGradient>`;
    o += `<linearGradient id="bg_msway" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B4F5A9"/><stop offset="1" stop-color="#5BB164"/></linearGradient>`;
    return o + '</defs>';
  }
  const bgRect = (key, dx = 0, op = 1) => {
    if (op <= 0) return '';
    const r = `x="${f(dx)}" y="0" width="${W}" height="${H}"`;
    return `<g opacity="${f(op)}"><rect ${r} fill="url(#bg_${key})"/>${key === 'hitec' ? `<rect ${r} fill="url(#bg_hitec2)"/>` : ''}</g>`;
  };
  // footage: clean plate + the truck driving along the deck, with a slow drone push
  function photo(off, op, t) {
    if (op <= 0) return '';
    const tr = TRUCK.v * (t - TRUCK.t0), s = 1 + 0.04 * t / PH.end;
    return `<g opacity="${f(op)}" transform="translate(${f(off[0] + 960)} ${f(off[1] + 800)}) scale(${s.toFixed(5)}) translate(-960 -800)">` +
      `<image href="img/plate.jpg" x="0" y="0" width="1920" height="1441" preserveAspectRatio="none"/>` +
      `<image href="img/truck.png" x="${f(TRUCK.x - TRUCK.dir[0] * tr)}" y="${f(TRUCK.y - TRUCK.dir[1] * tr)}" width="${TRUCK.w}" height="${TRUCK.h}"/></g>`;
  }

  // the 24's pixel skeleton: cells flash over the old form and dissolve into the new one
  const BITS = [['11111', '00001', '11111', '10000', '11111'], ['10001', '10001', '11111', '00001', '00001']];
  function cells(t, t0, color) {
    let o = '';
    BITS.forEach((rows, dg) => rows.forEach((row, r) => [...row].forEach((v, c) => {
      if (v !== '1') return;
      const lag = (dg * 5 + c) * 0.018 + r * 0.01;
      const g = ease.out(seg(t, t0 + lag, t0 + 0.2 + lag)), s = flow(seg(t, t0 + 0.3 + lag, t0 + 0.5 + lag));
      const k = g * (1 - s); if (k <= 0) return;
      const sz = (CELL + 1) * k, cx = BOX.x + dg * DIG4 + (c + 0.5) * CELL, cy = BOX.y + (r + 0.5) * CELL;
      o += `<rect x="${f(cx - sz / 2)}" y="${f(cy - sz / 2)}" width="${f(sz)}" height="${f(sz)}"/>`;
    })));
    return o ? `<g fill="${color}">${o}</g>` : '';
  }
  function gridLines(p, alpha) {
    if (p <= 0 || alpha <= 0) return '';
    let o = `<g stroke="#fff" stroke-width="1" opacity="${f(0.45 * alpha)}">`;
    for (let i = 0; i <= GRID.n; i++) {
      const v = GRID.x + i * CELL, q = ease.out(clamp(p * 1.6 - i * 0.045)), q2 = ease.out(clamp(p * 1.6 - 0.1 - i * 0.045));
      if (q > 0) o += `<line x1="${f(GRID.x)}" y1="${f(GRID.y + i * CELL)}" x2="${f(GRID.x + GRID.s * q)}" y2="${f(GRID.y + i * CELL)}"/>`;
      if (q2 > 0) o += `<line x1="${f(v)}" y1="${f(GRID.y)}" x2="${f(v)}" y2="${f(GRID.y + GRID.s * q2)}"/>`;
    }
    return o + '</g>';
  }
  // blueprint labels + corner ticks around the grid
  const FORM_LABEL = [['GROUP 24', 'STROKE'], ['KRAMAT 24', 'CHAMFER 45°'], ['MS WAY 24', 'RADIUS ½ CELL'], ['HI-TEC 24', 'ROUND + DOTS']];
  function gridMarks(p, alpha, formIdx) {
    if (p <= 0 || alpha <= 0) return '';
    const a = alpha * ease.out(p), x0 = GRID.x, y0 = GRID.y, x1 = GRID.x + GRID.s, y1 = GRID.y + GRID.s, k = 9;
    let o = `<g stroke="#fff" stroke-width="1" opacity="${f(0.8 * a)}">`;
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) o += `<line x1="${f(x - k)}" y1="${f(y)}" x2="${f(x + k)}" y2="${f(y)}"/><line x1="${f(x)}" y1="${f(y - k)}" x2="${f(x)}" y2="${f(y + k)}"/>`;
    o += '</g>';
    const [name, spec] = FORM_LABEL[formIdx];
    o += `<g fill="#fff" opacity="${f(0.75 * a)}" font-family="DejaVu Sans Mono, monospace" font-size="12" letter-spacing="2">`;
    o += `<text x="${f(x0)}" y="${f(y0 - 16)}">GRID 13×13</text><text x="${f(x1)}" y="${f(y0 - 16)}" text-anchor="end">${name}</text>`;
    o += `<text x="${f(x0)}" y="${f(y1 + 28)}">FORM 0${formIdx + 1} / 04</text><text x="${f(x1)}" y="${f(y1 + 28)}" text-anchor="end">${spec}</text>`;
    return o + '</g>';
  }
  // cells of the grid that carry what changes between forms (chamfers, radii, dots) light up
  // measured with G24.formProbe: cells the form only partly fills
  const HL = {
    kramat: [[5, 4], [11, 6], [1, 8]],
    msway: [[4, 4], [11, 5], [1, 6], [5, 6], [7, 6], [11, 6], [1, 8]],
    hitec: [[0, 2], [12, 2], [1, 4], [4, 4], [7, 4], [11, 4], [5, 5], [11, 5], [1, 6], [5, 6], [7, 6], [10, 6], [11, 7], [1, 8], [5, 8], [11, 8], [0, 10], [12, 10]],
  };
  function highlights(t, TF, FORMS) {
    let o = '';
    TF.forEach((x, i) => {
      const cellsOn = HL[FORMS[i + 1]] || [], end = TF[i + 1] !== undefined ? TF[i + 1] : PH.fly;
      cellsOn.forEach(([c, r], j) => {
        const a = ease.out(seg(t, x + 0.4 + j * 0.015, x + 0.65 + j * 0.015)) * (1 - seg(t, end, end + 0.25));
        if (a <= 0) return;
        o += `<rect x="${f(GRID.x + c * CELL)}" y="${f(GRID.y + r * CELL)}" width="${f(CELL)}" height="${f(CELL)}" fill="#fff" fill-opacity="${f(0.16 * a)}" stroke="#fff" stroke-opacity="${f(0.95 * a)}" stroke-width="1.5"/>`;
      });
    });
    return o;
  }
  // right-hand copy: lines leave upward through a mask, the next ones rise in
  function rightText(t, tagX, ts) {
    const blocks = [{ tag: true, in: -9, out: PH.f1 }, { txt: '3 BRANDS', in: PH.f1, out: PH.f3 }, { txt: '3 STYLES', in: PH.f3, out: PH.fly }];
    let o = `<clipPath id="rt"><rect x="1050" y="480" width="870" height="120"/></clipPath><g clip-path="url(#rt)" fill="#0a0a0a">`;
    for (const b of blocks) {
      const pin = ease.out(seg(t, b.in + 0.2, b.in + 0.8)), pout = flow(seg(t, b.out, b.out + 0.4));
      if (pin <= 0 || pout >= 1) continue;
      const dy = (1 - pin) * 90 - pout * 90;
      o += b.tag ? `<g transform="translate(${f(tagX - TAG_X * ts)} ${f(540 - 136.34 * ts + dy)}) scale(${ts.toFixed(4)})">${GRP.tag.map(d => `<path d="${d}"/>`).join('')}</g>`
                 : `<text x="${TXT_X}" y="${f(549 + dy)}" font-family="Inter" font-size="26" letter-spacing="3">${b.txt}</text>`;
    }
    return o + '</g>';
  }

  // ---------- part 1: lockup → strip → square grid → 3 forms → HI-TEC ----------
  function revealIntro(t) {
    const pm = flow(seg(t, PH.merge, PH.merge + 0.8));
    const pB = flow(seg(t, PH.strip, PH.strip + 0.9));
    const pC = flow(seg(t, PH.square, PH.square + 1.0));
    const pE = flow(seg(t, PH.fly, PH.fly + 1.0));
    const pN = ease.out(seg(t, PH.name, PH.name + 1.0));
    const pD = flow(seg(t, PH.down, PH.down + 1.05));
    const FORMS = ['rect', 'kramat', 'msway', 'hitec'], TF = [PH.f1, PH.f2, PH.f3];
    const formIdx = TF.filter(x => t >= x + 0.31).length, form = FORMS[formIdx];

    // plate: ■ widens → strip → square → corner styles → full pill → inset pill
    let g = toAp(lerpGeom(LK[0], MERGED, pm));
    g = lerpAp(g, { ...STRIP, c: CORNERS.rect }, pB);
    g = lerpAp(g, { ...SQ, c: CORNERS.rect }, pC);
    TF.forEach((x, i) => { g = lerpAp(g, { ...g, c: CORNERS[FORMS[i + 1]] }, flow(seg(t, x, x + 0.75))); });
    g = lerpAp(g, FULLPILL, pE);
    g = lerpAp(g, SLIDE.hitec, pD);

    let o = `<rect width="${W}" height="${H}" fill="#fff"/>` + bgRect('hitec', 0, seg(t, PH.down + 0.15, PH.down + 0.9));

    // thin 24: waits left of the block, gets swallowed by the growing strip, then scales onto the grid
    const X24 = lx(794.47), x24 = Math.min(X24, g.x + 41 * LS);
    const small24 = { x: x24, y: ly(506.83), w: D24.w * LS, h: D24.h * LS };
    const box24 = { x: lerp(small24.x, BOX.x, pC), y: lerp(small24.y, BOX.y, pC), w: lerp(small24.w, BOX.w, pC), h: lerp(small24.h, BOX.h, pC) };
    // GROUP is pushed left by the 24, then leaves the frame
    const gx = (x24 - X24) * 1.229 - 760 * pC;
    if (pC < 1) o += `<g transform="translate(${f(gx)} 0) ${LOCK}" fill="#0a0a0a">${GRP.grp.map(d => `<path d="${d}"/>`).join('')}</g>` + thin24(small24, '#0a0a0a');

    o += `<clipPath id="pl"><path d="${apPath(g)}"/></clipPath>`;
    o += ap(g, ` fill="#0a0a0a"`);
    o += `<g clip-path="url(#pl)">${photo([lerp(PHOTO_SQ[0], 0, pE), lerp(PHOTO_SQ[1], 0, pE)], seg(t, PH.strip + 0.1, PH.strip + 0.6), t)}</g>`;
    o += ap(g, ` fill="url(#ag_hitec)" opacity="${f(seg(t, PH.down + 0.2, PH.down + 0.9))}"`);
    // signet ▛ and ● tuck into the ■ (turning grey), then dissolve as the strip opens
    if (t < PH.strip + 0.5) {
      const q = 1 - flow(seg(t, PH.strip, PH.strip + 0.45));
      [1, 2].forEach(i => {
        const p = flow(seg(t, PH.merge + (i - 1) * 0.1, PH.merge + 0.6 + (i - 1) * 0.1));
        const s = lerpGeom(LK[i], TUCK[i], p), cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        const sc = { ...s, x: cx - s.w * q / 2, y: cy - s.h * q / 2, w: s.w * q, h: s.h * q, r: s.r.map(v => v * q) };
        if (q > 0) o += shape(sc, ` fill="${rgb(mixC(INK, [207, 207, 207], seg(p, 0.35, 1)))}"`);
      });
    }
    // construction grid
    const gridA = 1 - seg(t, PH.fly, PH.fly + 0.4);
    o += `<g clip-path="url(#pl)">${gridLines(seg(t, PH.square + 0.4, PH.square + 1.2), gridA)}${highlights(t, TF, FORMS)}</g>`;
    o += gridMarks(seg(t, PH.square + 0.6, PH.square + 1.3), gridA, formIdx);

    // the 24 itself (white inside the plate)
    let w24 = '';
    if (form === 'rect') w24 = thin24(box24, '#fff');
    else if (form !== 'hitec') w24 = brand24(form, fitT(BRANDS[form].dbb, BOX), '#fff');
    w24 = `<g clip-path="url(#pl)">${w24}</g>`;
    TF.forEach(x => { w24 += cells(t, x, '#fff'); });
    o += w24;

    // HI-TEC: dots at the grid corners, 24 flies right, name rides in, everything settles into the logo
    if (form === 'hitec') {
      const b = BRANDS.hitec, LF = finalLayout('hitec'), TFin = { s: LF.s, tx: LF.ox, ty: LF.oy };
      const T = lerpT(fitT(b.dbb, { ...BOX, x: BOX.x + FLY * pE }), TFin, pD);
      o += brand24('hitec', T, '#fff');
      const sN = 200 / b.nbb.h;
      const TN = lerpT({ s: sN, tx: 774 - (b.nbb.x + b.nbb.w) * sN - (1 - pN) * 910, ty: 540 - (b.nbb.y + b.nbb.h / 2) * sN }, TFin, pD);
      if (pN > 0) o += `<g transform="translate(${f(TN.tx)} ${f(TN.ty)}) scale(${TN.s.toFixed(5)})" fill="#fff">${paths(b.name, '#fff')}</g>`;
      let mk = '';
      for (let sl = 0; sl < 6; sl++) {
        const m = b.markers[sl];
        if (m.col === 0) {
          if (pN <= 0) continue;
          mk += shape({ x: m.x * TN.s + TN.tx, y: m.y * TN.s + TN.ty, w: m.w * TN.s, h: m.h * TN.s, r: m.r.map(v => v * TN.s) });
          continue;
        }
        const k = ease.out(seg(t, PH.f3 + 0.3 + sl * 0.04, PH.f3 + 0.7 + sl * 0.04));
        const R = CELL / 2 * k;
        const big = { x: (m.col === 1 ? GRID.x : GRID.x + GRID.s - CELL) + FLY * pE + CELL / 2 - R, y: GRID.y + (m.top ? 2 : 10) * CELL + CELL / 2 - R, w: 2 * R, h: 2 * R, r: [R, R, R, R] };
        mk += shape(lerpGeom(big, markerGeom('hitec', sl, LF), pD));
      }
      o += `<g fill="#fff">${mk}</g>`;
    }

    // tagline slides with the signet, then to the right column; swaps to "3 BRANDS" / "3 STYLES"
    o += rightText(t, lerp(lerp(lx(1341.19), lx(1204), pm), TXT_X, pC), lerp(LS, 0.62, pC));
    return o;
  }

  // ---------- part 2: brand slider — bg, plate and logo move as separate layers ----------
  function brandLogo(key, color) {
    const b = BRANDS[key], L = finalLayout(key);
    let o = logo(key, L, { nameIn: 1, nameOut: 0, digitsIn: 1, digitsOut: 0 }, color);
    let mk = ''; for (let sl = 0; sl < 6; sl++) mk += shape(markerGeom(key, sl, L));
    return o + `<g fill="${color}">${mk}</g>`;
  }
  const zoomAbout = (dx, s, cx = W / 2, cy = H / 2) => `translate(${f(dx + cx)} ${f(cy)}) scale(${s.toFixed(5)}) translate(${-cx} ${-cy})`;
  function revealSlider(t) {
    // slide i sits at offset (U - i) × distance; U sums both transitions, so the move never resets
    const TS = [PH.s1, PH.s2], DA = 1800;
    const U = (d0, d1) => TS.reduce((acc, ts) => acc + flow(seg(t, ts + d0, ts + d1)), 0);
    const dip = (d0, d1) => 1 - 0.085 * TS.reduce((acc, ts) => acc + Math.sin(Math.PI * flow(seg(t, ts + d0, ts + d1))), 0);
    const ub = U(0, 0.9), ua = U(0.08, 1.0), ul = U(0.2, 1.15), sA = dip(0.08, 1.0), sL = dip(0.2, 1.15);
    let o = '';
    ORDER.forEach((key, i) => { if (Math.abs(ub - i) < 1) o += bgRect(key, (ub - i) * W); });
    ORDER.forEach((key, i) => {
      if (Math.abs(ua - i) >= 1 && Math.abs(ul - i) >= 1) return;
      const tA = zoomAbout((ua - i) * DA, sA), tL = zoomAbout((ul - i) * DA, sL);
      o += `<clipPath id="sc${i}"><path transform="${tA}" d="${apPath(SLIDE[key])}"/></clipPath>`;
      o += `<path transform="${tA}" d="${apPath(SLIDE[key])}" fill="url(#ag_${key})"/>`;
      o += `<g clip-path="url(#sc${i})"><g transform="${tL}">${brandLogo(key, '#fff')}</g></g>`;
    });
    return o;
  }

  // ---------- part 3: last plate becomes ▛, ■ and ● grow out of it, GROUP 24 is pulled out ----------
  function revealOutro(t) {
    const T0 = PH.out, L = finalLayout('msway');
    const pB = flow(seg(t, T0, T0 + 0.6)), pA = flow(seg(t, T0 + 0.15, T0 + 1.05));
    const pSq = flow(seg(t, T0 + 0.85, T0 + 1.45)), pCi = flow(seg(t, T0 + 0.95, T0 + 1.55));
    const pG = flow(seg(t, T0 + 1.25, T0 + 2.05)), pT = flow(seg(t, T0 + 1.35, T0 + 2.15));
    const pK = flow(seg(t, T0 + 2.0, T0 + 2.7)), pS = flow(seg(t, T0 + 2.1, T0 + 3.3));
    const plate = lerpAp(SLIDE.msway, toAp(LK[1]), pA);
    let o = `<rect width="${W}" height="${H}" fill="#fff"/>`;
    let inner = '';
    if (pB < 1) inner += `<clipPath id="ob"><path d="${apPath(lerpAp({ x: 0, y: 0, w: W, h: H, c: CORNERS.rect }, plate, pB))}"/></clipPath><g clip-path="url(#ob)">${bgRect('msway')}</g>`;
    const sq = lerpGeom(LK[1], LK[0], pSq), ci = lerpGeom(LK[1], LK[2], pCi);
    const black = ` fill="#0a0a0a" opacity="${f(pK)}"`;
    if (pSq > 0) inner += shape(sq, ` fill="url(#ag_kramat)"`) + shape(sq, black);
    if (pCi > 0) inner += shape(ci, ` fill="url(#ag_hitec)"`) + shape(ci, black);
    inner += ap(plate, ` fill="url(#ag_msway)"`) + ap(plate, black);
    // the MS WAY logo retracts; its markers fold into the ▛
    inner += logo('msway', L, { nameIn: 1, nameOut: seg(t, T0, T0 + 0.4), digitsIn: 1, digitsOut: seg(t, T0, T0 + 0.35) }, '#fff');
    for (let sl = 0; sl < 6; sl++) {
      const p = flow(seg(t, T0 + 0.05 + sl * 0.02, T0 + 0.85 + sl * 0.02));
      if (p < 1) inner += shape(lerpGeom(markerGeom('msway', sl, L), LK[1], p), ` fill="#fff" opacity="${f(1 - seg(p, 0.6, 1))}"`);
    }
    // GROUP 24 out of the ■ (clipped left of it), tagline out of the ● (clipped right of it)
    if (pG > 0) {
      const push = (sq.x - lx(294.38)) * (1 - pG);
      inner += `<clipPath id="og"><rect x="-400" y="0" width="${f(sq.x + 400)}" height="${H}"/></clipPath><g clip-path="url(#og)"><g transform="translate(${f(push)} 0) ${LOCK}" fill="#0a0a0a">${[...GRP.grp, ...GRP.d24].map(d => `<path d="${d}"/>`).join('')}</g></g>`;
    }
    if (pT > 0) {
      const push = (lx(1624.9) - (ci.x + ci.w)) * (1 - pT);
      inner += `<clipPath id="ot"><rect x="${f(ci.x + ci.w)}" y="0" width="${W}" height="${H}"/></clipPath><g clip-path="url(#ot)"><g transform="translate(${f(-push)} 0) ${LOCK}" fill="#0a0a0a">${GRP.tag.map(d => `<path d="${d}"/>`).join('')}</g></g>`;
    }
    return o + `<g transform="${zoomAbout(0, lerp(1, 0.4625 / LS, pS))}">${inner}</g>`;
  }

  const camR = t => 1 + 0.05 * (t / PH.end); // one slow continuous push-in over the whole piece
  function reveal(t) {
    clipId = 0;
    const body = t >= PH.out ? revealOutro(t) : t >= PH.s1 ? revealSlider(t) : revealIntro(t);
    return svgWrap(defs() + `<rect width="${W}" height="${H}" fill="#fff"/><g transform="${zoomAbout(0, camR(t))}">${body}</g>`);
  }

  const SCENES = {
    film: { dur: F.end, fn: film },
    reveal: { dur: PH.end, fn: reveal },
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
    // white form on black, grid-aligned: used offline to find which cells a form only partly fills
    formProbe(form) {
      this.init();
      let o = `<rect width="${W}" height="${H}" fill="#000"/>` + brand24(form, fitT(BRANDS[form].dbb, BOX), '#fff');
      if (form === 'hitec') [GRID.x, GRID.x + GRID.s - CELL].forEach(x => [2, 10].forEach(r => { o += `<circle cx="${f(x + CELL / 2)}" cy="${f(GRID.y + r * CELL + CELL / 2)}" r="${f(CELL / 2)}" fill="#fff"/>`; }));
      return { svg: svgWrap(o), grid: GRID, cell: CELL };
    },
  };
})();
