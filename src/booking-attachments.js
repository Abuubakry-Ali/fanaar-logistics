import { preparePhoto } from './customer-api';
export const BOOKING_ATTACHMENT_ACCEPT='.jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.docx,.xlsx';
export async function prepareBookingAttachment(file) {
  const extension=file.name.split('.').pop().toLowerCase();
  const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf',txt:'text/plain',csv:'text/csv',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
  const type=types[extension];
  if(!type)throw new Error('Choose JPG, PNG, WebP, PDF, TXT, CSV, DOCX or XLSX files.');
  let value;
  if(type.startsWith('image/'))value=await preparePhoto(file.type===type?file:new File([file],file.name,{type}));
  else {
    if(!file.size||file.size>1048576)throw new Error(`${file.name}: documents must be no larger than 1 MiB.`);
    const result=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('That file could not be read. Please choose it again.'));reader.readAsDataURL(file);});
    value={name:file.name.slice(0,160),type,dataBase64:result.split(',')[1]};
  }
  return {...value,key:crypto.randomUUID(),uploaded:false,size:Math.floor(value.dataBase64.length*3/4)};
}
