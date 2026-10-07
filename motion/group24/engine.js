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
  const lerpGeom = (a, c, p) => ({ x: lerp(a.x, c.x, p), y: lerp(a.y, c.y, p), w: lerp(a.w, c.w, p), h: lerp(a.h, c.h, p),
                                   r: a.r.map((v, i) => lerp(v, c.r[i], p)) });
  function rr(g) {
    let { x, y, w, h } = g; if (w <= 0.01 || h <= 0.01) return '';
    const m = Math.min(w, h);
    let [tl, tr, br, bl] = g.r.map(v => clamp(v, 0, m));
    return `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}` + (tr ? `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}` : '') +
      `V${f(y + h - br)}` + (br ? `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}` : '') +
      `H${f(x + bl)}` + (bl ? `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}` : '') +
      `V${f(y + tl)}` + (tl ? `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}` : '') + 'Z';
  }
  // group signet (placeholder until the GROUP 24 SVG arrives): rectangle, quarter-circle, circle
  function signetGeom(i, scale = 1, cx = W / 2, cy = H / 2 - 30) {
    const h = 56 * scale, gap = 14 * scale;
    const ws = [h * 1.3, h, h];
    const total = ws[0] + ws[1] + ws[2] + gap * 2;
    let x = cx - total / 2; for (let j = 0; j < i; j++) x += ws[j] + gap;
    const r = [[0, 0, 0, 0], [0, h, 0, 0], [h / 2, h / 2, h / 2, h / 2]][i];
    return { x, y: cy - h / 2, w: ws[i], h, r };
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
    // digits: segment-by-segment snap with a one-frame flicker
    const N = b.digits.length;
    b.digits.forEach((q, i) => {
      const u = st.digitsIn * (N + 1) - i;      // build left→right
      const v = st.digitsOut * (N + 1) - (N - 1 - i); // clear right→left
      const on = u > 0.55 || (u > 0 && u < 0.3);
      const off = v > 0.55 || (v > 0 && v < 0.3);
      if (on && !off) out += `<path d="${q.d}"/>`;
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
      mk += `<path d="${rr(lerpGeom(from, markerGeom(key, sl, L), p))}"/>`;
    }
    o += `<g fill="${color}">${mk}</g>`;
    o += logo(key, L, { nameIn: seg(t, 1.05, 1.7), nameOut: 0, digitsIn: seg(t, 0.8, 1.35), digitsOut: 0 }, color);
    const ml = markerGeom(key, 1, L);
    o += tagline(BRANDS[key].tagline, ml.x, ml.y + ml.h + 64, seg(t, 1.65, 2.25), color);
    return svgWrap(o);
  }

  // =====================================================================
  // SCENE: system film, 15 s
  // signet → 3 brands built together (equal weight) → merge → cycle → back to signet
  // =====================================================================
  const T = { split: 1.1, trioHold: 3.3, merge: 4.3, mergeEnd: 5.3, c1: 7.0, c2: 9.2, out: 11.4, outEnd: 12.6, end: 15 };

  function film(t) {
    clipId = 0;
    // --- background & ink ---
    // light → teal: band opens from the logo's centre line; brand → brand: hard wipe with a scan line;
    // outro: band closes back to the centre line.
    const open = ease.io(seg(t, T.merge + 0.15, T.mergeEnd));
    const close = ease.io(seg(t, T.out + 0.2, T.outEnd));
    const w1 = ease.io(seg(t, T.c1 + 0.12, T.c1 + 0.85));
    const w2 = ease.io(seg(t, T.c2 + 0.12, T.c2 + 0.85));
    const cur = t >= T.c2 + 0.12 ? 'kramat' : 'hitec';
    const nxt = t >= T.c2 + 0.12 ? 'msway' : 'kramat';
    const wp = t >= T.c2 + 0.12 ? w2 : w1;
    const cy = H / 2 - 30;
    const bandH = H * 1.1 * open * (1 - close);
    const darkness = seg(open, 0.06, 0.16) * (1 - seg(close, 0.82, 0.94));
    const color = rgb(mixC(INK, WHITE, darkness));
    let o = background({});
    if (bandH > 0.5) {
      o += `<clipPath id="band"><rect x="0" y="${f(cy - bandH / 2)}" width="${W}" height="${f(bandH)}"/></clipPath><g clip-path="url(#band)">`;
      o += `<rect width="${W}" height="${H}" fill="url(#g_${cur})"/>`;
      if (wp > 0) {
        o += `<rect width="${f(W * wp)}" height="${H}" fill="url(#g_${nxt})"/>`;
        if (wp < 1) o += `<rect x="${f(W * wp - 1)}" width="2" height="${H}" fill="#fff" opacity="0.8"/>`;
      }
      o += '</g>';
      if (open < 1 || close > 0) o += `<g stroke="#fff" stroke-width="1" opacity="0.7"><line x1="0" x2="${W}" y1="${f(cy - bandH / 2)}" y2="${f(cy - bandH / 2)}"/><line x1="0" x2="${W}" y1="${f(cy + bandH / 2)}" y2="${f(cy + bandH / 2)}"/></g>`;
    }

    // --- phase A/B/C: signet, split, trio ---
    if (t < T.mergeEnd) {
      const mergeP = ease.io(seg(t, T.merge, T.mergeEnd));
      const center = centerLayout('hitec');
      let mk = '';
      for (const key of ORDER) {
        const i = ORDER.indexOf(key);
        const Ltrio = trioLayout(key);
        // during merge: hitec row travels to centre, others fold into hitec's slots
        const L = key === 'hitec' ? lerpLayout(Ltrio, center, mergeP) : Ltrio;
        const sg = SIGNET_OF[key];
        const appear = ease.out(seg(t, 0.15 + sg * 0.12, 0.55 + sg * 0.12));
        const sig = signetGeom(sg);
        const sigA = { ...sig, x: sig.x + sig.w / 2 * (1 - appear), y: sig.y + sig.h / 2 * (1 - appear), w: sig.w * appear, h: sig.h * appear, r: sig.r.map(v => v * appear) };
        for (let sl = 0; sl < 6; sl++) {
          const p = ease.io(seg(t, T.split + i * 0.08 + sl * 0.02, T.split + 0.75 + i * 0.08 + sl * 0.02));
          let g = lerpGeom(sigA, markerGeom(key, sl, L), p);
          if (key !== 'hitec') g = lerpGeom(g, markerGeom('hitec', sl, center), mergeP);
          mk += `<path d="${rr(g)}"/>`;
        }
        const gr = seg(t, T.split + 0.4 + i * 0.1, T.split + 1.2 + i * 0.1);
        o += grid(key, L, gr, (1 - seg(t, T.trioHold, T.merge)), color);
        const out = key === 'hitec' ? 0 : seg(t, T.merge, T.merge + 0.45);
        o += logo(key, L, {
          nameIn: seg(t, T.split + 0.95 + i * 0.1, T.split + 1.6 + i * 0.1), nameOut: out,
          digitsIn: seg(t, T.split + 0.7 + i * 0.1, T.split + 1.25 + i * 0.1), digitsOut: out,
        }, color);
      }
      o += `<g fill="${color}">${mk}</g>`;
      if (t > T.merge) {
        const ml = markerGeom('hitec', 1, center);
        o += tagline(BRANDS.hitec.tagline, ml.x, ml.y + ml.h + 64, seg(t, T.mergeEnd - 0.2, T.mergeEnd + 0.4), color);
      }
      return svgWrap(o);
    }

    // --- phase D: cycle hitec → kramat → msway ---
    if (t < T.out) {
      let from = 'hitec', to = 'hitec', p = 0, t0 = 0;
      if (t >= T.c2) { from = 'kramat'; to = 'msway'; t0 = T.c2; }
      else if (t >= T.c1) { from = 'hitec'; to = 'kramat'; t0 = T.c1; }
      p = ease.io(seg(t, t0 + 0.15, t0 + 0.85));
      const La = centerLayout(from), Lb = centerLayout(to);
      let mk = '';
      for (let sl = 0; sl < 6; sl++) {
        const ps = ease.io(seg(t, t0 + 0.12 + sl * 0.02, t0 + 0.82 + sl * 0.02));
        mk += `<path d="${rr(lerpGeom(markerGeom(from, sl, La), markerGeom(to, sl, Lb), from === to ? 0 : ps))}"/>`;
      }
      o += `<g fill="${color}">${mk}</g>`;
      if (from !== to) {
        o += logo(from, La, { nameIn: 1, nameOut: seg(t, t0, t0 + 0.4), digitsIn: 1, digitsOut: seg(t, t0, t0 + 0.3) }, color);
        o += logo(to, Lb, { nameIn: seg(t, t0 + 0.4, t0 + 0.95), nameOut: 0, digitsIn: seg(t, t0 + 0.35, t0 + 0.8), digitsOut: 0 }, color);
        const a = markerGeom(from, 1, La), c = markerGeom(to, 1, Lb);
        const tx = lerp(a.x, c.x, p);
        if (t < t0 + 0.5) o += tagline(BRANDS[from].tagline, tx, a.y + a.h + 64, 1, color, seg(t, t0, t0 + 0.35));
        else o += tagline(BRANDS[to].tagline, tx, c.y + c.h + 64, seg(t, t0 + 0.6, t0 + 1.1), color);
      } else {
        o += logo('hitec', La, { nameIn: 1, nameOut: 0, digitsIn: 1, digitsOut: 0 }, color);
        const a = markerGeom('hitec', 1, La);
        o += tagline(BRANDS.hitec.tagline, a.x, a.y + a.h + 64, 1, color);
      }
      return svgWrap(o);
    }

    // --- phase E: outro, markers fold back into the group signet ---
    const L = centerLayout('msway');
    let mk = '';
    for (let sl = 0; sl < 6; sl++) {
      const col = Math.floor(sl / 2); // left→rect, middle→quarter, right→circle
      const p = ease.io(seg(t, T.out + 0.25 + col * 0.06, T.out + 1.05 + col * 0.06));
      mk += `<path d="${rr(lerpGeom(markerGeom('msway', sl, L), signetGeom(col), p))}"/>`;
    }
    o += logo('msway', L, { nameIn: 1, nameOut: seg(t, T.out, T.out + 0.4), digitsIn: 1, digitsOut: seg(t, T.out, T.out + 0.3) }, color);
    if (t < T.out + 0.4) { const a = markerGeom('msway', 1, L); o += tagline(BRANDS.msway.tagline, a.x, a.y + a.h + 64, 1, color, seg(t, T.out, T.out + 0.3)); }
    o += `<g fill="${color}">${mk}</g>`;
    const s0 = signetGeom(0);
    const txt = 'LEADING ALL THE WAY.';
    const tw = txt.length * 17.3; // approx mono advance at 22px + 4 spacing
    o += tagline(txt, W / 2 - tw / 2, s0.y + s0.h + 90, seg(t, T.outEnd, T.outEnd + 0.7), color);
    return svgWrap(o);
  }

  const SCENES = {
    film: { dur: T.end, fn: film },
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
    init() { if (!ready) { parseBrands(); ready = true; } },
    frame(scene, t) { this.init(); return SCENES[scene].fn(t); },
  };
})();
