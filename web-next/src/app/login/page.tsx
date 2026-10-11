
import {T} from "@/app/locale-provider";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";
import Button from "./button";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(await getServerSession(authOptions)) redirect("/dashboard");
 const {error}=await searchParams;
 return <main className="login"><span className="eyebrow">RdpFree / Account</span><h1><T text={"Selamat datang kembali."}/></h1><p><T text={"Login hanya untuk identitas. Akses repository diminta terpisah setelah kamu masuk."}/></p><section className="card"><h2><T text={"Satu akun. Satu dashboard."}/></h2><p><T text={"Tahap 1: masuk dengan profil GitHub. Tahap 2: Install GitHub App dan pilih repository yang diizinkan."}/></p>{error&&<p className="error"><T text={"Login belum berhasil. Coba lagi atau periksa konfigurasi OAuth."}/></p>}<Button/></section><footer>Credit: KallAncrit</footer></main>
}
