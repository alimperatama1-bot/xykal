import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import {rateLimit} from "./db";
import {createHash,timingSafeEqual} from "node:crypto";
export const authOptions: NextAuthOptions = {
 secret: process.env.NEXTAUTH_SECRET,
 providers: [
 GitHubProvider({clientId: process.env.GITHUB_ID || "", clientSecret: process.env.GITHUB_SECRET || "", authorization: {params: {scope: "read:user"}}}),
 Credentials({name:"Admin",credentials:{email:{label:"Email",type:"email"},password:{label:"Password",type:"password"},turnstile:{label:"Turnstile",type:"text"}},async authorize(c,req){
  if(!c?.email||!c.password||!c.turnstile||c.password.length>256||c.turnstile.length>2048)return null;
  if(!process.env.ADMIN_PASSWORD_HASH||!process.env.ADMIN_EMAIL||!process.env.ADMIN_CREDENTIAL_VERSION||!process.env.TURNSTILE_SECRET_KEY)return null;
  const ip=String(req.headers?.["cf-connecting-ip"]||"unknown");
  const bucket=createHash("sha256").update(ip).digest("hex");
  if(!await rateLimit("admin:"+bucket,5,900))return null;
  const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:c.turnstile,remoteip:ip}),signal:AbortSignal.timeout(10000)});
  const check=await r.json();if(!check.success||check.hostname!=="rdpfree.projectkal.my.id"||check.action!=="admin_login")return null;
  const [salt,expected]=process.env.ADMIN_PASSWORD_HASH.split(":");
  if(!salt||!expected)return null;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(c.password),"PBKDF2",false,["deriveBits"]);
  const result=await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:100000,hash:"SHA-256"},key,256);
  const a=Buffer.from(result),z=Buffer.from(expected,"hex");
  if(a.length!==z.length||!timingSafeEqual(a,z)||c.email.trim().toLowerCase()!==process.env.ADMIN_EMAIL.toLowerCase())return null;
  return {id:"rdpfree-admin",name:"Admin",email:process.env.ADMIN_EMAIL};
 }})],
 session: {strategy: "jwt", maxAge: 30*24*60*60},
 pages: {signIn: "/login"},
 callbacks: {
  async jwt({token,account,profile,user}) {
   if(account?.provider === "github") {const avatar=(profile as {avatar_url?:string})?.avatar_url;token.picture=typeof avatar==="string"&&/^https:\/\/avatars\.githubusercontent\.com\//.test(avatar)?avatar:null;delete token.accessToken;token.login=(profile as {login?:string})?.login;token.githubId=account.providerAccountId;token.authKind="github";delete token.credVersion;}
   if(account?.provider === "credentials"&&user?.id==="rdpfree-admin"){token.authKind="admin";token.credVersion=process.env.ADMIN_CREDENTIAL_VERSION;token.login="Admin";delete token.accessToken;delete token.githubId;}
   if(token.authKind==="github")delete token.accessToken;
   token.role=token.authKind==="admin"&&!!process.env.ADMIN_CREDENTIAL_VERSION&&token.credVersion===process.env.ADMIN_CREDENTIAL_VERSION?"admin":"user";
   return token;
  },
  async session({session,token}) {if(session.user)session.user.name=String(token.login||session.user.name||"");if(session.user){session.user.image=typeof token.picture==="string"&&/^https:\/\/avatars\.githubusercontent\.com\//.test(token.picture)?token.picture:null;}session.role=token.role==="admin"?"admin":"user";return session;}
 }
};
