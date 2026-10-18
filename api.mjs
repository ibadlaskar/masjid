import {getStore} from "@netlify/blobs";
import crypto from "node:crypto";
export const config={path:"/api/*"};
const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json"}});
const H=(p,s)=>crypto.scryptSync(p,s,32).toString("hex");
const SER=/^[A-Za-z0-9_-]{1,20}$/, PUR=["monthly","donation","ramadan"];
export default async(req)=>{
 const st=getStore({name:"masjid",consistency:"strong"});
 const u=new URL(req.url),route=u.pathname.replace(/^\/api\//,"").replace(/\/$/,""),m=req.method,q=u.searchParams;
 let cfg=await st.get("config",{type:"json"});
 if(!cfg){const salt=crypto.randomBytes(16).toString("hex");cfg={id:"admin",salt,hash:H("admin123",salt),secret:crypto.randomBytes(32).toString("hex"),pv:1,def:true};await st.setJSON("config",cfg)}
 const sign=b=>crypto.createHmac("sha256",cfg.secret).update(b).digest("base64url");
 const pwOk=p=>{const a=Buffer.from(H(String(p||""),cfg.salt)),b=Buffer.from(cfg.hash);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
 const token=()=>{const b=Buffer.from(JSON.stringify({exp:Date.now()+12*36e5,pv:cfg.pv})).toString("base64url");return b+"."+sign(b)};
 const authed=()=>{try{const[b,s]=(req.headers.get("authorization")||"").replace("Bearer ","").split(".");if(!b||s!==sign(b))return false;const t=JSON.parse(Buffer.from(b,"base64url"));return t.exp>Date.now()&&t.pv===cfg.pv}catch{return false}};
 const body=(m==="POST")?await req.json().catch(()=>({})):{};
 const get=s=>st.get("m:"+s,{type:"json"});

 if(route==="member"&&m==="GET"){const d=SER.test(q.get("serial")||"")&&await get(q.get("serial"));if(!d)return J({error:"Not found"},404);delete d.phone;return J(d)}
 if(route==="report"&&m==="GET"){const l=await st.list({prefix:"m:"});const ms=(await Promise.all(l.blobs.map(b=>st.get(b.key,{type:"json"})))).filter(Boolean);return J({members:ms.map(d=>({serial:d.serial,name:d.name,fee:d.fee,start:d.start,payments:d.payments.map(p=>({amt:p.amt,date:p.date,purpose:p.purpose}))}))})}
 if(route==="login"&&m==="POST"){await new Promise(r=>setTimeout(r,500));if(body.id===cfg.id&&pwOk(body.password))return J({token:token(),def:!!cfg.def});return J({error:"Wrong user ID or password"},401)}
 if(!authed())return J({error:"Unauthorized"},401);

 if(route==="members"&&m==="GET"){const l=await st.list({prefix:"m:"});const ms=await Promise.all(l.blobs.map(b=>st.get(b.key,{type:"json"})));return J({members:ms.filter(Boolean),def:!!cfg.def})}
 if(route==="members"&&m==="POST"){const s=String(body.serial||"").trim();const fee=+body.fee;if(!SER.test(s)||!body.name||!(fee>0)||!/^\d{4}-\d{2}$/.test(body.start||""))return J({error:"Invalid details"},400);
  const old=await get(s);if(old&&!body.edit)return J({error:"Serial number already exists"},409);
  const d={serial:s,name:String(body.name).trim(),phone:String(body.phone||"").trim(),fee,start:body.start,payments:old?.payments||[]};await st.setJSON("m:"+s,d);return J(d)}
 if(route==="members"&&m==="DELETE"){await st.delete("m:"+q.get("serial"));return J({ok:1})}
 if(route==="payments"&&m==="POST"){const d=await get(String(body.serial||""));const amt=+body.amt;
  if(!d||!(amt>0)||!PUR.includes(body.purpose)||!/^\d{4}-\d{2}-\d{2}$/.test(body.date||""))return J({error:"Invalid payment"},400);
  const meta=(await st.get("meta",{type:"json"}))||{seq:0};meta.seq++;await st.setJSON("meta",meta);
  const p={id:"UAJM-"+String(meta.seq).padStart(5,"0"),amt,date:body.date,purpose:body.purpose,note:String(body.note||"").slice(0,80),ts:Date.now()};
  d.payments.push(p);await st.setJSON("m:"+d.serial,d);return J({payment:p,member:d})}
 if(route==="payments"&&m==="DELETE"){const d=await get(q.get("serial"));if(!d)return J({error:"Not found"},404);d.payments=d.payments.filter(p=>p.id!==q.get("id"));await st.setJSON("m:"+d.serial,d);return J({ok:1})}
 if(route==="password"&&m==="POST"){if(!pwOk(body.oldPassword))return J({error:"Current password is wrong"},400);
  if(String(body.newPassword||"").length<6)return J({error:"New password must be at least 6 characters"},400);
  const salt=crypto.randomBytes(16).toString("hex");cfg={...cfg,salt,hash:H(body.newPassword,salt),pv:cfg.pv+1,def:false,id:(body.newId||cfg.id).trim()};await st.setJSON("config",cfg);return J({token:token()})}
 return J({error:"Not found"},404);
};
