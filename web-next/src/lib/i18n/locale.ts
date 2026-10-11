export type Locale='id'|'en';
export function detectLocale(header:string|null|undefined):Locale{
 const prefs=(header||'').split(',').map((raw,index)=>{const [tag,...params]=raw.trim().toLowerCase().split(';');const q=params.find(p=>p.trim().startsWith('q='));return {lang:tag.split('-')[0],q:q?Number(q.trim().slice(2)):1,index}}).filter(x=>Number.isFinite(x.q)&&x.q>0).sort((a,b)=>b.q-a.q||a.index-b.index);
 return prefs.find(x=>x.lang==='id'||x.lang==='en')?.lang as Locale||'en';
}
export function preferredLocale(cookie:string|undefined,header:string|null):Locale{return cookie==='id'||cookie==='en'?cookie:detectLocale(header)}
