const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('https://**.supabase.co/**',r=>r.fulfill({contentType:'application/json',body:'null'}));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173');
  const welcome=page.locator('.empty-home');
  await welcome.locator('[data-action="account-register"]').waitFor();
  assert.equal(await welcome.locator('button.primary').getAttribute('data-action'),'account-register');
  assert.equal(await welcome.locator('[data-action="create-model"]').isVisible(),false);
  for(const width of [320,390,430]) {
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await welcome.locator('[data-action="account-register"]').click();
  await page.locator('#account-form[data-mode="register"] #account-username').waitFor();
  await page.locator('[data-action="nav:home"]').click();
  await welcome.locator('[data-action="account-login"]').click();
  await page.locator('#account-form[data-mode="login"]').waitFor();
  await page.locator('[data-action="nav:home"]').click();
  await welcome.locator('summary').click();
  await welcome.locator('[data-action="create-model"]').click();
  await page.locator('#creation-name').waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS account welcome: signup first, login, optional guest creation, mobile widths.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
