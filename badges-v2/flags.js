export const v2Enabled=()=>{try{return globalThis.localStorage?.getItem('elan-badges-v2')==='enabled';}catch{return false;}};
