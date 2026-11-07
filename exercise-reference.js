// Canonical identity is additive. Names alone never merge distinct equipment variants.
import {commonExercises} from './exercise-catalogue.js';
import {legacyExerciseKey} from './exercise-key.js';
let referenceAliases=new Map(),personalLegacy=new Map(),referenceCache=new WeakMap();
export function configureExerciseReferences(state){referenceCache=new WeakMap();referenceAliases=new Map((state.exerciseLibrary?.aliases||[]).map(a=>[a.from,a.to]));personalLegacy=new Map((state.exerciseLibrary?.personal||[]).filter(d=>d.legacySource).map(d=>[legacyExerciseKey(d.legacySource),d.id]));}
const builtinAliases=new Map(commonExercises.flatMap(d=>(d.legacyCanonicalIds||[]).map(id=>[id,d.id])));
const resolve=id=>referenceAliases.get(id)||builtinAliases.get(id)||id;
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function resolveExerciseId(e){if(!e)return null;if(e.libraryId)return resolve(e.libraryId);const own=personalLegacy.get(legacyExerciseKey(e));if(own)return own;const matches=commonExercises.filter(d=>((d.legacyIds||[]).includes(e.id)||e.equipment&&e.equipment!=='unknown')&&(!e.equipment||e.equipment==='unknown'||e.equipment===d.equipment||e.tracking==='cardio'&&d.tracking==='cardio')&&[d.name,...d.legacyNames||[]].some(n=>norm(n)===norm(e.name)));return matches.length===1?resolve(matches[0].id):resolve(e.id);}
export function canonicalExerciseId(e){if(!e||typeof e!=='object')return null;const signature=JSON.stringify([e.id,e.libraryId,e.name,e.equipment,e.tracking,e.muscles]),cached=referenceCache.get(e);if(cached?.signature===signature)return cached.id;const id=resolveExerciseId(e);referenceCache.set(e,{signature,id});return id;}
export const sameExerciseReference=(a,b)=>!!a?.id&&!!b?.id&&canonicalExerciseId(a)===canonicalExerciseId(b);
