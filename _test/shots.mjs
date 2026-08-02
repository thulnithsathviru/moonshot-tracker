// Visual check: grab the pages whose chrome/layout changed.
import {evalJS, goto, URLBASE, done} from './harness.mjs';
import fs from 'node:fs';
const wait = ms => new Promise(r => setTimeout(r, ms));
const OUT = new URL('./out/', import.meta.url);
fs.mkdirSync(OUT, {recursive: true});

await goto(URLBASE + 'index.html');
await evalJS('localStorage.clear();');
await goto(URLBASE + 'index.html');
await wait(2500);

// full-page screenshot via CDP is not exposed here, so use html2canvas on <body>
async function shot(name, sel = 'body', h = 1000) {
  const data = await evalJS(`
    const el=document.querySelector('${sel}');
    const c=await html2canvas(el,{scale:1,backgroundColor:'#FBFBFD',logging:false,
      windowWidth:1600,windowHeight:${h},height:Math.min(${h},el.scrollHeight)});
    return c.toDataURL('image/png');`);
  fs.writeFileSync(new URL('./' + name + '.png', OUT), Buffer.from(data.split(',')[1], 'base64'));
}

await evalJS(`UI.view='calendar';UI.calMode='month';render();`); await wait(400);
await shot('page-calendar-toolbar', '#app', 420);

await evalJS(`UI.view='manage';render();`); await wait(400);
await shot('page-setup', '#app', 3200);

// the delete-day-type dialog
await evalJS(`document.querySelector('[data-ddel]').click();`); await wait(300);
await shot('dialog-delete-daytype', '#modal .mod', 500);
await evalJS(`document.getElementById('uc_no').click();`);

done();
process.exit(0);
