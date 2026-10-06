#!/usr/bin/env node
// Prints the next free versioned filename, never an existing one.
// Usage: node scripts/next-version.mjs generated/higgsfield shot-01 mp4
//   -> generated/higgsfield/shot-01-v03.mp4   (if v01 and v02 exist)
import fs from "node:fs";
import path from "node:path";

const [dir, base, ext] = process.argv.slice(2);
if (!dir || !base || !ext) {
  console.error("Usage: node scripts/next-version.mjs <dir> <base-name> <ext>");
  process.exit(1);
}
const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-v(\\d+)\\.`);
const existing = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
const max = existing.reduce((m, f) => {
  const hit = f.match(re);
  return hit ? Math.max(m, Number(hit[1])) : m;
}, 0);
console.log(path.join(dir, `${base}-v${String(max + 1).padStart(2, "0")}.${ext.replace(/^\./, "")}`));
