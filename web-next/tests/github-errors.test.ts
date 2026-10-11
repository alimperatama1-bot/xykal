import assert from 'node:assert/strict';
import {test} from 'node:test';
import {inspect} from '../src/lib/setup';
const context={token:'synthetic-test-token',repo:'testuser/XyRDP',subject:'test',kind:'user' as const};
const store=globalThis as unknown as Record<symbol,unknown>;
store[Symbol.for('__cloudflare-context__')]={env:{DB:{prepare:()=>({bind(){return this},async first(){return null}})}}};
const original=globalThis.fetch;
test('GitHub failure diagnosis preserves setup state and never exposes token',async()=>{
 try{
 for(const [message,status,code,headers] of [
 ['Your account was suspended.',403,'account_restricted',{}],
 ['API rate limit exceeded',403,'github_rate_limit',{'x-ratelimit-remaining':'0'}],
 ['Bad credentials',401,'github_token_invalid',{}],
 ['Resource not accessible by integration',403,'github_permission_denied',{}]
 ] as const){
 globalThis.fetch=async()=>Response.json({message},{status,headers:{...headers,'x-github-request-id':'TEST-REQUEST'}});
 const d=await inspect(context);assert.equal(d.blocked,true);assert.equal(d.ready,false);assert.equal(d.repo,context.repo);assert.equal(d.issues[0].code,code);assert.equal(d.issues[0].stage,'account');assert(!JSON.stringify(d).includes(context.token));
 }
 globalThis.fetch=async input=>String(input).endsWith('/user')?Response.json({login:'testuser'}):Response.json({message:'Not Found'},{status:404});
 const missing=await inspect(context);assert.equal(missing.blocked,false);assert.equal(missing.exists,false);
 globalThis.fetch=async input=>{const p=String(input);if(p.endsWith('/user'))return Response.json({login:'testuser'});if(p.endsWith('/XyRDP'))return Response.json({permissions:{push:true}});if(p.endsWith('/rdp-6h.yml'))return Response.json({state:'active'});return Response.json({message:'Must have admin rights to Repository.'},{status:403})};
 const partial=await inspect(context);assert.equal(partial.exists,true);assert.equal(partial.workflow_exists,true);assert.equal(partial.issues[0].stage,'actions_permissions');
 }finally{globalThis.fetch=original}
});
