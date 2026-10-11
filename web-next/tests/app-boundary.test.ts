import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {NextRequest} from 'next/server';
import {encode} from 'next-auth/jwt';
import {context,ApiError} from '../src/lib/api';
import {APP_PERMISSIONS,installationToken,verifyInstallation,manifest} from '../src/lib/github-app';
import {sealPassword} from '../src/lib/vault';
import {authOptions} from '../src/lib/auth';
test('identity login cannot reuse legacy OAuth repo access; app grants are repo-bound',async()=>{
 const oldSecret=process.env.NEXTAUTH_SECRET,oldURL=process.env.NEXTAUTH_URL,oldFetch=globalThis.fetch;process.env.NEXTAUTH_URL='https://rdpfree.projectkal.my.id';process.env.NEXTAUTH_SECRET='test-only-secret-not-used-in-production';
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});const config={id:123,slug:'test-app',pem:privateKey.export({type:'pkcs8',format:'pem'}).toString()};
 let linked=false,calls=0;
 (globalThis as unknown as Record<symbol,unknown>)[Symbol.for('__cloudflare-context__')]={env:{DB:{prepare(sql:string){return {bind(){return this},async first(){if(sql.includes('app_config'))return {payload:sealPassword('system:github-app',JSON.stringify(config))};if(sql.includes('app_installations'))return linked?{subject:'github:7',installation_id:44,account_id:'7',login:'owner'}:null;if(sql.includes('repositories'))return {repo:'owner/Selected'};return null}}}}}};
 globalThis.fetch=async(input,init)=>{calls++;const path=String(input);if(path.endsWith('/access_tokens')){const data=JSON.parse(String(init?.body));assert.deepEqual(data.permissions,APP_PERMISSIONS);assert.deepEqual(data.repositories,['Selected']);return Response.json({token:'installation-test-token'})}return Response.json({id:44,app_id:123,account:{id:999,login:'someone-else',type:'User'},suspended_at:null})};
 try{
 const token=await encode({secret:process.env.NEXTAUTH_SECRET,token:{authKind:'github',githubId:'7',login:'owner',accessToken:'legacy-oauth-token'},maxAge:60});
 const req=new NextRequest('https://rdpfree.projectkal.my.id/api/v1/runs',{headers:{cookie:'__Secure-next-auth.session-token='+token}});
 await assert.rejects(()=>context(req),e=>e instanceof ApiError&&e.status===409);assert.equal(calls,0);
 linked=true;const grant=await context(req);assert.equal(grant.token,'installation-test-token');assert.equal(grant.repo,'owner/Selected');assert.equal(grant.installationId,44);
 await assert.rejects(()=>installationToken('github:7','other/Secret'),e=>e instanceof ApiError&&e.status===403);
 await assert.rejects(()=>verifyInstallation(44,'7'),e=>e instanceof ApiError&&e.status===403);
 const updated=await authOptions.callbacks!.jwt!({token:{authKind:'github',accessToken:'legacy-oauth-token'},user:{id:'7'},account:null});assert(!('accessToken' in updated));
 assert.equal(manifest().request_oauth_on_install,false);assert.equal(manifest().default_permissions.administration,'write');assert(!('administration' in APP_PERMISSIONS));assert.equal(manifest().default_permissions.contents,'read');
 }finally{globalThis.fetch=oldFetch;process.env.NEXTAUTH_SECRET=oldSecret;process.env.NEXTAUTH_URL=oldURL}
});
