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
  // SCENE: reveal — GROUP 24 system presentation. Light, hairline, continuous.
  //  1 group      three companies (● HI-TEC, ■ KRAMAT, ▛ MS WAY) slide together into the signet
  //  2 logo       the GROUP 24 lockup is pulled out of the signet
  //  3 constant   the "24" steps forward onto a hairline construction grid
  //  4 evolution  a scanline redraws the 24 in each brand's dialect; markers re-shape; details light up
  //  5 behaviour  the page contracts into each brand's white shape with footage around it; logo black, 24 in brand colour
  //  6 finale     the page opens again, the 24 becomes the group 24, markers fold into ■ ▛ ●, full lockup
  // Brand order everywhere: HI-TEC → KRAMAT → MS WAY.
  // =====================================================================
  const PH = { a: 0.15, join: 1.8, pull: 2.6, ink: 3.5, step: 4.15, grid: 4.55, f1: 5.85, f2: 6.95, f3: 8.05, f4: 9.15, b0: 10.0, b1: 12.2, b2: 14.2, fin: 16.3, end: 20.0 };
  const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const NAME24 = { hitec: 'HI-TEC 24', kramat: 'KRAMAT 24', msway: 'MS WAY 24' };
  const flow = x => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2); // cubic in-out: short tails, chains without stalls
  const INKC = '#0a0a0a';
  const ACCENT = { hitec: '#2FA597', kramat: '#E0561E', msway: '#4CA563' };
  const SIG_OF = { kramat: 0, msway: 1, hitec: 2 };

  // group lockup (Figma position, scaled to 80 % around the frame centre)
  const LS = 0.8;
  const lx = x => 960 + (x - 960) * LS, ly = y => 540 + (y - 540) * LS;
  const lRect = r => ({ ...r, x: lx(r.x), y: ly(r.y), w: r.w * LS, h: r.h * LS, r: r.r.map(v => v * LS) });
  const LK = [
    { x: 1013.38, y: 503.05, w: 96.24, h: 77.37, r: [0, 0, 0, 0] },
    { x: 1122.91, y: 501.98, w: 81.78, h: 77.81, r: [35.19, 0, 0, 0], notch: 1 },
    { x: 1210.87, y: 499.92, w: 81.46, h: 81.46, r: [40.73, 40.73, 40.73, 40.73] },
  ].map(lRect);
  const LOCK = `translate(${f(lx(251))} ${f(ly(405))}) scale(${LS})`; // group24.svg → screen
  const D24 = { x: 543.47, y: 101.83, w: 167.96, h: 69.82 };         // thin 24 inside group24.svg
  const LK24 = { x: lx(251) + D24.x * LS, y: ly(405) + D24.y * LS, w: D24.w * LS, h: D24.h * LS };
  const TAG_R = lx(251) + 1373.9 * LS, GROUP_L = lx(251) + 43.38 * LS;

  // construction grid: 13 × 13 cells; the 24 is two 5 × 5 digits with one cell between
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
  const form24 = (form, box, color) => form === 'thin' ? thin24(box, color) : brand24(form, fitT(BRANDS[form].dbb, box), color);
  const scaleAbout = (g, k) => { const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
    return { ...g, x: cx - g.w * k / 2, y: cy - g.h * k / 2, w: g.w * k, h: g.h * k, r: g.r.map(v => v * k) }; };
  const sigAt = (key, cx, cy, h) => { const g = LK[SIG_OF[key]], s = h / g.h;
    return { x: cx - g.w * s / 2, y: cy - h / 2, w: g.w * s, h, r: g.r.map(v => v * s), notch: g.notch || 0 }; };

  function defs() {
    let o = '<defs>';
    for (const k of ORDER) o += `<linearGradient id="ag_${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BRANDS[k].grad[0]}"/><stop offset="1" stop-color="${BRANDS[k].grad[1]}"/></linearGradient>`;
    return o + '</defs>';
  }
  const mono = (x, y, txt, op, anchor = 'start', size = 13) => op <= 0 ? '' :
    `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" fill="${INKC}" opacity="${f(op)}" font-family="DejaVu Sans Mono, monospace" font-size="${size}" letter-spacing="2">${txt}</text>`;
  // text that rises in from below a mask line and leaves upward
  function rise(x, y, inner, pin, pout, h = 40) {
    if (pin <= 0 || pout >= 1) return '';
    const id = 'r' + (clipId++), dy = (1 - ease.out(pin)) * h - flow(pout) * h;
    return `<clipPath id="${id}"><rect x="${f(x - 600)}" y="${f(y - h)}" width="1200" height="${f(h + 12)}"/></clipPath><g clip-path="url(#${id})"><g transform="translate(0 ${f(dy)})">${inner}</g></g>`;
  }

  // ---------- 1 + 2: three companies → signet → GROUP 24 ----------
  const ROWX = key => W / 2 + (ORDER.indexOf(key) - 1) * 400, ROWY = 500, ROWH = 110;
  function actGroup(t) {
    let o = '';
    const pOut = seg(t, PH.join - 0.1, PH.join + 0.4);
    // hairline connecting the three companies
    const pl = ease.out(seg(t, PH.a + 0.8, PH.a + 1.5)) * (1 - flow(seg(t, PH.join, PH.join + 0.6)));
    if (pl > 0) { const x0 = ROWX('hitec'), x1 = ROWX('msway'), c = (x0 + x1) / 2;
      o += `<line x1="${f(c - (c - x0) * pl)}" x2="${f(c + (x1 - c) * pl)}" y1="${ROWY}" y2="${ROWY}" stroke="${INKC}" stroke-opacity="0.25" stroke-width="1"/>`; }
    o += mono(W / 2, ROWY + 200, '3 COMPANIES — 1 GROUP', 0.55 * seg(t, PH.a + 1.0, PH.a + 1.4) * (1 - pOut), 'middle');
    // the three shapes, then the join into the signet (HI-TEC crosses underneath on an arc)
    const ink = flow(seg(t, PH.ink, PH.ink + 0.5)), gone = t >= PH.step;
    ORDER.forEach((key, i) => {
      const k = ease.out(seg(t, PH.a + i * 0.12, PH.a + 0.75 + i * 0.12));
      const p = flow(seg(t, PH.join + i * 0.06, PH.join + 0.95 + i * 0.06));
      const arc = [120, -40, -70][i] * Math.sin(Math.PI * p);
      let g = lerpGeom(scaleAbout(sigAt(key, ROWX(key), ROWY, ROWH), k), LK[SIG_OF[key]], p);
      g = { ...g, y: g.y + arc };
      // in act 3 the signet steps back: shapes shrink away
      const q = 1 - flow(seg(t, PH.step + i * 0.06, PH.step + 0.5 + i * 0.06));
      if (q < 1) g = scaleAbout(g, q);
      if (k <= 0 || q <= 0) return;
      o += shape(g, ` fill="url(#ag_${key})"`) + (ink > 0 ? shape(g, ` fill="${INKC}" opacity="${f(ink)}"`) : '');
      // labels under each company
      const lab = `<text x="${f(ROWX(key))}" y="${ROWY + ROWH / 2 + 52}" text-anchor="middle" fill="${INKC}" font-family="Inter" font-size="18" letter-spacing="4">${NAME24[key]}</text>`;
      o += rise(ROWX(key), ROWY + ROWH / 2 + 52, lab, seg(t, PH.a + 0.3 + i * 0.12, PH.a + 0.9 + i * 0.12), seg(t, PH.join - 0.15 + i * 0.04, PH.join + 0.3 + i * 0.04), 30);
      o += mono(ROWX(key), ROWY - ROWH / 2 - 30, `0${i + 1}`, 0.5 * seg(t, PH.a + 0.4 + i * 0.12, PH.a + 0.9 + i * 0.12) * (1 - pOut), 'middle', 12);
    });
    // GROUP 24 pulled out of the ■ (clipped left of it), tagline out of the ● (clipped right of it); in act 3 they retract
    // act 3: GROUP and the tagline leave upward under a mask band, so the 24 stays alone
    const up = -110 * flow(seg(t, PH.step - 0.05, PH.step + 0.45)), upT = -110 * flow(seg(t, PH.step + 0.05, PH.step + 0.55));
    const pG = flow(seg(t, PH.pull, PH.pull + 0.8)), pT = flow(seg(t, PH.pull + 0.1, PH.pull + 0.9));
    const sq = LK[0], ci = LK[2];
    o += `<clipPath id="band"><rect x="-400" y="${f(ly(405) + 80 * LS)}" width="${W + 800}" height="${f(110 * LS)}"/></clipPath>`;
    if (pG > 0 && up > -110) {
      const push = (sq.x - GROUP_L) * (1 - pG);
      o += `<g clip-path="url(#band)"><clipPath id="og"><rect x="-400" y="0" width="${f(sq.x + 400)}" height="${H}"/></clipPath><g clip-path="url(#og)"><g transform="translate(${f(push)} ${f(up)}) ${LOCK}" fill="${INKC}">${GRP.grp.map(d => `<path d="${d}"/>`).join('')}</g></g></g>`;
    }
    if (pT > 0 && upT > -110) {
      const push = (TAG_R - (ci.x + ci.w)) * (1 - pT);
      o += `<g clip-path="url(#band)"><clipPath id="ot"><rect x="${f(ci.x + ci.w)}" y="0" width="${W}" height="${H}"/></clipPath><g clip-path="url(#ot)"><g transform="translate(${f(-push)} ${f(upT)}) ${LOCK}" fill="${INKC}">${GRP.tag.map(d => `<path d="${d}"/>`).join('')}</g></g></g>`;
    }
    // the thin 24 travels with GROUP out of the ■, then (act 3) steps forward on its own
    const pS = flow(seg(t, PH.step + 0.35, PH.step + 1.4));
    const p24 = flow(seg(t, PH.pull, PH.pull + 0.8));
    if (p24 > 0 && t < PH.f1) {
      const push = (sq.x - GROUP_L) * (1 - p24);
      const b = lerpBox({ ...LK24, x: LK24.x + push }, BOX, pS);
      o += pS > 0 ? thin24(b, INKC) : `<clipPath id="o24"><rect x="-400" y="0" width="${f(sq.x + 400)}" height="${H}"/></clipPath><g clip-path="url(#o24)">${thin24(b, INKC)}</g>`;
    }
    return o;
  }

  // ---------- 3 + 4: the constant on the grid, then its evolution ----------
  const FORMS = ['thin', 'hitec', 'kramat', 'msway', 'hitec']; // ends on HI-TEC, which opens the brand run
  const FORM_LABEL = { thin: ['GROUP 24', 'STROKE', 1], hitec: ['HI-TEC 24', 'ROUND + DOTS', 2], kramat: ['KRAMAT 24', 'CHAMFER 45°', 3], msway: ['MS WAY 24', 'RADIUS ½ CELL', 4] };
  const SHAPE_ICON = { hitec: 2, kramat: 0, msway: 1 };
  // measured with G24.formProbe: cells the form only partly fills
  const HL = {
    kramat: [[5, 4], [11, 6], [1, 8]],
    msway: [[4, 4], [11, 5], [1, 6], [5, 6], [7, 6], [11, 6], [1, 8]],
    hitec: [[0, 2], [12, 2], [1, 4], [4, 4], [7, 4], [11, 4], [5, 5], [11, 5], [1, 6], [5, 6], [7, 6], [10, 6], [11, 7], [1, 8], [5, 8], [11, 8], [0, 10], [12, 10]],
  };
  const TFS = () => [PH.f1, PH.f2, PH.f3, PH.f4];
  const formAt = t => TFS().filter(x => t >= x + 0.35).length;   // index of the form the labels describe
  // grid markers: 4 corner cells (cols 0 / 12, rows 2 / 10), shaped like each brand's markers
  const markerR = (form, right, top) => {
    const R = CELL / 2;
    if (form === 'hitec') return [R, R, R, R];
    if (form === 'kramat') return [0, 0, 0, 0];
    const Q = CELL; return top ? (right ? [0, Q, 0, 0] : [Q, 0, 0, 0]) : (right ? [0, 0, Q, 0] : [0, 0, 0, Q]);
  };
  function gridMarkers(t, extraT) {
    const TF = TFS();
    const k = ease.out(seg(t, TF[0] + 0.3, TF[0] + 0.75));
    if (k <= 0) return [];
    const out = [];
    for (const right of [false, true]) for (const top of [true, false]) {
      let r = markerR('hitec', right, top);
      [1, 2, 3].forEach(i => { const p = flow(seg(t, TF[i] + 0.15, TF[i] + 0.65)); const nr = markerR(FORMS[i + 1], right, top); r = r.map((v, j) => lerp(v, nr[j], p)); });
      const g = scaleAbout({ x: GRID.x + (right ? 12 : 0) * CELL, y: GRID.y + (top ? 2 : 10) * CELL, w: CELL, h: CELL, r }, k);
      out.push({ right, top, g });
    }
    return out;
  }
  function gridLines(p, alpha) {
    if (p <= 0 || alpha <= 0) return '';
    let o = `<g stroke="${INKC}" stroke-width="1" opacity="${f(0.13 * alpha)}">`;
    for (let i = 0; i <= GRID.n; i++) {
      const v = GRID.x + i * CELL, q = ease.out(clamp(p * 1.6 - i * 0.045)), q2 = ease.out(clamp(p * 1.6 - 0.1 - i * 0.045));
      if (q > 0) o += `<line x1="${f(GRID.x)}" y1="${f(GRID.y + i * CELL)}" x2="${f(GRID.x + GRID.s * q)}" y2="${f(GRID.y + i * CELL)}"/>`;
      if (q2 > 0) o += `<line x1="${f(v)}" y1="${f(GRID.y)}" x2="${f(v)}" y2="${f(GRID.y + GRID.s * q2)}"/>`;
    }
    o += '</g>';
    // corner ticks
    const a = alpha * ease.out(p), x0 = GRID.x, y0 = GRID.y, x1 = GRID.x + GRID.s, y1 = GRID.y + GRID.s, k = 9;
    o += `<g stroke="${INKC}" stroke-width="1" opacity="${f(0.5 * a)}">`;
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) o += `<line x1="${f(x - k)}" y1="${f(y)}" x2="${f(x + k)}" y2="${f(y)}"/><line x1="${f(x)}" y1="${f(y - k)}" x2="${f(x)}" y2="${f(y + k)}"/>`;
    return o + '</g>';
  }
  function gridLabels(t, alpha) {
    if (alpha <= 0) return '';
    const x0 = GRID.x, y0 = GRID.y, x1 = GRID.x + GRID.s, y1 = GRID.y + GRID.s;
    let o = mono(x0, y0 - 18, 'GRID 13×13', 0.5 * alpha);
    // form name / spec / number roll through small windows at each scan
    const TF = [-9, ...TFS()];
    FORMS.forEach((form, i) => {
      const [name, spec, num] = FORM_LABEL[form];
      const pin = i === 0 ? 1 : seg(t, TF[i] + 0.3, TF[i] + 0.7), pout = i === FORMS.length - 1 ? 0 : seg(t, TF[i + 1] + 0.1, TF[i + 1] + 0.45);
      const icon = SHAPE_ICON[form] !== undefined ? (() => { const g = sigAt(form, x1 - 6, y0 - 22, 11); return shape(g, ` fill="${ACCENT[form]}"`); })() : '';
      o += rise(x1, y0 - 18, mono(x1 - (icon ? 18 : 0), y0 - 18, name, 0.7 * alpha, 'end') + icon, pin, pout, 22);
      o += rise(x1, y1 + 30, mono(x1, y1 + 30, spec, 0.5 * alpha, 'end'), pin, pout, 22);
      o += rise(x0, y1 + 30, mono(x0, y1 + 30, `FORM 0${num} / 04`, 0.5 * alpha), pin, pout, 22);
    });
    return o;
  }
  // side caption: brand name + claim, swapping with each form
  function caption(t, alpha) {
    if (alpha <= 0) return '';
    const x = GRID.x + GRID.s + 90, TF = [-9, ...TFS()];
    let o = '';
    FORMS.forEach((form, i) => {
      const name = form === 'thin' ? 'GROUP 24' : NAME24[form], sub = form === 'thin' ? ['LEADING ALL', 'THE WAY.'] : TAG2[form];
      const pin = i === 0 ? seg(t, PH.grid + 0.3, PH.grid + 0.9) : seg(t, TF[i] + 0.25, TF[i] + 0.85), pout = i === FORMS.length - 1 ? 0 : seg(t, TF[i + 1], TF[i + 1] + 0.4);
      o += rise(x, 532, `<text x="${x}" y="532" fill="${INKC}" opacity="${f(alpha)}" font-family="Inter" font-size="28" letter-spacing="2">${name}</text>`, pin, pout, 40);
      sub.forEach((line, j) => { o += rise(x, 566 + j * 20, mono(x, 566 + j * 20, line, 0.55 * alpha, 'start', 13), seg(pin, 0.15 + j * 0.1, 1), pout, 20); });
    });
    return o;
  }
  function highlights(t, alpha) {
    let o = '';
    const TF = TFS();
    TF.forEach((x, i) => {
      const form = FORMS[i + 1], end = TF[i + 1] !== undefined ? TF[i + 1] : PH.b0;
      (HL[form] || []).forEach(([c, r], j) => {
        const a = alpha * ease.out(seg(t, x + 0.5 + j * 0.015, x + 0.8 + j * 0.015)) * (1 - seg(t, end, end + 0.3));
        if (a <= 0) return;
        o += `<rect x="${f(GRID.x + c * CELL)}" y="${f(GRID.y + r * CELL)}" width="${CELL}" height="${CELL}" fill="${ACCENT[form]}" fill-opacity="${f(0.14 * a)}" stroke="${ACCENT[form]}" stroke-opacity="${f(0.9 * a)}" stroke-width="1.5"/>`;
      });
    });
    return o;
  }
  // the 24 on the grid; at each step a scanline redraws it top → bottom in the next dialect
  function gridDigits(t) {
    const TF = TFS();
    const started = TF.filter(x => t >= x).length;
    const cur = FORMS[started], prev = FORMS[Math.max(0, started - 1)];
    const sp = started ? flow(seg(t, TF[started - 1], TF[started - 1] + 0.7)) : 1;
    if (sp >= 1) return form24(cur, BOX, INKC);
    const y = BOX.y - 8 + (BOX.h + 16) * sp, id = 'sc' + (clipId++);
    let o = `<clipPath id="${id}a"><rect x="0" y="0" width="${W}" height="${f(y)}"/></clipPath><clipPath id="${id}b"><rect x="0" y="${f(y)}" width="${W}" height="${H}"/></clipPath>`;
    o += `<g clip-path="url(#${id}a)">${form24(cur, BOX, INKC)}</g><g clip-path="url(#${id}b)">${form24(prev, BOX, INKC)}</g>`;
    o += `<line x1="${f(GRID.x - 14)}" x2="${f(GRID.x + GRID.s + 14)}" y1="${f(y)}" y2="${f(y)}" stroke="${ACCENT[cur]}" stroke-width="1.5" opacity="${f(Math.sin(Math.PI * sp))}"/>`;
    return o;
  }

  // ---------- 5 + 6: the page becomes the brand's white shape with footage around it; then back into the group ----------
  const K = 0.5523;                                   // cubic handle length for a quarter circle
  const C0 = { dx: 0, dy: 0, k: 0 };
  const cr = (d, k = K) => ({ dx: d, dy: d, k });
  const toAp = g => ({ x: g.x, y: g.y, w: g.w, h: g.h, c: g.r.map(r => cr(r)), notch: g.notch || 0 });
  const lerpAp = (a, b, p) => ({
    x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p),
    c: a.c.map((q, i) => ({ dx: lerp(q.dx, b.c[i].dx, p), dy: lerp(q.dy, b.c[i].dy, p), k: lerp(q.k, b.c[i].k, p) })),
    notch: lerp(a.notch || 0, b.notch || 0, p),
  });
  // outline: per corner a cubic from edge to edge; k = 0 → chamfer, k = K → round, d = 0 → sharp; notch = ▛ cut-out
  function apPath(g) {
    const { x, y, w, h } = g; if (w < 0.01 || h < 0.01) return '';
    const [tl, tr, br, bl] = g.c.map(q => ({ dx: clamp(q.dx, 0, w / 2), dy: clamp(q.dy, 0, h / 2), k: q.k }));
    const cub = (a, c, b, k) => `C${f(a[0] + (c[0] - a[0]) * k)} ${f(a[1] + (c[1] - a[1]) * k)} ${f(b[0] + (c[0] - b[0]) * k)} ${f(b[1] + (c[1] - b[1]) * k)} ${f(b[0])} ${f(b[1])}`;
    let d = `M${f(x + tl.dx)} ${f(y)}L${f(x + w - tr.dx)} ${f(y)}` + cub([x + w - tr.dx, y], [x + w, y], [x + w, y + tr.dy], tr.k);
    d += `L${f(x + w)} ${f(y + h - br.dy)}` + cub([x + w, y + h - br.dy], [x + w, y + h], [x + w - br.dx, y + h], br.k);
    d += `L${f(x + bl.dx)} ${f(y + h)}` + cub([x + bl.dx, y + h], [x, y + h], [x, y + h - bl.dy], bl.k);
    d += `L${f(x)} ${f(y + tl.dy)}` + cub([x, y + tl.dy], [x, y], [x + tl.dx, y], tl.k) + 'Z';
    const n = seg(g.notch || 0, 0.6, 1);
    if (n > 0.001) { const nx = x + w * (1 - 0.564 * n), ny = y + h * (1 - 0.541 * n); d += `M${f(nx)} ${f(ny)}H${f(x + w)}V${f(y + h)}H${f(nx)}Z`; }
    return d;
  }
  const FULLR = { x: -40, y: -40, w: W + 80, h: H + 80, c: [C0, C0, C0, C0], notch: 0 };
  const SHAPE_H = 620, SHAPE_CX = 760;
  const shapeOf = key => { const g = LK[SIG_OF[key]], s = SHAPE_H / g.h;
    return toAp({ x: SHAPE_CX - g.w * s / 2, y: H / 2 - SHAPE_H / 2, w: g.w * s, h: SHAPE_H, r: g.r.map(v => v * s), notch: g.notch || 0 }); };
  const SHAPE = { hitec: shapeOf('hitec'), kramat: shapeOf('kramat'), msway: shapeOf('msway') };
  const ANCHOR = { hitec: [0.5, 0.5], kramat: [0.5, 0.5], msway: [0.42, 0.37] };      // optical centre (▛ keeps clear of its notch)
  // logo 52 px tall, tagline two lines under it, flush with the logotype's left edge
  function brandL(key) {
    const b = BRANDS[key], s = 56 / b.h, P = SHAPE[key];
    const ax = P.x + P.w * ANCHOR[key][0], ay = P.y + P.h * ANCHOR[key][1];
    return { ox: ax - b.w * s / 2, oy: ay - 65, s, lh: b.h * s };
  }
  const TAG2 = { hitec: ['IN THE RIGHT', 'TEMPERATURE.'], kramat: ['IN THE RIGHT', 'HANDS.'], msway: ['IN THE RIGHT', 'TIME.'] };
  function tag2(key, pin, pout) {
    const L = brandL(key), y0 = L.oy + L.lh + 40;
    return TAG2[key].map((line, j) => rise(L.ox, y0 + j * 26,
      `<text x="${f(L.ox)}" y="${f(y0 + j * 26)}" fill="${INKC}" opacity="0.85" font-family="Inter" font-size="18" letter-spacing="4">${line}</text>`,
      seg(pin, j * 0.15, 1), seg(pout, j * 0.1, 1), 26)).join('');
  }
  // footage: clean plate + the truck driving along the deck, framed tight with a slow drone push
  const TRUCK = { x: 866, y: 578, w: 311, h: 151, dir: [0.9496, -0.3134], v: 38 };
  function footage(t) {
    const tr = TRUCK.v * (t - PH.b1), s = 1.6 * (1 + 0.05 * seg(t, PH.b0, PH.end));
    return `<g transform="translate(960 540) scale(${s.toFixed(5)}) translate(-880 -600)">` +
      `<image href="img/plate.jpg" x="0" y="0" width="1920" height="1441" preserveAspectRatio="none"/>` +
      `<image href="img/truck.png" x="${f(TRUCK.x - TRUCK.dir[0] * tr)}" y="${f(TRUCK.y - TRUCK.dir[1] * tr)}" width="${TRUCK.w}" height="${TRUCK.h}"/></g>`;
  }
  const gridSlot = m => (m.col === 1 ? (m.top ? 0 : 1) : (m.top ? 2 : 3)); // gridMarkers(): left-top, left-bottom, right-top, right-bottom
  const BSEQ = ['hitec', 'kramat', 'msway'];
  function actBrands(t) {
    const B = [PH.b0, PH.b1, PH.b2, PH.fin];
    const p0 = flow(seg(t, PH.b0, PH.b0 + 1.1));
    // the white page contracts into the brand shape, morphs ● → ■ → ▛, then opens back to the page
    let page = lerpAp(FULLR, SHAPE.hitec, p0);
    page = lerpAp(page, SHAPE.kramat, flow(seg(t, PH.b1, PH.b1 + 0.9)));
    page = lerpAp(page, SHAPE.msway, flow(seg(t, PH.b2, PH.b2 + 0.9)));
    const pOpen = flow(seg(t, PH.fin + 0.3, PH.fin + 1.3));
    page = lerpAp(page, FULLR, pOpen);
    let o = '';
    if (pOpen < 1) o += footage(t) + `<path fill-rule="evenodd" d="${apPath(page)}" fill="#fff"/>`;

    BSEQ.forEach((key, i) => {
      const b = BRANDS[key], L = brandL(key), TL = { s: L.s, tx: L.ox, ty: L.oy };
      const tin = B[i], tout = B[i + 1];
      const lead = i === 0 ? 0.55 : 0.25, nameIn = seg(t, tin + lead, tin + lead + 0.6), nameOut = i < 2 ? seg(t, tout, tout + 0.4) : seg(t, PH.fin, PH.fin + 0.45);
      if (nameIn > 0 && nameOut < 1) o += logo(key, L, { nameIn, nameOut, digitsIn: 0, digitsOut: 0 }, INKC);
      o += tag2(key, seg(t, tin + lead + 0.2, tin + lead + 0.8), i < 2 ? seg(t, tout, tout + 0.35) : seg(t, PH.fin, PH.fin + 0.35));
      // the 24, in brand colour: HI-TEC's drops in from the grid, the others pen-draw; MS WAY's becomes the group 24
      if (i === 0 && p0 < 1) {
        o += brand24(key, lerpT(fitT(b.dbb, BOX), TL, p0), rgb(mixC(INK, hexRGB(ACCENT[key]), seg(p0, 0.4, 1))));
      } else if (i === 2 && t >= PH.fin) {
        const pJ = flow(seg(t, PH.fin + 0.2, PH.fin + 1.2));
        o += brand24(key, lerpT(TL, fitT(b.dbb, LK24), pJ), rgb(mixC(hexRGB(ACCENT[key]), INK, seg(pJ, 0.2, 0.7))), 1 - seg(pJ, 0.5, 0.9));
      } else {
        const dIn = i === 0 ? 1 : seg(t, tin + 0.1, tin + 0.7), dOut = i < 2 ? seg(t, tout, tout + 0.35) : 0;
        if (t >= tin && dOut < 1) o += logo(key, L, { nameIn: 0, nameOut: 0, digitsIn: dIn, digitsOut: dOut }, ACCENT[key]);
      }
    });
    // markers: HI-TEC's come off the grid corners, then glide and re-shape into KRAMAT's and MS WAY's,
    // and finally fold column by column into the signet ■ ▛ ●
    const gm = gridMarkers(t), LH = brandL('hitec'), LKr = brandL('kramat'), LM = brandL('msway');
    const pk = flow(seg(t, PH.b1 + 0.1, PH.b1 + 0.85)), pmw = flow(seg(t, PH.b2 + 0.1, PH.b2 + 0.85));
    for (let sl = 0; sl < 6; sl++) {
      const m = BRANDS.hitec.markers[sl];
      let g = markerGeom('hitec', sl, LH);
      if (m.col > 0) g = lerpGeom(gm[gridSlot(m)].g, g, p0);
      else { const kk = ease.out(seg(t, PH.b0 + 0.6 + sl * 0.03, PH.b0 + 1.0 + sl * 0.03)); if (kk <= 0) continue; g = scaleAbout(g, kk); }
      g = lerpGeom(g, markerGeom('kramat', sl, LKr), pk);
      g = lerpGeom(g, markerGeom('msway', sl, LM), pmw);
      const col = BRANDS.msway.markers[sl].col, key = ['kramat', 'msway', 'hitec'][col];
      const pf = flow(seg(t, PH.fin + 0.25 + col * 0.07, PH.fin + 1.15 + col * 0.07));
      if (pf > 0) g = lerpGeom(g, LK[col], pf);
      o += shape(g, ` fill="${INKC}"`) + (pf > 0 ? shape(g, ` fill="url(#ag_${key})" opacity="${f(seg(pf, 0.05, 0.5))}"`) : '');
    }
    // finale: the thin group 24 lands; GROUP is pulled out of the 24, the tagline out of the ●
    const pJ = flow(seg(t, PH.fin + 0.2, PH.fin + 1.2));
    o += thin24(LK24, INKC, seg(pJ, 0.5, 0.9));
    const pG = flow(seg(t, PH.fin + 1.1, PH.fin + 1.9)), pT = flow(seg(t, PH.fin + 1.25, PH.fin + 2.05));
    if (pG > 0) {
      const push = (LK24.x - GROUP_L) * (1 - pG);
      o += `<clipPath id="fg"><rect x="-400" y="0" width="${f(LK24.x - 6 + 400)}" height="${H}"/></clipPath><g clip-path="url(#fg)"><g transform="translate(${f(push)} 0) ${LOCK}" fill="${INKC}">${GRP.grp.map(d => `<path d="${d}"/>`).join('')}</g></g>`;
    }
    if (pT > 0) {
      const ci = LK[2], push = (TAG_R - (ci.x + ci.w)) * (1 - pT);
      o += `<clipPath id="ft"><rect x="${f(ci.x + ci.w)}" y="0" width="${W}" height="${H}"/></clipPath><g clip-path="url(#ft)"><g transform="translate(${f(-push)} 0) ${LOCK}" fill="${INKC}">${GRP.tag.map(d => `<path d="${d}"/>`).join('')}</g></g>`;
    }
    return o;
  }

  function actGrid(t) {
    const alpha = 1 - seg(t, PH.b0, PH.b0 + 0.5);
    let o = gridLines(seg(t, PH.grid, PH.grid + 1.0), alpha) + highlights(t, alpha) + gridLabels(t, alpha * ease.out(seg(t, PH.grid + 0.4, PH.grid + 1.0))) + caption(t, alpha);
    if (t >= PH.f1 && t < PH.b0) o += gridDigits(t);
    // corner markers (carried into the HI-TEC logo by actBrands)
    if (t < PH.b0) o += gridMarkers(t).map(m => shape(m.g, ` fill="${INKC}"`)).join('');
    return o;
  }

  const zoomAbout = (dx, s, cx = W / 2, cy = H / 2) => `translate(${f(dx + cx)} ${f(cy)}) scale(${s.toFixed(5)}) translate(${-cx} ${-cy})`;
  const camR = t => 1 + 0.04 * (t / PH.end); // one slow continuous push-in over the whole piece
  function reveal(t) {
    clipId = 0;
    let body = '';
    if (t < PH.f1 + 0.01) body += actGroup(t);
    if (t >= PH.grid) body += actGrid(t);
    if (t >= PH.b0) body += actBrands(t);
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
