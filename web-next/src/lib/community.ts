import {db} from './db';
export const ONLINE_WINDOW_MS=5*60*1000;
export function communityProfile(id:string,login:string){
 if(!/^\d{1,30}$/.test(id)||! /^(?!-)[A-Za-z0-9-]{1,39}(?<!-)$/.test(login))throw Error('Invalid GitHub identity');
 return {id,login,avatar:'https://avatars.githubusercontent.com/u/'+id+'?s=80&v=4'};
}
export async function publicCommunity(now=Date.now()){
 const totals=await db().prepare('SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN last_seen>=? THEN 1 ELSE 0 END),0) AS online FROM community_members').bind(now-ONLINE_WINDOW_MS).first<{total:number;online:number}>();
 const rows=await db().prepare("SELECT github_id,login FROM community_members WHERE show_profile=1 AND login<>'' ORDER BY joined_at DESC LIMIT 8").all<{github_id:string;login:string}>();
 const profiles=rows.results.flatMap(row=>{try{const p=communityProfile(row.github_id,row.login);return [{login:p.login,avatar:p.avatar,url:'https://github.com/'+p.login}]}catch{return []}});
 return {total:Number(totals?.total||0),online:Number(totals?.online||0),online_window_minutes:5,profiles,measured_at:new Date(now).toISOString()};
}
