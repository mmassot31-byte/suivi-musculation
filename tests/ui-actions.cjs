// Existing journeys minimise the new timer as a user would; timer-specific tests keep it open.
exports.journeyClick=(getPage,run)=>async action=>{
 const page=getPage(),minimise=async()=>{const button=page.locator('#rest-dialog[open] [data-action="rest-dismiss"]');if(await button.count()){await button.click();await page.waitForFunction(()=>document.querySelector('#save')?.textContent==='Enregistré sur cet appareil')}};
 await minimise();
 // Exercise/muscle details now open from the overview's section links.
 if(action==='overview-tab:muscle'&&!await page.locator('[data-action="overview-tab:muscle"]').count()&&await page.locator('[data-action="overview-tab:overview"]').count())await page.locator('[data-action="overview-tab:overview"]').first().click();
 if(action.startsWith('progress-tab:')&&!await page.locator(`[data-action="${action}"]`).count()&&await page.locator('[data-action="exercise-back"]').count())await page.locator('[data-action="exercise-back"]').click();
 // The library now opens a complete sheet before muscle settings.
 if(action.startsWith('muscle-library:')&&!await page.locator(`[data-action="${action}"]`).count()){
   const open=page.locator(`[data-action="exercise-open:${action.slice(15)}"]`).first();
   if(await open.count())await open.click();
 }

 if(action==='close-editor'&&!await page.locator('[data-action="close-editor"]').count()&&await page.locator('[data-action="model-editor-close"]').count())action='model-editor-close';
 if(action==='settings'&&!await page.locator('[data-action="settings"]').count())await page.locator('[data-action="account-open"]').click();
 if(action==='models'&&!await page.locator('[data-action="models"]').count()){await page.locator('[data-action="nav:home"]').click();return}
 if(action.startsWith('home-model:')){const index=Number(action.split(':')[1]);if(!await page.locator('.session-card').count())await page.locator('[data-action="nav:home"]').click();action='model:'+await page.locator('.session-card').nth(index).getAttribute('data-home-id')}
 if(/^(model:|delete-model:|clone-model:)/.test(action)&&!await page.locator(`[data-action="${action}"]`).count()){await page.locator('[data-action="nav:home"]').click()}
 if(action==='create-model'&&!await page.locator('[data-action="create-model"]').count())await page.locator('[data-action="nav:home"]').click();
 // Sessions now open directly on home; older journeys need no view selector.
 if((action.startsWith('start:')||action==='models')&&!await page.locator(`button[data-action="${action}"]`).count())await page.locator('nav [data-action="nav:home"]').click();
 if((action.startsWith('muscle-history:')||action.startsWith('edit:')||action.startsWith('delete-set:')||['delete-session','duplicate-session'].includes(action))&&!await page.locator(`[data-action="${action}"]`).count()&&await page.locator('.finish-summary [data-action="summary-detail"]').count())await page.locator('[data-action="summary-detail"]').click();
 if(action.startsWith('calendar-')&&await page.locator('details.history-calendar:not([open])').count())await page.locator('.history-calendar>summary').click();
 if(action.startsWith('detail:')&&!await page.locator(`.history-session [data-action="${action}"]`).count()&&await page.locator('[data-action="history-scope:year"]').count())await page.locator('[data-action="history-scope:year"]').click();
 if(action.startsWith('plan-edit:')&&!await page.locator(`[data-action="${action}"]`).count()){const [,path,delta]=action.split(':');const input=page.locator(`[data-ex="${path}"][data-field="count"]`);if(await input.count()){await input.fill(String(Math.max(0,Number(await input.inputValue())+Number(delta))));await input.dispatchEvent('change');await page.waitForFunction(()=>document.querySelector('#save')?.textContent==='Enregistré sur cet appareil');return}}
 const target=page.locator(`[data-action="${action}"]`).first();if(await target.count())await target.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true});
 await run(action);if(action==='progress-tab:muscles'){const panel=page.locator('.volume-analysis');if(await panel.count()&&!await panel.evaluate(e=>e.open))await panel.locator('summary').first().click();}if(action==='nav:body'){await page.locator('[data-action="account-body"]').click();await page.locator('#body-metric').waitFor();}await minimise();
};
// Initial proposals remain available in the exercise options; the main card shows comparable history only.
exports.previousText=async page=>{const menu=page.locator('.live-exercise-options'),wasOpen=await menu.evaluate(e=>e.open);if(!wasOpen)await menu.locator('summary').click();const text=await page.locator('.previous-session').innerText();if(!wasOpen)await menu.locator('summary').click();return text};
