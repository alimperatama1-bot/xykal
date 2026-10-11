
import {T} from "@/app/locale-provider";
import CommunityStats from "./community-stats";
import GitHubIcon from "./github-icon";
import Link from "next/link";
import Navigation from "./dashboard/navigation";
import CommunitySupport from "./community-support";
import BrandSlider from "./brand-slider";
import TutorialVideo from "./tutorial-video";
import {tutorialVideo} from "@/lib/tutorial";
export default function Home(){return <main className="landing"><Navigation publicMode/><section className="hero"><span className="eyebrow">Your desktop. Your repository.</span><h1><T text={"Desktop kamu."}/><br/><span><T text={"Dari mana saja."}/></span></h1><p><T text={"Buat repository dari template XyRDP, atur sesi Windows, dan sambungkan melalui XyDesk Remote."}/></p><div className="actions"><Link href="/login" className="button github-cta"><GitHubIcon/><T text={"Mulai dengan GitHub →"}/></Link><a className="button secondary" href="https://github.com/xykal/XyRDP" target="_blank" rel="noreferrer"><T text={"Lihat template ↗"}/></a></div><CommunityStats/><p className="muted"><T text={"Workflow berjalan di akun GitHub kamu, mengikuti kuota dan kebijakan GitHub Actions."}/></p></section><BrandSlider/><div id="panduan"><TutorialVideo {...tutorialVideo}/></div><section className="landing-steps"><article><span>01</span><h2><T text={"Gunakan template"}/></h2><p><T text={"Pilih nama repository kamu sendiri."}/></p></article><article><span>02</span><h2><T text={"Izinkan repo, lalu setup"}/></h2><p><T text={"Pilih repo untuk GitHub App, lalu isi Tailscale auth key dan password."}/></p></article><article><span>03</span><h2><T text={"Hubungkan desktop"}/></h2><p><T text={"Jalankan workflow dan gunakan XyDesk Remote."}/></p></article></section><CommunitySupport/><footer>Credit: KallAncrit</footer></main>}
