import {ApiError} from './api';
export function validateJsonKeys(value:unknown,depth=0):void{
 if(depth>20)throw new ApiError(400,'JSON terlalu dalam');
 if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){
  if(['__proto__','prototype','constructor'].includes(key))throw new ApiError(400,'Nama parameter tidak diizinkan');
  validateJsonKeys(item,depth+1);
 }
}
export function redactSecrets(message:string){return message.replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|rdf_[A-Za-z0-9_-]{20,}|tskey-(?:auth|api)-[A-Za-z0-9_-]+)/g,'[redacted]')}
