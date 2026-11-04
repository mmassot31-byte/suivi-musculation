// Existing journeys minimise the new timer as a user would; timer-specific tests keep it open.
exports.journeyClick=(getPage,run)=>async action=>{
 const page=getPage(),minimise=async()=>{const button=page.locator('#rest-dialog[open] [data-action="rest-dismiss"]');if(await button.count()){await button.click();await page.waitForFunction(()=>document.querySelector('#save')?.textContent==='Enregistré sur cet appareil')}};
 await minimise();
 if(action==='settings'&&!await page.locator('[data-action="settings"]').count())await page.locator('[data-action="account-open"]').click();
 if(action.startsWith('home-model:')){const index=Number(action.split(':')[1]);if(!await page.locator('.session-card').count())await page.locator('[data-action="nav:home"]').click();const id=await page.locator('.session-card').nth(index).getAttribute('data-home-id');await page.locator('[data-action="models"]').click();action='model:'+id}
 if((action.startsWith('delete-model:')||action.startsWith('clone-model:')||action==='create-model')&&!await page.locator(`[data-action="${action}"]`).count()){if(!await page.locator('[data-action="models"]').count())await page.locator('[data-action="nav:home"]').click();await page.locator('[data-action="models"]').click()}
 await run(action);await minimise();
};
