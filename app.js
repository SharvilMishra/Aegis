/p1/
const firebaseConfig={apiKey:"AIzaSyCcpIzXv-6BwVG1omd0djFu7T6FyIoa_pc",authDomain:"aegis-f36a6.firebaseapp.com",projectId:"aegis-f36a6",storageBucket:"aegis-f36a6.firebasestorage.app",messagingSenderId:"492241347617",appId:"1:492241347617:web:07666aadc7c9c8d052ef60"};
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth(),db=firebase.firestore(),storage=firebase.storage();

const OWNER_EMAIL='eng.sharvilmishra@gmail.com';
const ALLOWED_EMAILS=[OWNER_EMAIL,'sharvilm112@gmail.com'];
const GEMINI_KEY='AQ.Ab8RN6IAKrSnveTNMD4mJJR_BCVAnf5MZIzslbMUSdUT5fiwEg';

const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const app={user:null,isOwner:false,chats:[],activeChat:null};
let attachments=[],mediaStream=null,recognition=null;

const authScreen=$('#auth-screen'),appEl=$('#app'),sidebar=$('#sidebar'),
sidebarOverlay=$('#sidebar-overlay'),chatArea=$('#chat-area'),
welcomeState=$('#welcome-state'),messagesContainer=$('#messages-container'),
msgInput=$('#msg-input'),btnSend=$('#btn-send'),inputAttachments=$('#input-attachments'),
topbarTitle=$('#topbar-title'),userName=$('#user-name'),userRole=$('#user-role'),
userAvatar=$('#user-avatar'),userDropdown=$('#user-dropdown'),toastContainer=$('#toast-container');
/p2/
function toast(m,t=''){const e=document.createElement('div');e.className=`toast${t?' toast-'+t:''}`;e.textContent=m;toastContainer.appendChild(e);setTimeout(()=>e.remove(),3500)}
function openModal(id){$('#'+id).classList.remove('hidden')}
function closeModal(id){$('#'+id).classList.add('hidden')}
function toggleSidebar(){sidebar.classList.toggle('open');sidebarOverlay.classList.toggle('hidden')}
function formatContent(c){return c.replace(/```(\w*)\n([\s\S]*?)```/g,'<pre><code>$2</code></pre>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}

 $$('.modal-backdrop').forEach(b=>b.onclick=()=>b.closest('.modal').classList.add('hidden'));
 $$('.modal-close').forEach(b=>b.onclick=()=>b.closest('.modal').classList.add('hidden'));
 $('#btn-toggle-sidebar').onclick=toggleSidebar;
sidebarOverlay.onclick=toggleSidebar;
/p3/
function enterApp(user){
  app.user=user;app.isOwner=user.email===OWNER_EMAIL;
  authScreen.classList.add('hidden');appEl.classList.remove('hidden');
  userName.textContent=user.name;userRole.textContent=user.isOwner?'Owner':'User';
  userAvatar.textContent=user.name.charAt(0).toUpperCase();
  $$('.owner-only').forEach(el=>el.style.display=app.isOwner?'flex':'none');
  if(app.isOwner)loadUsers();loadChats();
}

 $('#btn-gmail-auth').onclick=async()=>{
  try{
    const provider=new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');provider.addScope('profile');
    const result=await auth.signInWithPopup(provider);
    const email=result.user.email;
    if(!ALLOWED_EMAILS.includes(email)){toast('Email not authorized','error');await auth.signOut();return}
    const name=result.user.displayName||email.split('@')[0];
    try{
      const d=await db.collection('users').doc(email).get();
      if(!d.exists)await db.collection('users').doc(email).set({name,email,role:email===OWNER_EMAIL?'owner':'user',createdAt:firebase.firestore.FieldValue.serverTimestamp(),lastLogin:firebase.firestore.FieldValue.serverTimestamp()});
      else await db.collection('users').doc(email).update({lastLogin:firebase.firestore.FieldValue.serverTimestamp()});
    }catch(e){console.warn(e)}
    enterApp({name,email,isOwner:email===OWNER_EMAIL});
  }catch(e){
    if(['auth/popup-closed-by-user','auth/cancelled-popup-request'].includes(e.code))return;
    toast(e.code==='auth/popup-blocked'?'Popup blocked — allow popups for this site':'Auth failed: '+e.message,'error');
  }
};
/p4/
 $('#btn-face-auth').onclick=async()=>{
  $('#face-scan-overlay').classList.remove('hidden');
  try{mediaStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}});$('#face-camera').srcObject=mediaStream;
    setTimeout(()=>{if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());$('#face-scan-overlay').classList.add('hidden');enterApp({name:'Sharvil',email:OWNER_EMAIL,isOwner:true})}},3000);
  }catch(e){toast('Camera access denied','error');$('#face-scan-overlay').classList.add('hidden')}
};
 $('#btn-cancel-face').onclick=()=>{$('#face-scan-overlay').classList.add('hidden');if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null}};

 $('#btn-voice-auth').onclick=()=>{
  $('#voice-scan-overlay').classList.remove('hidden');
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Speech recognition not supported','error');$('#voice-scan-overlay').classList.add('hidden');return}
  recognition=new SR();recognition.lang='en-US';
  recognition.onresult=e=>{const t=e.results[0][0].transcript.toLowerCase();$('#voice-scan-overlay').classList.add('hidden');
    if(t.includes('aegis')||t.includes('hello'))enterApp({name:'Sharvil',email:OWNER_EMAIL,isOwner:true});
    else toast('Voice not recognized','error')};
  recognition.onerror=()=>{toast('Voice recognition failed','error');$('#voice-scan-overlay').classList.add('hidden')};
  recognition.start();
};
 $('#btn-cancel-voice').onclick=()=>{$('#voice-scan-overlay').classList.add('hidden');if(recognition)recognition.abort()};

