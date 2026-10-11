import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";
import nacl from "tweetnacl";
import {blake2b} from "blakejs";
function key(){if(!process.env.NEXTAUTH_SECRET)throw Error("Session secret missing");return createHash("sha256").update("rdpfree-password-vault-v1:"+process.env.NEXTAUTH_SECRET).digest()}
export function sealPassword(repo:string,password:string){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv);cipher.setAAD(Buffer.from(repo));const ct=Buffer.concat([cipher.update(password,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),ct]).toString("base64")}
export function openPassword(repo:string,payload:string){const raw=Buffer.from(payload,"base64"),dec=createDecipheriv("aes-256-gcm",key(),raw.subarray(0,12));dec.setAAD(Buffer.from(repo));dec.setAuthTag(raw.subarray(12,28));return Buffer.concat([dec.update(raw.subarray(28)),dec.final()]).toString("utf8")}
// GitHub uses libsodium crypto_box_seal: ephemeral Curve25519 key || XSalsa20-Poly1305 box,
// nonce = BLAKE2b(ephemeral_public || recipient_public, 24). Pure JS avoids runtime WASM compilation.
export function githubSealedBox(publicKey:string,value:string){const pk=new Uint8Array(Buffer.from(publicKey,"base64"));if(pk.length!==32)throw Error("Invalid repository public key");const ephemeral=nacl.box.keyPair();try{const nonce=blake2b(new Uint8Array([...ephemeral.publicKey,...pk]),undefined,24);const encrypted=nacl.box(new TextEncoder().encode(value),nonce,pk,ephemeral.secretKey);return Buffer.from([...ephemeral.publicKey,...encrypted]).toString("base64")}finally{ephemeral.secretKey.fill(0)}}
