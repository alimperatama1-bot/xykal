import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {NextRequest} from 'next/server';
import {encode} from 'next-auth/jwt';
import {validateDeleteTarget,validateDeleteConfirmation} from '../src/lib/repository-delete';
import {POST} from '../src/app/api/github-app/delete-repository/route';
import {sealPassword} from '../src/lib/vault';
test('delete safeguards: exact confirmation, own personal repo, protected source',()=>{
 const target={id:22,full_name:'owner/session',owner:{id:7,type:'User'}};
 validateDeleteTarget('owner/session',target,'7');
 assert.throws(()=>validateDeleteTarget('owner/session',target,'8'));
 assert.throws(()=>validateDeleteTarget('owner/other',target,'7'));
 assert.throws(()=>validateDeleteTarget('xykal/XyRDP',{...target,full_name:'xykal/XyRDP'},'7'));
 assert.throws(()=>validateDeleteConfirmation('owner/session',{confirmation:'owner/session',challenge:'a',acknowledge:false}));
 assert.throws(()=>validateDeleteConfirmation('owner/session',{confirmation:'session',challenge:'a',acknowledge:true}));
});
test('delete route requires browser owner, blocks running jobs/missing permission, deletes only after valid one-time confirmation',async()=>{
 const oldFetch=globalThis.fetch,oldSecret=process.env.NEXTAUTH_SECRET,oldURL=process.env.NEXTAUTH_URL;
 process.env.NEXTAUTH_SECRET='test-delete-only-secret';process.env.NEXTAUTH_URL='https://rdpfree.projectkal.my.id';
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});const config={id:123,slug:'test',pem:privateKey.export({type:'pkcs8',format:'pem'}).toString()};
 const states=new Map<string,string>();let running=false,permission=false,deletes=0,revokes=0;const cleanup:string[]=[];
 (globalThis as unknown as Record<symbol,unknown>)[Symbol.for('__cloudflare-context__')]={env:{DB:{prepare(sql:string){let args:unknown[]=[];return {bind(...v:unknown[]){args=v;return this},async first(){
 if(sql.includes('rate_limits'))return {count:1};if(sql.startsWith('INSERT INTO locks'))return {key:'run:owner/session'};
 if(sql.startsWith('SELECT payload FROM app_config'))return {payload:sealPassword('system:github-app',JSON.stringify(config))};
 if(sql.includes('FROM app_installations'))return {subject:'github:7',installation_id:44,account_id:'7',login:'owner'};
 if(sql.includes('FROM repositories'))return {repo:'owner/session'};
 if(sql.startsWith('DELETE FROM app_states')){const key=String(args[0]);if(states.get(key)===args[2]){states.delete(key);return {hash:key}}return null;}return null;
 },async run(){if(sql.startsWith('INSERT INTO app_states'))states.set(String(args[0]),String(args[2]));if(sql.startsWith('DELETE FROM'))cleanup.push(sql);return {meta:{changes:1}}}}}}}};
 globalThis.fetch=async(input,init)=>{const url=String(input),method=init?.method||'GET';
 if(url.endsWith('/access_tokens')){const data=JSON.parse(String(init?.body));assert.deepEqual(data.repositories,['session']);return Response.json({token:data.permissions.administration?'delete-token':'read-token'})}
 if(url.endsWith('/app/installations/44'))return Response.json({account:{id:7,type:'User'},suspended_at:null,permissions:{administration:permission?'write':'read'}});
 if(url.includes('/actions/runs?'))return Response.json({total_count:running?1:0});
 if(url.endsWith('/installation/token')){revokes++;return new Response(null,{status:204})}
 if(url.endsWith('/repos/owner/session')){if(method==='DELETE'){assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer delete-token');deletes++;return new Response(null,{status:204})}return Response.json({id:22,full_name:'owner/session',owner:{id:7,type:'User'}})}throw Error('Unexpected request '+url);
 };
 try{
 const cookie='__Secure-next-auth.session-token='+await encode({secret:process.env.NEXTAUTH_SECRET,token:{authKind:'github',githubId:'7',login:'owner'},maxAge:300});
 const req=(data:unknown,extra:Record<string,string>={})=>new NextRequest('https://rdpfree.projectkal.my.id/api/github-app/delete-repository',{method:'POST',headers:{cookie,origin:'https://rdpfree.projectkal.my.id','Content-Type':'application/json',...extra},body:JSON.stringify(data)});
 assert.equal((await POST(req({action:'prepare'},{authorization:'Bearer device'}))).status,403);
 assert.equal((await POST(req({action:'prepare'},{origin:'https://evil.example'}))).status,403);
 const prepared=await POST(req({action:'prepare'}));assert.equal(prepared.status,200);const d=await prepared.json();
 const payload={action:'delete',challenge:d.challenge,confirmation:'owner/session',acknowledge:true};
 assert.equal((await POST(req({...payload,confirmation:'session'}))).status,400);
 running=true;assert.equal((await POST(req(payload))).status,409);assert.equal(deletes,0);running=false;
 assert.equal((await POST(req(payload))).status,403);assert.equal(deletes,0);permission=true;
 assert.equal((await POST(req(payload))).status,200);assert.equal(deletes,1);assert.equal(revokes,1);
 assert(cleanup.some(s=>s.includes('credentials')));assert(cleanup.some(s=>s.includes('devices')));
 assert.equal((await POST(req(payload))).status,403);assert.equal(deletes,1);
 }finally{globalThis.fetch=oldFetch;process.env.NEXTAUTH_SECRET=oldSecret;process.env.NEXTAUTH_URL=oldURL}
});
