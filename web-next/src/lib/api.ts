import {validateJsonKeys,redactSecrets} from "./json-input";
import {NextRequest} from "next/server";
import {getToken,decode} from "next-auth/jwt";
import {db} from "./db";
import {createHash} from "node:crypto";
export type Context={token:string;repo:string;subject:string;kind:"admin"|"user"|"device";deviceId?:string;installationId?:number};
export type GitHubDiagnostic={provider:"github";status:number;endpoint:string;code:string;message:string;request_id:string|null;retry_after:string|null;rate_reset:string|null};
export class ApiError extends Error {constructor(public status:number,message:string,public diagnostic?:GitHubDiagnostic){super(message)}}
export const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
export const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export function origin(req:NextRequest){if(req.headers.get("origin")!=="https://rdpfree.projectkal.my.id")throw new ApiError(403,"Origin tidak diizinkan");}
export async function body(req:NextRequest){const raw=await req.text();if(raw.length>16384)throw new ApiError(413,"Payload terlalu besar");try{const d=JSON.parse(raw);if(!d||typeof d!=="object"||Array.isArray(d))throw Error();validateJsonKeys(d);return d as Record<string,unknown>;}catch{throw new ApiError(400,"JSON tidak valid")}}
async function selected(subject:string,fallback:string){const r=await db().prepare("SELECT repo FROM repositories WHERE subject=?").bind(subject).first<{repo:string}>();return r?.repo||fallback;}
export async function context(req:NextRequest,browserOnly=false):Promise<Context>{
 const authorization=req.headers.get("authorization");
 if(authorization){
  if(browserOnly)throw new ApiError(403,"Gunakan sesi browser untuk pengaturan perangkat");
  const match=/^Bearer (rdf_[A-Za-z0-9_-]{43})$/.exec(authorization);if(!match)throw new ApiError(401,"Token perangkat tidak valid");
  const row=await db().prepare("SELECT id,payload,subject,expires FROM devices WHERE token_hash=?").bind(hash(match[1])).first<{id:string;payload:string;subject:string;expires:number}>();
  if(!row||row.expires<Date.now())throw new ApiError(401,"Token perangkat kedaluwarsa atau dicabut");
  const d=await decode({token:row.payload,secret:process.env.NEXTAUTH_SECRET!});
  if(!d||typeof d.repo!=="string")throw new ApiError(401,"Sesi perangkat tidak valid");
  if(row.subject!=="admin"){
   if(d.binding!=="github_app")throw new ApiError(401,"Token perangkat lama tidak lagi dipakai. Hubungkan GitHub App lalu buat token XyDesk baru.");
   const grant=await (await import("./github-app")).installationToken(row.subject,d.repo);
   return {...grant,repo:d.repo,subject:row.subject,kind:"device",deviceId:row.id};
  }
  if(typeof d.accessToken!=="string")throw new ApiError(401,"Sesi perangkat tidak valid");
  return {token:d.accessToken,repo:d.repo,subject:row.subject,kind:"device",deviceId:row.id};
 }
 const t=await getToken({req,secret:process.env.NEXTAUTH_SECRET});
 if(t?.authKind==="admin"&&process.env.ADMIN_CREDENTIAL_VERSION&&t.credVersion===process.env.ADMIN_CREDENTIAL_VERSION&&process.env.ADMIN_GITHUB_TOKEN)return {kind:"admin",subject:"admin",token:process.env.ADMIN_GITHUB_TOKEN,repo:await selected("admin",process.env.ADMIN_REPO||"xykal/XyRDP")};
 if(t?.authKind==="github"&&typeof t.githubId==="string"&&/^\d+$/.test(t.githubId)&&typeof t.login==="string"){
  const subject="github:"+t.githubId;const mapping=await db().prepare("SELECT repo FROM repositories WHERE subject=?").bind(subject).first<{repo:string}>();
  if(!mapping)throw new ApiError(409,"Login berhasil. Install GitHub App dan pilih repository terlebih dahulu.");
  const grant=await (await import("./github-app")).installationToken(subject,mapping.repo);return {...grant,kind:"user",repo:mapping.repo,subject};
 }
 throw new ApiError(401,"Silakan masuk kembali");
}
export async function github<T=Record<string,unknown>>(token:string,path:string,method="GET",data?:unknown):Promise<T>{
 const r=await fetch("https://api.github.com"+path,{method,headers:{Authorization:"Bearer "+token,"User-Agent":"RdpFree","Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(data?{"Content-Type":"application/json"}:{})},body:data?JSON.stringify(data):undefined,cache:"no-store",signal:AbortSignal.timeout(25000)});
 if(!r.ok){
  let message="GitHub menolak permintaan";try{const d=await r.json();if(typeof d.message==="string")message=d.message.slice(0,350)}catch{}
  message=redactSecrets(message);
  const lower=message.toLowerCase();
  const code=/suspend|account.*(restrict|block)|account.*flagged/.test(lower)?"account_restricted":r.status===401?"github_token_invalid":r.headers.get("x-ratelimit-remaining")==="0"||/rate limit|secondary rate|abuse detection/.test(lower)?"github_rate_limit":r.status===403?"github_permission_denied":r.status===404?"github_not_found":"github_error";
  const diagnostic:GitHubDiagnostic={provider:"github",status:r.status,endpoint:path.split("?")[0],code,message,request_id:r.headers.get("x-github-request-id"),retry_after:r.headers.get("retry-after"),rate_reset:r.headers.get("x-ratelimit-reset")};
  throw new ApiError([401,403,404,409,422,429].includes(r.status)?r.status:502,"GitHub ("+r.status+"): "+message,diagnostic);
 }
 return (r.status===204?{}:await r.json()) as T;
}
export async function gh<T=Record<string,unknown>>(ctx:Context,path:string,method="GET",data?:unknown):Promise<T>{return github<T>(ctx.token,"/repos/"+ctx.repo+path,method,data);}
export async function guarded(fn:()=>Promise<Response>){try{return await fn()}catch(e){return reply({error:e instanceof ApiError?redactSecrets(e.message):"Layanan belum dapat memproses permintaan. Coba lagi.",...(e instanceof ApiError&&e.diagnostic?{diagnostic:e.diagnostic}:{})},e instanceof ApiError?e.status:503)}}
