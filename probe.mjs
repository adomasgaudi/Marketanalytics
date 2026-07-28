import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const check = async (w, label) => {
  await p.setViewportSize({ width: w, height: 1100 });
  await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);
  const o = await p.evaluate(() => {
    const yAxis = [...document.querySelectorAll('[role="group"]')].find(g=>g.getAttribute('aria-label')==='Y axis');
    const plot = document.querySelector('.chartbox.tall');
    if (!yAxis || !plot) return null;
    const y = yAxis.getBoundingClientRect(), c = plot.getBoundingClientRect();
    return {
      yRight: Math.round(y.right), plotLeft: Math.round(c.left),
      leftOfPlot: y.right <= c.left + 2,
      vertical: getComputedStyle(yAxis).flexDirection === 'column',
    };
  });
  console.log(label.padEnd(12), o ? `Ycontrols end@${o.yRight} plot starts@${o.plotLeft} | left-of-plot: ${o.leftOfPlot} | stacked: ${o.vertical}` : 'not found');
};
await check(1400, 'desktop');
await check(820, 'ipad');
await check(430, 'phone');
console.log(errs.length ? 'ERR '+errs[0] : 'no errors');
await b.close();
