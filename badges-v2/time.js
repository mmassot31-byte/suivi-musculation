export const defaultZone='Europe/Paris';
export function localParts(value,zone=defaultZone){const d=new Date(value);if(!Number.isFinite(+d))return null;const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));return {day:`${parts.year}-${parts.month}-${parts.day}`,month:`${parts.year}-${parts.month}`,hour:Number(parts.hour)};}
export const dayNumber=day=>Date.parse(day+'T12:00:00Z')/86400000;
export function isoWeek(day){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);}
export function longestWeeks(weeks){let longest=0,run=0,last=null;for(const w of [...new Set(weeks)].sort()){run=last!==null&&dayNumber(w)-dayNumber(last)===7?run+1:1;last=w;longest=Math.max(longest,run);}return longest;}
