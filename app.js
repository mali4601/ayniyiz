
import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,onAuthStateChanged,setPersistence,browserLocalPersistence,GoogleAuthProvider,signInWithPopup}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import{getFirestore,doc,setDoc,getDoc,updateDoc,increment,arrayUnion}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import{getStorage,ref,uploadBytes,getDownloadURL}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig={
  apiKey:"AIzaSyAI31IV5RMxCLs5DiBaYjFVcHUFW5KDIeQ",
  authDomain:"ayniyiz-1a512.firebaseapp.com",
  projectId:"ayniyiz-1a512",
  storageBucket:"ayniyiz-1a512.firebasestorage.app",
  messagingSenderId:"926954313338",
  appId:"1:926954313338:web:006c9d26e7b8dae9860dc3",
  measurementId:"G-J6WPPNT26E"
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const storage=getStorage(app);
await setPersistence(auth,browserLocalPersistence);

window.currentUser=null;
window.pendingResult=null;

function creditHtml(v=0){
  return `<div class="creditBadge" onclick="location.href='kredi.html'" title="Kredi yükle">⚡ Kredin: ${v}</div>`;
}

function updateFriendGate(isLoggedIn){
  const gate=document.getElementById("friendLoginGate");
  const content=document.getElementById("friendContent");
  if(gate) gate.style.display=isLoggedIn ? "none" : "block";
  if(content) content.style.display=isLoggedIn ? "block" : "none";
}

function updateSettingsGate(isLoggedIn){
  const gate=document.getElementById("settingsLoginGate");
  const form=document.getElementById("settingsFormBox");
  if(gate) gate.style.display=isLoggedIn ? "none" : "block";
  if(form) form.style.display=isLoggedIn ? "block" : "none";
}

function renderLoggedOut(){
  const box=document.getElementById("userBox");
  if(box){
    box.innerHTML=`
      ${creditHtml(0)}
      <button onclick="loginWithGoogle()" style="background:rgba(255,255,255,.09)">Google ile Devam Et</button>
      <input type="email" id="email" placeholder="E-mail">
      <input type="password" id="password" placeholder="Şifre">
      <button onclick="loginUser()">Giriş Yap</button>
      <button onclick="registerUser()">Kayıt Ol</button>
    `;
  }
  document.querySelectorAll(".creditBadge").forEach(b=>{
    b.innerText="⚡ Kredin: 0";
    b.onclick=()=>location.href="kredi.html";
  });
  updateFriendGate(false);
  updateSettingsGate(false);
}

function renderLoggedIn(user,credits=0){
  const box=document.getElementById("userBox");
  if(box){
    const name=user.displayName || user.email || "Kullanıcı";
    box.innerHTML=`
      ${creditHtml(credits)}
      <div class="userEmail">${name}</div>
      <button onclick="logoutUser()">Çıkış Yap</button>
    `;
  }
  updateFriendGate(true);
  updateSettingsGate(true);
}

async function ensureUserDoc(user, provider="email"){
  const refDoc=doc(db,"users",user.uid);
  const snap=await getDoc(refDoc);

  if(!snap.exists()){
    await setDoc(refDoc,{
      uid:user.uid,
      email:user.email || "",
      displayName:user.displayName || "",
      photoURL:user.photoURL || "",
      provider:provider,
      credits:1,
      welcomeCreditsGiven:true,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),

      nickname:user.displayName || "",
      birthDate:"",
      gender:"",
      city:"",
      bio:"",
      interests:"",

      privacy:"public",
      messagePreference:"followers",
      notificationPreference:"on",

      solvedTests:[],
      following:[],
      followers:[],
      favorites:[],
      blockedUsers:[],

      verified:provider==="google",
      verificationMethod:provider
    },{merge:true});
    return 1;
  }

  const data=snap.data();
  const patch={
    updatedAt:new Date().toISOString()
  };

  if(!data.uid) patch.uid=user.uid;
  if(!data.email && user.email) patch.email=user.email;
  if(!data.displayName && user.displayName) patch.displayName=user.displayName;
  if(!data.nickname && user.displayName) patch.nickname=user.displayName;
  if(!data.photoURL && user.photoURL) patch.photoURL=user.photoURL;
  if(!data.provider) patch.provider=provider;
  if(data.credits===undefined){ patch.credits=1; patch.welcomeCreditsGiven=true; }

  if(data.birthDate===undefined) patch.birthDate="";
  if(data.gender===undefined) patch.gender="";
  if(data.city===undefined) patch.city="";
  if(data.bio===undefined) patch.bio="";
  if(data.interests===undefined) patch.interests="";
  if(data.privacy===undefined) patch.privacy="public";
  if(data.messagePreference===undefined) patch.messagePreference="followers";
  if(data.notificationPreference===undefined) patch.notificationPreference="on";
  if(data.solvedTests===undefined) patch.solvedTests=[];
  if(data.following===undefined) patch.following=[];
  if(data.followers===undefined) patch.followers=[];
  if(data.favorites===undefined) patch.favorites=[];
  if(data.blockedUsers===undefined) patch.blockedUsers=[];
  if(data.verified===undefined) patch.verified=provider==="google";
  if(data.verificationMethod===undefined) patch.verificationMethod=provider;

  if(Object.keys(patch).length>1) await setDoc(refDoc,patch,{merge:true});
  return data.credits===undefined ? 1 : (data.credits || 0);
}

