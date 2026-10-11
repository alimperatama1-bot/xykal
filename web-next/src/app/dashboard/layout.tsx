import CommunityPresence from "./community-presence";
import Navigation from "@/app/dashboard/navigation";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";
import ConnectionGate from "./connection-gate";
export default async function Layout({children}:{children:React.ReactNode}){const session=await getServerSession(authOptions);if(!session)redirect("/login");return <><Navigation name={session.user?.name} image={session.user?.image}/><main><ConnectionGate>{children}</ConnectionGate>{session.role!=="admin"&&<CommunityPresence/>}</main><footer>Credit: KallAncrit</footer></>}
