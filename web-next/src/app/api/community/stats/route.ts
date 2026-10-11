import {guarded} from '@/lib/api';
import {publicCommunity} from '@/lib/community';
let cached:Awaited<ReturnType<typeof publicCommunity>>|null=null;let expires=0;
export async function GET(){return guarded(async()=>{
 if(!cached||expires<Date.now()){cached=await publicCommunity();expires=Date.now()+15000}
 return Response.json(cached,{headers:{'Cache-Control':'public, max-age=15, s-maxage=15','X-Content-Type-Options':'nosniff'}})
})}
