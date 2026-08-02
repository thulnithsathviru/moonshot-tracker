import {evalJS, goto, logs, URLBASE, DLDIR, done} from './harness.mjs';
import fs from 'node:fs';

const ok = [], bad = [];
const check = (name, cond, detail = '') => (cond ? ok : bad).push(name + (detail ? ' — ' + detail : ''));
const wait = ms => new Promise(r => setTimeout(r, ms));

await goto(URLBASE + 'index.html');
await evalJS('localStorage.clear();');          // start from data.json, not a stale draft
await goto(URLBASE + 'index.html');
await wait(2500);   // boot(): blocked supabase + data.json + render
check('cloud is unreachable in the test (no writes to live data)',
      await evalJS('return cloud.state==="err"'), await evalJS('return cloud.state'));

check('booted', await evalJS('return !!(typeof DB!=="undefined" && DB.outlets.length)'),
      String(await evalJS('return DB?DB.outlets.length:"no DB"')));
const trapNative = () => evalJS(`window.__native=[];
  ['confirm','prompt','alert'].forEach(k=>window[k]=()=>{window.__native.push(k);throw new Error('native '+k+'() used');});`);
console.log('outlets:', await evalJS('return DB.outlets.length'),
            'tasks:', await evalJS('return DB.outlets.reduce((a,o)=>a+o.tasks.length,0)'),
            'dayTypes:', await evalJS('return DB.dayTypes.map(d=>d.id).join()'),
            'holidays:', await evalJS('return DB.holidays.length'));

/* ---------- 1. dayType() no longer borrows another type's identity ---------- */
check('dayType(unknown) is the no-type object',
      await evalJS(`return dayType('nope-not-here').name===''&&dayType('nope-not-here').id===null`));
check('orphan typeIds cleared at boot',
      await evalJS(`return DB.holidays.every(h=>!h.typeId||DB.dayTypes.some(t=>t.id===h.typeId))`));

// simulate the reported bug: a day type deleted straight out of the data
await evalJS(`
  DB.dayTypes=DB.dayTypes.filter(t=>t.id!=='poya');
  render();
`);
check('day whose type vanished shows no other type name',
      await evalJS(`return holLabel(DB.holidays.find(h=>h.typeId==='poya')||{typeId:'poya'})===''`));
await goto(URLBASE + 'index.html'); await wait(2500);   // reload to restore
await trapNative();   // any native dialog from here on becomes a thrown error

/* ---------- 4/7. chrome + subtitle sweep on every page ---------- */
const gone = [
  'tick Milestone to give a category a row',
  'every outlet’s chart recalculates', 'and every outlet',
  'in the programme — rename',
  'assign once, applies everywhere',
  'A safety copy of everything',
  'works through:',
  'Each row is a category',
  'Blocks work, no label',
];
for (const view of ['milestones', 'calendar', 'critical', 'manage']) {
  await evalJS(`UI.view='${view}';render();`);
  await wait(250);
  const txt = await evalJS('return document.getElementById("app").innerText');
  for (const g of gone) check(`[${view}] no "${g.slice(0, 28)}"`, !txt.includes(g), 'still present');
  // Generic sweep: a .sub/.hint carrying a sentence is a descriptive subtitle.
  // Counts real words only, so factual data ("8 Jun 2026 → 10 Jun 2026", "20 outlets")
  // stays; empty-state lines ("No day types yet.") are the only content, so allowed.
  const prose = await evalJS(`
    return [...document.querySelectorAll('#app .sub,#app .hint')]
      .map(e=>e.innerText.trim())
      .filter(t=>!/^(No |Nothing )/.test(t) &&
                 (t.match(/\\b[A-Za-z]{3,}\\b/g)||[]).length>6);`);
  check(`[${view}] no descriptive subtitles left`, prose.length === 0, prose.join(' | '));
}

/* ---------- 6. calendar toolbar order ---------- */
await evalJS(`UI.view='calendar';UI.calMode='month';render();`);
await wait(200);
check('month toolbar reads ‹ [month] › then Today',
      await evalJS(`
        const bar=document.querySelectorAll('#app .bar')[0];
        const seq=[...bar.querySelectorAll('button,input')].map(e=>e.id||e.dataset.cal||e.type).join('>');
        return seq==='day>week>month>calPrev>calJumpM>calNext>calToday';`),
      await evalJS(`const bar=document.querySelectorAll('#app .bar')[0];
        return [...bar.querySelectorAll('button,input')].map(e=>e.id||e.dataset.cal||e.type).join('>');`));
