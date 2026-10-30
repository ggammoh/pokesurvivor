/* Optional browser integration: npm install --prefix tools/cache/browser --no-save --package-lock=false playwright
 * node tools/test_mega_browser.cjs (installed Edge on Windows; PLAYWRIGHT_CHANNEL=chrome supported).
 * Uses an isolated browser profile, local guest save and explicit debug mode. No cloud traffic.
 */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('./cache/browser/node_modules/playwright')); }
const root = path.resolve(__dirname, '..'), out = path.join(__dirname, 'cache', 'ultra-rift');
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
  const ctx=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'}),url=`http://127.0.0.1:${server.address().port}`;
  await ctx.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/dev.html?debug=1');await page.waitForFunction(()=>window.G?.Game&&document.getElementById('boot').classList.contains('hidden'));await page.keyboard.press('Enter');
  await page.evaluate(()=>{G.DB.playAsGuest();G.DB.grant(448,'test');G.DB.save.partner=448;G.Game.startRun();G.Rift.debugOpenUltra();const p=G.Game.player,r=G.Rift.rift;p.x=r.x-100;p.y=r.y+35;G.Camera.x=p.x;G.Camera.y=p.y;G.Game.togglePause();G.UI.hideAll();r.t=1;});
  await page.evaluate(()=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve();im.onerror=reject;im.src='assets/effects/ultra-rift.png';}));
  await page.screenshot({path:path.join(out,'ultra-rift.png')});
  assert.equal(await page.evaluate(()=>G.T('ULTRAGRIETA')),'ULTRA RIFT');
  assert.equal(await page.evaluate(()=>G.T('¡SE HA ABIERTO UNA ULTRAGRIETA!')),'AN ULTRA RIFT HAS OPENED!');
  await page.evaluate(()=>{G.Game.togglePause();const p=G.Game.player,r=G.Rift.rift;p.x=r.x;p.y=r.y-10;G.Rift.update(.1,p,G.Game.st.time);});
  assert.equal(await page.evaluate(()=>G.Rift.arena.kind),'mega');
  assert.equal(await page.evaluate(()=>G.EnemyMgr.get(G.Rift.arena.bossId).maxHp),9000000);
  await page.evaluate(()=>{G.Rift.debugWin();G.Rift.update(.1,G.Game.player,G.Game.st.time);});
  assert.equal(await page.evaluate(()=>G.Game.player.pendingMegaForm),'lucario-mega');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,animatedAsset:true,ultraLabel:true,bossHp:9000000,rewardPreserved:true,errors}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
