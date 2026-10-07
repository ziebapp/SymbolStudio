// Offline render: node render.js <scene> [fps] [--stills t1,t2,...]
// Writes out/<scene>.mp4 (or PNG stills) using headless Chromium + ffmpeg.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

(async () => {
  const scene = process.argv[2] || 'film';
  const fps = +(process.argv[3] || 30);
  const stillsArg = process.argv.indexOf('--stills');
  const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'render.html'));
  const dur = await page.evaluate(s => G24.SCENES[s].dur, scene);
  const draw = t => page.evaluate(([s, t]) => { document.body.innerHTML = G24.frame(s, t); }, [scene, t]);

  if (stills) {
    for (const t of stills) {
      await draw(t);
      await page.screenshot({ path: path.join(outDir, `${scene}_${t.toFixed(2)}.png`) });
    }
  } else {
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'g24-'));
    const n = Math.round(dur * fps);
    for (let i = 0; i <= n; i++) {
      await draw(i / fps);
      await page.screenshot({ path: path.join(tmp, String(i).padStart(5, '0') + '.png') });
    }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, '%05d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', path.join(outDir, scene + '.mp4')]);
    fs.rmSync(tmp, { recursive: true });
  }
  await browser.close();
  console.log('done', scene);
})();
