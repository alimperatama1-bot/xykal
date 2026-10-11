import {NextRequest} from "next/server";
import {identity} from "@/lib/identity";
import {appConfig,installation} from "@/lib/github-app";
import {guarded,reply} from "@/lib/api";
import {db} from "@/lib/db";
export async function GET(req:NextRequest){return guarded(async()=>{const who=await identity(req);if(who.kind==="admin")return reply({admin:true,connected:true,login:who.login});const config=await appConfig(),link=await installation(who.subject),repo=await db().prepare("SELECT repo FROM repositories WHERE subject=?").bind(who.subject).first<{repo:string}>();return reply({admin:false,login:who.login,configured:!!config,installed:!!link,connected:!!link&&!!repo,repo:repo?.repo||null,manage_url:config?"https://github.com/apps/"+config.slug+"/installations/new":null})})}
