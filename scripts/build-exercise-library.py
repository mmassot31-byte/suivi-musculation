"""Compile the supplied public candidates and reviewed built-ins; never reads user documents."""
from pathlib import Path
import json,re,unicodedata
ROOT=Path(__file__).resolve().parents[1]
def norm(s):return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip()
source=json.loads((ROOT/'assets/library/candidate-source.json').read_text())['exercises']
legacy=json.loads((ROOT/'assets/library/legacy-builtins.json').read_text())
equipment={'barre':'barbell','barre EZ':'ezbar','trap bar':'trapbar','smith':'smith','machine':'machine','haltère':'dumbbell','haltères':'dumbbell','poulie':'cable','poids du corps':'bodyweight','élastique':'band','banc':'bench','landmine':'landmine','disque':'plate','accessoire':'accessory','cardio':'cardio','kettlebell':'kettlebell','ballon':'ball','medecine ball':'medicineball','box':'box','traîneau':'sled','cordes':'ropes'}
muscles={'pectoraux':'chest','quadriceps':'quads','fessiers':'glutes','ischio-jambiers':'hamstrings','mollets':'calves','grand dorsal':'lats','haut du dos':'upper_back','trapèzes':'traps','biceps':'biceps','triceps':'triceps','avant-bras':'forearms','abdominaux':'abs'}
english={'Squat':'squat','Presse à cuisses':'leg press','Fentes':'lunge split squat step up','Extension de jambes':'leg extension','Soulevé de terre':'deadlift','Flexion des jambes':'leg curl','Extension de hanche':'hip thrust glute bridge hip extension','Abduction et adduction':'hip abduction adduction','Mollets':'calf raise','Développé couché':'bench press chest press','Développé incliné':'incline bench press','Développé décliné':'decline bench press','Développé épaules':'shoulder press overhead military press','Élévations latérales':'lateral raise side delts','Élévations frontales':'front raise','Arrière épaules':'rear delt reverse fly','Écartés pectoraux':'chest fly pec deck','Tirage vertical':'lat pulldown pullover','Tractions':'pull up chin up','Rowing horizontal':'row horizontal row','Trapèzes':'shrug traps','Curl biceps':'biceps curl','Extensions triceps':'triceps extension','Avant-bras':'forearm wrist','Abdominaux':'abs core','Pompes et dips':'push up dips','Cardio':'cardio','Conditionnement':'conditioning'}
# Only explicit equivalent movement+equipment+execution joins. Generic presses/angles stay distinct.
joins={'Développé couché':'elan-ex-developpe-couche-barre-libre','Chest press':'elan-ex-developpe-couche-machine','Incliné chest press':'elan-ex-developpe-incline-machine','Décliné chest press':'elan-ex-developpe-decline-machine','Shoulder press':'elan-ex-shoulder-press-machine','Pendulum squat':'elan-ex-pendulum-squat','Belt squat':'elan-ex-belt-squat','Squat à la barre':'elan-ex-squat-barre-libre','Goblet squat avec haltère':'elan-ex-goblet-squat','Soulevé de terre roumain':'elan-ex-souleve-de-terre-roumain-barre','Élévations latérales aux haltères':'elan-ex-elevations-laterales-halteres','Curl marteau':'elan-ex-curl-marteau-halteres','Facepull':'elan-ex-face-pull-poulie','Butterfly':'elan-ex-pec-deck','Abducteurs à la machine':'elan-ex-abducteurs-machine','Adducteurs':'elan-ex-adducteurs-machine','Gainage':'elan-ex-planche','Rameur':'elan-ex-rameur','Vélo':'elan-ex-velo-stationnaire','Vélo elliptique':'elan-ex-velo-elliptique','Écarté inversé à la machine':'elan-ex-reverse-pec-deck','Élévations latérales':'elan-ex-elevations-laterales-halteres','Hip thrust':'elan-ex-hip-thrust-machine','Glute bridge':'elan-ex-glute-bridge-machine','Low row':'elan-ex-low-row-machine','Back extension machine':'elan-ex-extension-lombaire-machine','Good morning':'elan-ex-good-morning-barre','Soulevé de terre roumain à la barre':'elan-ex-souleve-de-terre-roumain-barre','Soulevé de terre roumain aux haltères':'elan-ex-souleve-de-terre-roumain-halteres','Fentes bulgares':'elan-ex-squat-bulgare-halteres','Rowing unilatéral avec haltère':'elan-ex-rowing-unilateral-haltere','Pompes':'elan-ex-pompes-classiques','Seated dips':'elan-ex-dips-machine','Curl pupitre':'elan-ex-curl-pupitre-machine'}
# Existing public IDs are the canonical references, even if supplied candidate labels differ.
matched={};matched_choices={};used=set()
for e in source:
 choices=[b for b in legacy if (joins.get(b['name'])==e['id'] or norm(b['name'])==norm(e['name_fr'])) and (b.get('equipment')==equipment.get(e['equipment']) or e['family']=='Cardio'and b.get('tracking')=='cardio' or e['id']=='elan-ex-planche')]
 if choices:
  b=choices[0];matched[e['id']]=b;matched_choices[e['id']]=choices;used.update(x['publicId']for x in choices)
