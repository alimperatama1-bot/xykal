import {Context,ApiError,gh,github,type GitHubDiagnostic} from "./api";
import {db} from "./db";

export const TEMPLATE="xykal/XyRDP";
export async function inspect(c:Context){
 const mapping=await db().prepare("SELECT state FROM repositories WHERE subject=? AND repo=?").bind(c.subject,c.repo).first<{state:string}>();
 const result={repo:c.repo,template:TEMPLATE,exists:false,workflow_exists:false,workflow_state:"",actions_enabled:false,can_write:false,missing:[] as string[],ready:false,importing:mapping?.state==="initializing",password_stored:false,access_mode:c.installationId?"installation":"admin",blocked:false,issues:[] as (GitHubDiagnostic&{stage:string})[]};
 const fail=(e:unknown,stage:string)=>{if(e instanceof ApiError&&e.diagnostic){result.blocked=true;result.issues.push({...e.diagnostic,stage});return result}throw e};
 try{if(!c.installationId)await github(c.token,"/user")}catch(e){return fail(e,"account")}
 let repo:{permissions?:{push?:boolean;admin?:boolean}};
 try{repo=await gh(c,"");}catch(e){if(e instanceof ApiError&&e.status===404)return result;return fail(e,"repository")}
 result.exists=true;result.can_write=!!c.installationId||!!repo.permissions?.push;
 try{const w=await gh<{state:string}>(c,"/actions/workflows/rdp-6h.yml");result.workflow_exists=true;result.workflow_state=w.state;}catch(e){if(!(e instanceof ApiError&&e.status===404))return fail(e,"workflow");}
 if(!result.can_write)return result;
 try{if(c.installationId)result.actions_enabled=result.workflow_state==="active";else {const permissions=await gh<{enabled:boolean}>(c,"/actions/permissions");result.actions_enabled=permissions.enabled;}}catch(e){return fail(e,"actions_permissions")}
 let names:string[];try{const secrets=await gh<{secrets:{name:string}[]}>(c,"/actions/secrets?per_page=100");names=secrets.secrets.map(s=>s.name);}catch(e){return fail(e,"secrets_permissions")}
 const required=["RDP_PASSWORD","TAILSCALE_AUTH_KEY"];result.missing=required.filter(k=>!names.includes(k));
 const vault=await db().prepare("SELECT repo FROM credentials WHERE repo=?").bind(c.repo).first();result.password_stored=!!vault;
 result.ready=result.workflow_exists&&result.workflow_state==="active"&&result.actions_enabled&&!result.missing.length&&!result.importing;
 return result;
}
export async function finishSetup(c:Context){
 const state=await db().prepare("SELECT state FROM repositories WHERE subject=? AND repo=?").bind(c.subject,c.repo).first<{state:string}>();
 // Only a repo created by this onboarding flow is eligible for template cleanup.
 if(state?.state==="initializing"&&!c.installationId){
  const repo=await gh<{default_branch:string}>(c,"");const branch=repo.default_branch;
  const ref=await gh<{object:{sha:string}}>(c,"/git/ref/heads/"+encodeURIComponent(branch));
  const commit=await gh<{tree:{sha:string}}>(c,"/git/commits/"+ref.object.sha);
  const root=await gh<{tree:{path:string;mode:string;type:string;sha:string}[]}>(c,"/git/trees/"+commit.tree.sha);
  const keep=root.tree.filter(x=>!["web","web-next","deploy"].includes(x.path)).map(({path,mode,type,sha})=>({path,mode,type,sha}));
  if(keep.length!==root.tree.length){
   const tree=await gh<{sha:string}>(c,"/git/trees","POST",{tree:keep});
   const next=await gh<{sha:string}>(c,"/git/commits","POST",{message:"chore: repository RDP tanpa dashboard web — credit KallAncrit",tree:tree.sha,parents:[ref.object.sha]});
   await gh(c,"/git/refs/heads/"+encodeURIComponent(branch),"PATCH",{sha:next.sha,force:false});
  }
 }
 if(!c.installationId){await gh(c,"/actions/permissions","PUT",{enabled:true,allowed_actions:"all"});
 await gh(c,"/actions/permissions/workflow","PUT",{default_workflow_permissions:"write",can_approve_pull_request_reviews:false});}
 await gh(c,"/actions/workflows/rdp-6h.yml/enable","PUT");
 await db().prepare("UPDATE repositories SET state='ready',updated=? WHERE subject=? AND repo=?").bind(Date.now(),c.subject,c.repo).run();
}
