"use client";
import {T} from "@/app/locale-provider";

import GitHubIcon from "../github-icon";
import {signIn} from "next-auth/react";
export default function Button(){return <button className="github-cta" onClick={()=>signIn("github",{callbackUrl:"/dashboard"})}><GitHubIcon/><T text={"Login GitHub · identitas saja →"}/></button>}