rows=[];corrections=[]
for e in source:
 name=e['name_fr'];key=e['id'];eq=equipment[e['equipment']];family=e['family'];mode=e['charge_mode'];measurement='external_load';tracking=None;isometric=False
 if re.search(r'unilat|bulgare|fentes|step.up|concentration|bayesian|kickback|abduction hanche|adduction hanche',name,re.I):mode='unilateral'
 if key in('elan-ex-squat-sumo','elan-ex-goblet-squat'):mode='bilateral'
 if mode!=e['charge_mode']:corrections.append({'candidate':key,'field':'loadMode','from':e['charge_mode'],'to':mode})
 if family=='Cardio' or re.search(r'farmer walk|sled |battle ropes|bear crawl',name,re.I):measurement='duration';tracking='cardio'
 elif re.search(r'planche|plank|hollow body hold|dead hang',name,re.I):measurement='duration';tracking='mobility';isometric=True
 elif re.search(r'assist',name,re.I):measurement='assistance'
 elif re.search(r'lest',name,re.I):measurement='added_load'
 elif eq=='bodyweight' or key in('elan-ex-nordic-curl','elan-ex-leg-curl-glisse','elan-ex-ab-wheel','elan-ex-box-jump'):measurement='bodyweight'
 if measurement=='assistance'and eq=='band':measurement='bodyweight'
 primary=[muscles[m]for m in re.split(r'[|,]',e['primary_muscle'])if m in muscles];secondary=[muscles[m]for m in re.split(r'[|,]',e['secondary_muscles'])if m in muscles]
 if e['primary_muscle']=='deltoïdes':primary=['rear_delts'if family=='Arrière épaules'else 'side_delts'if family=='Élévations latérales'else 'front_delts']
 if 'abduct' in key or 'marche-laterale' in key:primary=['abductors'];secondary=['glutes']
 if 'adduct' in key and 'abduct'not in key:primary=['adductors'];secondary=[]
 if 'copenhagen' in key:primary=['adductors'];secondary=['abs']
 if 'lombaire' in key:primary=['erectors'];secondary=['glutes','hamstrings']
 if family=='Conditionnement' and not primary:primary=['quads','glutes','front_delts']if 'thruster'in key else []
 # Reviewed isolation/compound profiles; the candidate family's default is not authoritative.
 if family=='Extension de jambes':primary=['quads'];secondary=[]
 if family=='Flexion des jambes':primary=['hamstrings'];secondary=[]
 if family in('Développé couché','Développé incliné','Développé décliné'):primary=['chest'];secondary=['front_delts','triceps']
 if family=='Écartés pectoraux':primary=['chest'];secondary=['front_delts']
 if family=='Développé épaules':primary=['front_delts'];secondary=['side_delts','triceps']
 if family in('Élévations latérales','Élévations frontales'):secondary=[]
 if family=='Arrière épaules':primary=['rear_delts'];secondary=['upper_back']
 if family=='Rowing horizontal':primary=['upper_back'];secondary=['lats','biceps','rear_delts']
 if family=='Tirage vertical'and 'pullover'in key:primary=['lats'];secondary=['chest']
 if family=='Soulevé de terre':secondary=list(dict.fromkeys(secondary+['erectors']))
 if 'rack-pull'in key:primary=['erectors','traps'];secondary=['glutes','hamstrings']
 if family=='Trapèzes':primary=['traps'];secondary=[]
 if 'face-pull'in key:primary=['rear_delts','upper_back'];secondary=['traps']
 if 'tibialis'in key:primary=[];secondary=[] # No tibialis group exists; do not mislabel it as calf work.
 if family=='Curl biceps'and re.search(r'marteau|inverse',key):primary=['brachialis'];secondary=['biceps','forearms']
 if key=='elan-ex-extension-triceps-au-dessus-tete-haltere':mode='bilateral'
 secondary=[m for m in dict.fromkeys(secondary)if m not in primary]
 base=matched.get(key);canonical=base['publicId']if base else key;joined_ids={b['publicId']for b in matched_choices.get(key,[])}
 aliases=list(dict.fromkeys([name,english.get(family,''),*([base['name'],base.get('label',''),*base.get('aliases',[])]if base else [])]))
 row={'id':canonical,'candidateId':key,'legacyCanonicalIds':sorted(joined_ids),'name':name,'familyId':e['family_id'],'familyLabel':family,'equipment':eq,'muscles':{'primary':primary,'secondary':secondary},'loadMode':mode,'measurement':measurement,'libraryScope':'common','aliases':aliases,'legacyNames':list(dict.fromkeys([b['name']for b in legacy if b['publicId']in joined_ids])), 'legacyIds':list(dict.fromkeys([b['id']for b in legacy if b['publicId']in joined_ids]))if base else [],'isometric':isometric}
 if tracking:row.update(tracking=tracking,counter='duration')
 if base and base.get('alternativeKey'):row['alternativeKey']=base['alternativeKey']
 if key=='elan-ex-planche':row['alternativeKey']='plank'
 rows.append(row)
