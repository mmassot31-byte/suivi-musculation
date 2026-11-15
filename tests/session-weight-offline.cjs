// Exercise the actual service worker on an isolated origin, with no cloud keys.
const {chromium}=require('./browser-fixtures.cjs'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/cloud-config.js'){res.setHeader('Content-Type','text/javascript');res.end("export const cloudConfig={url:'',publishableKey:''}");return;}
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.session-card').first().waitFor();await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cache=fs.readFileSync(path.join(root,'sw.js'),'utf8').match(/const CACHE='([^']+)'/)[1];
  const files=await page.evaluate(async name=>(await(await caches.open(name)).keys()).map(r=>new URL(r.url).pathname),cache);
  for(const filename of['session-weight.js','session-weight.css','session-weight-catalogue.js','session-weight-catalogue.json'])assert(files.includes('/'+filename),filename+' precached');
  await context.setOffline(true);await page.reload();await page.locator('.session-card').first().waitFor();
  const ready=()=>page.waitForFunction(()=>document.querySelector('#save')?.textContent==='Enregistré sur cet appareil'),click=async action=>{const el=page.locator(`[data-action="${action}"]`).first();await el.evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await el.click();await ready();};
  await click('start-free');await click('live-add-ex');await page.locator('#picker-custom-name').fill('Hors connexion');await click('picker-custom-add');
  await page.locator('#weight').fill('40');await page.locator('#reps').fill('10');await click('validate');
  if(await page.locator('#rest-dialog[open]').count())await click('rest-dismiss');
  await click('finish');await page.locator('.session-weight-card').waitFor();
  assert.match(await page.locator('.session-weight-total').innerText(),/400\s*kg/);
  const before=await page.locator('.session-weight-card').getAttribute('data-weight-reference');await click('session-weight-next');assert.notEqual(await page.locator('.session-weight-card').getAttribute('data-weight-reference'),before);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log('PASS actual offline session weight: worker precaches catalogue/module/styles, offline reload, custom free workout, validation/completion/comparison/reroll at 320px. No production calls.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
