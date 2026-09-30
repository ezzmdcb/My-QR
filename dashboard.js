(async()=>{
const {db,$,esc,notice,backendProblem,cardUrl,copy,downloadPng,downloadSvg,requireAuth}=QL;
const p=backendProblem();if(p){notice(p,'error');return}
const s=await requireAuth();if(!s)return;
$('who').textContent=s.user.email||'';
$('signOut').onclick=async e=>{e.preventDefault();await db.auth.signOut();location.replace('login.html')};
async function load(){
 const {data:cards,error}=await db.from('cards').select('id,name,slug,is_active,photo_url,qr_dark,qr_light').eq('user_id',s.user.id).order('created_at',{ascending:false});
 if(error)return notice(error.message,'error');
 const since=new Date(Date.now()-30*864e5).toISOString();
 const {data:ev}=await db.from('events').select('card_id,type').gte('created_at',since).limit(20000);
 const st={};(ev||[]).forEach(e=>{const o=st[e.card_id]||(st[e.card_id]={view:0,click:0});o[e.type]++});
 let v=0,c=0;Object.values(st).forEach(o=>{v+=o.view;c+=o.click});
 $('sCards').textContent=cards.length;$('sViews').textContent=v;$('sClicks').textContent=c;
 const box=$('cardList');box.innerHTML='';
 if(!cards.length){box.innerHTML='<div class="empty-state"><h3>No cards yet</h3><p>Create your first QR card in under a minute.</p><a class="button primary" href="./create.html">Create a card</a></div>';return}
 cards.forEach(k=>{const o=st[k.id]||{view:0,click:0},url=k.slug?cardUrl(k.slug):'';
  const row=document.createElement('div');row.className='card-row'+(k.is_active?'':' paused');
  row.innerHTML=`<div class="card-main"><div class="mini-avatar"${k.photo_url?` style="background-image:url('${esc(k.photo_url)}')"`:''}>${k.photo_url?'':esc(QL.initials(k.name))}</div><div><strong>${esc(k.name)}</strong><small>${k.slug?'/u/'+esc(k.slug):'no username'}${k.is_active?'':' · paused'}</small></div></div><div class="card-stats"><span>${o.view} views</span><span>${o.click} clicks</span></div><div class="card-actions"><a class="button secondary" href="./create.html?edit=${esc(k.id)}">Edit</a><a class="button secondary" href="${esc(url)}" target="_blank" rel="noopener">Open</a><button class="button secondary" data-a="copy">Copy link</button><button class="button secondary" data-a="png">PNG</button><button class="button secondary" data-a="svg">SVG</button><button class="button secondary" data-a="pause">${k.is_active?'Pause':'Activate'}</button><button class="button secondary danger" data-a="del">Delete</button></div>`;
  row.onclick=async e=>{const a=e.target.dataset?.a;if(!a)return;
   if(a==='copy')copy(url,e.target);
   if(a==='png')downloadPng(url,k.qr_dark,k.qr_light,'qrlink-'+k.slug);
   if(a==='svg')downloadSvg(url,k.qr_dark,k.qr_light,'qrlink-'+k.slug);
   if(a==='pause'){const {error}=await db.from('cards').update({is_active:!k.is_active}).eq('id',k.id);error?notice(error.message,'error'):load()}
   if(a==='del'&&confirm('Delete "'+k.name+'" permanently? Its QR code will stop working.')){const {error}=await db.from('cards').delete().eq('id',k.id);error?notice(error.message,'error'):load()}};
  box.append(row)});
}
load();
})();
