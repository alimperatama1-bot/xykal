import {NextRequest} from "next/server";
import {getToken} from "next-auth/jwt";
import {ApiError} from "./api";
export async function identity(req:NextRequest){const t=await getToken({req,secret:process.env.NEXTAUTH_SECRET});
 if(t?.authKind==="admin"&&process.env.ADMIN_CREDENTIAL_VERSION&&t.credVersion===process.env.ADMIN_CREDENTIAL_VERSION)return {kind:"admin" as const,subject:"admin",id:"admin",login:"Admin"};
 if(t?.authKind==="github"&&typeof t.githubId==="string"&&/^\d+$/.test(t.githubId)&&typeof t.login==="string")return {kind:"user" as const,subject:"github:"+t.githubId,id:t.githubId,login:t.login};
 throw new ApiError(401,"Sesi dashboard tidak berlaku. Silakan masuk.");
}
export async function adminIdentity(req:NextRequest){const who=await identity(req);if(who.kind!=="admin")throw new ApiError(403,"Khusus admin");return who;}
