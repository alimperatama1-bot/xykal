import fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'next-auth/jwt';
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').trim().split('\n').map(l=>{const i=l.indexOf('=');return [l.slice(0,i),JSON.parse(l.slice(i+1))]}));
const base='https://rdpfree.projectkal.my.id';
async function cookie(token){return '__Secure-next-auth.session-token='+await encode({secret:env.NEXTAUTH_SECRET,token,maxAge:120})}
const admin=await cookie({authKind:'admin',credVersion:env.ADMIN_CREDENTIAL_VERSION,login:'Admin',sub:'rdpfree-admin',name:'Admin',email:env.ADMIN_EMAIL});
const oldOwner=await cookie({authKind:'github',githubId:'297800307',role:'admin',login:'xykal',accessToken:env.ADMIN_GITHUB_TOKEN});
async function check(label,path,expected,options={}){const r=await fetch(base+path,{redirect:'manual',...options});const text=await r.text();assert.equal(r.status,expected,label+': '+text.slice(0,200));console.log('PASS',label,r.status);return text;}
await check('Login public','/login',200);
const pub=await check('Public HTML','/login',200);assert(!pub.includes('href="/admin/login"'));
const login=await check('Admin form','/admin/login',200);assert(login.includes('name="password"'));assert(login.includes('name="email"'));
await check('Admin protected','/admin',307);
await check('Admin unauthenticated','/api/admin/status',401);
await check('OAuth owner cannot become admin','/api/admin/status',403,{headers:{cookie:oldOwner}});
await check('Synthetic current credentials session','/api/admin/status',200,{headers:{cookie:admin}});
await check('Admin layout','/admin',200,{headers:{cookie:admin}});
for(const path of ['/api/v1/status','/api/v1/settings','/api/v1/runs','/api/v1/repository','/api/v1/devices'])await check('No auth '+path,path,401);
const settings=JSON.parse(await check('D1 settings','/api/v1/settings',200,{headers:{cookie:admin}}));assert.equal(settings.inputs.rdp_user,'xyadmin');
await check('GitHub repository','/api/v1/repository',200,{headers:{cookie:admin}});
await check('GitHub workflow runs','/api/v1/runs',200,{headers:{cookie:admin}});
await check('Status + connection','/api/v1/status',200,{headers:{cookie:admin}});
const headers={cookie:admin,origin:base,'Content-Type':'application/json'};
await check('CSRF denied','/api/v1/settings',403,{method:'PUT',headers:{cookie:admin,'Content-Type':'application/json'},body:JSON.stringify({inputs:settings.inputs})});
await check('Invalid duration rejected','/api/v1/settings',400,{method:'PUT',headers,body:JSON.stringify({inputs:{durasi_menit:'999'}})});
await check('Explicit run confirmation required','/api/v1/runs',400,{method:'POST',headers,body:'{}'});
// No workflow is dispatched. Create one test device and revoke it immediately.
const device=JSON.parse(await check('Create native token','/api/v1/devices',201,{method:'POST',headers,body:JSON.stringify({name:'Automated smoke test (temporary)'})}));
try{
 const auth={Authorization:'Bearer '+device.token};
 await check('Native settings access','/api/v1/settings',200,{headers:auth});
 await check('Native cannot access admin','/api/admin/status',403,{headers:auth});
 await check('Native cannot mint tokens','/api/v1/devices',403,{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'{"name":"bad"}'});
 await check('Native revoke self','/api/v1/device/revoke',200,{method:'POST',headers:auth});
 await check('Revoked native token denied','/api/v1/settings',401,{headers:auth});
}finally{await fetch(base+'/api/v1/devices',{method:'DELETE',headers,body:JSON.stringify({id:device.id})})}
console.log('No GitHub workflow was started. Synthetic session tests do not verify real Turnstile login.');
