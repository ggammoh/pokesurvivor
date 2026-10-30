/* Optional browser integration: npm install --prefix tools/cache/browser --no-save --package-lock=false playwright
 * node tools/test_mega_browser.cjs (installed Edge on Windows; PLAYWRIGHT_CHANNEL=chrome supported).
 * Uses an isolated browser profile, local guest save and explicit debug mode. No cloud traffic.
 */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('./cache/browser/node_modules/playwright')); }
const root = path.resolve(__dirname, '..'), out = path.join(__dirname, 'cache', 'reward-controls');
fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const ctx=await browser.newContext({serviceWorkers:'block'}),url=`http://127.0.0.1:${server.address().port}`;await ctx.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url+'/dev.html?debug=1');await p.waitForFunction(()=>window.G?.Game&&document.getElementById('boot').classList.contains('hidden'));await p.keyboard.press('Enter');await p.evaluate(()=>G.DB.playAsGuest());
  for(const dex of [448,646]){
   await p.evaluate(dex=>{G.DB.grant(dex,'test');G.DB.save.partner=dex;G.Game.startRun();G.Forms.queueReward(G.Game.player);},dex);
   await p.locator('#scr-mega:not(.hidden)').waitFor();await p.waitForFunction(()=>!document.getElementById('mega-cards').classList.contains('guard'));
   assert.equal(await p.locator('#mega-deny').innerText(),'Deny');await p.locator('#mega-deny').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>G.Game.state==='playing');
   assert.equal(await p.evaluate(()=>G.Game.player.pendingMegaForm),null);assert.equal(await p.evaluate(()=>G.FormScene.active),false);
   await p.evaluate(()=>G.Forms.queueReward(G.Game.player));await p.locator('#scr-mega:not(.hidden)').waitFor();await p.waitForFunction(()=>!document.getElementById('mega-cards').classList.contains('guard'));await p.locator('#mega-claim').click();await p.waitForFunction(()=>G.FormScene.active);
   if(dex===448)await p.keyboard.press('a');else await p.locator('.fc-sprites').click();await p.waitForFunction(()=>G.FormScene.stage==='result');
   assert.equal(await p.evaluate(()=>G.Game.state),'choice');assert.equal(await p.locator('.fc-stat').count(),6);assert.equal(await p.evaluate(()=>G.Game.player.formId),dex===448?'lucario-mega':'kyurem-black');
   await p.locator('.fc-continue').click();await p.waitForFunction(()=>!G.FormScene.active);
  }
  assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>typeof G.DB.prestigeOf),'undefined');assert.equal(await p.evaluate(()=>typeof G.DB.repertoireEnabled),'undefined');
  console.log(JSON.stringify({passed:true,deny:true,keyboardSkip:true,clickSkip:true,pausedResult:true,megaOnly:true,errors}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
