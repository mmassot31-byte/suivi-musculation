// All npm test commands inherit the fail-closed network guard, including subprocesses.
const {spawnSync}=require('node:child_process'),path=require('node:path');
const command=process.argv.slice(2).join(' ');if(!command)throw Error('Missing test command');
const env={...process.env,NODE_OPTIONS:'--require '+path.join(__dirname,'local-safety.cjs')};
const r=spawnSync(command,{shell:true,stdio:'inherit',env});process.exit(r.status??1);