auth.onAuthStateChanged(async u=>{if(!u||app.user)return;
  enterApp({name:u.displayName||u.email.split('@')[0],email:u.email,isOwner:u.email===OWNER_EMAIL})});

 $('#btn-logout').onclick=async()=>{try{await auth.signOut()}catch(e){}app.user=null;app.isOwner=false;app.activeChat=null;appEl.classList.add('hidden');authScreen.classList.remove('hidden');toast('Logged out')};
/p5/
function loadChats(){
  const list=$('#chat-history-list');list.innerHTML='';
  const stored=JSON.parse(localStorage.getItem('aegis_chats')||'[]');app.chats=stored;
  stored.forEach((c,i)=>{const li=document.createElement('li');li.className=`sidebar-item${app.activeChat===i?' active':''}`;li.textContent=c.title||'New Chat';li.onclick=()=>selectChat(i);list.appendChild(li)});
  if(!stored.length)list.innerHTML='<li style="padding:10px 12px;font-size:12px;color:var(--text-dim)">No conversations yet</li>';
}
function selectChat(i){app.activeChat=i;topbarTitle.textContent=app.chats[i].title||'New Chat';welcomeState.classList.add('hidden');messagesContainer.classList.remove('hidden');renderMessages(app.chats[i].messages);loadChats()}
function renderMessages(msgs){messagesContainer.innerHTML='';if(!msgs||!msgs.length){messagesContainer.classList.add('hidden');welcomeState.classList.remove('hidden');return}msgs.forEach(m=>appendMsg(m.role,m.content,m.time,false))}

function appendMsg(role,content,time='',animate=true){
  welcomeState.classList.add('hidden');messagesContainer.classList.remove('hidden');
  const div=document.createElement('div');div.className=`msg msg-${role}`;if(!animate)div.style.animation='none';
  const t=time||new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const name=role==='user'?(app.user?.name||'You'):'Aegis';
  div.innerHTML=`<div class="msg-avatar">${role==='user'?(app.user?.name||'U').charAt(0):'A'}</div><div class="msg-body"><div class="msg-name">${name}</div><div class="msg-content">${formatContent(content)}</div><div class="msg-time">${t}</div></div>`;
  messagesContainer.appendChild(div);chatArea.scrollTop=chatArea.scrollHeight;
}

function showTyping(){const d=document.createElement('div');d.className='msg msg-ai';d.id='typing-indicator';d.innerHTML='<div class="msg-avatar">A</div><div class="msg-body"><div class="msg-name">Aegis</div><div class="msg-typing"><span></span><span></span><span></span></div></div>';messagesContainer.appendChild(d);chatArea.scrollTop=chatArea.scrollHeight}
function hideTyping(){const e=$('#typing-indicator');if(e)e.remove()}

