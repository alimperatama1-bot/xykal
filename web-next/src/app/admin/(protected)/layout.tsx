import Navigation from "@/app/dashboard/navigation";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {redirect} from "next/navigation";
export default async function Layout({children}:{children:React.ReactNode}){const session=await getServerSession(authOptions);if(session?.role!=="admin")redirect("/admin/login");return <><Navigation admin name={session.user?.name}/><main>{children}</main><footer>Credit: KallAncrit</footer></>}
