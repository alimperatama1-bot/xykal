"use client";
import {createContext,useContext,useState,useEffect} from "react";
import messages from "@/lib/i18n/en.json";
import {detectLocale,type Locale} from "@/lib/i18n/locale";
const Context=createContext<{locale:Locale;choose:(value:Locale|'auto')=>void}>({locale:'id',choose:()=>{}});
export function translate(text:string,locale:Locale){const clean=text.replace(/\s+/g,' ').trim();const value=locale==='en'?(messages as Record<string,string>)[clean]||clean:clean;return (text.startsWith(' ')?' ':'')+value+(text.endsWith(' ')?' ':'')}
export function useLocale(){const c=useContext(Context);return {...c,t:(text:string)=>translate(text,c.locale)}}
export function T({text}:{text:unknown}){const {locale}=useContext(Context);return typeof text==='string'?translate(text,locale):text as React.ReactNode}
export default function LocaleProvider({initialLocale,children}:{initialLocale:Locale;children:React.ReactNode}){const [locale,setLocale]=useState(initialLocale);useEffect(()=>{document.documentElement.lang=locale},[locale]);function choose(value:Locale|'auto'){document.cookie=value==='auto'?'rdpfree_locale=; Path=/; Max-Age=0; SameSite=Lax; Secure':`rdpfree_locale=${value}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;setLocale(value==='auto'?detectLocale(navigator.languages.join(',')):value)}return <Context.Provider value={{locale,choose}}>{children}</Context.Provider>}
export function LanguageSwitcher(){const {locale,choose}=useContext(Context);return <div className="language-switcher" role="group" aria-label="Language / Bahasa"><button type="button" aria-pressed={locale==='id'} onClick={()=>choose('id')}>ID</button><button type="button" aria-pressed={locale==='en'} onClick={()=>choose('en')}>EN</button><button type="button" title="Follow browser language / Ikuti bahasa browser" onClick={()=>choose('auto')}>Auto</button></div>}

export function confirmLocalized(message:string){return window.confirm(translate(message,document.documentElement.lang==='en'?'en':'id'))}