window.refreshCredits=async()=>{
  if(!window.currentUser){
    document.querySelectorAll(".creditBadge").forEach(b=>{
      b.innerText="⚡ Kredin: 0";
      b.onclick=()=>location.href="kredi.html";
    });
    return;
  }
  try{
    const snap=await getDoc(doc(db,"users",window.currentUser.uid));
    const credits=snap.exists() ? (snap.data().credits || 0) : 0;
    document.querySelectorAll(".creditBadge").forEach(b=>{
      b.innerText="⚡ Kredin: "+credits;
      b.onclick=()=>location.href="kredi.html";
    });
  }catch(e){
    document.querySelectorAll(".creditBadge").forEach(b=>{
      b.innerText="⚡ Kredin: 0";
      b.onclick=()=>location.href="kredi.html";
    });
  }
}

async function afterLogin(user,msg,provider="email"){
  window.currentUser=user;
  renderLoggedIn(user,0);
  await ensureUserDoc(user,provider);
  await refreshCredits();
  await loadProfileSettings();
  closeAuthModal();
  alert(msg);
  if(window.pendingResult){
    await window.saveQuizResult(window.pendingResult);
    window.pendingResult=null;
  }
}

window.registerUser=async()=>{
  const email=document.getElementById("email")?.value || document.getElementById("modalEmail")?.value;
  const password=document.getElementById("password")?.value || document.getElementById("modalPassword")?.value;
  if(!email||!password) return alert("E-mail ve şifre gir.");
  try{
    const u=await createUserWithEmailAndPassword(auth,email,password);
    await afterLogin(u.user,"Kayıt başarılı ⚡ 1 kredi hesabına tanımlandı.","email");
  }catch(e){alert(e.message);}
}

window.loginUser=async()=>{
  const email=document.getElementById("email")?.value || document.getElementById("modalEmail")?.value;
  const password=document.getElementById("password")?.value || document.getElementById("modalPassword")?.value;
  if(!email||!password) return alert("E-mail ve şifre gir.");
  try{
    const u=await signInWithEmailAndPassword(auth,email,password);
    await afterLogin(u.user,"Giriş başarılı ⚡","email");
  }catch(e){alert(e.message);}
}

window.loginWithGoogle=async()=>{
  try{
    const provider=new GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});
    const u=await signInWithPopup(auth,provider);
    await afterLogin(u.user,"Google ile giriş başarılı ⚡","google");
  }catch(e){
    alert("Google girişi başarısız: "+e.message);
  }
}

window.logoutUser=async()=>{
  await signOut(auth);
  window.currentUser=null;
  renderLoggedOut();
}

window.openAuthModal=()=>document.getElementById("authModal")?.classList.add("show");
window.closeAuthModal=()=>document.getElementById("authModal")?.classList.remove("show");

window.addCredits=async(amount)=>{
  if(!window.currentUser){openAuthModal();return;}
  await updateDoc(doc(db,"users",window.currentUser.uid),{credits:increment(amount),updatedAt:new Date().toISOString()});
  await refreshCredits();
}

window.buyCredits=async(amount,price)=>{
  const box=document.getElementById("creditInfoBox");
  if(box){
    box.innerHTML=`<b>${amount} kredi / ${price} TL</b><br>Gerçek ödeme entegrasyonu yakında eklenecek. Demo için kredi ekleniyor.`;
  }
  await addCredits(amount);
  alert(amount+" kredi hesabına eklendi ⚡");
}

window.useCreditForTest=async()=>{
  if(!window.currentUser){openAuthModal();return false;}
  const refDoc=doc(db,"users",window.currentUser.uid);
  const snap=await getDoc(refDoc);
  const credits=snap.exists() ? (snap.data().credits || 0) : 0;
  if(credits<1){
    alert("Yeterli kredin yok, kredi yükleme sayfasına yönlendiriliyorsun.");
    location.href="kredi.html";
    return false;
  }
  await updateDoc(refDoc,{credits:increment(-1),updatedAt:new Date().toISOString()});
  await refreshCredits();
  return true;
}