# Keep non-equivalent older built-ins as their own fixed variants. Never guess an angle/grip.
for b in legacy:
 if b['publicId']in used or any(r['id']==b['publicId']for r in rows):continue
 mode='unilateral'if b.get('laterality')=='unilateral' or re.search(r'unilat',b['name'],re.I) or b.get('equipment')=='dumbbell'and not re.search(r'goblet',b['name'],re.I)else 'bilateral';tracking=b.get('tracking');measurement='duration'if tracking else 'bodyweight'if b.get('equipment')=='bodyweight'else 'external_load'
 rows.append({'id':b['publicId'],'name':b['name'],'familyId':b.get('familyId',b.get('family','legacy')),'familyLabel':'Autres exercices','equipment':b.get('equipment','unknown'),'muscles':b.get('muscles',{'primary':[],'secondary':[]}),'loadMode':mode,'measurement':measurement,'libraryScope':'common','aliases':list(dict.fromkeys([b['name'],b.get('label',''),*b.get('aliases',[])])),'legacyNames':list(dict.fromkeys([x['name']for x in legacy if x['publicId']==b['publicId']])), 'legacyIds':list(dict.fromkeys([x['id']for x in legacy if x['publicId']==b['publicId']])) ,**({'tracking':tracking,'counter':'duration'}if tracking else {}),**({'alternativeKey':b['alternativeKey']}if b.get('alternativeKey')else {})})
assert len({r['id']for r in rows})==len(rows)
(ROOT/'assets/library/catalogue.seed.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
(ROOT/'exercise-catalogue.js').write_text('// Generated by scripts/build-exercise-library.py from the supplied candidates and reviewed built-ins.\nexport const commonExercises='+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n')
report={'supplied':len(source),'common':len(rows),'reusedCanonicalCandidates':len(matched),'newCandidates':len(source)-len(matched),'presetCorrections':corrections,'safeBuiltInJoins':[{'candidate':k,'canonical':v['publicId'],'existingName':v['name']}for k,v in matched.items()]}
(ROOT/'assets/library/import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items()if not isinstance(v,list)},ensure_ascii=False))

path=ROOT/'supabase/migrations/202611070017_exercise_library.sql'
if path.exists():
 text=path.read_text();a=text.index('-- CATALOGUE-SEED-BEGIN');b=text.index('-- CATALOGUE-SEED-END',a);seed="insert into public.common_exercises(id,definition,signature)select d->>'id',d,exercise_definition_signature(d)from jsonb_array_elements($catalogue$"+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+"$catalogue$::jsonb)d;\n";path.write_text(text[:a]+'-- CATALOGUE-SEED-BEGIN\n'+seed+text[b:])
