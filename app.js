(async()=>{
const {db,$,esc,safeUrl,notice,hideNotice,backendProblem,cardUrl,contrast,qrCanvas,copy,downloadPng,downloadSvg,requireAuth,initials}=QL;
const form=$('cardForm');let links=[],photoBlob=null,photoUrl='',editId=new URLSearchParams(location.search).get('edit'),ownSlug='',slugOk=false,timer;
const problem=backendProblem();
$('modeBadge').textContent=problem?'Not connected':'Supabase connected';$('modeBadge').classList.add(problem?'error':'connected');
if(problem){notice(problem,'error');$('createBtn').disabled=true;return}
const session=await requireAuth();if(!session)return;
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function addLink(label='',url=''){links.push({id:uid(),label,url});renderRows()}
function renderRows(){const box=$('linksList');box.innerHTML='';links.forEach((l,i)=>{const r=document.createElement('div');r.className='link-row';
 r.innerHTML=`<div class="link-index">${String(i+1).padStart(2,'0')}</div><div class="link-fields"><input class="link-label" maxlength="40" placeholder="Link name" value="${esc(l.label)}"><input class="link-url" maxlength="500" placeholder="https://example.com/your-profile" value="${esc(l.url)}"></div><button type="button" class="remove-link" aria-label="Remove link">×</button>`;
 r.querySelector('.link-label').oninput=e=>{l.label=e.target.value;preview()};r.querySelector('.link-url').oninput=e=>{l.url=e.target.value;preview()};
 r.querySelector('.remove-link').onclick=()=>{links=links.filter(x=>x.id!==l.id);renderRows()};box.append(r)});
 $('linkCount').textContent=links.length+' link'+(links.length===1?'':'s');preview()}
async function preview(){
 const name=$('name').value.trim();$('previewCard').dataset.theme=$('theme').value;$('previewName').textContent=name||'Your Name';$('previewBio').textContent=$('bio').value.trim()||'Your short bio appears here';
 const src=photoBlob?URL.createObjectURL(photoBlob):photoUrl;const av=$('previewAvatar');av.textContent=src?'':initials(name);av.style.backgroundImage=src?`url("${src}")`:'';
 const em=$('email').value.trim(),ph=$('phone').value.trim();$('previewContact').textContent=[em,ph].filter(Boolean).join(' · ');
 const box=$('previewLinks');box.innerHTML='';const ok=links.filter(x=>x.label.trim()&&safeUrl(x.url));
 if(!ok.length)box.innerHTML='<div class="empty-links">Your links will appear here</div>';
 ok.forEach(x=>{const a=document.createElement('a');a.href=safeUrl(x.url);a.target='_blank';a.rel='noopener noreferrer';a.innerHTML=`<span>${esc(x.label)}</span><b>↗</b>`;box.append(a)});
 const d=$('qrDark').value,l=$('qrLight').value,ratio=contrast(d,l);
 $('qrWarn').textContent=ratio<4?'Low contrast — this QR may not scan. Pick a darker QR color or lighter background.':lum(d,l)?'Tip: a dark QR on a light background scans on every device.':'Good contrast — scans reliably.';
 $('qrWarn').className='field-help'+(ratio<4?' warn':'');
 const slug=$('slug').value.trim().toLowerCase();const c=await qrCanvas(cardUrl(slug||'yourname'),d,l,240);
 $('previewCard').querySelector('.qr-area').replaceChildren(Object.assign(document.createElement('div'),{className:'qr-generated'}));const g=$('previewCard').querySelector('.qr-generated');g.append(c);const s=document.createElement('small');s.textContent=slug?'Unique QR code':'Enter a username to finalize your QR';g.append(s)}
function lum(d,l){return lumOf(d)>lumOf(l)}
function lumOf(h){const m=/^#([0-9a-f]{6})$/i.exec(h);if(!m)return 0;return parseInt(m[1].substr(0,2),16)*.3+parseInt(m[1].substr(2,2),16)*.59+parseInt(m[1].substr(4,2),16)*.11}
$('slug').oninput=e=>{const v=e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,'');e.target.value=v;slugOk=false;const h=$('slugHint');clearTimeout(timer);
 if(!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(v)){h.textContent='3–30 characters: a-z, 0-9, - or _ (must start with a letter or number)';h.className='field-help';preview();return}
 if(v===ownSlug){slugOk=true;h.textContent='✓ This is your current username';h.className='field-help ok';preview();return}
 h.textContent='Checking…';timer=setTimeout(async()=>{const {data,error}=await db.rpc('slug_available',{p_slug:v});if($('slug').value!==v)return;slugOk=!error&&data===true;h.textContent=error?'Could not check availability.':slugOk?'✓ Available':'✗ Already taken or reserved';h.className='field-help '+(slugOk?'ok':'warn')},350);preview()};
['name','bio','email','phone','qrDark','qrLight','theme'].forEach(id=>{$(id).addEventListener('input',preview);$(id).addEventListener('change',preview)});
$('addLink').onclick=()=>addLink();
$('photo').onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(!/^image\/(png|jpeg|webp)$/.test(f.type)){notice('Choose a PNG, JPG or WebP image.','error');e.target.value='';return}
 const img=new Image();img.onload=()=>{const s=Math.min(1,800/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(b=>{photoBlob=b;preview()},'image/jpeg',.85)};img.onerror=()=>notice('That image could not be read.','error');img.src=URL.createObjectURL(f)};
if(editId){$('pageTitle').textContent='Edit your card';$('createBtn').innerHTML='Save changes <span>→</span>';
 const {data:c,error}=await db.from('cards').select('*').eq('id',editId).eq('user_id',session.user.id).maybeSingle();
 if(error||!c){notice('Card not found.','error');$('createBtn').disabled=true;return}
 $('name').value=c.name;$('bio').value=c.bio||'';$('email').value=c.email||'';$('phone').value=c.phone||'';$('slug').value=c.slug||'';ownSlug=c.slug||'';slugOk=true;
 $('qrDark').value=c.qr_dark;$('qrLight').value=c.qr_light;$('theme').value=c.theme;photoUrl=c.photo_url||'';links=(c.links||[]).map(l=>({id:uid(),label:l.label,url:l.url}))}
else{addLink('Instagram','');addLink('WhatsApp','')}
renderRows();
form.onsubmit=async e=>{e.preventDefault();hideNotice();$('result').classList.add('hidden');
 const name=$('name').value.trim(),slug=$('slug').value.trim().toLowerCase(),email=$('email').value.trim();
 if(!name)return notice('Please enter a display name.','error');
 if(!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(slug))return notice('Choose a valid username (3–30 characters: a-z, 0-9, - or _).','error');
 if(!slugOk)return notice('That username is not available. Try another one.','error');
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return notice('Please enter a valid email address.','error');
 const clean=links.map(x=>({label:x.label.trim(),url:safeUrl(x.url)})).filter(x=>x.label||x.url);
 if(clean.some(x=>!x.label||!x.url))return notice('Every link needs both a name and a valid URL.','error');
 const btn=$('createBtn');btn.disabled=true;btn.textContent='Saving…';
 try{let url=photoUrl;
  if(photoBlob){const path=`${session.user.id}/${uid()}.jpg`;const {error}=await db.storage.from('profile-photos').upload(path,photoBlob,{contentType:'image/jpeg'});if(error)throw new Error('Photo upload failed: '+error.message);url=db.storage.from('profile-photos').getPublicUrl(path).data.publicUrl}
  const row={name,slug,bio:$('bio').value.trim(),email,phone:$('phone').value.trim(),links:clean,photo_url:url||'',qr_dark:$('qrDark').value,qr_light:$('qrLight').value,theme:$('theme').value};
  let saved;if(editId){const {data,error}=await db.from('cards').update(row).eq('id',editId).select('id,slug').single();if(error)throw error;saved=data}
  else{const {data,error}=await db.from('cards').insert({...row,user_id:session.user.id}).select('id,slug').single();if(error)throw error;saved=data;editId=data.id;ownSlug=slug}
  ownSlug=slug;photoBlob=null;photoUrl=url||'';history.replaceState(null,'','create.html?edit='+saved.id);
  const link=cardUrl(slug),d=row.qr_dark,l=row.qr_light;
  $('result').innerHTML=`<div class="result-title">Your card is ready</div><div class="result-url">${esc(link)}</div><div class="result-buttons"><button class="button primary" id="rCopy">Copy link</button><a class="button secondary" href="${esc(link)}" target="_blank" rel="noopener">Open card</a><button class="button secondary" id="rPng">PNG</button><button class="button secondary" id="rSvg">SVG</button><button class="button secondary" id="rShare">Share</button><a class="button secondary" href="./dashboard.html">Dashboard</a></div>`;
  $('result').classList.remove('hidden');$('rCopy').onclick=ev=>copy(link,ev.target);$('rPng').onclick=()=>downloadPng(link,d,l,'qrlink-'+slug);$('rSvg').onclick=()=>downloadSvg(link,d,l,'qrlink-'+slug);
  $('rShare').onclick=async()=>{try{navigator.share?await navigator.share({title:name+' — QRLink',url:link}):copy(link,$('rShare'))}catch{}};
  notice('Saved successfully.','success');preview()
 }catch(err){let m=err.message||'Could not save the card.';if(err.code==='23505')m='That username was just taken. Try another one.';notice(m,'error')}
 finally{btn.disabled=false;btn.innerHTML=(editId?'Save changes':'Save & generate QR')+' <span>→</span>'}};
})();
