import {NextRequest} from 'next/server';
import {identity} from '@/lib/identity';
import {origin,guarded,body,reply,ApiError} from '@/lib/api';
import {db,rateLimit} from '@/lib/db';
import {communityProfile} from '@/lib/community';
export async function POST(req:NextRequest){return guarded(async()=>{
 origin(req);if(req.headers.has('authorization'))throw new ApiError(403,'Gunakan sesi browser');
 const who=await identity(req);if(who.kind!=='user')throw new ApiError(403,'Statistik khusus pengguna GitHub');
 if(!await rateLimit('presence:'+who.subject,30,60))throw new ApiError(429,'Terlalu banyak pembaruan kehadiran');
 const data=await body(req);if(Object.keys(data).some(k=>k!=='show_profile')||('show_profile' in data&&typeof data.show_profile!=='boolean'))throw new ApiError(400,'Pilihan profil tidak valid');
 const p=communityProfile(who.id,who.login),now=Date.now(),explicit=typeof data.show_profile==='boolean';
 const row=await db().prepare('INSERT INTO community_members(subject,github_id,login,joined_at,last_seen,show_profile) VALUES(?,?,?,?,?,?) ON CONFLICT(subject) DO UPDATE SET login=excluded.login,last_seen=excluded.last_seen,show_profile=CASE WHEN ? THEN excluded.show_profile ELSE community_members.show_profile END RETURNING show_profile').bind(who.subject,p.id,p.login,now,now,data.show_profile===true?1:0,explicit?1:0).first<{show_profile:number}>();
 return reply({show_profile:row?.show_profile===1});
})}
