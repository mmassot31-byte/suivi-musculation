import {createClient} from './vendor/supabase.js';
import {cloudConfig} from './cloud-config.js';
export const authStorageKey='elan-auth-v1';
export function configured(config=cloudConfig){if(!config.url||!config.publishableKey)return false;const url=new URL(config.url);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Le service doit utiliser HTTPS.');if(config.publishableKey.startsWith('sb_secret_'))throw Error('Clé secrète interdite dans le navigateur.');if(!config.publishableKey.startsWith('sb_publishable_')){let role;try{role=JSON.parse(atob(config.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role}catch{throw Error('Clé publique invalide.')}if(role!=='anon')throw Error('Clé d’administration interdite.');}return true}
export function createService(config=cloudConfig){try{if(!configured(config))return null}catch{console.warn('Configuration du service de comptes invalide ; données locales conservées.');return null}const client=createClient(config.url,config.publishableKey,{global:{fetch:async(input,init={})=>{const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,12000);init.signal?.addEventListener('abort',abort,{once:true});try{return await fetch(input,{...init,signal:controller.signal})}finally{clearTimeout(timer);init.signal?.removeEventListener('abort',abort)}}},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:authStorageKey}});let capabilities=null;const competitionCapabilities=async()=>{const {data,error}=await client.rpc('competition_capabilities');if(error){if(['PGRST202','42883'].includes(error.code))return null;throw error}if(data?.version>=1&&data.completedOnly===true)capabilities=data;return capabilities};const result=async promise=>{const {data,error}=await promise;if(error)throw error;return data};const privateQuery=async(query,uid)=>{const {data,error}=await client.auth.getSession();if(error||!uid||data.session?.user.id!==uid)throw Error('ACCOUNT_CHANGED');return result(query.setHeader('Authorization','Bearer '+data.session.access_token))};return {client,auth:client.auth,cachedIdentity(){try{const value=JSON.parse(localStorage.getItem(authStorageKey)||'null');return typeof value?.user?.id==='string'?value.user:null}catch{return null}},
 document:uid=>privateQuery(client.from('private_documents').select('payload,version').maybeSingle(),uid),
 sync:async(args,uid)=>{const sporting=[...(args?.p_payload?.sessions||[]),...(args?.p_payload?.importedDrafts||[]),...(args?.p_payload?.active?[args.p_payload.active]:[])];if(sporting.some(session=>session?.exercises?.some(e=>e.sets?.some(s=>s.type!=='warmup')))){let ready=capabilities;try{ready||=await competitionCapabilities()}catch{}if(!ready?.completedOnly)throw Error('En attente de synchronisation : mise à jour Supabase nécessaire pour publier uniquement des performances admissibles. Tes données restent sur cet appareil.')}return privateQuery(client.rpc('sync_snapshot',args).retry(false),uid)},
 competitionCapabilities,
 competitionRanking:args=>result(client.rpc('competition_rankings',args)),
 competitionCandidates:uid=>privateQuery(client.rpc('competition_candidates'),uid),
 competitionUser:username=>result(client.rpc('competition_user',{p_username:username})),
 challengeList:uid=>privateQuery(client.rpc('challenge_list'),uid),
 challengeCreate:(args,uid)=>privateQuery(client.rpc('challenge_create',args),uid),
 challengeRespond:(args,uid)=>privateQuery(client.rpc('challenge_respond',args),uid),
 challengeRevoke:(id,uid)=>privateQuery(client.rpc('challenge_revoke',{p_id:id}),uid),
 challengeRedeem:(token,uid)=>privateQuery(client.rpc('challenge_redeem',{p_token:token}),uid),
 challengeRematch:(id,uid)=>privateQuery(client.rpc('challenge_rematch',{p_id:id}),uid),
 variants:()=>result(client.from('exercise_variants').select('*').order('label').limit(100)),
 registerMachine:args=>result(client.rpc('register_machine',args)),
 ranking:args=>result(client.rpc('rankings',args)),
 profile:(username,offset=0)=>result(client.rpc('sport_profile',{p_username:username,p_offset:offset,p_limit:20})),
 usernameAvailable:username=>result(client.from('profiles').select('id').eq('username',username).maybeSingle()).then(value=>!value),
 ownProfile:uid=>result(client.from('profiles').select('id,username,avatar_path').eq('id',uid).single()),
 updateProfile:(uid,changes)=>result(client.from('profiles').update(changes).eq('id',uid).select('id,username,avatar_path').single()),
 async avatar(uid,file){if(file.size>2097152||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choisis une image JPG, PNG ou WebP de 2 Mo maximum.');const ext={ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type],path=uid+'/'+crypto.randomUUID()+'.'+ext;await result(client.storage.from('avatars').upload(path,file,{contentType:file.type,upsert:false}));return path},
 avatarUrl:path=>path?client.storage.from('avatars').getPublicUrl(path).data.publicUrl:null,
 async signOut(){const {error}=await client.auth.signOut({scope:'local'});if(error){client.auth.stopAutoRefresh();localStorage.removeItem(authStorageKey);localStorage.removeItem(authStorageKey+'-code-verifier')}return error}
}}
