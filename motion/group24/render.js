// Offline render: node render.js <scene> [fps] [--stills t1,t2,...] [--blur N]
// --blur N renders N sub-frames per output frame and averages them (motion blur).
// Writes out/<scene>.mp4 (or PNG stills) using headless Chromium + ffmpeg.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

(async () => {
  const scene = process.argv[2] || 'film';
  const fps = +(process.argv[3] || 30);
  const stillsArg = process.argv.indexOf('--stills');
  const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;
  const blurArg = process.argv.indexOf('--blur');
  const sub = blurArg > 0 ? +process.argv[blurArg + 1] : 1;
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  // footage clip → JPEG sequence the SVG engine can address frame by frame (git-ignored, rebuilt on demand)
  const bgDir = path.join(__dirname, 'img', 'bg');
  if (!fs.existsSync(path.join(bgDir, '0300.jpg'))) {
    fs.mkdirSync(bgDir, { recursive: true });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(__dirname, 'img', 'bg-hitec-kramat.mp4'),
      '-q:v', '2', path.join(bgDir, '%04d.jpg')]);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'render.html'));
  const dur = await page.evaluate(s => G24.SCENES[s].dur, scene);
  // set the frame, then wait until any <image> (footage stills) is decoded so no frame renders empty
  const draw = t => page.evaluate(async ([s, t]) => {
    document.body.innerHTML = G24.frame(s, t);
    await Promise.all([...document.querySelectorAll('image')].map(i => (i.decode ? i.decode() : Promise.resolve()).catch(() => {})));
  }, [scene, t]);

  if (stills) {
    for (const t of stills) {
      await draw(t);
      await page.screenshot({ path: path.join(outDir, `${scene}_${t.toFixed(2)}.png`) });
    }
  } else {
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'g24-'));
    const rate = fps * sub, n = Math.round(dur * rate);
    for (let i = 0; i <= n; i++) {
      await draw(i / rate);
      await page.screenshot({ path: path.join(tmp, String(i).padStart(5, '0') + '.png') });
    }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(rate), '-i', path.join(tmp, '%05d.png'),
      ...(sub > 1 ? ['-vf', `tmix=frames=${sub},fps=${fps}`] : []),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', path.join(outDir, scene + '.mp4')]);
    fs.rmSync(tmp, { recursive: true });
  }
  await browser.close();
  console.log('done', scene);
})();