async function sendMessage(){
  const text=msgInput.value.trim(),files=[...attachments];if(!text&&!files.length)return;
  msgInput.value='';msgInput.style.height='auto';btnSend.disabled=true;inputAttachments.innerHTML='';attachments=[];
  let content=text;files.forEach(f=>{if(f.type.startsWith('image/'))content+=`<br><img src="${f.data}" alt="${f.name}">`;else content+=`<br>📎 ${f.name}`});
  if(app.activeChat===null){app.chats.unshift({title:text.slice(0,40)||(files.length?'Media shared':'New Chat'),messages:[],created:Date.now()});app.activeChat=0;topbarTitle.textContent=app.chats[0].title;loadChats()}
  const now=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  appendMsg('user',content,now);app.chats[app.activeChat].messages.push({role:'user',content,time:now});saveChats();showTyping();
  const reply=await generateReply(text,files);hideTyping();const t2=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  appendMsg('ai',reply,t2);app.chats[app.activeChat].messages.push({role:'ai',content:reply,time:t2});saveChats();
}

function saveChats(){localStorage.setItem('aegis_chats',JSON.stringify(app.chats.slice(0,50)))}
/p6/
async function generateReply(text,files){
  try{
    const history=app.chats[app.activeChat]?.messages||[];
    const msgs=[{role:'user',parts:[{text:'You are Aegis, a private AI assistant. Be helpful, concise, and smart. Use markdown for code blocks. Keep answers clear and organized.'}]}];
    msgs.push({role:'model',parts:[{text:'Understood. I am Aegis, ready to help.'}]});
    const recent=history.slice(-10);
    recent.forEach(m=>{
      const role=m.role==='user'?'user':'model';
      let content=m.content.replace(/<[^>]*>/g,'');
      msgs.push({role,parts:[{text:content}]});
    });
    if(files.length&&files[0].type.startsWith('image/')){
      const base64=files[0].data.split(',')[1];
      msgs.push({role:'user',parts:[{text:text||'Describe this image.'},{inline_data:{mime_type:files[0].type,data:base64}}]});
    }else{
      msgs.push({role:'user',parts:[{text:text||'Hello'}]});
    }
    const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+GEMINI_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:msgs,generationConfig:{temperature:0.7,maxOutputTokens:1024}})});
    if(!res.ok){const err=await res.json();throw new Error(err.error?.message||'API error')}
    const data=await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text||'Sorry, I could not generate a response.';
  }catch(e){
    console.error('Gemini error:',e);
    return'Something went wrong. Please try again.\n\nError: '+e.message;
  }
}
/p7/
msgInput.oninput=()=>{msgInput.style.height='auto';msgInput.style.height=Math.min(msgInput.scrollHeight,150)+'px';btnSend.disabled=!msgInput.value.trim()&&!attachments.length};
msgInput.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}};
btnSend.onclick=sendMessage;
 $('#btn-new-chat').onclick=()=>{app.activeChat=null;topbarTitle.textContent='New Conversation';welcomeState.classList.remove('hidden');messagesContainer.classList.add('hidden');messagesContainer.innerHTML='';loadChats()};
 $$('.quick-action-btn').forEach(b=>b.onclick=()=>{msgInput.value=b.dataset.prompt;msgInput.dispatchEvent(new Event('input'));sendMessage()});

 $('#btn-attach').onclick=()=>{const inp=document.createElement('input');inp.type='file';inp.multiple=true;inp.accept='image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.apk';
  inp.onchange=e=>{[...e.target.files].forEach(f=>{const r=new FileReader();r.onload=ev=>{attachments.push({name:f.name,type:f.type,data:ev.target.result,size:f.size});renderAttachments()};r.readAsDataURL(f)})};inp.click()};
function renderAttachments(){
  inputAttachments.innerHTML='';
  attachments.forEach((a,i)=>{const d=document.createElement('div');d.className='attachment-preview';
    if(a.type.startsWith('image/'))d.innerHTML=`<img src="${a.data}" alt="${a.name}"><button class="attachment-remove" data-i="${i}">&times;</button>`;
    else d.innerHTML=`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text-dim);padding:4px;text-align:center;overflow:hidden">${a.name}</div><button class="attachment-remove" data-i="${i}">&times;</button>`;
    inputAttachments.appendChild(d)});
  btnSend.disabled=!msgInput.value.trim()&&!attachments.length;
  $$('.attachment-remove').forEach(b=>b.onclick=e=>{e.stopPropagation();attachments.splice(+b.dataset.i,1);renderAttachments()});
}
/p8/
 $('#btn-user-menu').onclick=e=>{e.stopPropagation();userDropdown.classList.toggle('hidden')};
