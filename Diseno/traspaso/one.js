// node one.js <relpath> <out.png> <w> <h> [fullPage] [scrollY] [click]
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const [rel,out,w,h,full,sy,click] = process.argv.slice(2);
const STUB = fs.readFileSync(path.join(__dirname,'stub.js'),'utf8');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const pg=await (await b.newContext({viewport:{width:+w,height:+h}})).newPage();
 pg.on('pageerror',e=>console.log('PAGEERR',e.message));
 await pg.route('**/*', r=>{const u=r.request().url();
  if(/@supabase\/supabase-js/.test(u)) return r.fulfill({contentType:'application/javascript',body:STUB});
  if(/auth-guard\.js/.test(u)) return r.fulfill({contentType:'application/javascript',body:'window.GP2_AUTH_ON=false;'});
  if(u.startsWith('file://')) return r.continue(); return r.abort();});
 await pg.goto('file:///home/user/Gestion-Productiva-2.0/'+rel.split('/').map(encodeURIComponent).join('/').replace('%3F','?').replace('%3D','='),{waitUntil:'load'}); await pg.waitForTimeout(600);
 if(click){ await pg.click(click); await pg.waitForTimeout(300);}
 if(sy){ await pg.evaluate(y=>window.scrollTo(0,+y), sy); await pg.waitForTimeout(200);}
 await pg.screenshot({path:out, fullPage: full==='1'}); await b.close(); })();