await evalJS(`UI.calMode='week';render();`); await wait(150);
check('week view keeps a date picker',
      await evalJS(`return !!document.getElementById('calJump')&&!document.getElementById('calJumpM')`));
check('‹ › still step', await evalJS(`
  UI.calMode='month';UI.calDate='2026-07-01';render();
  document.getElementById('calPrev').click();
  const a=UI.calDate; document.getElementById('calNext').click(); document.getElementById('calNext').click();
  return a==='2026-06-01'&&UI.calDate==='2026-08-01';`));

/* ---------- 7. green pass ---------- */
await evalJS(`UI.view='milestones';render();`); await wait(150);
const green = await evalJS(`
  const px=s=>getComputedStyle(document.querySelector(s)).backgroundColor;
  return {tab:px('#tabs button.on'), exp:px('#btnExport')};`);
check('active tab pill is green', green.tab === 'rgb(80, 147, 83)', green.tab);
check('Export button is deep green', green.exp === 'rgb(61, 114, 64)', green.exp);
const black = await evalJS(`
  toast('probe');
  await new Promise(r=>setTimeout(r,60));
  const hits=[];
  document.querySelectorAll('.toast,.seg button.on,.btn.dark,#tabs button.on').forEach(e=>{
    const bg=getComputedStyle(e).backgroundColor, m=bg.match(/\\d+/g);
    if(m && +m[0]<60 && +m[1]<60 && +m[2]<60) hits.push((e.className||e.tagName)+' '+bg);
  });
  document.getElementById('toast').innerHTML='';
  return hits;`);
check('no black backgrounds left on interactive chrome', black.length === 0, black.join(' | '));

/* ---------- 3. critical path legend ---------- */
// pick an outlet whose window actually contains marked days
const withHols = await evalJS(`
  const o=DB.outlets.find(o=>{const[a,b]=outletSpan(o);return DB.holidays.some(h=>h.date>=addDays(a,-3)&&h.date<=addDays(b,14));});
  if(o)UI.outlet=o.id;
  return o?o.name:null;`);
console.log('legend outlet:', withHols);
check('an outlet window contains marked days', !!withHols);
await evalJS(`UI.view='critical';render();`); await wait(300);
const leg = await evalJS(`
  const l=document.querySelector('.cp-legend');
  if(!l) return {n:0};
  return {n:l.querySelectorAll('span').length, txt:l.innerText.replace(/\\n/g,' | '),
          inExport:document.getElementById('cpExport').contains(l)};`);
check('legend rendered on Critical Path', leg.n > 0, JSON.stringify(leg));
check('legend is inside the export target', leg.inExport === true);
console.log('legend:', leg.txt);
check('exportTarget() contains the legend',
      await evalJS(`const t=exportTarget();return t.el.querySelector('.cp-legend')!==null`));

/* ---------- 5. milestone matrix header/body alignment ---------- */
await evalJS(`UI.view='milestones';render();`); await wait(200);
for (const n of [1, 3, 20]) {
  const res = await evalJS(`
    UI.outlets=new Set(DB.outlets.slice(0,${n}).map(o=>o.id)); render();
    await new Promise(r=>setTimeout(r,120));
    const screenW=Math.round(document.querySelector('table.mtx').getBoundingClientRect().width);
    document.body.classList.add('exporting');
    await new Promise(r=>setTimeout(r,80));
    const tb=document.querySelector('table.mtx');
    let w=Math.ceil(tb.getBoundingClientRect().width);
    tb.style.width=w+'px';
    await new Promise(r=>setTimeout(r,25));
    w=Math.ceil(tb.getBoundingClientRect().width);
    tb.style.width=w+'px';tb.style.minWidth=w+'px';tb.style.maxWidth=w+'px';
    const el=document.getElementById('msSlide');
    const cs=getComputedStyle(el), pad=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight);
    el.style.width=Math.max(520,w+pad)+'px';
    await new Promise(r=>setTimeout(r,60));
    const hx=[...tb.querySelectorAll('thead th')].map(c=>Math.round(c.getBoundingClientRect().left));
    const bx=[...tb.querySelectorAll('tbody tr:first-child td')].map(c=>Math.round(c.getBoundingClientRect().left));
    const tw=Math.round(tb.getBoundingClientRect().width);
    tb.style.width='';tb.style.minWidth='';tb.style.maxWidth='';el.style.width='';
    document.body.classList.remove('exporting');
    return {hx,bx,tw,screenW,cols:hx.length};`);
  const aligned = res.hx.length === res.bx.length && res.hx.every((v, i) => Math.abs(v - res.bx[i]) <= 1);
  check(`matrix header/body aligned at ${n} outlet(s)`, aligned, JSON.stringify(res));
  check(`matrix columns not squeezed at ${n} outlet(s)`,
        res.tw === 238 + n * 132, `${res.tw} vs expected ${238 + n * 132}`);
  check(`matrix on screen matches export width at ${n} outlet(s)`,
        res.screenW === res.tw, `screen ${res.screenW} vs export ${res.tw}`);
  console.log(`  ${n} outlets → table ${res.tw}px, ${res.cols} cols, head=${res.hx.join(',')} body=${res.bx.join(',')}`);
}
const wrapped = await evalJS(`
  UI.outlets=new Set(DB.outlets.map(o=>o.id)); render();
  await new Promise(r=>setTimeout(r,180));
  return [...document.querySelectorAll('table.mtx thead th .oname')]
    .map(s=>[s.textContent.trim(), Math.round(s.offsetHeight/parseFloat(getComputedStyle(s).lineHeight))])
    .filter(([,n])=>n>1).map(([t,n])=>t+':'+n+'lines');`);