document.onclick=()=>userDropdown.classList.add('hidden');
 $('#btn-settings').onclick=()=>{userDropdown.classList.add('hidden');openModal('modal-settings')};
 $('#btn-memory').onclick=()=>{userDropdown.classList.add('hidden');openModal('modal-memory')};
 $('#btn-manage-users').onclick=()=>{userDropdown.classList.add('hidden');openModal('modal-users')};

function loadUsers(){
  const list=$('#users-list');list.innerHTML='';
  const stored=JSON.parse(localStorage.getItem('aegis_users')||'[]');
  const all=[{name:'Sharvil',email:OWNER_EMAIL,role:'owner'},...stored];
  $('#users-count').textContent=`${all.length} / 10 users`;
  all.forEach((u,i)=>{const d=document.createElement('div');d.className='user-manage-card';
    d.innerHTML=`<div class="user-avatar">${u.name.charAt(0)}</div><div class="user-manage-info"><div class="user-manage-name">${u.name}</div><div class="user-manage-email">${u.email}</div></div><span class="user-manage-role">${u.role}</span>${u.role!=='owner'?`<div class="user-manage-actions"><button class="btn-remove-user" data-i="${i-1}" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`:''}`;
    list.appendChild(d)});
  $$('.btn-remove-user').forEach(b=>b.onclick=()=>{const users=JSON.parse(localStorage.getItem('aegis_users')||'[]');users.splice(+b.dataset.i,1);localStorage.setItem('aegis_users',JSON.stringify(users));loadUsers();toast('User removed','success')});
}
 $('#btn-add-user').onclick=()=>$('#add-user-form').classList.toggle('hidden');
 $('#btn-cancel-add-user').onclick=()=>$('#add-user-form').classList.add('hidden');
 $('#btn-confirm-add-user').onclick=()=>{
  const email=$('#new-user-email').value.trim();if(!email||!email.includes('@')){toast('Enter a valid email','error');return}
  const users=JSON.parse(localStorage.getItem('aegis_users')||'[]');
  if(users.length>=9){toast('Max 9 additional users','error');return}
  if(users.find(u=>u.email===email)){toast('Email already added','error');return}
  users.push({name:email.split('@')[0].replace(/[^a-z]/gi,' ').replace(/\b\w/g,c=>c.toUpperCase()),email,role:'user'});
  localStorage.setItem('aegis_users',JSON.stringify(users));$('#new-user-email').value='';$('#add-user-form').classList.add('hidden');loadUsers();toast('User added','success');
};

 $('#btn-clear-memory').onclick=()=>{localStorage.removeItem('aegis_memory');$('#memory-preferences').innerHTML='<span class="memory-tag">No preferences saved yet</span>';$('#memory-context').innerHTML='<span class="memory-tag">No context stored yet</span>';toast('Memory cleared','success')};

 $('#btn-camera-input').onclick=async()=>{openModal('modal-camera');try{mediaStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});$('#camera-feed').srcObject=mediaStream}catch(e){toast('Camera access denied','error');closeModal('modal-camera')}};
 $('#btn-capture').onclick=()=>{const v=$('#camera-feed'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);const d=c.toDataURL('image/jpeg',0.8);attachments.push({name:'capture.jpg',type:'image/jpeg',data:d,size:0});renderAttachments();if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null}closeModal('modal-camera');toast('Image captured','success')};
const closeCam=()=>{if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null}};
 $$('[data-modal="modal-camera"]').forEach(b=>b.onclick=()=>{closeCam();closeModal('modal-camera')});

 $$('.toggle-input').forEach(t=>{const s=localStorage.getItem('aegis_perm_'+t.id);if(s!==null)t.checked=s==='true';t.onchange=()=>localStorage.setItem('aegis_perm_'+t.id,t.checked)});
const ss=localStorage.getItem('aegis_style');if(ss)$('#setting-response-style').value=ss;
 $('#setting-response-style').onchange=e=>localStorage.setItem('aegis_style',e.target.value);
const sl=localStorage.getItem('aegis_lang');if(sl)$('#setting-language').value=sl;
 $('#setting-language').onchange=e=>localStorage.setItem('aegis_lang',e.target.value);

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
