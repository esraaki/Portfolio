import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(path.join(root, 'index.html'), 'utf8');

const expectedCapabilities = [
  'Figma',
  'Framer',
  'Design Systems',
  'Figma Variables',
  'Accessibility / ADA',
  'RTL Design',
  'GitHub',
  'Vercel',
  'AI-Assisted Development',
  'Responsive UI',
  'Information Architecture',
  'Wireframing',
  'Basic HTML & CSS',
  'Prototyping',
  'Website Maintenance',
];

const skillsElement = { innerHTML: '' };
globalThis.document = { querySelector: selector => selector === '.skills' ? skillsElement : null };
await import('../capabilities.js');
const section = skillsElement.innerHTML;
const cards = [...section.matchAll(/<li class="skill-card">([\s\S]*?)<\/li>/g)];
assert.equal(cards.length, expectedCapabilities.length, 'Capabilities should render the complete approved card set');

const renderedNames = cards.map(([, card]) => {
  const match = card.match(/<span class="skill-name">([^<]+)<\/span>/);
  assert.ok(match, 'Every capability card should have a visible name');
  return match[1].trim();
});
assert.deepEqual(renderedNames, expectedCapabilities, 'Capabilities should match the approved list and order');

const iconPaths = cards.map(([, card]) => {
  const match = card.match(/<img[^>]+src="([^"]+)"[^>]+alt=""/);
  assert.ok(match, 'Every capability card should have a decorative local icon');
  assert.match(match[1], /^assets\/icons\/[a-z0-9-]+\.(svg|png)$/, 'Icons should use local artwork');
  return match[1];
});

assert.equal(new Set(iconPaths).size, expectedCapabilities.length, 'Each retained capability should have its own icon');
assert.equal(iconPaths[8], 'assets/icons/claude.svg', 'AI-Assisted Development should use the Claude logo');
for (const [index, name] of [[2, 'design-systems'], [3, 'figma-variables'], [4, 'accessibility'], [5, 'rtl-design'], [13, 'prototyping'], [14, 'website-maintenance']]) {
  assert.equal(iconPaths[index], `assets/icons/${name}.png`, 'Updated cards should use the supplied PNG artwork');
}
await Promise.all(iconPaths.map(iconPath => access(path.join(root, iconPath))));
assert.match(html, /<script src="capabilities\.js"><\/script>/, 'Capabilities behavior should load on the page');

console.log(`Verified ${cards.length} capability cards and ${iconPaths.length} local icons, including six replacement PNGs.`);
