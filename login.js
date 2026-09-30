(async()=>{
const {db,$,notice,backendProblem}=QL;let mode='in';
const p=backendProblem();if(p){notice(p,'error');$('submitBtn').disabled=true;$('googleBtn').disabled=true;return}
const next=(()=>{const n=new URLSearchParams(location.search).get('next')||'';return /^(dashboard|create)\.html(\?[\w=&%-]*)?$/.test(n)?n:'dashboard.html'})();
const {data}=await db.auth.getSession();if(data.session){location.replace(next);return}
function setMode(m){mode=m;$('authTitle').textContent=m==='in'?'Sign in':'Create account';$('submitBtn').textContent=m==='in'?'Sign in':'Create account';$('toggleMode').textContent=m==='in'?'New here? Create an account':'Have an account? Sign in';$('password').autocomplete=m==='in'?'current-password':'new-password'}
$('toggleMode').onclick=e=>{e.preventDefault();setMode(mode==='in'?'up':'in')};
$('authForm').onsubmit=async e=>{e.preventDefault();$('submitBtn').disabled=true;try{const email=$('email').value.trim(),password=$('password').value;
 if(mode==='in'){const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;location.replace(next)}
 else{const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:new URL('login.html',location.href).href}});if(error)throw error;if(data.session)location.replace(next);else notice('Account created. Check your email to confirm, then sign in.','success')}
}catch(err){notice(err.message||'Something went wrong.','error')}finally{$('submitBtn').disabled=false}};
$('googleBtn').onclick=async()=>{const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL(next,location.href).href}});if(error)notice(error.message,'error')};
$('forgot').onclick=async e=>{e.preventDefault();const email=$('email').value.trim();if(!email)return notice('Enter your email first.','error');const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:new URL('login.html',location.href).href});notice(error?error.message:'Password reset email sent.',error?'error':'success')};
})();
