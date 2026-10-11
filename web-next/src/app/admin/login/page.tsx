
import {T} from "@/app/locale-provider";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";
import Form from "./form";
export const metadata={title:"Masuk",robots:{index:false,follow:false}};
export default async function Login(){const session=await getServerSession(authOptions);if(session?.role==="admin")redirect("/admin");return <main className="login"><span className="eyebrow">RdpFree / Private</span><h1><T text={"Masuk."}/></h1><section className="card"><Form siteKey={process.env.TURNSTILE_SITE_KEY||""}/></section></main>}
