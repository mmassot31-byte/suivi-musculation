import {anatomicalProfile, weeklyProfile, validProfile, defaultProfile} from '../muscles.js';
import {catalog, catalogVersion, muscleGroups, thresholds} from './catalog.js';

// Existing snapshots take precedence; never infer a muscle from load or exercise name.
function directGroups(source, profiles) {
  const stored = source.muscles === undefined ? profiles.find(p=>p.exerciseId===source.id) : source.muscles;
  if (stored !== undefined && !validProfile(stored)) return null;
  if (stored === undefined && !defaultProfile(source.id).primary.length) return [];
  const primary = weeklyProfile(anatomicalProfile(stored===undefined?source:{...source,muscles:stored})).primary;
  return [...new Set(primary.map(id=>['front_delts','side_delts','rear_delts'].includes(id)?'shoulders':id))];
}

/** Recompute from the saved history only. Pure projection, never an award/XP ledger. */
export function evaluateMuscleVolume(document) {
  if (!document || !Array.isArray(document.sessions)) throw Error('V2_INVALID_HISTORY');
  const counts = Object.fromEntries(muscleGroups.map(({id})=>[id,0]));
  const profiles = document.exerciseMuscles ?? [];
  if (!Array.isArray(profiles)) throw Error('V2_INVALID_PROFILES');
  const diagnostics = {unclassifiedSets:0, invalidProfileSets:0, excludedSets:0};
  const sessionIds = new Set();
  for (const session of document.sessions) {
    if (!session || typeof session.id!=='string' || !Array.isArray(session.exercises)) throw Error('V2_INVALID_SESSION');
    if (sessionIds.has(session.id)) throw Error('V2_DUPLICATE_SESSION');
    sessionIds.add(session.id);
    if (['abandoned','cancelled','draft','pending'].includes(session.status)) continue;
    for (const exercise of session.exercises) {
      for (const set of exercise.sets || []) {
        // Missing type/status is the legacy saved-set representation used by Élan.
        // Drops are parts of one validated series; refs/activityEntries are never series.
        if (!set || (set.type ?? 'work')!=='work' || set.validated===false ||
            (set.status!==undefined && !['validated','completed'].includes(set.status)) ||
            !Number.isFinite(set.w) || set.w<0 || !Number.isInteger(set.r) || set.r<1) {
          diagnostics.excludedSets++; continue;
        }
        const source = set.exerciseReference ?? exercise;
        const groups = source && typeof source==='object' ? directGroups(source, profiles) : null;
        if (groups===null) { diagnostics.invalidProfileSets++; continue; }
        if (!groups.length) diagnostics.unclassifiedSets++;
        for (const group of groups) if (Object.hasOwn(counts,group)) counts[group]++;
      }
    }
  }
  const earned = catalog.filter(b=>b.status==='calculable' && counts[b.condition.muscle]>=b.condition.threshold).map(b=>b.id);
  const progress = Object.fromEntries(muscleGroups.map(({id})=>{
    const current=counts[id], next=thresholds.find(t=>t>current) ?? null;
    return [id,{current, nextThreshold:next, nextBadgeId:next===null?null:`v2.muscle_volume.${id}.${next}`,
      remaining:next===null?0:next-current, ratio:next===null?1:current/next, complete:next===null}];
  }));
  return {engineVersion:2, catalogVersion, counts, earned, progress, diagnostics};
}
