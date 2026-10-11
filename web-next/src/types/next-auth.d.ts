import "next-auth";
declare module "next-auth" { interface Session { role: "admin" | "user" } }
