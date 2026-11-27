import {readFile,writeFile,readdir,copyFile} from 'node:fs/promises';
const res='android/app/src/main/res';
const svg=await readFile('icon.svg','utf8');
const paths=[...svg.matchAll(/<path d="([^"]+)"[^>]*>/g)].map(m=>m[1]);
if(paths.length!==2)throw Error('Logo SVG inattendu');
const vector='<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="192" android:viewportHeight="192"><group android:scaleX=".72" android:scaleY=".72" android:pivotX="96" android:pivotY="96"><path android:fillColor="#FFFFFF" android:pathData="'+paths[0]+'"/><path android:strokeColor="#F97316" android:strokeWidth="15" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="'+paths[1]+'"/></group></vector>';
await writeFile(res+'/drawable-v24/ic_launcher_foreground.xml',vector);
await writeFile(res+'/drawable/ic_launcher_background.xml','<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#171717" android:pathData="M0,0H108V108H0Z"/></vector>');
for(const d of await readdir(res)){if(!/^mipmap-(mdpi|hdpi|xhdpi|xxhdpi|xxxhdpi)$/.test(d))continue;for(const file of await readdir(res+'/'+d)){if(/^ic_launcher(_round)?\.png$/.test(file))await copyFile('www/icon-192.png',res+'/'+d+'/'+file);}}
console.log('5ACHAT Android launcher branding applied');
