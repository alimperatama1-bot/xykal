import {NextRequest} from "next/server";
import {context,guarded,reply,gh,ApiError} from "@/lib/api";
import {inspect} from "@/lib/setup";
import {runs,active,loadSettings} from "@/lib/workflow";
type StatusFile={run_id?:string;active?:boolean;started_at?:string;expires_at?:string;rdp_user?:string;hostname?:string;games?:Record<string,{status?:string;note?:string;compatibility?:string;gta_installed?:boolean;samp_installed?:boolean}>;media?:{wallpaper?:string;microphone?:string;verification?:string};game_environment?:{os?:string;runner?:string;play_tested?:boolean};akses?:{tailscale?:{ip?:string;status?:string}}};
export async function GET(req:NextRequest){return guarded(async()=>{const c=await context(req);let list;try{list=await runs(c)}catch(e){if(e instanceof ApiError&&e.status===404){const setup=await inspect(c);return reply({repo:c.repo,phase:"setup_required",active:false,run:null,session:null,connection:null,setup,server_time:new Date().toISOString()})}throw e}const run=list.find(active)||list[0]||null;let session:StatusFile|null=null;
 try{const f=await gh<{content:string}>(c,"/contents/rdp-status.json?ref=status");session=JSON.parse(Buffer.from(f.content,"base64").toString("utf8").replace(/^\uFEFF/,""));}catch(e){if(!(e instanceof ApiError&&e.status===404))throw e}
 const current=!!(run&&active(run)&&session&&String(session.run_id)===String(run.id)&&session.active&&Date.parse(session.expires_at||"")>Date.now());
 const ts=current?session?.akses?.tailscale:null;
 const host=ts?.status==="ok"?ts.ip:null;
 const connection=host?{host,port:3389,username:session?.rdp_user||"xyadmin",password_required:true,transport:"tailscale"}:null;
 return reply({repo:c.repo,username:(await loadSettings(c.repo)).rdp_user,run,active:!!run&&active(run),session:current?{hostname:session?.hostname,started_at:session?.started_at,expires_at:session?.expires_at,username:session?.rdp_user}:null,connection,games:current?session?.games||null:null,media:current?session?.media||null:null,game_environment:current?session?.game_environment||null:null,server_time:new Date().toISOString(),phase:current?(connection?"ready":"preparing"):(run&&active(run)?"preparing":"stopped")});})}