check('no outlet header name wraps mid-word', wrapped.length === 0, wrapped.join(', '));
check('no outlet header name overflows its cell', await evalJS(`
  return [...document.querySelectorAll('table.mtx thead th:not(.lead)')].every(th=>{
    const s=th.querySelector('.oname');
    return s.scrollWidth<=Math.ceil(s.getBoundingClientRect().width)+1;});`));
check('header names sit centred in the cell', await evalJS(`
  const th=document.querySelector('table.mtx thead th:not(.lead)');
  const cs=getComputedStyle(th);
  return cs.verticalAlign==='middle' && parseFloat(cs.paddingLeft)>=12 && parseFloat(cs.paddingTop)>=12;`));

/* ---------- critical-path export geometry (whole chart + legend) ---------- */
await evalJS(`UI.view='critical';render();`); await wait(300);
const geo = await evalJS(`
  document.body.classList.add('exporting');
  await new Promise(r=>setTimeout(r,90));
  const el=document.getElementById('cpExport'), tb=document.getElementById('gtb');
  const tw=Math.ceil(tb.getBoundingClientRect().width);
  tb.style.width=tw+'px';tb.style.minWidth=tw+'px';tb.style.maxWidth=tw+'px';
  el.style.width=Math.max(520,tw)+'px';el.style.maxWidth='none';
  await new Promise(r=>setTimeout(r,60));
  const er=el.getBoundingClientRect(), lr=document.querySelector('.cp-legend').getBoundingClientRect();
  const tr=tb.getBoundingClientRect();
  const lastCol=[...tb.querySelectorAll('thead th')].pop().getBoundingClientRect();
  const out={elW:Math.round(er.width),tblW:Math.round(tr.width),elH:Math.round(el.scrollHeight),
    legendInside:lr.bottom<=er.bottom+1&&lr.right<=er.right+1,
    lastColInside:lastCol.right<=er.right+1,
    legendBelowChart:lr.top>=tr.bottom-1};
  tb.style.width='';tb.style.minWidth='';tb.style.maxWidth='';el.style.width='';el.style.maxWidth='';
  document.body.classList.remove('exporting');
  return out;`);
check('export wrapper spans the whole chart', geo.elW >= geo.tblW, JSON.stringify(geo));
check('last day column is inside the capture', geo.lastColInside, JSON.stringify(geo));
check('legend sits inside the capture, under the chart',
      geo.legendInside && geo.legendBelowChart, JSON.stringify(geo));
console.log('cp export geometry:', JSON.stringify(geo));

