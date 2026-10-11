import {NextRequest} from "next/server";
import {getToken} from "next-auth/jwt";
export async function GET(req:NextRequest){const present=req.cookies.getAll().some(c=>/^(__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(c.name));let token;try{token=await getToken({req,secret:process.env.NEXTAUTH_SECRET})}catch{}return Response.json({authenticated:!!token,reason:token?"session_valid":present?"session_expired_or_invalid":"no_session_cookie",expires_at:typeof token?.exp==="number"?new Date(token.exp*1000).toISOString():null},{headers:{"Cache-Control":"private, no-store"}})}
