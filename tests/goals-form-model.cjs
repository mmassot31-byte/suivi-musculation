const assert=require('node:assert/strict');
(async()=>{const {goalResults,createGoalsUI}=await import('../goals.js');
for(const type of ['regularity','records','volume','tonnage'])for(const period of ['week','month']){
 const g={id:'new',version:3,type,start:'2026-01-01',period,target:10,muscle:'chest',recurring:true,until:'2026-03-03'};
 const state={sportGoals:[g],sessions:[]};const before=JSON.stringify(state),r=goalResults(state,'2026-11-01');assert.equal(r.at(-1).end,g.until);assert.equal(r[0].start,g.start);assert.equal(JSON.stringify(state),before);
 g.until=null;assert.equal(goalResults(state,'2026-11-01').at(-1).status,'active');g.recurring=false;assert.equal(goalResults(state,'2026-11-01').length,1);
}
const state={accountOwnerId:'owner',sessions:[],templates:[]};let ui;ui=createGoalsUI({getState:()=>state,render:()=>ui.html(),save:async()=>{},icon:()=>''});ui.html();for(const type of ['regularity','performance','records','volume','tonnage']){await ui.action('goal-new:'+type);assert.match(ui.html(),/1\/3/);await ui.action('goal-next');assert.match(ui.html(),/2\/3/);assert.doesNotMatch(ui.html(),/Semaines à la cible|Référence manuelle|Poursuivre après/);}
console.log('PASS form model: all categories render; week/month recurrence, bounded final periods, no end, one-off and immutable data');})().catch(e=>{console.error(e);process.exit(1)});
