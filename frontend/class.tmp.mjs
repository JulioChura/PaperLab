import { chromium } from '@playwright/test';
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'msedge', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const errs = [];
const page = await ctx.newPage();
page.on('pageerror', (e) => errs.push('T: ' + e.message));
await page.addInitScript(() => localStorage.setItem('paperlab-theme', 'light'));

await page.goto('http://localhost:5173/');
await page.waitForTimeout(800);
await page.getByTestId('splash-teacher').click();
await page.waitForTimeout(900);
await page.getByTestId('pick-circuit_safe_led').click();
await page.screenshot({ path: `${out}/t1-create.png`, fullPage: true });
await page.getByTestId('create-session').click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/t2-creating.png` });
const code = (await page.getByTestId('room-code').innerText({ timeout: 10000 })).trim();
console.log('code', code);

const stu = await ctx.newPage();
stu.on('pageerror', (e) => errs.push('S: ' + e.message));
await stu.goto(`http://localhost:5173/?sala=${code}`);
await stu.getByTestId('join-name').fill('Alfredo (real)');
await stu.getByTestId('join-submit').click();
await stu.waitForTimeout(700);
await stu.screenshot({ path: `${out}/s1-joining.png` });
await stu.waitForTimeout(2500);

await page.bringToFront();
await page.waitForTimeout(5000);
await page.screenshot({ path: `${out}/t3-lobby.png`, fullPage: true });
await page.getByTestId('start-session').click();
await page.getByTestId('speed-20').click();
await page.waitForTimeout(22000);
await page.screenshot({ path: `${out}/t4-live.png`, fullPage: true });
const bar = page.locator('[aria-pressed]').filter({ hasText: '%' }).first();
if (await bar.count()) {
  await bar.click();
  await page.waitForTimeout(500);
  await page.getByTestId('group-hint').click().catch(() => {});
  await page.waitForTimeout(600);
}
await page.screenshot({ path: `${out}/t5-error-selected.png` });
await page.locator('[data-testid="student-grid"] button').first().click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/t6-drawer.png` });
await page.keyboard.press('Escape');
await page.mouse.click(200, 400);

await stu.bringToFront();
await stu.waitForTimeout(800);
await stu.screenshot({ path: `${out}/s2-student-camera.png` });

await page.bringToFront();
await page.waitForTimeout(14000);
page.once('dialog', (d) => void d.accept());
await page.getByTestId('end-session').click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/t7-report.png`, fullPage: true });

const mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
const m = await mob.newPage();
await m.goto('http://localhost:5173/?sala=xyz-abcd-efg');
await m.getByTestId('join-name').fill('Invitado');
await m.getByTestId('join-submit').click();
await m.waitForTimeout(3500);
await m.screenshot({ path: `${out}/m1-notfound.png` });
console.log(errs.join('\n') || 'no page errors');
await browser.close();
