import {test} from 'node:test';import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';import {encode} from 'next-auth/jwt';
import {communityProfile,publicCommunity,ONLINE_WINDOW_MS} from '../src/lib/community';
import {POST} from '../src/app/api/community/presence/route';
test('community identity validation allows only GitHub IDs and usernames',()=>{assert.equal(communityProfile('123','octo-cat').avatar,'https://avatars.githubusercontent.com/u/123?s=80&v=4');assert.throws(()=>communityProfile('not-an-id','user'));assert.throws(()=>communityProfile('123','../../private'));});
test('public community response includes aggregates and opted-in profiles only, never last-seen or subjects',async()=>{
 let threshold=0;
 (globalThis as unknown as Record<symbol,unknown>)[Symbol.for('__cloudflare-context__')]={env:{DB:{prepare(sql:string){return {bind(n:number){threshold=n;return this},async first(){return {total:3,online:1}},async all(){assert(sql.includes('show_profile=1'));return {results:[{github_id:'10',login:'opted-in'}]}}}}}}};
 const result=await publicCommunity(10000000);assert.equal(threshold,10000000-ONLINE_WINDOW_MS);assert.equal(result.total,3);assert.equal(result.online,1);assert.equal(result.profiles.length,1);assert(!JSON.stringify(result).includes('last_seen'));assert(!JSON.stringify(result).includes('subject'));
});
test('presence is session-bound, deduplicated and private by default; opt-in persists until explicitly disabled',async()=>{
 process.env.NEXTAUTH_SECRET='community-test-only';process.env.NEXTAUTH_URL='https://rdpfree.projectkal.my.id';
 let calls=0;const members=new Map<string,{show_profile:number}>();
 (globalThis as unknown as Record<symbol,unknown>)[Symbol.for('__cloudflare-context__')]={env:{DB:{prepare(sql:string){let args:unknown[]=[];return {bind(...v:unknown[]){args=v;return this},async first(){if(sql.includes('rate_limits'))return {count:1};calls++;assert.equal(args[0],'github:7');assert.equal(args[1],'7');const current=members.get(String(args[0]));const row={show_profile:current&&args[6]!==1?current.show_profile:Number(args[5])};members.set(String(args[0]),row);return row}}}}}};
 const token=await encode({secret:process.env.NEXTAUTH_SECRET,token:{authKind:'github',githubId:'7',login:'test-owner'},maxAge:300});
 const req=(data:unknown,extra:Record<string,string>={})=>new NextRequest('https://rdpfree.projectkal.my.id/api/community/presence',{method:'POST',headers:{origin:'https://rdpfree.projectkal.my.id',cookie:'__Secure-next-auth.session-token='+token,...extra},body:JSON.stringify(data)});
 assert.equal((await POST(req({}, {origin:'https://evil.example'}))).status,403);assert.equal((await POST(req({}, {authorization:'Bearer token'}))).status,403);assert.equal((await POST(req({login:'someone-else'}))).status,400);assert.equal(calls,0);
 assert.equal((await (await POST(req({}))).json()).show_profile,false);
 assert.equal((await (await POST(req({show_profile:true}))).json()).show_profile,true);
 assert.equal((await (await POST(req({}))).json()).show_profile,true);
 assert.equal((await (await POST(req({show_profile:false}))).json()).show_profile,false);assert.equal(members.size,1);
});
