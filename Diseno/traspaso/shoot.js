// uso: node shoot.js <outdir> [filtro]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const RAIZ = '/home/user/Gestion-Productiva-2.0';
const ROOT = 'file://' + RAIZ;
const OUT = process.argv[2]; const FILT = process.argv[3] ? new RegExp(process.argv[3]) : null;
fs.mkdirSync(OUT, { recursive: true });
const STUB = fs.readFileSync(path.join(__dirname, 'stub.js'), 'utf8');
const EXCL = /(^|[\\/])(_backup|node_modules|\.git|tests)([\\/]|$)/;
const pags = [];
(function walk(d){ for (const f of fs.readdirSync(d)) { const p = path.join(d,f); if (EXCL.test(p)) continue;
  if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) pags.push(p); } })(RAIZ);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const vp of [{n:'d',w:1366,h:900},{n:'m',w:390,h:844}]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
    for (const p of pags) {
      const rel = path.relative(RAIZ, p); if (FILT && !FILT.test(rel)) continue;
      const pg = await ctx.newPage();
      await pg.route('**/*', r => { const u = r.request().url();
        if (/@supabase\/supabase-js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: STUB });
        if (/auth-guard\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: 'window.GP2_AUTH_ON=false;' });
        if (u.startsWith('file://')) return r.continue(); return r.abort(); });
      try { await pg.goto(ROOT + '/' + rel.split(path.sep).map(encodeURIComponent).join('/'), { waitUntil: 'load', timeout: 15000 }); await pg.waitForTimeout(500);
        const name = rel.replace(/[\/ ]/g,'_').replace('.html','') + '.' + vp.n + '.png';
        await pg.screenshot({ path: path.join(OUT, name), fullPage: vp.n==='m' ? false : false });
      } catch (e) { console.log('ERR', rel, e.message.split('\n')[0]); }
      await pg.close();
    }
    await ctx.close();
  }
  await b.close();
})();
