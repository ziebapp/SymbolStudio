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
  // SCENE: reveal — GROUP 24 system presentation
  //  1 GROUP 24 rises in on white; the signet shapes ■ ▛ ● fly in and dock
  //  2 everything is pulled into the ■: it widens into a strip (pushing GROUP out), the footage opens inside,
  //    and it grows straight to the full frame; a hairline grid draws, the 24 settles into it
  //  3 evolution: the 24 morphs (shape morph, not a mask) through HI-TEC → KRAMAT → MS WAY; markers re-shape
  //  4 brands: white outline shapes ● ■ ▛ appear left → right across the full width, white logos inside
  //  5 finale: the outlines fold into the white group signet, GROUP 24 is pulled out, the three full brand
  //    logos settle in a row under it
  // Brand order everywhere: HI-TEC → KRAMAT → MS WAY.
  // =====================================================================
  // tightened timeline: every act starts while the previous one is still settling — no dead holds
  const PH = { in: 0.15, trim: 0.45, fall: 1.5, claim: 2.1, absorb: 2.55, full: 3.05, settle: 3.95, grid: 4.0, f1: 5.1, f2: 5.95, f3: 6.8,
               textOut: 7.55, slide: 7.7, compare: 9.2, logos: 9.85, outline: 10.55, pulse: 11.35, fill: 12.35, zoom: 12.85, dock: 13.7, rise: 14.45, end: 16.6 };
  // cubic-bezier easing (CSS semantics) — each kind of motion gets its own curve, nothing moves on the same symmetric one
  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = u => ((ax * u + bx) * u + cx) * u, Y = u => ((ay * u + by) * u + cy) * u, dX = u => (3 * ax * u + 2 * bx) * u + cx;
    return x => { if (x <= 0) return 0; if (x >= 1) return 1; let u = x;
      for (let i = 0; i < 8; i++) { const e = X(u) - x, d = dX(u); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; u -= e / d; }
      return Y(clamp(u)); };
  }
  const flow = bez(0.45, 0, 0.12, 1);          // moves: quick, decisive start, long soft landing
  const morphE = bez(0.65, 0, 0.35, 1);        // shape changes: balanced
  const fallE = bez(0.55, 0, 0.18, 1);         // falling: gathers speed, settles without a bounce
  const enterE = bez(0.16, 1, 0.3, 1);         // entrances: expo-like ease-out
  const INKC = '#0a0a0a', WH = '#fff';
  const ACCENT = { hitec: '#5FE0D0', kramat: '#FF7A3D', msway: '#8FE58A' };
  const SIG_OF = { kramat: 0, msway: 1, hitec: 2 };
  const NAME24 = { hitec: 'HI-TEC 24', kramat: 'KRAMAT 24', msway: 'MS WAY 24' };
  const TAG2 = { hitec: ['IN THE RIGHT', 'TEMPERATURE.'], kramat: ['IN THE RIGHT', 'HANDS.'], msway: ['IN THE RIGHT', 'TIME.'] };

  // ---------- group lockup (Figma position, 80 % around the frame centre) ----------
  const LS = 0.8;
  const lx = x => 960 + (x - 960) * LS, ly = y => 540 + (y - 540) * LS;
  const lRect = r => ({ ...r, x: lx(r.x), y: ly(r.y), w: r.w * LS, h: r.h * LS, r: r.r.map(v => v * LS) });
  const LK = [
    { x: 1013.38, y: 503.05, w: 96.24, h: 77.37, r: [0, 0, 0, 0] },
    { x: 1122.91, y: 501.98, w: 81.78, h: 77.81, r: [35.19, 0, 0, 0], notch: 1 },
    { x: 1210.87, y: 499.92, w: 81.46, h: 81.46, r: [40.73, 40.73, 40.73, 40.73] },
  ].map(lRect);
  const MERGED = lRect({ x: 1013, y: 503, w: 153, h: 77, r: [0, 0, 0, 0] });
  const TUCK = [null, lRect({ x: 1021.78, y: 510.34, w: 64.22, h: 61.1, r: [27.6, 0, 0, 0], notch: 1 }),
                      lRect({ x: 1033, y: 512, w: 57, h: 57, r: [28.5, 28.5, 28.5, 28.5] })];
  const STRIP = lRect({ x: 461, y: 471, w: 705, h: 141, r: [0, 0, 0, 0] });
  const FULLG = { x: -30, y: -30, w: W + 60, h: H + 60, r: [0, 0, 0, 0] };
  const lockT = dy => `translate(${f(lx(251))} ${f(ly(405) + dy)}) scale(${LS})`;   // group24.svg → screen
  const D24 = { x: 543.47, y: 101.83, w: 167.96, h: 69.82 };                         // thin 24 inside group24.svg
  const LK24 = { x: lx(251) + D24.x * LS, y: ly(405) + D24.y * LS, w: D24.w * LS, h: D24.h * LS };
  const GROUP_L = lx(251) + 43.38 * LS, TAG_R = lx(251) + 1373.9 * LS;
  const FIN_DY = -70;                                                                 // final lockup sits a little higher
  const shiftY = (g, dy) => ({ ...g, y: g.y + dy });

  // ---------- construction grid: 13 × 13 cells; the 24 is two 5 × 5 digits, one cell apart ----------
  const CELL = 46;
  const GRID = { x: W / 2 - 6.5 * CELL, y: H / 2 - 6.5 * CELL, s: 13 * CELL, n: 13 };
  const BOX = { x: GRID.x + CELL, y: GRID.y + 4 * CELL, w: 11 * CELL, h: 5 * CELL };

  const fitT = (bb, box) => { const s = Math.min(box.w / bb.w, box.h / bb.h);
    return { s, tx: box.x + (box.w - bb.w * s) / 2 - bb.x * s, ty: box.y + (box.h - bb.h * s) / 2 - bb.y * s }; };
  const lerpT = (a, b, p) => ({ s: lerp(a.s, b.s, p), tx: lerp(a.tx, b.tx, p), ty: lerp(a.ty, b.ty, p) });
  const lerpBox = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });
  const paths = (qs, color) => qs.map(q => `<path d="${q.d}"${q.stroke ? ` stroke="${color}" stroke-width="${q.stroke}"` : ''}/>`).join('');
  const thin24 = (box, color, op = 1) => op <= 0 ? '' : `<g opacity="${f(op)}" transform="translate(${f(box.x - D24.x * box.w / D24.w)} ${f(box.y - D24.y * box.h / D24.h)}) scale(${(box.w / D24.w).toFixed(5)} ${(box.h / D24.h).toFixed(5)})" fill="${color}">${GRP.d24.map(d => `<path d="${d}"/>`).join('')}</g>`;
  const brand24 = (key, T, color, op = 1) => op <= 0 ? '' : `<g opacity="${f(op)}" transform="translate(${f(T.tx)} ${f(T.ty)}) scale(${T.s.toFixed(5)})" fill="${color}">${paths(BRANDS[key].digits, color)}</g>`;
  const scaleAbout = (g, k) => { const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
    return { ...g, x: cx - g.w * k / 2, y: cy - g.h * k / 2, w: g.w * k, h: g.h * k, r: g.r.map(v => v * k) }; };

  // ---------- the 24 as a parametric construction on the cell grid ----------
  // Every form is the same five pieces — 2: top bar + body; 4: bar, upper right, lower right — each a polygon
  // in cell units with a corner spec per vertex {d: cut length in cells, k: 0 = chamfer, KR = round}.
  // Morphing interpolates vertices and corner specs, so every in-between frame is a clean geometric shape.
  const FORMS = ['thin', 'kramat', 'msway', 'hitec'];   // signet order: ■ ▛ ●
  const KR = 0.5523, S0 = { d: 0, k: 0 }, RD = d => ({ d, k: KR }), CH = d => ({ d, k: 0 });
  const rectP = (x0, y0, x1, y1, c = [S0, S0, S0, S0]) => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c });
  const FORM_CACHE = {};
  function form24(name) {
    if (FORM_CACHE[name]) return FORM_CACHE[name];
    let F;
    if (name === 'thin' || name === 'thinG') {
      // group 24: thin strokes; in the lockup the digits sit ~2 cells apart, on the grid 1 cell (as in Figma)
      const T = name === 'thin' ? 0.42 : 0.26, w = name === 'thin' ? 4.87 : 5, o = name === 'thin' ? 7.03 : 6, m = 2.5;
      F = [rectP(0, 0, w, T),
        { pts: [[w - T, 0], [w, 0], [w, m + T / 2], [T, m + T / 2], [T, 5 - T], [w, 5 - T], [w, 5], [0, 5], [0, m - T / 2], [w - T, m - T / 2]], c: Array(10).fill(S0) },
        { pts: [[o, 0], [o + T, 0], [o + T, m - T / 2], [o + 5, m - T / 2], [o + 5, m + T / 2], [o, m + T / 2]], c: Array(6).fill(S0) },
        rectP(o + 5 - T, 0, o + 5, m), rectP(o + 5 - T, m, o + 5, 5)];
    } else {
      const body = c => ({ pts: [[4, 1], [5, 1], [5, 3], [1, 3], [1, 4], [5, 4], [5, 5], [0, 5], [0, 2], [4, 2]], c });
      const bar = c => ({ pts: [[6, 0], [7, 0], [7, 2], [10, 2], [10, 3], [6, 3]], c });
      const h = RD(0.5), one = RD(1);
      if (name === 'hitec') F = [rectP(0, 0, 4, 1, [h, h, h, h]), body([h, h, one, S0, S0, h, h, one, one, S0]),
        bar([h, h, S0, h, h, one]), rectP(10, 0, 11, 2, [h, h, h, h]), rectP(10, 3, 11, 5, [h, h, h, h])];
      else if (name === 'kramat') F = [rectP(0, 0, 5, 1, [S0, CH(1), S0, S0]), body([S0, S0, S0, S0, S0, S0, S0, CH(1), S0, S0]),
        bar(Array(6).fill(S0)), rectP(10, 0, 11, 2), rectP(10, 2, 11, 5, [S0, CH(1), S0, S0])];
      else F = [rectP(0, 0, 4, 1, [S0, one, S0, S0]), body([S0, S0, one, S0, S0, S0, S0, one, one, S0]),
        bar([S0, S0, S0, S0, S0, one]), rectP(10, 0, 11, 2, [S0, S0, S0, one]), rectP(10, 2, 11, 5, [S0, one, S0, S0])];
    }
    return (FORM_CACHE[name] = F);
  }
  const lerpForm = (A, B, p) => A.map((pa, i) => ({
    pts: pa.pts.map((v, j) => [lerp(v[0], B[i].pts[j][0], p), lerp(v[1], B[i].pts[j][1], p)]),
    c: pa.c.map((q, j) => ({ d: lerp(q.d, B[i].c[j].d, p), k: lerp(q.k, B[i].c[j].k, p) })) }));
  function polyD(pc, ox, oy, c) {
    const P = pc.pts.map(([x, y]) => [ox + x * c, oy + y * c]), n = P.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const V = P[i], A = P[(i + n - 1) % n], B = P[(i + 1) % n];
      const la = Math.hypot(A[0] - V[0], A[1] - V[1]), lb = Math.hypot(B[0] - V[0], B[1] - V[1]);
      const dd = la > 1e-6 && lb > 1e-6 ? Math.min(pc.c[i].d * c, la, lb) : 0;
      if (dd < 0.01) { d += (i ? 'L' : 'M') + f(V[0]) + ' ' + f(V[1]); continue; }
      const k = pc.c[i].k, p0 = [V[0] + (A[0] - V[0]) / la * dd, V[1] + (A[1] - V[1]) / la * dd], p1 = [V[0] + (B[0] - V[0]) / lb * dd, V[1] + (B[1] - V[1]) / lb * dd];
      d += (i ? 'L' : 'M') + f(p0[0]) + ' ' + f(p0[1]) + `C${f(p0[0] + (V[0] - p0[0]) * k)} ${f(p0[1] + (V[1] - p0[1]) * k)} ${f(p1[0] + (V[0] - p1[0]) * k)} ${f(p1[1] + (V[1] - p1[1]) * k)} ${f(p1[0])} ${f(p1[1])}`;
    }
    return d + 'Z';
  }
  // place: {ox, oy, c} = top-left of the 2 and cell size in px
  const draw24 = (F, P, color, op = 1) => op <= 0 ? '' : `<g fill="${color}"${op < 1 ? ` opacity="${f(op)}"` : ''}>${F.map(pc => `<path d="${polyD(pc, P.ox, P.oy, P.c)}"/>`).join('')}</g>`;
  const lerpP = (a, b, p) => ({ ox: lerp(a.ox, b.ox, p), oy: lerp(a.oy, b.oy, p), c: lerp(a.c, b.c, p) });
  const P_LOCK = () => ({ ox: LK24.x, oy: LK24.y, c: LK24.h / 5 });
  const P_GRID = () => ({ ox: BOX.x, oy: BOX.y, c: CELL });
  const P_LOGO = (key, L) => { const bb = BRANDS[key].dbb; return { ox: L.ox + bb.x * L.s, oy: L.oy + bb.y * L.s, c: bb.h / 5 * L.s }; };
  const gridName = n => (n === 'thin' ? 'thinG' : n);

  function defs() {
    let o = '<defs>';
    for (const k of ORDER) o += `<linearGradient id="ag_${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BRANDS[k].grad[0]}"/><stop offset="1" stop-color="${BRANDS[k].grad[1]}"/></linearGradient>`;
    return o + '</defs>';
  }
  const mono = (x, y, txt, op, anchor = 'start', size = 13, color = WH) => op <= 0 ? '' :
    `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" fill="${color}" opacity="${f(op)}" font-family="DejaVu Sans Mono, monospace" font-size="${size}" letter-spacing="2">${txt}</text>`;
  // content rising in from below a mask line, leaving upward
  function rise(x, y, inner, pin, pout, h = 40, w = 1600) {
    if (pin <= 0 || pout >= 1) return '';
    const id = 'r' + (clipId++), dy = (1 - ease.out(pin)) * h - flow(pout) * h;
    return `<clipPath id="${id}"><rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${w}" height="${f(h + 14)}"/></clipPath><g clip-path="url(#${id})"><g transform="translate(0 ${f(dy)})">${inner}</g></g>`;
  }
  // outline of a signet-style shape (rounded corners + optional ▛ notch) as one closed path
  function outline(g) {
    const { x, y, w, h } = g; if (w < 0.5 || h < 0.5) return '';
    const m = Math.min(w, h), [tl, tr, br, bl] = g.r.map(v => clamp(v, 0, m / 2));
    const n = seg(g.notch || 0, 0.6, 1), nx = x + w * (1 - 0.564 * n), ny = y + h * (1 - 0.541 * n);
    let d = `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}` + (tr ? `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}` : '');
    if (n > 0.001) d += `V${f(ny)}H${f(nx)}V${f(y + h)}`;
    else d += `V${f(y + h - br)}` + (br ? `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}` : '');
    d += `H${f(x + bl)}` + (bl ? `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}` : '') + `V${f(y + tl)}` + (tl ? `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}` : '') + 'Z';
    return d;
  }

  // ---------- footage: the original still (truck stays in the photo), framed tight, slow drift, darkened ----------
  function footage(t) {
    const u = t / PH.end, s = 1.6 * (1 + 0.035 * u), dx = -26 * u, dy = 9 * u;
    // once only the signet windows remain, the footage brightens so the small signet still reads
    const lift = seg(t, PH.fill, PH.zoom + 0.8), dark = 0.3 * (1 - lift);
    return `<g transform="translate(${f(960 + dx)} ${f(540 + dy)}) scale(${s.toFixed(5)}) translate(-880 -600)"${lift > 0 ? ` style="filter:brightness(${(1 + 0.9 * lift).toFixed(3)}) contrast(${(1 + 0.15 * lift).toFixed(3)})"` : ''}>` +
      `<image href="img/photo.jpg" x="0" y="0" width="1920" height="1441" preserveAspectRatio="none"/></g>` +
      (dark > 0 ? `<rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="#000" opacity="${f(dark)}"/>` : '');
  }

  // ---------- act 1: GROUP, the 24 drawn as a path, shapes fall, claim — the ■ sits at the frame centre ----------
  const LX = W / 2 - (LK[0].x + LK[0].w / 2);                    // shift that centres the ■
  const sx = g => ({ ...g, x: g.x + LX });
  const ease3 = enterE;
  // thin 24 as centre lines (cell units) — stroked with butt caps and mitre joins it equals the filled thin form
  const THIN = { T: 0.42, w: 4.87, o: 7.03 };
  function thinStrokes(P, p2, p4a, p4b, color) {
    const { T, w, o } = THIN, h = T / 2, m = 2.5, X = x => f(P.ox + x * P.c), Y = y => f(P.oy + y * P.c);
    const seg2 = `M${X(0)} ${Y(h)}L${X(w - h)} ${Y(h)}L${X(w - h)} ${Y(m)}L${X(h)} ${Y(m)}L${X(h)} ${Y(5 - h)}L${X(w)} ${Y(5 - h)}`;
    const seg4a = `M${X(o + h)} ${Y(0)}L${X(o + h)} ${Y(m)}L${X(o + 5)} ${Y(m)}`, seg4b = `M${X(o + 5 - h)} ${Y(0)}L${X(o + 5 - h)} ${Y(5)}`;
    const st = (d, p) => p <= 0 ? '' : `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(T * P.c)}" stroke-linejoin="miter" stroke-miterlimit="4" pathLength="1" stroke-dasharray="${p.toFixed(4)} 1"/>`;
    return st(seg2, p2) + st(seg4a, p4a) + st(seg4b, p4b);
  }
  // the plate: ■ → a band that takes in 24, shapes and claim → full frame
  const BAND = (() => { const x0 = LK24.x + LX - 40, x1 = TAG_R + LX + 40, h = LK[0].h * 1.9;
    return { x: x0, y: H / 2 - h / 2, w: x1 - x0, h, r: [0, 0, 0, 0] }; })();
  function plateGeom(t) {
    const pa = flow(seg(t, PH.absorb, PH.absorb + 0.8)), pf = bez(0.6, 0, 0.1, 1)(seg(t, PH.full, PH.full + 1.35));   // the frame opens slowly, lands softly
    return lerpGeom(lerpGeom(sx(LK[0]), BAND, pa), FULLG, pf);
  }
  function actOpen(t) {
    let o = '';
    const g = plateGeom(t);
    const pa = flow(seg(t, PH.absorb, PH.absorb + 0.8));
    // GROUP: rises in, then the plate's leading edge pushes it out of frame
    const pIn = ease.out(seg(t, PH.in, PH.in + 0.8));
    const gRight = lx(251) + 510 * LS + LX, push = Math.min(0, g.x - 30 - gRight);
    o += `<clipPath id="band"><rect x="-2400" y="${f(ly(405) + 80 * LS)}" width="${W + 4800}" height="${f(110 * LS)}"/></clipPath>`;
    o += `<g clip-path="url(#band)"><g transform="translate(${f(LX + push)} ${f((1 - pIn) * 90)}) ${lockT(0)}" fill="${INKC}">${GRP.grp.map(d => `<path d="${d}"/>`).join('')}</g></g>`;
    // the 24: drawn as a path (2 from its top-left corner down, then 4), then filled; pulled to the centre; then onto the grid
    const tr = bez(0.4, 0, 0.2, 1), p2 = tr(seg(t, PH.trim, PH.trim + 0.6)), p4a = tr(seg(t, PH.trim + 0.5, PH.trim + 0.85)), p4b = tr(seg(t, PH.trim + 0.75, PH.trim + 1.1));
    const PL = { ...P_LOCK(), ox: P_LOCK().ox + LX };
    const wThin = (THIN.o + 5) * PL.c;
    const PC = { ...PL, ox: W / 2 - wThin / 2 };                    // the 24 centred in the band
    const pS = flow(seg(t, PH.settle, PH.settle + 1.0));
    const P24 = lerpP(lerpP(PL, PC, pa), P_GRID(), pS);
    const F24 = lerpForm(form24('thin'), form24('thinG'), pS);
    const filled = p4b >= 1;
    const draw = color => filled ? draw24(F24, P24, color) : thinStrokes(P24, p2, p4a, p4b, color);
    o += draw(INKC);
    // shapes fall in one, two, three (no bounce), then are pulled into the plate
    [0, 1, 2].forEach(i => {
      const k = fallE(seg(t, PH.fall + i * 0.16, PH.fall + 0.6 + i * 0.16));
      if (k <= 0 || (i === 0 && pa > 0)) return;
      let s = lerpGeom({ ...sx(LK[i]), y: LK[i].y - 640 }, sx(LK[i]), k);
      if (i > 0) s = lerpGeom(s, { ...s, x: W / 2 - s.w / 2 }, pa);
      if (pa < 1) o += shape(s, ` fill="${INKC}"`);
    });
    // claim: two lines ride in, then get pulled into the plate
    const pC = seg(t, PH.claim, PH.claim + 0.6), dxC = (W / 2 - (TAG_R + LX)) * pa;
    if (pC > 0 && pa < 1) {
      o += `<clipPath id="cl"><rect x="${f(TAG_R + LX - 320)}" y="0" width="${W}" height="${H}"/></clipPath>`;
      o += `<g clip-path="url(#cl)"><g transform="translate(${f(LX + dxC + (1 - ease3(pC)) * 120)} 0) ${lockT(0)}" fill="${INKC}" opacity="${f(Math.min(1, pC * 2))}">${GRP.tag.map(d => `<path d="${d}"/>`).join('')}</g></g>`;
    }
    // the plate (■ itself until the pull), footage opening inside, 24 white inside
    if (t >= PH.fall) {
      const k0 = fallE(seg(t, PH.fall, PH.fall + 0.6));
      const gq = pa > 0 ? g : lerpGeom({ ...sx(LK[0]), y: LK[0].y - 640 }, sx(LK[0]), k0);
      o += shape(gq, ` fill="${INKC}"`);
      o += `<clipPath id="win"><path d="${rr(gq)}"/></clipPath>`;
      const pFoot = seg(t, PH.absorb + 0.35, PH.absorb + 0.9);
      if (pFoot > 0) o += `<g clip-path="url(#win)" opacity="${f(pFoot)}">${footage(t)}</g>`;
      o += `<g clip-path="url(#win)">${draw(WH)}</g>`;
    }
    return o;
  }

  // ---------- act 2: one grid, the 24 runs through its styles ----------
  const TFS = () => [PH.f1, PH.f2, PH.f3];
  const FORM_LABEL = { thin: ['GROUP 24', 'STROKE', 1], kramat: ['KRAMAT 24', 'CHAMFER 45°', 2], msway: ['MS WAY 24', 'RADIUS ½ CELL', 3], hitec: ['HI-TEC 24', 'ROUND + DOTS', 4] };
  const HL = {
    kramat: [[5, 4], [11, 6], [1, 8]],
    msway: [[4, 4], [11, 5], [1, 6], [5, 6], [7, 6], [11, 6], [1, 8]],
    hitec: [[0, 2], [12, 2], [1, 4], [4, 4], [7, 4], [11, 4], [5, 5], [11, 5], [1, 6], [5, 6], [7, 6], [10, 6], [11, 7], [1, 8], [5, 8], [11, 8], [0, 10], [12, 10]],
  };
  const markerR = (form, right, top) => {
    const R = CELL / 2;
    if (form === 'hitec') return [R, R, R, R];
    if (form === 'kramat') return [0, 0, 0, 0];
    const Q = CELL; return top ? (right ? [0, Q, 0, 0] : [Q, 0, 0, 0]) : (right ? [0, 0, Q, 0] : [0, 0, 0, Q]);
  };
  // the four corner markers of a grid, shaped like a form's (or between two forms)
  const cornerMarkers = (formA, formB, p, k) => {
    const out = [];
    for (const right of [false, true]) for (const top of [true, false]) {
      const ra = markerR(formA, right, top), rb = markerR(formB, right, top), r = ra.map((v, j) => lerp(v, rb[j], p));
      out.push(scaleAbout({ x: GRID.x + (right ? 12 : 0) * CELL, y: GRID.y + (top ? 2 : 10) * CELL, w: CELL, h: CELL, r }, k));
    }
    return out;
  };
  function gridLines(p, alpha) {
    if (p <= 0 || alpha <= 0) return '';
    let o = `<g stroke="${WH}" stroke-width="1" opacity="${f(0.3 * alpha)}">`;
    for (let i = 0; i <= GRID.n; i++) {
      const v = GRID.x + i * CELL, q = ease.out(clamp(p * 1.6 - i * 0.045)), q2 = ease.out(clamp(p * 1.6 - 0.1 - i * 0.045));
      if (q > 0) o += `<line x1="${f(GRID.x)}" y1="${f(GRID.y + i * CELL)}" x2="${f(GRID.x + GRID.s * q)}" y2="${f(GRID.y + i * CELL)}"/>`;
      if (q2 > 0) o += `<line x1="${f(v)}" y1="${f(GRID.y)}" x2="${f(v)}" y2="${f(GRID.y + GRID.s * q2)}"/>`;
    }
    o += '</g>';
    const a = alpha * ease.out(p), x0 = GRID.x, y0 = GRID.y, x1 = GRID.x + GRID.s, y1 = GRID.y + GRID.s, k = 9;
    o += `<g stroke="${WH}" stroke-width="1" opacity="${f(0.8 * a)}">`;
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) o += `<line x1="${f(x - k)}" y1="${f(y)}" x2="${f(x + k)}" y2="${f(y)}"/><line x1="${f(x)}" y1="${f(y - k)}" x2="${f(x)}" y2="${f(y + k)}"/>`;
    return o + '</g>';
  }
  function gridLabels(t, alpha) {
    if (alpha <= 0) return '';
    const x0 = GRID.x, y0 = GRID.y, x1 = GRID.x + GRID.s, y1 = GRID.y + GRID.s, TF = [-9, ...TFS()];
    let o = mono(x0, y0 - 18, 'GRID 13×13', 0.7 * alpha);
    FORMS.forEach((form, i) => {
      const [name, spec, num] = FORM_LABEL[form];
      const pin = i === 0 ? 1 : seg(t, TF[i] + 0.3, TF[i] + 0.7), pout = i === FORMS.length - 1 ? 0 : seg(t, TF[i + 1] + 0.1, TF[i + 1] + 0.45);
      o += rise(x1, y0 - 18, mono(x1, y0 - 18, name, 0.85 * alpha, 'end'), pin, pout, 22);
      o += rise(x1, y1 + 30, mono(x1, y1 + 30, spec, 0.7 * alpha, 'end'), pin, pout, 22);
      o += rise(x0, y1 + 30, mono(x0, y1 + 30, `FORM 0${num} / 04`, 0.7 * alpha), pin, pout, 22);
    });
    return o;
  }
  function caption(t, alpha) {
    if (alpha <= 0) return '';
    const x = GRID.x + GRID.s + 90, TF = [-9, ...TFS()];
    let o = '';
    FORMS.forEach((form, i) => {
      const name = form === 'thin' ? 'GROUP 24' : NAME24[form], sub = form === 'thin' ? ['LEADING ALL', 'THE WAY.'] : TAG2[form];
      const pin = i === 0 ? seg(t, PH.grid + 0.4, PH.grid + 1.0) : seg(t, TF[i] + 0.25, TF[i] + 0.85), pout = i === FORMS.length - 1 ? 0 : seg(t, TF[i + 1], TF[i + 1] + 0.4);
      o += rise(x, 532, `<text x="${x}" y="532" fill="${WH}" opacity="${f(alpha)}" font-family="Inter" font-size="28" letter-spacing="2">${name}</text>`, pin, pout, 40, 900);
      sub.forEach((line, j) => { o += rise(x, 568 + j * 20, mono(x, 568 + j * 20, line, 0.75 * alpha, 'start', 13), seg(pin, 0.15 + j * 0.1, 1), pout, 20, 900); });
    });
    return o;
  }
  const hlCells = (form, a) => a <= 0 ? '' : (HL[form] || []).map(([c, r]) =>
    `<rect x="${f(GRID.x + c * CELL)}" y="${f(GRID.y + r * CELL)}" width="${CELL}" height="${CELL}" fill="${ACCENT[form]}" fill-opacity="${f(0.18 * a)}" stroke="${ACCENT[form]}" stroke-opacity="${f(0.95 * a)}" stroke-width="1.5"/>`).join('');

  // ---------- act 3: three grids side by side; 24 → logo; signet outlines; light pulse; fill; zoom out ----------
  const GRID_KEYS = ['kramat', 'msway', 'hitec'];             // left → right exactly as in the signet ■ ▛ ●
  const GRID_X = [[0, -320, -640], [1500, 320, 0], [3000, 1500, 640]];      // dx of each grid: before / after step 1 / after step 2
  const gridDX = (i, t) => lerp(GRID_X[i][0], GRID_X[i][2], bez(0.5, 0, 0.1, 1)(seg(t, PH.slide, PH.slide + 1.9)));   // one continuous traverse
  // signet shapes at grid scale: the ■ spans the grid edge to edge; the others keep the signet's proportions
  const SIG_K = GRID.s / (96.24 * LS);
  const sigBig = key => { const g = LK[SIG_OF[key]], w = g.w * SIG_K, h = g.h * SIG_K;
    return { x: W / 2 - w / 2, y: H / 2 - h / 2, w, h, r: g.r.map(v => v * SIG_K), notch: g.notch || 0 }; };
  // all three logos on one line, centred in their grids
  const LOGO_CY = H / 2;                                         // centred in its grid
  function gridLogoL(key) {
    const b = BRANDS[key], s = 46 / b.h;
    return { ox: W / 2 - b.w * s / 2, oy: LOGO_CY - b.h * s / 2, s, lh: b.h * s };
  }
  // one compound path: the frame with the three signet shapes cut out — the footage stays only inside them
  const maskOver = (shapes, op) => op <= 0 ? '' :
    `<path fill-rule="evenodd" fill="#050505" opacity="${f(op)}" d="M-200 -200H${W + 200}V${H + 200}H-200Z ${shapes.map(outline).join(' ')}"/>`;
  function actGrids(t) {
    let o = maskOver(GRID_KEYS.map((key, i) => { const g = sigBig(key); return { ...g, x: g.x + GRID_X[i][2] }; }), seg(t, PH.fill + 0.1, PH.fill + 0.6));
    const gA = 1 - seg(t, PH.outline + 0.9, PH.outline + 1.3);                 // grids fade once the outlines are drawn
    GRID_KEYS.forEach((key, i) => {
      const dx = gridDX(i, t);
      if (dx > 1290) return;                                                   // fully off-frame
      let g = '';
      // lines (grid 0 draws on; the others arrive drawn)
      g += gridLines(i === 0 ? seg(t, PH.grid, PH.grid + 1.0) : 1, gA);
      // highlight cells: during the style run (grid 0), and all three together to compare
      if (i === 0) TFS().forEach((x, j) => { const form = FORMS[j + 1], end = TFS()[j + 1] || PH.textOut;
        g += hlCells(form, ease.out(seg(t, x + 0.6, x + 0.9)) * (1 - seg(t, end, end + 0.3))); });
      g += hlCells(key, ease.out(seg(t, PH.compare, PH.compare + 0.4)) * (1 - seg(t, PH.logos, PH.logos + 0.4)));
      // the 24: grid 0 morphs through the styles (and back to HI-TEC as it starts to slide); then each shrinks into its logo
      let F;
      if (i === 0) {
        const TF = TFS(), started = TF.filter(x => t >= x).length;
        F = started ? lerpForm(form24(gridName(FORMS[started - 1])), form24(FORMS[started]), morphE(seg(t, TF[started - 1], TF[started - 1] + 0.75))) : form24('thinG');
        F = lerpForm(F, form24(GRID_KEYS[0]), morphE(seg(t, PH.slide, PH.slide + 0.9)));
      } else F = form24(key);
      const L = gridLogoL(key), pL = flow(seg(t, PH.logos, PH.logos + 0.9));
      const logoOut = flow(seg(t, PH.fill, PH.fill + 0.4));
      if (i === 0 && t < PH.f1) {} // until the style run starts, act 1 still owns the 24
      else if (t < PH.logos + 0.9) g += draw24(F, lerpP(P_GRID(), P_LOGO(key, L), pL), WH);
      else g += logo(key, L, { nameIn: 1, nameOut: logoOut, digitsIn: 1, digitsOut: logoOut }, WH);
      if (t >= PH.logos && t < PH.logos + 0.9) g += logo(key, L, { nameIn: seg(t, PH.logos + 0.35, PH.logos + 0.95), nameOut: 0, digitsIn: 0, digitsOut: 0 }, WH);
      // markers: corner cells → the logo's markers; the left pair pops in
      const kM = i === 0 ? ease.out(seg(t, PH.f1 + 0.35, PH.f1 + 0.8)) : 1;
      let cm = i === 0 ? (() => { const TF = TFS(); let fa = FORMS[1], fb = FORMS[1], p = 0;
        for (let j = 1; j < TF.length; j++) if (t >= TF[j]) { fa = FORMS[j]; fb = FORMS[j + 1]; p = morphE(seg(t, TF[j], TF[j] + 0.75)); }
        const back = morphE(seg(t, PH.slide, PH.slide + 0.9));
        return cornerMarkers(fa, fb, p, kM).map((m, j) => lerpGeom(m, cornerMarkers(GRID_KEYS[0], GRID_KEYS[0], 0, 1)[j], back)); })()
        : cornerMarkers(key, key, 0, 1);
      let mk = '';
      const b = BRANDS[key];
      if (kM > 0 && logoOut < 1) for (let sl = 0; sl < 6; sl++) {
        const m = b.markers[sl];
        let mg = markerGeom(key, sl, L);
        if (m.col > 0) { const slot = m.col === 1 ? (m.top ? 0 : 1) : (m.top ? 2 : 3); mg = lerpGeom(cm[slot], mg, pL); }
        else { const kk = ease.out(seg(t, PH.logos + 0.4 + sl * 0.03, PH.logos + 0.8 + sl * 0.03)); if (kk <= 0) continue; mg = scaleAbout(mg, kk); }
        mk += shape(scaleAbout(mg, 1 - logoOut));
      }
      g += `<g fill="${WH}">${mk}</g>`;
      // signet outline on the grid's edges; a pulse of light in the brand colour runs once around it; then it fills
      const pd = flow(seg(t, PH.outline + i * 0.12, PH.outline + 0.9 + i * 0.12));
      if (pd > 0 && t < PH.zoom) {
        const d = outline(sigBig(key)), pp = seg(t, PH.pulse + i * 0.12, PH.pulse + 1.1 + i * 0.12), fl = seg(t, PH.fill + 0.15, PH.fill + 0.55);
        g += `<path d="${d}" fill="none" stroke="${WH}" stroke-width="2" stroke-opacity="${f(1 - 0.6 * fl)}" pathLength="1" stroke-dasharray="${f(pd)} 1"/>`;
        if (pp > 0 && pp < 1) {
          const a = Math.sin(Math.PI * pp), off = -ease.io(pp);
          g += `<path d="${d}" fill="none" stroke="${ACCENT[key]}" stroke-width="10" stroke-linecap="round" opacity="${f(0.25 * a)}" pathLength="1" stroke-dasharray="0.14 0.86" stroke-dashoffset="${off.toFixed(4)}"/>`;
          g += `<path d="${d}" fill="none" stroke="${ACCENT[key]}" stroke-width="3" stroke-linecap="round" opacity="${f(a)}" pathLength="1" stroke-dasharray="0.1 0.9" stroke-dashoffset="${off.toFixed(4)}"/>`;
        }
      }
      o += `<g transform="translate(${f(dx)} 0)">${g}</g>`;
    });
    // labels + caption around the first grid only, until the slide
    const la = 1 - seg(t, PH.textOut, PH.textOut + 0.4);
    o += gridLabels(t, la * ease.out(seg(t, PH.grid + 0.4, PH.grid + 1.0))) + caption(t, la);
    return o;
  }
  // zoom out: the three video windows rush into the signet — accelerates, then brakes hard but smooth
  const expoIO = bez(0.7, 0, 0.12, 1);
  function actSignet(t) {
    let o = '';
    const pz = expoIO(seg(t, PH.zoom, PH.zoom + 1.2)), up = flow(seg(t, PH.rise, PH.rise + 0.9)) * FIN_DY;
    // the three video windows fly straight into the signet — already in signet order, nothing swaps
    o += maskOver(GRID_KEYS.map((key, i) => {
      const big = sigBig(key), dx = GRID_X[i][2];
      const from = { ...big, x: big.x + dx }, to = shiftY(LK[SIG_OF[key]], up);
      const g = lerpGeom(from, to, pz);
      return g;
    }), 1);
    // hairline edge on the windows so the small signet keeps its shape
    o += GRID_KEYS.map((key, i) => { const big = sigBig(key), from = { ...big, x: big.x + GRID_X[i][2] }, to = shiftY(LK[SIG_OF[key]], up);
      const g = lerpGeom(from, to, pz);
      return `<path d="${outline(g)}" fill="none" stroke="${WH}" stroke-opacity="0.85" stroke-width="${f(lerp(1.5, 1, pz))}"/>`; }).join('');
    // the rest of the lockup flies in at the stop: GROUP + 24 from the left, the claim from the right
    const pG = ease3(seg(t, PH.dock, PH.dock + 0.7)), pT = ease3(seg(t, PH.dock + 0.1, PH.dock + 0.8));
    if (pG > 0) o += `<g transform="translate(${f(-(1 - pG) * 700)} ${f(up)}) ${lockT(0)}" fill="${WH}" opacity="${f(Math.min(1, pG * 3))}">${[...GRP.grp, ...GRP.d24].map(d => `<path d="${d}"/>`).join('')}</g>`;
    if (pT > 0) o += `<g transform="translate(${f((1 - pT) * 500)} ${f(up)}) ${lockT(0)}" fill="${WH}" opacity="${f(Math.min(1, pT * 3))}">${GRP.tag.map(d => `<path d="${d}"/>`).join('')}</g>`;
    // the three brand logos appear under it
    const RL = rowLayout();
    GRID_KEYS.forEach((key, i) => {
      const k = seg(t, PH.rise + 0.4 + i * 0.12, PH.rise + 1.0 + i * 0.12);
      if (k <= 0) return;
      const L = RL[key];
      o += logo(key, L, { nameIn: k, nameOut: 0, digitsIn: k, digitsOut: 0 }, WH);
      let mk = ''; for (let sl = 0; sl < 6; sl++) mk += shape(scaleAbout(markerGeom(key, sl, L), ease.out(k)));
      o += `<g fill="${WH}">${mk}</g>`;
    });
    return o;
  }
  // final row of brand logos under the group lockup
  const ROW_Y = 640;
  let ROWL = null;
  // the brand row spans exactly the group lockup's width: left edge of GROUP → right edge of the claim
  const rowLayout = () => ROWL || (ROWL = (() => { const s0 = 40, ws = GRID_KEYS.map(k => BRANDS[k].w * s0 / BRANDS[k].h);
    const x0 = GROUP_L, x1 = TAG_R, gap = (x1 - x0 - ws.reduce((a, b) => a + b, 0)) / 2;
    let x = x0; const out = {};
    GRID_KEYS.forEach((k, i) => { const s = s0 / BRANDS[k].h; out[k] = { ox: x, oy: ROW_Y - s0 / 2, s, lh: s0 }; x += ws[i] + gap; });
    return out; })());

  const zoomAbout = (dx, s, cx = W / 2, cy = H / 2) => `translate(${f(dx + cx)} ${f(cy)}) scale(${s.toFixed(5)}) translate(${-cx} ${-cy})`;
  // camera: a gentle zoom-out through the opening, then a very slow drift
  const camR = t => lerp(1.06, 1.0, bez(0.3, 0, 0.3, 1)(seg(t, 0, PH.full + 0.6))) + 0.02 * bez(0.4, 0, 0.6, 1)(seg(t, PH.full + 0.6, PH.end));
  function reveal(t) {
    clipId = 0;
    let body = '';
    if (t >= PH.full + 0.95) body += footage(t);
    if (t < PH.f1 + 0.01) body += actOpen(t);
    if (t >= PH.grid && t < PH.zoom + 0.01) body += actGrids(t);
    if (t >= PH.zoom) body += actSignet(t);
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
    _brands: () => BRANDS, _grp: () => GRP,
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
