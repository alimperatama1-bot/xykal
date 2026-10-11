import {NextRequest,NextResponse} from "next/server";
import {getToken} from "next-auth/jwt";
import {dashboardRoute} from "./lib/dashboard-route";
export async function middleware(req:NextRequest){
 const token=await getToken({req,secret:process.env.NEXTAUTH_SECRET});
 const result=dashboardRoute(req.nextUrl.pathname,token?.authKind==='github'&&typeof token.login==='string'?token.login:null,token?.authKind==='admin');
 let response:NextResponse;
 if(result.kind==='reject')response=new NextResponse('Not found',{status:404});
 else if(result.kind==='login')response=NextResponse.redirect(new URL('/login',req.url));
 else if(result.kind==='redirect'||result.kind==='rewrite'){const url=req.nextUrl.clone();url.pathname=result.path;response=result.kind==='redirect'?NextResponse.redirect(url):NextResponse.rewrite(url)}
 else response=NextResponse.next();
 response.headers.set('Cache-Control','private, no-store');response.headers.set('X-Robots-Tag','noindex, nofollow');return response;
}
export const config={matcher:['/dashboard/:path*']};
