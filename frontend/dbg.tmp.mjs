import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
const p = await ctx.newPage();
p.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 200)));
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/?sala=abc-defg-hij');
await p.getByTestId('join-name').fill('Test Uno');
console.log('disabled?', await p.getByTestId('join-submit').isDisabled());
await p.evaluate(() => { const f = document.querySelector('form'); f.addEventListener('submit', () => console.log('SUBMIT fired'), true); console.log('form?', !!f, 'btn in form?', !!f?.querySelector('[data-testid=join-submit]')); });
const box = await p.getByTestId('join-submit').boundingBox();
console.log('box', JSON.stringify(box), 'top elem:', await p.evaluate(([x,y]) => { const e = document.elementFromPoint(x,y); return e?.tagName + ' ' + (e?.getAttribute('data-testid')||e?.className?.toString().slice(0,60)); }, [box.x+box.width/2, box.y+box.height/2]));
await p.getByTestId('join-submit').click();
for (const t of [100, 600, 2500]) {
  await p.waitForTimeout(t);
  console.log(t, await p.evaluate(() => sessionStorage.getItem('paperlab-class-link')), await p.getByTestId('join-error').count());
}
await browser.close();
