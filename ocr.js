let scriptPromise=null;
function library(){
 if(globalThis.Tesseract)return Promise.resolve(globalThis.Tesseract);
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('./vendor/tesseract/tesseract.min.js',location.href).href;s.onload=()=>globalThis.Tesseract?resolve(globalThis.Tesseract):reject(Error('OCR indisponible'));s.onerror=()=>{s.remove();reject(Error('Moteur OCR indisponible. Mettez à jour l’application.'));};document.head.append(s);}).catch(e=>{scriptPromise=null;throw e;});return scriptPromise;
}
export async function recognizeReceipt(file,onProgress=()=>{}){
 if(!file||file.size>8*1024*1024)throw Error('Image limitée à 8 Mo.');
 const bitmap=await createImageBitmap(file);let canvas;try{if(bitmap.width*bitmap.height>24000000)throw Error('Image trop grande');const ratio=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);}finally{bitmap.close();}
 const T=await library();let worker;try{
  worker=await T.createWorker(['fra','eng'],1,{workerPath:new URL('./vendor/tesseract/worker.min.js',location.href).href,corePath:new URL('./vendor/tesseract/core/',location.href).href,logger:m=>onProgress(m.status,Math.round((m.progress||0)*100))});
  const result=await worker.recognize(canvas);
  return {text:result.data.text,confidence:Math.round(result.data.confidence)};
 }finally{if(worker)await worker.terminate();}
}
