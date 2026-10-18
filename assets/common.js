const INR=n=>"₹"+Number(n||0).toLocaleString("en-IN");
const PUR={monthly:"Monthly Subscription",donation:"Donation",ramadan:"Ramadan Donation"};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
const nd=new Date(),curKey=nd.getFullYear()+"-"+String(nd.getMonth()+1).padStart(2,"0");
const mLabel=k=>{const[y,m]=k.split("-");return new Date(y,m-1,1).toLocaleString("en",{month:"long",year:"numeric"})};
function calc(d){
 const fee=+d.fee||0,ms=[];let[y,m]=(d.start||curKey).split("-").map(Number);const[cy,cm]=curKey.split("-").map(Number);
 while(y<cy||(y===cy&&m<=cm)){ms.push(y+"-"+String(m).padStart(2,"0"));if(++m>12){m=1;y++}}
 const mp=(d.payments||[]).filter(p=>p.purpose==="monthly"),paid=mp.reduce((s,p)=>s+p.amt,0),n=ms.length,bal=n*fee-paid;
 let run=0;const pre=mp.map(p=>run+=p.amt);
 const rows=ms.map((k,i)=>{const pd=Math.min(fee,Math.max(0,paid-i*fee)),j=pre.findIndex(x=>x>=(i+1)*fee);return{k,paid:pd,due:fee-pd,by:pd>=fee?mp[j]:null}});
 const arrears=Math.max(0,(n-1)*fee-paid);
 return{fee,paid,bal,arrears,cur:Math.max(0,Math.min(fee,n*fee-paid)),adv:Math.max(0,-bal),rows,all:d.payments||[]};
}
async function api(p,o={}){const t=sessionStorage.getItem("tok");
 const r=await fetch("/api/"+p,{method:o.method||"GET",headers:{"content-type":"application/json",...(t?{authorization:"Bearer "+t}:{})},body:o.body?JSON.stringify(o.body):undefined});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||"Error"),{status:r.status});return j}
const img=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=s});
function countUp(el,to,money){const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/1100),v=Math.round(to*(1-Math.pow(1-k,3)));el.textContent=money?INR(v):v.toLocaleString("en-IN");if(k<1)requestAnimationFrame(f)})(t0)}
function sky(el){let h='<div class="moon"></div><div class="lantern" style="left:7%"></div><div class="lantern" style="right:7%;animation-delay:1s"></div>';
 for(let i=0;i<24;i++)h+=`<i class="star" style="left:${Math.random()*100}%;top:${Math.random()*65}%;animation-delay:${Math.random()*3}s"></i>`;
 h+=`<svg class="skyline" viewBox="0 0 400 70" preserveAspectRatio="xMidYMax slice"><g fill="#0f6b4a"><rect y="52" width="400" height="18"/><path d="M150 52q50-70 100 0z"/><rect x="198" y="2" width="4" height="12"/><rect x="60" y="14" width="12" height="56"/><path d="M60 14l6-12 6 12z"/><rect x="328" y="14" width="12" height="56"/><path d="M328 14l6-12 6 12z"/><path d="M100 52q20-34 40 0zM260 52q20-34 40 0z"/></g><g class="win"><rect x="195" y="36" width="10" height="16" rx="5"/><rect x="63" y="28" width="6" height="10"/><rect x="331" y="28" width="6" height="10"/><rect x="113" y="42" width="6" height="10"/><rect x="273" y="42" width="6" height="10"/></g></svg>`;
 el.insertAdjacentHTML("afterbegin",h)}
async function receipt(o){
 const[lg,sg]=await Promise.all([img("assets/logo.svg"),img("assets/signature.svg")]);
 const W=900,H=640,c=document.createElement("canvas");c.width=W*2;c.height=H*2;const x=c.getContext("2d");x.scale(2,2);
 x.fillStyle="#fffdf5";x.fillRect(0,0,W,H);x.strokeStyle="#0f6b4a";x.lineWidth=5;x.strokeRect(14,14,W-28,H-28);x.strokeStyle="#c9a227";x.lineWidth=1.5;x.strokeRect(24,24,W-48,H-48);
 x.textAlign="center";if(lg)x.drawImage(lg,W/2-45,38,90,90);
 x.fillStyle="#0f6b4a";x.font="bold 30px Georgia,serif";x.fillText("Uttar Aloicherra Jame Masjid",W/2,160);
 x.fillStyle="#555";x.font="17px Arial";x.fillText("Aloicherra Part 4, 788165",W/2,186);
 x.fillStyle="#c9a227";x.fillRect(W/2-120,200,240,2);x.fillStyle="#1d2b24";x.font="bold 22px Arial";x.fillText("PAYMENT RECEIPT",W/2,236);
 x.textAlign="left";x.font="17px Arial";
 const L=[["Receipt No.",o.no],["Date",o.date],["Received from",o.name+"  (Serial #"+o.serial+")"],["Purpose",o.purpose],["Amount","₹ "+Number(o.amt).toLocaleString("en-IN")+"  /-"]];
 L.forEach((r,i)=>{const y=282+i*46;x.fillStyle="#66756d";x.fillText(r[0],70,y);x.fillStyle="#1d2b24";x.font=(i==4?"bold 24px":"17px")+" Arial";x.fillText(r[1],260,y);x.font="17px Arial";x.fillStyle="#e3dcc3";x.fillRect(70,y+12,W-140,1)});
 x.fillStyle="#66756d";x.font="italic 15px Arial";x.fillText("Received with thanks. May Allah accept your contribution.",70,540);
 if(sg)x.drawImage(sg,W-270,500,160,54);x.fillStyle="#1d2b24";x.fillRect(W-290,560,200,1);x.font="14px Arial";x.fillText("Authorised Signatory (Admin)",W-286,580);
 x.fillStyle="#999";x.font="12px Arial";x.fillText("This is a computer generated receipt.",70,596);
 const a=document.createElement("a");a.download=o.no+".png";a.href=c.toDataURL("image/png");a.click()}
