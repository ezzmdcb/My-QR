(async()=>{
const {db,$,esc,safeUrl,backendProblem,cardUrl,qrCanvas,initials}=QL;
function fail(m){$('notice').textContent=m;$('notice').classList.remove('hidden');$('publicCard').classList.add('hidden')}
try{
 const p=backendProblem();if(p)throw Error(p);
 const q=new URLSearchParams(location.search);const slug=(q.get('u')||'').toLowerCase(),id=q.get('id');
 if(!slug&&!id)throw Error('This profile link is incomplete.');
 let qb=db.from('cards').select('*');qb=slug?qb.eq('slug',slug):qb.eq('id',id);
 const {data:c,error}=await qb.maybeSingle();if(error)throw Error('Could not load this profile. Please try again.');
 if(!c||!c.is_active)throw Error('Profile not found or currently unavailable.');
 document.title=c.name+' — QRLink';document.querySelector('meta[name=description]').content=(c.bio||c.name+' on QRLink').slice(0,160);
 $('publicCard').dataset.theme=c.theme||'midnight';$('name').textContent=c.name;$('bio').textContent=c.bio||'';
 $('avatar').textContent=initials(c.name);if(c.photo_url){$('avatar').style.backgroundImage=`url("${c.photo_url}")`;$('avatar').textContent=''}
 $('contact').textContent=[c.email,c.phone].filter(Boolean).join(' · ');
 const track=(type,label)=>{try{db.rpc('track_event',{p_card:c.id,p_type:type,p_label:label||'',p_device:/Mobi|Android|iPhone/i.test(navigator.userAgent)?'mobile':'desktop'}).then(()=>{},()=>{})}catch{}};
 if(!sessionStorage.getItem('v_'+c.id)){sessionStorage.setItem('v_'+c.id,'1');track('view')}
 (Array.isArray(c.links)?c.links:[]).forEach(x=>{const u=safeUrl(x.url);if(!u)return;const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.innerHTML=`<span>${esc(x.label||'Link')}</span><b>↗</b>`;a.onclick=()=>track('click',x.label);$('links').append(a)});
 const shareUrl=c.slug?cardUrl(c.slug):location.href;
 const canvas=await qrCanvas(shareUrl,c.qr_dark||'#101827',c.qr_light||'#ffffff',230);$('qr').append(canvas);
 $('shareBtn').onclick=async()=>{try{if(navigator.share)await navigator.share({title:c.name+' — QRLink',url:shareUrl});else{await navigator.clipboard.writeText(shareUrl);$('shareBtn').textContent='Link copied ✓'}}catch{}};
 const v=s=>String(s||'').replace(/\\/g,'\\\\').replace(/[,;]/g,m=>'\\'+m).replace(/\r?\n/g,'\\n');
 $('contactBtn').onclick=()=>{const L=['BEGIN:VCARD','VERSION:3.0','FN:'+v(c.name),'N:'+v(c.name)+';;;;'];if(c.phone)L.push('TEL;TYPE=CELL:'+v(c.phone));if(c.email)L.push('EMAIL:'+v(c.email));L.push('URL:'+shareUrl);if(c.bio)L.push('NOTE:'+v(c.bio));L.push('END:VCARD');
  const u=URL.createObjectURL(new Blob([L.join('\r\n')],{type:'text/vcard'})),a=document.createElement('a');a.href=u;a.download=(c.name||'contact')+'.vcf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)};
}catch(e){fail(e.message)}
})();
