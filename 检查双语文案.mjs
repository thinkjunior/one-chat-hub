// 站点双语文案自检：node 检查双语文案.mjs
// 校验 HTML 里的 i18n 键在 zh / en 词典中成对存在，且英文不含中文残留。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(root, 'assets/i18n.js'), 'utf8');

const sandbox = {};
new Function('window', i18nSrc)(sandbox);
const dict = sandbox.OCH_I18N || {};

const problems = [];
const warnings = [];

const keys = new Set();
for (const m of html.matchAll(/data-i18n(?:-content|-alt|-aria)?="([^"]+)"/g)) keys.add(m[1]);

for (const lang of ['zh', 'en']) {
  if (!dict[lang]) { problems.push(`词典缺少 ${lang} 分支`); continue; }
  for (const k of keys) {
    const v = dict[lang][k];
    if (v == null || String(v).trim() === '') problems.push(`${lang} 缺少文案：${k}`);
  }
}

for (const k of Object.keys(dict.en || {})) {
  if (!keys.has(k)) warnings.push(`词典多余（HTML 未引用）：${k}`);
  if (/[\u4e00-\u9fa5]/.test(dict.en[k])) problems.push(`英文文案含中文：${k} → ${dict.en[k]}`);
}

for (const lang of ['zh', 'en']) {
  for (const k of Object.keys(dict[lang] || {})) {
    if (!(k in (dict.zh || {}))) problems.push(`zh 缺少键：${k}`);
    if (!(k in (dict.en || {}))) problems.push(`en 缺少键：${k}`);
  }
}

// 找出页面里含中文、却没有 data-i18n 承载的文本节点
let stripped = html
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<([a-zA-Z][\w-]*)\b[^>]*data-i18n="[^"]*"[^>]*>[\s\S]*?<\/\1>/g, '');
const naked = [...stripped.matchAll(/>([^<>]*[\u4e00-\u9fa5][^<>]*)</g)]
  .map((m) => m[1].trim())
  .filter((t) => t && t !== '中');

if (naked.length) {
  warnings.push(`以下中文文本未挂 data-i18n，英文模式不会切换：\n    - ${naked.join('\n    - ')}`);
}

console.log(`HTML 引用键 ${keys.size} 个；词典 zh ${Object.keys(dict.zh || {}).length} / en ${Object.keys(dict.en || {}).length}`);
if (warnings.length) {
  console.log('\n⚠️  提醒：');
  warnings.forEach((w) => console.log('  • ' + w));
}
if (problems.length) {
  console.log('\n❌ 不一致：');
  problems.forEach((p) => console.log('  • ' + p));
  process.exit(1);
}
console.log('\n✅ 双语文案齐备，英文无中文残留。');
