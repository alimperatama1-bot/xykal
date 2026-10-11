
import {T} from "@/app/locale-provider";
import SetupPanel from "../setup-panel";
export default function Page(){return <><span className="eyebrow">Workspace / Setup</span><h1><T text={"Repository, lalu koneksi."}/></h1><p><T text={"Gunakan template XyRDP di akunmu, sambungkan secrets, dan periksa kesiapan workflow."}/></p><SetupPanel expanded/></>}
