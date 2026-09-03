/*
 * בניית targets.mind מתמונות מקומיות — בלי דפדפן.
 *
 *   npm init -y
 *   npm pkg set type=module
 *   npm install mind-ar@1.2.5 jpeg-js pngjs --ignore-scripts
 *   node compile.mjs lion.jpg tzadik.jpg ...
 *
 * הפלט: targets.mind (סדר התמונות בשורת הפקודה = targetIndex 0,1,2...)
 * מותקן עם --ignore-scripts כי node-canvas לא נדרש — הסקריפט מייצר לו תחליף בג'אווהסקריפט טהור.
 */
import fs from 'fs';
import path from 'path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('שימוש: node compile.mjs image1.jpg [image2.png ...]');
  process.exit(1);
}

// תחליף ל־node-canvas: המהדר רק מצייר את התמונה וקורא ממנה פיקסלים
const shimDir = path.join('node_modules', 'canvas');
fs.mkdirSync(shimDir, { recursive: true });
fs.writeFileSync(path.join(shimDir, 'package.json'),
  JSON.stringify({ name: 'canvas', version: '0.0.0-shim', type: 'module', main: 'index.js' }));
fs.writeFileSync(path.join(shimDir, 'index.js'), `
export function createCanvas(w, h) {
  let src = null;
  return { width: w, height: h, getContext() { return {
    drawImage(img) { src = img; },
    getImageData() { return { data: src.data, width: src.width, height: src.height }; }
  }; } };
}
export default { createCanvas };
`);

const { OfflineCompiler } = await import('mind-ar/src/image-target/offline-compiler.js');

const images = files.map((f) => {
  const buf = fs.readFileSync(f);
  if (/\.png$/i.test(f)) {
    const p = PNG.sync.read(buf);
    return { width: p.width, height: p.height, data: new Uint8ClampedArray(p.data) };
  }
  const d = jpeg.decode(buf, { useTArray: true });
  return { width: d.width, height: d.height, data: new Uint8ClampedArray(d.data) };
});

images.forEach((im, i) => console.log(`${i}: ${files[i]} — ${im.width}x${im.height}`));

const compiler = new OfflineCompiler();
let last = -10;
await compiler.compileImageTargets(images, (p) => {
  if (p - last >= 10) { last = p; console.log('  ' + Math.round(p) + '%'); }
});
fs.writeFileSync('targets.mind', Buffer.from(compiler.exportData()));
console.log('נוצר targets.mind —', fs.statSync('targets.mind').size, 'בתים');
