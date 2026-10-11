import {NextRequest} from "next/server";
import {identity} from "@/lib/identity";
import {guarded,reply,origin,ApiError} from "@/lib/api";
import {db} from "@/lib/db";
export async function POST(req:NextRequest){return guarded(async()=>{origin(req);const who=await identity(req);if(who.kind!=="user")throw new ApiError(403,"Khusus pengguna GitHub App");await db().prepare("DELETE FROM app_installations WHERE subject=?").bind(who.subject).run();await db().prepare("DELETE FROM devices WHERE subject=?").bind(who.subject).run();return reply({ok:true,message:"Koneksi dashboard dan token perangkat dicabut. Uninstall app di GitHub untuk mencabut instalasinya juga."})})}
