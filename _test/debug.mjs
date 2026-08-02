import {evalJS, goto, URLBASE, done} from './harness.mjs';
const wait = ms => new Promise(r => setTimeout(r, ms));
await goto(URLBASE + 'index.html');
await evalJS('localStorage.clear();');
await goto(URLBASE + 'index.html');
await wait(2500);
await evalJS(`UI.view='milestones';UI.outlets=new Set(DB.outlets.map(o=>o.id));render();`);
await wait(300);
// how wide does each outlet name actually want to be in the header font?
console.log(await evalJS(`
  const th=document.querySelector('table.mtx thead th:not(.lead)');
  const cs=getComputedStyle(th), sp=th.querySelector('.oname'), scs=getComputedStyle(sp);
  const c=document.createElement('canvas').getContext('2d');
  c.font=scs.fontWeight+' '+scs.fontSize+' '+scs.fontFamily;
  const rows=DB.outlets.map(o=>{
    const words=o.name.split(/\\s+/);
    return {name:o.name, full:Math.ceil(c.measureText(o.name).width),
            word:Math.ceil(Math.max(...words.map(w=>c.measureText(w).width)))};
  }).sort((a,b)=>b.word-a.word);
  return JSON.stringify({
    thPadding:cs.paddingLeft+'/'+cs.paddingRight, thW:Math.round(th.getBoundingClientRect().width),
    font:c.font, rows:rows.slice(0,6)},null,1);`));
done();
process.exit(0);