window.saveQuizResult=async(payload)=>{
  const user=auth.currentUser;
  if(!user){window.pendingResult=payload;openAuthModal();return;}
  try{
    await updateDoc(doc(db,"users",user.uid),{solvedTests:arrayUnion(payload),updatedAt:new Date().toISOString()});
    alert("Sonucun kaydedildi ⚡");
  }catch(e){alert("Sonuç kaydedilemedi: "+e.message);}
}

window.uploadProfilePhoto=async()=>{
  if(!window.currentUser){openAuthModal();return;}
  const input=document.getElementById("profilePhotoFile");
  const status=document.getElementById("photoUploadStatus");
  if(!input || !input.files || !input.files[0]){
    alert("Önce bir fotoğraf seç.");
    return;
  }
  const file=input.files[0];
  if(!file.type.startsWith("image/")){
    alert("Lütfen görsel dosyası seç.");
    return;
  }
  if(file.size > 3 * 1024 * 1024){
    alert("Fotoğraf 3 MB altında olmalı.");
    return;
  }
  try{
    if(status) status.innerText="Fotoğraf yükleniyor...";
    const ext=(file.name.split(".").pop() || "png").toLowerCase();
    const storageRef=ref(storage,`profilePhotos/${window.currentUser.uid}/profile.${ext}`);
    await uploadBytes(storageRef,file);
    const url=await getDownloadURL(storageRef);
    await setDoc(doc(db,"users",window.currentUser.uid),{photoURL:url,updatedAt:new Date().toISOString()},{merge:true});
    const preview=document.getElementById("profilePhotoPreview");
    if(preview){
      preview.src=url;
      preview.style.display="block";
    }
    if(status) status.innerText="Fotoğraf yüklendi ⚡";
  }catch(e){
    if(status) status.innerText="Yükleme başarısız.";
    alert("Fotoğraf yüklenemedi: "+e.message);
  }
}

window.loadProfileSettings=async()=>{
  if(!window.currentUser) return;
  const form=document.getElementById("profileSettingsForm");
  if(!form) return;
  try{
    const snap=await getDoc(doc(db,"users",window.currentUser.uid));
    if(!snap.exists()) return;
    const d=snap.data();
    const fields=["nickname","birthDate","gender","city","bio","interests","privacy","messagePreference","notificationPreference"];
    fields.forEach(id=>{
      const el=document.getElementById(id);
      if(el && d[id]!==undefined) el.value=d[id];
    });
    const preview=document.getElementById("profilePhotoPreview");
    if(preview && d.photoURL){
      preview.src=d.photoURL;
      preview.style.display="block";
    }
  }catch(e){console.warn(e);}
}

window.saveProfileSettings=async()=>{
  if(!window.currentUser){openAuthModal();return;}
  const data={
    nickname:document.getElementById("nickname")?.value || "",
    birthDate:document.getElementById("birthDate")?.value || "",
    gender:document.getElementById("gender")?.value || "",
    city:document.getElementById("city")?.value || "",
    bio:document.getElementById("bio")?.value || "",
    interests:document.getElementById("interests")?.value || "",
    privacy:document.getElementById("privacy")?.value || "public",
    messagePreference:document.getElementById("messagePreference")?.value || "followers",
    notificationPreference:document.getElementById("notificationPreference")?.value || "on",
    updatedAt:new Date().toISOString()
  };
  try{
    await setDoc(doc(db,"users",window.currentUser.uid),data,{merge:true});
    alert("Profil ayarların kaydedildi ⚡");
    await loadProfileSettings();
  }catch(e){alert("Ayarlar kaydedilemedi: "+e.message);}
}

window.friendAction=(action,name)=>{
  alert(name+" için '"+action+"' işlemi sonraki sosyal modülde aktif edilecek.");
}

onAuthStateChanged(auth,async user=>{
  window.currentUser=user;
  if(!user){renderLoggedOut();return;}
  renderLoggedIn(user,0);
  try{
    const provider=user.providerData?.[0]?.providerId==="google.com" ? "google" : "email";
    await ensureUserDoc(user,provider);
    await refreshCredits();
    await loadProfileSettings();
  }catch(e){
    document.querySelectorAll(".creditBadge").forEach(b=>{
      b.innerText="⚡ Kredin: 0";
      b.onclick=()=>location.href="kredi.html";
    });
  }
});
