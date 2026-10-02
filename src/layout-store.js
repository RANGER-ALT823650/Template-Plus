// PNG layouts quickly exceed localStorage's small quota. Keep full snapshots in
// IndexedDB, retaining the original localStorage key for small layouts/migration.
const KEY='template-plus-layout-v1';
let connection,queue=Promise.resolve();
function database(){
  if(!connection)connection=new Promise((resolve,reject)=>{const request=indexedDB.open('template-plus-designs',1);request.onupgradeneeded=()=>request.result.createObjectStore('layouts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  return connection;
}
async function stored(mode,value){
  const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('layouts',mode),store=tx.objectStore('layouts'),request=mode==='readonly'?store.get(KEY):store.put(value,KEY);tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存已中断'));});
}
export async function loadLayout(){
  try{const value=await stored('readonly');if(typeof value==='string')return value;}catch{}
  try{return localStorage.getItem(KEY);}catch{return null;}
}
export function saveLayout(value){
  let fallback=false;try{localStorage.setItem(KEY,value);fallback=true;}catch{try{localStorage.removeItem(KEY);}catch{}}
  const save=queue.catch(()=>{}).then(async()=>{try{await stored('readwrite',value);}catch(e){if(!fallback)throw e;}});
  queue=save;return save;
}
