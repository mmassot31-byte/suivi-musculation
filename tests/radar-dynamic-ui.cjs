// Isolated rendering with actual muscle selection; no account writes or cloud calls.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({serviceWorkers:'block'});
  await page.route('**/cloud-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const cloudConfig={url:'',publishableKey:''};"}));
  await page.goto('http://localhost:4173');
  await page.evaluate(()=>{document.body.innerHTML='<main class="saved-shell" id="fixture"></main>';});
  for(const width of [320,375,390,393,414,430]){
   await page.setViewportSize({width,height:844});
   for(let count=0;count<=17;count++){
    const expected=await page.evaluate(async count=>{
     const {radarHtml}=await import('./radar-ui.js'),{radarModel,radarGroups}=await import('./radar.js');
     const ids=radarGroups.slice(0,count).map(([id])=>id==='elbow_flexors'?'biceps':id);
     const session={id:'test',exercises:ids.map((id,i)=>({id:'fixture-'+i,name:'Fixture '+i,muscles:{primary:[id],secondary:[]},sets:Array.from({length:i%5+1},(_,j)=>({id:i+'-'+j,w:20,r:10,type:'work'}))}))};
     const model=radarModel(session);document.querySelector('#fixture').innerHTML=radarHtml(session,null,{compact:true,volumeList:true});
     return {axes:model.axes.map(a=>a.id),values:model.axes.map(a=>a.current.total),scale:model.scale};
    },count);
    assert.equal(expected.axes.length,count);
    assert.equal(await page.locator('.radar-card-art').count(),1);
    assert(await page.locator('.radar-top>span').isVisible(),'Session count visible even at 320px');
    if(count){
     const band=page.locator('.radar-scale-band');assert.equal(await band.count(),1);
     assert.equal(await band.locator('svg').count(),2,'Info icon and decorative curve');
     assert.match(await band.innerText(),new RegExp('Maximum : '+expected.scale+' séries'));
     assert(await band.evaluate(e=>e.getBoundingClientRect().top>=e.previousElementSibling.getBoundingClientRect().bottom),'Scale below chart and bars');
    }
    assert(await page.locator('.radar-top').evaluate(e=>{const a=e.querySelector('h2').getBoundingClientRect(),b=e.querySelector('span').getBoundingClientRect();return a.right<=b.left+1}),'Title and set count do not overlap');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(count<3){assert.equal(await page.locator('.radar-bar-row').count(),count);continue;}
    const svg=page.locator('.muscle-radar');
    assert.deepEqual((await svg.getAttribute('data-axes')).split(','),expected.axes);
    assert.equal(await svg.locator('.radar-axis-value').count(),0);
    assert.equal(await svg.locator('.radar-anatomy').count(),count);
    assert.deepEqual(await svg.locator('.radar-anatomy').evaluateAll(es=>es.map(e=>e.dataset.anatomy)),expected.axes);
    assert(await svg.locator('.radar-axis-block').evaluateAll(es=>es.every(e=>{const icon=e.querySelector('.radar-anatomy'),text=e.querySelector('text'),a=icon.getBoundingClientRect(),b=text.getBoundingClientRect();return a.bottom<=b.top+1&&Math.max(a.width,a.height)>=12&&!!icon.querySelector('path')})),`Detailed SVG anatomy above each label: ${count}/${width}`);
    assert.equal(await svg.locator('.radar-surface-halo').count(),1);
    const geometry=await svg.evaluate(e=>({w:e.viewBox.baseVal.width,h:e.viewBox.baseVal.height,boxes:[...e.querySelectorAll('[data-radar-axis]')].map(t=>{const b=t.getBBox();return{x:b.x,y:b.y,w:b.width,h:b.height}}),points:e.querySelector('.radar-direct').getAttribute('points').split(' ').map(p=>p.split(',').map(Number)),spokes:[...e.querySelectorAll('.radar-spoke')].map(s=>['x1','y1','x2','y2'].map(k=>+s.getAttribute(k)))}));
    for(const b of geometry.boxes)assert(b.x>=0&&b.y>=0&&b.x+b.w<=geometry.w&&b.y+b.h<=geometry.h,`${count}/${width}: clipped`);
    for(let i=0;i<count;i++){
     for(let j=i+1;j<count;j++){const a=geometry.boxes[i],b=geometry.boxes[j];assert(!(Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)),`${count}/${width}: overlap`);}
     const [cx,cy,x,y]=geometry.spokes[i],f=expected.values[i]/expected.scale;
     assert(Math.abs(geometry.points[i][0]-(cx+(x-cx)*f))<.01);
     assert(Math.abs(geometry.points[i][1]-(cy+(y-cy)*f))<.01);
     const next=geometry.spokes[(i+1)%count];
     const angle=Math.atan2((x-cx)*(next[3]-cy)-(y-cy)*(next[2]-cx),(x-cx)*(next[2]-cx)+(y-cy)*(next[3]-cy));
     assert(Math.abs(angle-2*Math.PI/count)<1e-8,'regular angles');
    }
    const values=await page.locator('.saved-muscle-volumes-list strong').allTextContents();
    assert.deepEqual(values,expected.values.map(n=>n.toLocaleString('fr-FR')));
    if([3,9,17].includes(count)&&[320,390].includes(width))await page.locator('.saved-muscles').screenshot({path:`/tmp/elan-dynamic-${count}-${width}.png`});
   }
  }
  // Same muscle values and total set count as the supplied artistic reference,
  // derived from real fixture sets rather than overriding the renderer's model.
  const reference=await page.evaluate(async()=>{
   const {radarHtml}=await import('./radar-ui.js'),{radarModel}=await import('./radar.js');
   const profiles=Array.from({length:25},()=>({primary:[],secondary:[]}));let slot=0;
   for(const [id,count]of [['chest',3],['lats',6],['mid_lower_traps',3],['front_delts',1],['side_delts',6],['rear_delts',3],['biceps',6],['triceps',4],['forearms',2]])for(let i=0;i<count;i++)profiles[slot++%25].primary.push(id);
   profiles[10].secondary=['chest','biceps','forearms'];
   const session={id:'reference',exercises:profiles.map((muscles,i)=>({id:'ref-'+i,name:'Reference '+i,muscles,sets:[{id:'set-'+i,w:20,r:10,type:'work'}]}))};
   const model=radarModel(session);document.querySelector('#fixture').innerHTML=radarHtml(session,null,{compact:true,volumeList:true});
   return {sets:model.first.sets,values:model.axes.map(a=>a.current.total)};
  });
  assert.equal(reference.sets,25);assert.deepEqual(reference.values,[3.5,6,3,1,6,3,6.5,4,2.5]);
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   await page.locator('.saved-muscles').screenshot({path:`/tmp/elan-radar-premium-reference-${width}.png`});
  }
  // Stress the presentation with long names and a zero without changing selection rules.
  await page.evaluate(async()=>{
   const {radarHtml}=await import('./radar-ui.js'),{radarModel}=await import('./radar.js');
   const model=radarModel({exercises:[{id:'test',muscles:{primary:['chest','lats','triceps','front_delts','side_delts'],secondary:[]},sets:[{w:10,r:10}]}]});
   model.axes[0].label='Trapèzes moyens et inférieurs particulièrement longs';model.axes[1].label='IntituléExtrêmementLongSansEspace';model.axes[2].current.total=0;
   document.querySelector('#fixture').innerHTML=radarHtml({id:'long'},null,{compact:true,volumeList:true,model});
  });
  for(const width of [320,390,430]){
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(()=>{const svg=document.querySelector('.muscle-radar'),v=svg.viewBox.baseVal,bs=[...svg.querySelectorAll('[data-radar-axis]')].map(t=>t.getBBox());return document.documentElement.scrollWidth<=innerWidth&&bs.every(b=>b.x>=0&&b.y>=0&&b.x+b.width<=v.width&&b.y+b.height<=v.height)&&bs.every((a,i)=>bs.slice(i+1).every(b=>Math.min(a.x+a.width,b.x+b.width)<=Math.max(a.x,b.x)||Math.min(a.y+a.height,b.y+b.height)<=Math.max(a.y,b.y)))}));
  }
  assert((await page.locator('.saved-muscle-volumes-list strong').allTextContents()).includes('0'));
  console.log('PASS dynamic radar: 0–17 groups × six iPhone widths, anatomical SVGs above every label, header/scale order and decoration, regular angles, contained nonoverlapping multiline labels, exact surface/bar values, long/unbroken names and zero.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
