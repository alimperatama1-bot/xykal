"use client";
import {T} from "@/app/locale-provider";

import {signOut} from "next-auth/react";
export default function Logout(){return <button onClick={()=>signOut({callbackUrl:"/login"})}><T text={"Keluar"}/></button>}
