import {previousExercise,workSets} from './performance.js';
import {defaultProfile} from './muscles.js';
export const equipmentTypes=[['machine','Machines personnelles'],['cable','Poulies'],['dumbbell','Haltères'],['barbell','Barre'],['bodyweight','Poids du corps']];
export const movementTypes=[['knee','Dominante genou'],['hinge','Charnière de hanche'],['hip','Extension de hanche'],['knee_flexion','Flexion du genou'],['push_horizontal','Poussée horizontale'],['push_vertical','Poussée verticale'],['pull_horizontal','Tirage horizontal'],['pull_vertical','Tirage vertical'],['lateral','Abduction d’épaule'],['rear','Arrière d’épaule'],['elbow_flexion','Flexion du coude'],['elbow_extension','Extension du coude'],['calves','Mollets'],['adduction','Adduction'],['unknown','À préciser']];
const definitions=[
 [['Pendulum squat'],'squat','knee','machine','high','genou'],
 [['Machine à mollets'],'calf_raise','calves','machine','low','mollets'],
 [['Hip thrust','Glute bridge'],'hip_thrust','hip','machine','moderate','hanche'],
 [['Back extension machine'],'back_extension','unknown','machine','unknown','à préciser'],
 [['Adducteurs'],'adductor','adduction','machine','low','adduction'],
 [['Shoulder press'],'overhead_press','push_vertical','machine','high','vertical'],
 [['Incliné chest press'],'chest_press','push_horizontal','machine','high','incliné'],
 [['Décliné chest press'],'chest_press','push_horizontal','machine','high','décliné'],
 [['Chest press'],'chest_press','push_horizontal','machine','high','horizontal'],
 [['Développé couché'],'chest_press','push_horizontal','barbell','high','horizontal'],
 [['Low row'],'row','pull_horizontal','machine','high','horizontal'],
 [['Tirage vertical','lat-upper','lat-pull'],'pulldown','pull_vertical','machine','high','vertical'],
 [['Élévations latérales aux haltères','laterales-push'],'lateral_raise','lateral','dumbbell','low','latéral'],
 [['Curl biceps','Curl marteau'],'curl','elbow_flexion','dumbbell','low','coude'],
 [['Curl pupitre'],'curl','elbow_flexion','machine','low','pupitre'],
 [['Triceps haltère'],'triceps_extension','elbow_extension','dumbbell','low','variante à préciser'],
 [['Barre au front triceps'],'triceps_extension','elbow_extension','barbell','low','allongé'],
 [['Triceps à la corde unilatéral'],'triceps_extension','elbow_extension','cable','low','poulie'],
 [['Tirage menton à la barre'],'upright_row','lateral','barbell','moderate','multiarticulaire'],
 [['Rear delt barre'],'rear_raise','rear','barbell','unknown','à préciser'],
 [['Arrière d’épaule aux haltères'],'rear_raise','rear','dumbbell','low','arrière'],
 [['Butterfly'],'fly','push_horizontal','machine','low','adduction horizontale'],
 [['Facepull'],'face_pull','rear','cable','low','rotation/tirage'],
 [['Seated dips'],'dip','push_vertical','machine','high','dips']
];
const known=new Map(definitions.flatMap(([ids,family,movement,equipment,demand,variant])=>ids.map(id=>[id,{family,movement,equipment,demand,variant}])));
export const genericAlternatives=[
 {"key": "barbell-squat", "name": "Squat à la barre", "family": "squat", "movement": "knee", "equipment": "barbell", "demand": "high", "primary": ["quads"], "secondary": ["glutes", "adductors"], "defaultEnabled": false},
 {"key": "belt-squat", "name": "Belt squat", "family": "squat", "movement": "knee", "equipment": "machine", "demand": "high", "primary": ["quads"], "secondary": ["glutes"], "defaultEnabled": false},
 {"key": "bulgarian", "name": "Fentes bulgares", "family": "split_squat", "movement": "knee", "equipment": "dumbbell", "demand": "high", "primary": ["quads", "glutes"], "secondary": ["adductors"], "defaultEnabled": false, "laterality": "unilateral"},
 {"key": "leg-press", "name": "Presse à cuisses", "family": "leg_press", "movement": "knee", "equipment": "machine", "demand": "high", "primary": ["quads"], "secondary": ["glutes", "adductors"], "defaultEnabled": false},
 {"key": "good-morning", "name": "Good morning", "family": "hinge", "movement": "hinge", "equipment": "barbell", "demand": "high", "primary": ["hamstrings"], "secondary": ["glutes", "erectors"], "defaultEnabled": false},
 {"key": "abductor", "name": "Abducteurs à la machine", "family": "abductor", "movement": "hip", "equipment": "machine", "demand": "low", "primary": ["abductors"], "secondary": [], "defaultEnabled": false},
 {"key": "reverse-fly", "name": "Écarté inversé à la machine", "family": "rear_raise", "movement": "rear", "equipment": "machine", "demand": "low", "primary": ["rear_delts"], "secondary": ["upper_back"], "defaultEnabled": false},
 {"key": "shoulder-internal", "name": "Rotation interne de l’épaule", "family": "shoulder_rotation", "movement": "rear", "equipment": "cable", "demand": "low", "primary": ["front_delts"], "secondary": [], "defaultEnabled": false, "laterality": "unilateral"},
 {"key": "shoulder-external", "name": "Rotation externe de l’épaule", "family": "shoulder_rotation", "movement": "rear", "equipment": "cable", "demand": "low", "primary": ["rear_delts"], "secondary": [], "defaultEnabled": false, "laterality": "unilateral"},
 {"key": "step-up", "name": "Montées sur banc", "family": "step_up", "movement": "knee", "equipment": "dumbbell", "demand": "moderate", "primary": ["quads", "glutes"], "secondary": [], "defaultEnabled": false, "laterality": "unilateral"},
 {"key": "barbell-rdl", "name": "Soulevé de terre roumain à la barre", "family": "rdl", "movement": "hinge", "equipment": "barbell", "demand": "high", "primary": ["hamstrings"], "secondary": ["glutes", "erectors"], "defaultEnabled": false},
 {key:'plank',name:'Gainage',family:'core_isometric',movement:'unknown',equipment:'bodyweight',demand:'low',primary:['abs'],secondary:[],defaultEnabled:false,tracking:'mobility',counter:'duration'},
 {"key": "shoulder-pails", "name": "PAILs / RAILs · épaule", "family": "mobility", "movement": "unknown", "equipment": "bodyweight", "demand": "low", "primary": [], "secondary": [], "defaultEnabled": false, "tracking": "mobility", "counter": "duration"},
 {"key": "treadmill", "name": "Tapis de course", "family": "cardio", "movement": "unknown", "equipment": "machine", "demand": "low", "primary": [], "secondary": [], "defaultEnabled": false, "tracking": "cardio", "counter": "duration"},
 {"key": "bike", "name": "Vélo", "family": "cardio", "movement": "unknown", "equipment": "machine", "demand": "low", "primary": [], "secondary": [], "defaultEnabled": false, "tracking": "cardio", "counter": "duration"},
 {"key": "elliptical", "name": "Vélo elliptique", "family": "cardio", "movement": "unknown", "equipment": "machine", "demand": "low", "primary": [], "secondary": [], "defaultEnabled": false, "tracking": "cardio", "counter": "duration"},
 {"key": "rowing", "name": "Rameur", "family": "cardio", "movement": "unknown", "equipment": "machine", "demand": "low", "primary": [], "secondary": [], "defaultEnabled": false, "tracking": "cardio", "counter": "duration"},
 {key:'goblet-squat',name:'Goblet squat avec haltère',family:'goblet_squat',movement:'knee',equipment:'dumbbell',demand:'high',primary:['quads'],secondary:['glutes','adductors'],defaultEnabled:true},
 {key:'standing-calf',name:'Mollets debout au poids du corps',family:'calf_raise',movement:'calves',equipment:'bodyweight',demand:'low',primary:['calves'],secondary:[],defaultEnabled:true},
 {key:'db-rdl',name:'Soulevé de terre roumain aux haltères',family:'rdl',movement:'hinge',equipment:'dumbbell',demand:'high',primary:['hamstrings'],secondary:['glutes','erectors'],defaultEnabled:true},
 {key:'leg-curl',name:'Leg curl · machine à identifier',family:'leg_curl',movement:'knee_flexion',equipment:'machine',demand:'low',primary:['hamstrings'],secondary:[],defaultEnabled:false},
 {key:'leg-extension',name:'Leg extension · machine à identifier',family:'leg_extension',movement:'knee',equipment:'machine',demand:'low',primary:['quads'],secondary:[],defaultEnabled:false},
 {key:'db-row',name:'Rowing unilatéral avec haltère',family:'row',movement:'pull_horizontal',equipment:'dumbbell',demand:'moderate',primary:['upper_back'],secondary:['lats','biceps','rear_delts'],defaultEnabled:true},
 {key:'pushup',name:'Pompes',family:'pushup',movement:'push_horizontal',equipment:'bodyweight',demand:'moderate',primary:['chest'],secondary:['front_delts','triceps'],defaultEnabled:true}
];
export function personalExercises(templates){const found=new Map();function walk(e){const key=e.id+'\0'+e.convention;if(!found.has(key))found.set(key,e);if(e.alternative)walk(e.alternative)}for(const t of templates)for(const e of t.exercises)walk(e);return [...found.values()]}
export function exerciseProfile(e,prefs={}){const base=known.get(e.id)||{family:e.familyId||'personal:'+e.id,movement:e.movement||'unknown',equipment:e.equipment||'unknown',demand:e.demand||'unknown',variant:''},override=prefs.metadata?.find(m=>m.exerciseId===e.id)||{};return {...base,...override,...Object.fromEntries(['movement','equipment','demand','familyId'].filter(k=>typeof e[k]==='string').map(k=>[k==='familyId'?'family':k,e[k]])),muscles:e.muscles||defaultProfile(e.id)}}
export function prescription(e,prefs={},sessions=[]){const p=exerciseProfile(e,prefs),last=previousExercise(sessions,e),history=last?workSets(last.e):[],refs=history.length?history:e.refsAreTargets?[]:(e.refs||[]).filter(r=>!r.placeholder),values=refs.map(r=>r.r).sort((a,b)=>a-b),median=values.length?values[Math.floor(values.length/2)]:null,range=p.movement==='calves'?[10,20]:p.demand==='high'?[6,10]:[8,15];return {repMin:median?Math.max(4,median-(p.demand==='high'?2:3)):range[0],repMax:median?Math.max(6,median+(p.demand==='high'?2:3)):range[1],effort:'Garder des répétitions possibles ; l’échec n’est pas obligatoire.',source:history.length?'history':refs.length?'reference':'practical'}}
export function catalogue(state,prefs=state.programmingPreferences){const personal=personalExercises(state.templates).map(e=>({...structuredClone(e),catalogueSource:'personal',...exerciseProfile(e,prefs)}));const extra=genericAlternatives.filter(a=>prefs.enabledAlternatives.includes(a.key)).map(a=>({id:prefs.catalogueBindings[a.key]||'elan-catalogue:'+a.key,instanceId:'catalogue:'+a.key,name:a.name,note:'',convention:a.equipment==='dumbbell'?'Par haltère':'Total',step:2.5,rest:a.demand==='high'?prefs.compoundRest:prefs.isolationRest,auto:false,refs:[],refsAreTargets:true,plannedSets:a.tracking?0:2,sets:[],...(a.tracking?{tracking:a.tracking,counter:a.counter,activityEntries:[]}:{}),...(a.laterality?{laterality:a.laterality,loadIdentity:{version:1,unit:'kg',convention:a.equipment==='dumbbell'?'Par haltère':'Total',lateralMode:'one-side',source:'preset'}}:{}),muscles:{primary:a.primary,secondary:a.secondary},familyId:a.family,family:a.family,movement:a.movement,equipment:a.equipment,demand:a.demand,variant:'nouveau matériel personnel',catalogueSource:'alternative',alternativeKey:a.key}));const seen=new Set();return [...personal,...extra].filter(e=>{const key=e.id+'\0'+e.convention;if(seen.has(key))return false;seen.add(key);return true}).map(e=>({...e,prescription:e.prescription||prescription(e,prefs,state.sessions||[])}))}
export function defaultPreferences(state){const owned=personalExercises(state.templates),equipment=[...new Set(owned.map(e=>exerciseProfile(e).equipment).filter(x=>x!=='unknown'))];return {version:1,priorities:state.musclePins?.filter(p=>p.pinned).map(p=>p.muscle).length?state.musclePins.filter(p=>p.pinned).map(p=>p.muscle):['chest','lats','side_delts'],availableEquipment:[...new Set([...equipment,'bodyweight'])],preferredIds:[],excludedIds:[],lockedExerciseIds:[],lockedGroupIds:[],allowSupersets:true,allowMachinePairs:false,allowNewExercises:true,useModelRest:true,compoundRest:180,isolationRest:120,warmupMinutes:6,setupSeconds:60,prepRest:60,transitionSeconds:90,secondsPerRep:3.5,marginMinutes:3,maxExtraSets:2,maxNewExercises:1,maxSimilarMovements:2,metadata:[],enabledAlternatives:genericAlternatives.filter(a=>a.defaultEnabled).map(a=>a.key),catalogueBindings:Object.fromEntries(genericAlternatives.map(a=>[a.key,crypto.randomUUID()])),lastOrganisation:[]}}

export const familyName=id=>({squat:'Squat',goblet_squat:'Squat avec haltère',calf_raise:'Élévation de mollets',hip_thrust:'Extension de hanche',back_extension:'Extension du dos à préciser',adductor:'Adduction',overhead_press:'Poussée verticale',chest_press:'Développé pour les pectoraux',row:'Tirage horizontal',pulldown:'Tirage vertical',lateral_raise:'Élévation latérale',curl:'Flexion du coude',triceps_extension:'Extension du coude',upright_row:'Tirage menton',rear_raise:'Arrière d’épaule',fly:'Écarté pour les pectoraux',face_pull:'Facepull',dip:'Dips',rdl:'Charnière de hanche',pushup:'Pompes'})[id]||'Famille personnelle à préciser';