/* ---------- exports actually download ---------- */
const libs = await evalJS(`return {xlsx:typeof XLSX,h2c:typeof html2canvas,jspdf:typeof window.jspdf,excel:typeof ExcelJS}`);
console.log('cdn libs:', JSON.stringify(libs));
if (libs.h2c !== 'undefined') {
  for (const n of [1, 3, 20]) {                        // matrix PNG at each width
    await evalJS(`UI.view='milestones';UI.outlets=new Set(DB.outlets.slice(0,${n}).map(o=>o.id));render();`);
    await wait(250);
    await evalJS(`await exportImage(false,1);`);
    await wait(1600);
    fs.renameSync(DLDIR + '/moonshot-milestone-matrix-' + new Date().toISOString().slice(0, 10) + '.png',
                  DLDIR + `/matrix-${n}-outlets.png`);
  }
  await evalJS(`UI.outlets=new Set(DB.outlets.map(o=>o.id));render();`);
  for (const [view, pdf] of [['critical', false], ['critical', true], ['calendar', false]]) {
    await evalJS(`UI.view='${view}';render();`); await wait(250);
    await evalJS(`await exportImage(${pdf},1);`);
    await wait(1800);
  }
  if (libs.excel !== 'undefined') {
    await evalJS(`UI.view='critical';render();await exportExcel(UI.outlet);`); await wait(2000);
    // Read the real workbook back — capture the Blob the export hands to the
    // browser, then parse it. The sheet covers the unpadded outlet span, so the
    // legend is derived from that, not from the chart's padded window.
    const xlLeg = await evalJS(`
      // the sheet spans the outlet's own dates, so pick one that actually
      // contains a marked day — not one where the day sits in the chart padding
      const keep=UI.outlet;
      const o=DB.outlets.find(x=>dayTypeLegend(range(...outletSpan(x))).length)||outletOf(UI.outlet);
      const want=dayTypeLegend(range(...outletSpan(o))).map(d=>d.name||'Marked day');
      let blob=null; const real=URL.createObjectURL;
      URL.createObjectURL=b=>{blob=b;return real.call(URL,b);};
      await exportExcel(o.id);
      URL.createObjectURL=real;
      const wb=new ExcelJS.Workbook();
      await wb.xlsx.load(await blob.arrayBuffer());
      const cells=[];
      wb.worksheets[0].eachRow(r=>r.eachCell(c=>cells.push(String(c.value==null?'':c.value))));
      UI.outlet=keep; render();
      return {outlet:o.name,want,head:cells.includes('Day types'),
              missing:want.filter(n=>!cells.includes(n))};`);
    check('Excel sheet carries the day-type legend',
          xlLeg.want.length > 0 && xlLeg.head && xlLeg.missing.length === 0, JSON.stringify(xlLeg));
  }
  const files = fs.readdirSync(DLDIR).filter(f => !f.endsWith('.crdownload') && f !== 'downloads.htm');
  console.log('downloaded:', files.join(', ') || '(none)');
  fs.mkdirSync(new URL('./out/', import.meta.url), {recursive: true});
  files.forEach(f => fs.copyFileSync(DLDIR + '/' + f, new URL('./out/' + f, import.meta.url)));
  check('PNG + PDF + XLSX downloaded',
        files.some(f => f.endsWith('.png')) && files.some(f => f.endsWith('.pdf')),
        files.join(','));
  for (const f of files) check(`${f} is non-empty`, fs.statSync(DLDIR + '/' + f).size > 2000,
                               fs.statSync(DLDIR + '/' + f).size + ' bytes');
  // the PNG must be wide enough to hold the whole table — not clipped to the viewport
  const png = f => { const b = fs.readFileSync(DLDIR + '/' + f); return {w: b.readUInt32BE(16), h: b.readUInt32BE(20)}; };
  for (const n of [1, 3, 20]) {
    const d = png(`matrix-${n}-outlets.png`);
    const want = Math.max(520, 238 + n * 132 + 52);
    check(`matrix PNG at ${n} outlet(s) holds the whole table`, d.w === want, `${d.w}x${d.h}, expected ${want} wide`);
  }
  const cp = png('moonshot-critical-path-' + (await evalJS('return UI.outlet')) + '-' + new Date().toISOString().slice(0, 10) + '.png');
  console.log('critical-path PNG:', cp.w + 'x' + cp.h);
  check('critical-path PNG is wider than the viewport slice', cp.w > 0);
  check('export cleaned up after itself',
        await evalJS(`return !document.body.classList.contains('exporting')
          && !document.querySelector('table.mtx')?.style.width`));
} else {
  bad.push('CDN libs unavailable — export not exercised');
}

/* ---------- 1/2. day-type delete flow + user-created no-type ---------- */
await evalJS(`UI.view='manage';render();`); await wait(250);
check('no hard-coded "No type" row',
      await evalJS(`return !document.querySelector('[data-htadd="__none"]')`));
check('All marked days card lists every holiday',
      await evalJS(`
        const rows=[...document.querySelectorAll('#app table.tbl')].pop().querySelectorAll('tbody tr');
        return rows.length===DB.holidays.length;`),
      await evalJS(`return DB.holidays.length+' holidays'`));

// delete a type, keeping its days as untyped
const kept = await evalJS(`
  const id=DB.dayTypes[0].id, n=DB.holidays.filter(h=>h.typeId===id).length, tot=DB.holidays.length;
  document.querySelector('[data-ddel="'+id+'"]').click();
  await new Promise(r=>setTimeout(r,120));
  const hasAlt=!!document.getElementById('uc_alt');
  document.getElementById('uc_alt').click();
  await new Promise(r=>setTimeout(r,200));
  return {hasAlt,n,tot,left:DB.holidays.length,typed:DB.holidays.filter(h=>h.typeId===id).length,
          types:DB.dayTypes.some(t=>t.id===id),native:false};`);
