/* Shared helpers: Supabase client, escaping, URLs, QR rendering. */
(function(){
const cfg=window.QRLINK_CONFIG||{};
function norm(u){u=String(u||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u;try{return new URL(u).origin}catch{return ''}}
const url=norm(cfg.SUPABASE_URL), key=String(cfg.SUPABASE_ANON_KEY||'').trim();
const configured=Boolean(url&&key&&!/YOUR_/i.test(url+key));
const libLoaded=Boolean(window.supabase);
const db=configured&&libLoaded?window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(v){v=String(v||'').trim();if(!v)return '';try{const u=new URL(/^[a-z][a-z0-9+.-]*:/i.test(v)?v:'https://'+v);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}}
function notice(msg,type){const n=$('notice');if(!n)return;n.textContent=msg;n.className='notice '+(type||'');n.classList.remove('hidden')}
function hideNotice(){const n=$('notice');if(n)n.classList.add('hidden')}
function backendProblem(){if(!configured)return 'Add your Supabase URL and anon key to config.js, then reload.';if(!libLoaded)return 'Could not load the Supabase library. Check your connection and reload.';return ''}
function cardUrl(slug){const pretty=location.protocol==='https:'&&location.hostname!=='localhost';return pretty?location.origin+'/u/'+slug:new URL('card.html?u='+encodeURIComponent(slug),location.href).href}
function lum(h){const m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return 0;const c=[0,2,4].map(i=>parseInt(m[1].substr(i,2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function level(t){return t.length<200?'Q':t.length<500?'M':'L'}
async function qrCanvas(text,dark,light,width){const c=document.createElement('canvas');await window.QRLocal.toCanvas(c,text,{width:width||240,margin:2,errorCorrectionLevel:level(text),color:{dark,light}});return c}
function qrSvg(text,dark,light){return window.QRLocal.toString(text,{width:1000,margin:2,errorCorrectionLevel:level(text),color:{dark,light}})}
function save(href,name){const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove()}
async function downloadPng(text,dark,light,name){const c=await qrCanvas(text,dark,light,1000);save(c.toDataURL('image/png'),name+'.png')}
async function downloadSvg(text,dark,light,name){const s=await qrSvg(text,dark,light);const u=URL.createObjectURL(new Blob([s],{type:'image/svg+xml'}));save(u,name+'.svg');setTimeout(()=>URL.revokeObjectURL(u),1500)}
async function copy(t,btn){try{await navigator.clipboard.writeText(t)}catch{const x=document.createElement('textarea');x.value=t;document.body.append(x);x.select();try{document.execCommand('copy')}catch{}x.remove()}if(btn){const o=btn.textContent;btn.textContent='Copied ✓';setTimeout(()=>btn.textContent=o,1500)}}
async function requireAuth(){if(!db)return null;const {data}=await db.auth.getSession();if(data.session)return data.session;const here=location.pathname.split('/').pop()||'dashboard.html';location.replace('login.html?next='+encodeURIComponent(here+location.search));return null}
function initials(n){return String(n||'QR').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'QR'}
window.QL={db,configured,libLoaded,$,esc,safeUrl,notice,hideNotice,backendProblem,cardUrl,contrast,qrCanvas,qrSvg,downloadPng,downloadSvg,copy,requireAuth,initials};
})();
