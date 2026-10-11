import {ApiError} from "./api";
export function validateDeleteTarget(repo:string,data:{id:number;full_name:string;owner:{id:number;type:string}},accountId:string){
 if(!Number.isSafeInteger(data.id)||data.id<=0||data.full_name!==repo||String(data.owner.id)!==accountId||data.owner.type!=="User")throw new ApiError(403,"Hanya repository aktif milik akun sendiri yang boleh dihapus");
 if(["xykal/xyrdp","xykal/xydesk-remote"].includes(repo.toLowerCase()))throw new ApiError(403,"Repository sumber layanan dilindungi dari penghapusan dashboard");
}
export function validateDeleteConfirmation(repo:string,data:Record<string,unknown>){
 if(data.confirmation!==repo||data.acknowledge!==true||typeof data.challenge!=="string")throw new ApiError(400,"Ketik nama repository lengkap dan setujui dampak penghapusan");
}