check('delete-type dialog offers a third choice', kept.hasAlt, JSON.stringify(kept));
check('"keep as untyped" keeps the days, drops the type',
      kept.left === kept.tot && kept.typed === 0 && kept.types === false, JSON.stringify(kept));
check('kept days render with no borrowed label',
      await evalJS(`return DB.holidays.filter(h=>!h.typeId).every(h=>holLabel(h)==='')`));

// delete a type, removing its days
const removed = await evalJS(`
  const id=DB.dayTypes[0].id, n=DB.holidays.filter(h=>h.typeId===id).length, tot=DB.holidays.length;
  document.querySelector('[data-ddel="'+id+'"]').click();
  await new Promise(r=>setTimeout(r,120));
  document.getElementById('uc_ok').click();
  await new Promise(r=>setTimeout(r,200));
  return {n,tot,left:DB.holidays.length,
          worksOn:DB.outlets.reduce((a,o)=>a+(o.worksOn||[]).length,0)};`);
check('"delete the days" removes exactly those days',
      removed.left === removed.tot - removed.n && removed.n > 0, JSON.stringify(removed));

// a marked day can be removed from the All marked days list
check('marked day removable from Setup',
      await evalJS(`
        const before=DB.holidays.length;
        const d=DB.holidays[0].date;
        [...document.querySelectorAll('[data-htdel="'+d+'"]')].pop().click();
        await new Promise(r=>setTimeout(r,150));
        return DB.holidays.length===before-1 && !holidayOn(d);`));

// an empty-named day type is allowed and renders unlabelled
check('day type with no name is allowed',
      await evalJS(`
        document.getElementById('dtAdd').click();
        await new Promise(r=>setTimeout(r,120));
        document.getElementById('up_v').value='';
        document.getElementById('up_ok').click();
        await new Promise(r=>setTimeout(r,200));
        const d=DB.dayTypes[DB.dayTypes.length-1];
        return d && d.name==='' && holLabel({typeId:d.id})==='';`));
check('non-empty prompt still works',
      await evalJS(`
        document.getElementById('dtAdd').click();
        await new Promise(r=>setTimeout(r,120));
        document.getElementById('up_v').value='Audit Day';
        document.getElementById('up_ok').click();
        await new Promise(r=>setTimeout(r,200));
        return DB.dayTypes[DB.dayTypes.length-1].name==='Audit Day';`));
check('new day types get distinct colours', await evalJS(`
  const cols=DB.dayTypes.map(t=>t.color.toLowerCase());
  return new Set(cols).size===cols.length;`),
  await evalJS(`return DB.dayTypes.map(t=>(t.name||'(no label)')+' '+t.color).join(', ')`));
check('cancelling Add day type adds nothing',
      await evalJS(`
        const n=DB.dayTypes.length;
        document.getElementById('dtAdd').click();
        await new Promise(r=>setTimeout(r,120));
        document.getElementById('up_no').click();
        await new Promise(r=>setTimeout(r,150));
        return DB.dayTypes.length===n;`));

/* ---------- no native dialogs ---------- */
check('no native dialog fired during any flow',
      (await evalJS('return window.__native.length')) === 0,
      JSON.stringify(await evalJS('return window.__native')));
const srcNoComments = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
check('no native confirm/prompt/alert call sites in source',
      !/(^|[^.\w])(confirm|prompt|alert)\s*\(/m.test(srcNoComments.replace(/ui(Confirm|Prompt)/g, 'X')),
      (srcNoComments.match(/(^|[^.\w])(confirm|prompt|alert)\s*\(/gm) || []).join(' | '));

/* ---------- console ---------- */
const errs = logs.filter(l => l.type === 'error' || l.type === 'pageerror' ||
                              (l.type.startsWith('log:') && !/favicon|supabase|aopjjox|Failed to load resource/i.test(l.text)));
check('console clean', errs.length === 0, JSON.stringify(errs.slice(0, 6), null, 1));

console.log('\n--- PASS ---'); ok.forEach(s => console.log('  ✓ ' + s));
if (bad.length) { console.log('\n--- FAIL ---'); bad.forEach(s => console.log('  ✗ ' + s)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
if (logs.length) { console.log('\nconsole tail:'); logs.slice(-14).forEach(l => console.log(' ', l.type, l.text.slice(0, 220))); }
done();
process.exit(bad.length ? 1 : 0);
