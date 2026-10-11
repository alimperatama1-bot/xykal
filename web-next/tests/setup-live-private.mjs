import fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'next-auth/jwt';import {randomBytes} from 'node:crypto';
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').trim().split('\n').map(l=>{const i=l.indexOf('=');return [l.slice(0,i),JSON.parse(l.slice(i+1))]}));
const base='https://rdpfree.projectkal.my.id';
const name='rdpfree-setup-check-'+Date.now();const subject='setupcheck-'+randomBytes(6).toString('hex');
const token=await encode({secret:env.NEXTAUTH_SECRET,token:{authKind:'github',githubId:subject,accessToken:env.ADMIN_GITHUB_TOKEN,login:'rdpfree-newuser-check',name:'Setup check',sub:subject},maxAge:600});
const headers={cookie:'__Secure-next-auth.session-token='+token,origin:base,'Content-Type':'application/json'};
async function call(path,method='GET',body){const r=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(method+' '+path+': '+r.status+' '+d.error);return d;}
let repo='';
try{
 let d=await call('/api/v1/status');assert.equal(d.phase,'setup_required');assert.equal(d.setup.exists,false);console.log('PASS missing repo is onboarding, not 404/login failure');
 d=await call('/api/v1/setup','POST',{action:'create',name,private:true,confirm:true});repo=d.repo;assert(repo.endsWith('/'+name));console.log('PASS private repository created from real template');
 fs.writeFileSync('.setup-test.local',JSON.stringify({repo,subject:'github:'+subject}));
 // GitHub generation normally completes before these independent readiness reads.
 const r=await fetch('https://api.github.com/repos/'+repo,{headers:{Authorization:'Bearer '+env.ADMIN_GITHUB_TOKEN,'User-Agent':'RdpFree-test'}});const metadata=await r.json();assert.equal(metadata.private,true);
 await new Promise(resolve=>setTimeout(resolve,10000)); // GitHub template generation is asynchronous.
 d=await call('/api/v1/setup','POST',{action:'finish'});assert.equal(d.repo,repo);assert.equal(d.importing,false);assert.equal(d.workflow_exists,true);assert.equal(d.actions_enabled,true);assert(d.missing.includes('RDP_PASSWORD')&&d.missing.includes('TAILSCALE_AUTH_KEY'));console.log('PASS custom name persisted; workflow ready; required secrets detected');
 d=await call('/api/v1/repository?path=');const names=d.data.map(x=>x.name);assert(!names.includes('web')&&!names.includes('web-next')&&!names.includes('deploy'));assert(names.includes('scripts')&&names.includes('.github'));console.log('PASS generated working tree excludes web folders and retains RDP scripts');
 const password='Test!aA9'+randomBytes(20).toString('base64url');
 await call('/api/v1/secrets','POST',{password,tailscale:'tskey-auth-testnotreal-'+randomBytes(20).toString('hex'),remember:true});
 d=await call('/api/v1/setup');assert.equal(d.ready,true);assert.equal(d.password_stored,true);console.log('PASS GitHub encrypted secret upload and setup readiness');
 d=await call('/api/v1/credentials','POST',{});assert.equal(d.password,password);console.log('PASS encrypted password vault roundtrip');
 d=await call('/api/v1/settings');assert.equal(d.repo,repo);assert.equal(d.inputs.akses,'tailscale');console.log('PASS all APIs use selected repository, not hardcoded XyRDP');
 d=await call('/api/v1/status');assert.equal(d.repo,repo);assert.equal(d.run,null);console.log('PASS no workflow dispatched');
 // Obtain a device to prove its immutable repo binding and lack of vault access.
 const device=await call('/api/v1/devices','POST',{name:'Disposable onboarding test'});
 try{let r=await fetch(base+'/api/v1/settings',{headers:{Authorization:'Bearer '+device.token}});assert.equal((await r.json()).repo,repo);
 r=await fetch(base+'/api/v1/credentials',{method:'POST',headers:{Authorization:'Bearer '+device.token,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);console.log('PASS native token uses custom repository; password vault denied');}
 finally{await call('/api/v1/devices','DELETE',{id:device.id})}
 await call('/api/v1/credentials','DELETE');
 console.log('LIVE SETUP CHECK COMPLETE — no workflow run');
}finally{
 if(repo&&repo.endsWith('/'+name)){
  const r=await fetch('https://api.github.com/repos/'+repo,{method:'DELETE',headers:{Authorization:'Bearer '+env.ADMIN_GITHUB_TOKEN,'User-Agent':'RdpFree-test'}});assert.equal(r.status,204,'Temporary repository cleanup');console.log('Temporary private repository deleted');
 }
}
