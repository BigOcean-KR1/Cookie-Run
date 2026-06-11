(()=>{
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
let W,H,DPR,GROUND;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
 cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);GROUND=H*0.80;}
addEventListener('resize',resize);resize();

const imgs=COOKIES.map(c=>{const i=new Image();i.src=c.img;return i;});
let selected=0;
const ITEM_IMG={};
['fire','magnet'].forEach(k=>{const i=new Image();i.src=ITEM_ICONS[k];ITEM_IMG[k]=i;});

document.getElementById('thumb0').src=COOKIES[0].img;
document.getElementById('thumb1').src=COOKIES[1].img;
document.querySelectorAll('.pick').forEach(p=>{
 p.onclick=()=>{document.querySelectorAll('.pick').forEach(x=>x.classList.remove('sel'));
  p.classList.add('sel');selected=+p.dataset.c;};});

const P={x:0,y:0,vy:0,w:90,h:96,jumps:0,sliding:false,hp:100,inv:0,
 mag:0,bag:0,bonus:0,dead:false,run:0,tilt:0,targetY:0};
let speed,baseSpeed,dist,score,picked,obs,items,parts,clouds,trees,fireflies,
    spawnT,itemT,running=false,heavenY=0,shake=0;
const GRAV=2600,JUMP=-900;

// 쓰레기 종류 / 음료수 종류
const TRASH=['butt','can','bottle','paper'];
const DRINK=['juice','soda','water'];

function reset(){
 P.x=W*0.22;P.y=GROUND;P.vy=0;P.jumps=0;P.sliding=false;P.hp=100;P.inv=0;
 P.mag=0;P.bag=0;P.bonus=0;P.dead=false;P.run=0;P.tilt=0;
 baseSpeed=360;speed=baseSpeed;dist=0;score=0;picked=0;
 obs=[];items=[];parts=[];spawnT=0.5;itemT=0.6;heavenY=0;shake=0;
 clouds=[];for(let i=0;i<6;i++)clouds.push({x:Math.random()*W,y:40+Math.random()*H*0.35,s:0.5+Math.random()});
 trees=[];for(let i=0;i<4;i++)trees.push({x:Math.random()*W,s:0.8+Math.random()*0.6});
 fireflies=[];for(let i=0;i<30;i++)fireflies.push({x:Math.random()*W,y:Math.random()*H,ph:Math.random()*6,sp:0.3+Math.random()});
}

function jump(){if(P.dead||P.bonus>0)return;if(P.sliding){P.sliding=false;return;}
 if(P.jumps<2){P.vy=JUMP;P.jumps++;burst(P.x,P.y,'#fff',6);}}
function slideOn(){if(!P.dead&&P.bonus<=0&&P.y>=GROUND-2)P.sliding=true;}
function slideOff(){P.sliding=false;}
addEventListener('keydown',e=>{if(e.repeat)return;
 if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jump();}
 if(e.code==='ArrowDown'){e.preventDefault();slideOn();}});
addEventListener('keyup',e=>{if(e.code==='ArrowDown')slideOff();});
const jz=document.getElementById('jumpZone'),sz=document.getElementById('slideZone');
jz.addEventListener('touchstart',e=>{e.preventDefault();jump();},{passive:false});
sz.addEventListener('touchstart',e=>{e.preventDefault();slideOn();},{passive:false});
sz.addEventListener('touchend',slideOff);
jz.addEventListener('mousedown',jump);sz.addEventListener('mousedown',slideOn);
addEventListener('mouseup',slideOff);

function burst(x,y,c,n){for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-.5)*320,vy:-Math.random()*340,life:.5,c,r:3+Math.random()*3});}
function banner(txt){const b=document.getElementById('banner');b.textContent=txt;
 b.classList.remove('show');void b.offsetWidth;b.classList.add('show');b.style.opacity=1;
 clearTimeout(b._t);b._t=setTimeout(()=>b.style.opacity=0,1100);}

function mkItem(t,x,y){return {kind:'power',type:t,x,y,r:16};}
function addTrash(x,y){items.push({kind:'trash',type:TRASH[Math.floor(Math.random()*TRASH.length)],x,y,r:13,rot:Math.random()*6});}
function addDrink(x,y){items.push({kind:'drink',type:DRINK[Math.floor(Math.random()*DRINK.length)],x,y,r:15,rot:0});}

// 점프 포물선을 따라 쓰레기 깔기 (gap=장애물 폭). 점프 물리에 맞춘 곡선.
function trashArc(x0,gap,peak){
 const n=Math.max(5,Math.round(gap/46));
 for(let i=0;i<=n;i++){const t=i/n;
  // 0~1 구간 포물선: 4t(1-t) → 최고점 peak
  const h=4*t*(1-t)*peak;
  addTrash(x0+t*gap, GROUND-46-h);}
}

function spawnPattern(){
 const r=Math.random();
 // 가끔 파워업 단독 등장
 if(r<0.05){items.push(mkItem('fire',W+60,GROUND-120));return;}
 if(r<0.10){items.push(mkItem('bag',W+60,GROUND-120));return;}
 if(r<0.14){items.push(mkItem('magnet',W+60,GROUND-120));return;}
 if(r<0.18){items.push(mkItem('heart',W+60,GROUND-120));return;}

 const o=Math.random();
 if(o<0.34){ // 큰 상자: 넘는 점프 궤적 따라 쓰레기
  const bx=W+60;obs.push({type:'box',x:bx,y:GROUND,w:80,h:105});
  trashArc(bx-90, 260, 200);
 } else if(o<0.62){ // 넓은 구덩이: 2단 점프 궤적 따라 쓰레기
  const pw=210+Math.random()*100, bx=W+60;
  obs.push({type:'pit',x:bx,y:GROUND,w:pw});
  trashArc(bx-70, pw+140, 300);   // 높이 큰 포물선(2단 점프 유도)
 } else if(o<0.82){ // 박쥐(슬라이드): 낮게 깔린 쓰레기 줄
  const bx=W+60;obs.push({type:'bat',x:bx,y:GROUND-120,w:95,h:62,ph:0});
  for(let i=0;i<7;i++)addTrash(bx-100+i*40, GROUND-46);
 } else { // 평지: 물결 쓰레기 줄
  const tier=Math.random();const baseY=tier<0.5?GROUND-46:(tier<0.85?GROUND-150:GROUND-280);
  const n=6+Math.floor(Math.random()*3);const arcH=baseY<GROUND-200?40:60;
  for(let i=0;i<n;i++){const arc=Math.sin(i/(n-1)*Math.PI)*arcH;addTrash(W+40+i*46, baseY-arc);}
 }
}

function update(dt){
 dist+=speed*dt;P.run+=dt*(speed/baseSpeed)*9;
 if(P.bonus>0){
  P.bonus-=dt;heavenY=Math.min(heavenY+dt*1.6,1);itemT-=dt;
  if(itemT<=0){itemT=0.16;const yy=H*0.14+Math.random()*H*0.5;addDrink(W+30,yy);}
  P.targetY=H*0.42+Math.sin(P.run*0.6)*60;P.y+=(P.targetY-P.y)*0.08;P.hp=Math.min(100,P.hp+dt*4);
  if(P.bonus<=0){heavenY=0;itemT=0.6;P.y=GROUND;P.vy=0;}
 } else {
  heavenY=Math.max(heavenY-dt*1.6,0);
  // 진행할수록 점진 가속 (기본 360 → 최대 1050)
  speed=Math.min(baseSpeed+dist*0.018,1050);
  P.hp-=dt*2.2;
  P.vy+=GRAV*dt;P.y+=P.vy*dt;
  let onPit=obs.some(o=>o.type==='pit'&&P.x>o.x&&P.x<o.x+o.w);
  if(P.y>=GROUND&&!onPit){P.y=GROUND;P.vy=0;P.jumps=0;}
  if(P.y>GROUND+90){
   if(P.inv<=0){P.hp-=30;P.inv=1.5;shake=0.4;banner('⚠️ 구덩이!');burst(P.x,GROUND,'#ff5a5a',12);}
   P.y=GROUND;P.vy=JUMP*0.6;P.jumps=1;
  }
  spawnT-=dt;
  if(spawnT<=0){spawnPattern();spawnT=(1.3+Math.random()*0.7)*(baseSpeed/speed)+0.3;}
 }
 if(P.mag>0)P.mag-=dt;if(P.bag>0)P.bag-=dt;if(P.inv>0)P.inv-=dt;if(shake>0)shake-=dt;
 const wantTilt=P.sliding?-0.5:(P.y<GROUND-5&&P.bonus<=0?-0.12:0.06);P.tilt+=(wantTilt-P.tilt)*0.2;
 const sc=P.bonus>0?speed*1.3:speed;
 obs.forEach(o=>o.x-=sc*dt);obs=obs.filter(o=>o.x+(o.w||0)>-60);
 obs.forEach(o=>{if(o.type==='bat'){o.ph+=dt*4;o.y=GROUND-120+Math.sin(o.ph)*24;}});
 clouds.forEach(c=>{c.x-=sc*dt*0.12*c.s;if(c.x<-120)c.x=W+120;});
 trees.forEach(t=>{t.x-=sc*dt*0.4;if(t.x<-160)t.x=W+Math.random()*200;});
 fireflies.forEach(f=>{f.x-=sc*dt*0.3;f.ph+=dt*f.sp*3;if(f.x<-10){f.x=W+10;f.y=Math.random()*H;}});
 const cur=COOKIES[selected];const scale=cur.scale;
 const ph=(P.sliding?P.h*0.5:P.h)*scale, pw=P.w*scale;
 const cyMid=P.y-ph/2;
 // 자석: 끌어당김 / 비닐봉투: 강한 일괄 흡입
 const pull = P.bag>0 ? 0.30 : (P.mag>0 ? 0.14 : 0);
 const radius = P.bag>0 ? 9999 : (P.mag>0 ? 260 : 0);
 if(pull>0){for(const it of items){if(it.kind==='trash'||it.kind==='drink'){
  const d=Math.hypot(it.x-P.x,it.y-cyMid);if(d<radius){it.x+=(P.x-it.x)*pull;it.y+=(cyMid-it.y)*pull;}}}}
 // 장애물 충돌
 if(P.bonus<=0){const px=P.x-pw/2,py=P.y-ph;
  for(const o of obs){if(o.type==='pit')continue;
   if(px<o.x+o.w&&px+pw>o.x&&py<o.y&&py+ph>o.y-o.h){
    if(P.inv<=0){P.hp-=22;P.inv=1.2;shake=0.3;burst(P.x,P.y-40,'#ff5a5a',10);}}}}
 // 획득
 const py=P.y-ph;
 items=items.filter(it=>{
  if(Math.abs(it.x-P.x)<pw/2+it.r+6 && it.y>py-it.r-6 && it.y<P.y+it.r+6){pick(it);return false;}
  return true;});
 score+=sc*dt*0.05;
 document.getElementById('score').textContent=Math.floor(score);
 document.getElementById('hp').style.width=Math.max(0,P.hp)+'%';
 if(P.hp<=0&&!P.dead){P.dead=true;running=false;over();}
}
function pick(it){
 if(it.kind==='trash'){score+=10;picked++;P.hp=Math.min(100,P.hp+0.6);burst(it.x,it.y,'#9be29b',4);}
 else if(it.kind==='drink'){score+=20;P.hp=Math.min(100,P.hp+1.5);burst(it.x,it.y,'#7ad0ff',5);}
 else if(it.type==='heart'){P.hp=Math.min(100,P.hp+26);burst(it.x,it.y,'#ff7a7a',8);banner('💗 회복!');}
 else if(it.type==='bag'){P.bag=4;burst(it.x,it.y,'#7ad0ff',16);banner('🛍️ 일괄 흡입!');shake=0.2;}
 else if(it.type==='magnet'){P.mag=7;burst(it.x,it.y,'#ff5a5a',14);banner('🧲 자석!');}
 else if(it.type==='fire'){P.bonus=7;P.inv=0;burst(it.x,it.y,'#ffd23c',24);banner('☀️ BONUS TIME!');shake=0.3;}
}

function draw(){
 ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake*30,(Math.random()-.5)*shake*30);
 drawBackground();
 for(const it of items)drawItem(it);
 if(P.bonus<=0)for(const o of obs)drawObs(o);
 for(const p of parts){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();ctx.globalAlpha=1;}
 drawCookie();ctx.restore();
}
function drawBackground(){
 const h=heavenY;
 const g=ctx.createLinearGradient(0,0,0,H);
 // 천국: 더 밝고 따뜻하게 (위 하늘파랑 → 아래 솜사탕핑크/크림)
 g.addColorStop(0,mix('#0c1530','#d4f0ff',h));
 g.addColorStop(0.5,mix('#142447','#fff4dc',h));
 g.addColorStop(1,mix('#1d2a4d','#ffe0ef',h));
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // 천국 빛줄기 (더 부드럽고 환하게)
 if(h>0.05){ctx.save();ctx.globalAlpha=h*0.55;
  for(let i=0;i<7;i++){const x=W*(i/7)+(P.run*8)%(W/7);const grd=ctx.createLinearGradient(x,0,x+80,H);
   grd.addColorStop(0,'rgba(255,255,240,.6)');grd.addColorStop(1,'rgba(255,255,240,0)');ctx.fillStyle=grd;ctx.fillRect(x,0,80,H);}ctx.restore();}
 // 반짝임(천국)
 if(h>0.3){ctx.save();ctx.globalAlpha=(h-0.3)*0.9;
  for(const f of fireflies){const a=(Math.sin(f.ph)*0.5+0.5);ctx.fillStyle='rgba(255,255,255,'+a+')';
   ctx.beginPath();ctx.arc(f.x,(f.y*0.6),1.8+a*1.5,0,7);ctx.fill();}ctx.restore();}
 // 구름 (천국이면 크고 폭신하게)
 for(const c of clouds){const cs=c.s*(1+h*0.6);
  ctx.fillStyle='rgba(255,255,255,'+(0.35+h*0.55)+')';
  ctx.beginPath();ctx.ellipse(c.x,c.y,46*cs,18*cs,0,0,7);
  ctx.ellipse(c.x+28*cs,c.y-9,30*cs,14*cs,0,0,7);
  ctx.ellipse(c.x-26*cs,c.y-4,26*cs,13*cs,0,0,7);ctx.fill();}
 if(h<0.9){ctx.globalAlpha=1-h;
  for(const f of fireflies){const a=(Math.sin(f.ph)*0.5+0.5);ctx.fillStyle='rgba(150,255,210,'+a*0.8+')';ctx.beginPath();ctx.arc(f.x,f.y,2.2,0,7);ctx.fill();}
  for(const t of trees){ctx.fillStyle='rgba(8,16,30,.85)';const tw=70*t.s;ctx.fillRect(t.x,0,tw,GROUND);
   ctx.fillStyle='rgba(120,200,220,.25)';ctx.fillRect(t.x,GROUND-30,tw,30);}ctx.globalAlpha=1;}
 // 바닥 (천국이면 폭신한 구름 바닥)
 if(h<0.95){ctx.globalAlpha=1-h*0.6;
  ctx.fillStyle=mix('#243a2e','#ffffff',h);ctx.fillRect(0,GROUND,W,H-GROUND);
  ctx.fillStyle=mix('#3a6b4a','#ffe6f4',h);ctx.fillRect(0,GROUND,W,12);
  ctx.strokeStyle='rgba(0,0,0,'+(0.18*(1-h))+')';ctx.lineWidth=3;const off=(P.run*30)%70;
  for(let x=-off;x<W;x+=70){ctx.beginPath();ctx.moveTo(x,GROUND+28);ctx.lineTo(x+34,GROUND+28);ctx.stroke();}ctx.globalAlpha=1;}
 // 천국 구름 바닥 덩어리
 if(h>0.4){ctx.save();ctx.globalAlpha=(h-0.4)*1.4;ctx.fillStyle='rgba(255,255,255,.9)';
  const off=(P.run*20)%180;
  for(let x=-off;x<W+180;x+=180){ctx.beginPath();
   ctx.arc(x,H-20,70,Math.PI,0);ctx.arc(x+70,H-10,55,Math.PI,0);ctx.fill();}ctx.restore();}
}
function drawObs(o){
 if(o.type==='box'){ctx.fillStyle='#3a2a55';ctx.fillRect(o.x,o.y-o.h,o.w,o.h);
  ctx.fillStyle='#52407a';ctx.fillRect(o.x,o.y-o.h,o.w,9);ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=2;ctx.strokeRect(o.x,o.y-o.h,o.w,o.h);
  ctx.fillStyle='#7ad0ff';ctx.beginPath();ctx.arc(o.x+o.w/2,o.y-o.h/2,7,0,7);ctx.fill();}
 if(o.type==='bat'){ctx.fillStyle='#2a1a45';const cx=o.x+o.w/2,cy=o.y-o.h/2,fl=Math.sin(o.ph*2)*16;
  const bw=o.w/2.2, bh=o.h/2.2, wing=o.w*0.5;
  ctx.beginPath();ctx.ellipse(cx,cy,bw,bh,0,0,7);ctx.fill();
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo(cx-wing*0.85,cy-22-fl,cx-wing,cy+10);ctx.quadraticCurveTo(cx-wing*0.5,cy+3,cx,cy);ctx.fill();
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.quadraticCurveTo(cx+wing*0.85,cy-22-fl,cx+wing,cy+10);ctx.quadraticCurveTo(cx+wing*0.5,cy+3,cx,cy);ctx.fill();
  ctx.fillStyle='#ff5a5a';ctx.beginPath();ctx.arc(cx-7,cy-3,4.5,0,7);ctx.arc(cx+7,cy-3,4.5,0,7);ctx.fill();}
 if(o.type==='pit'){ctx.fillStyle='#060a14';ctx.fillRect(o.x,GROUND,o.w,H-GROUND);
  ctx.strokeStyle='rgba(120,200,220,.4)';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(o.x,GROUND);ctx.lineTo(o.x,H);ctx.moveTo(o.x+o.w,GROUND);ctx.lineTo(o.x+o.w,H);ctx.stroke();}
}
function drawItem(it){
 const x=it.x,y=it.y;
 if(it.kind==='trash'){drawTrash(it);return;}
 if(it.kind==='drink'){drawDrink(it);return;}
 if(it.type==='heart'){ctx.fillStyle='#ff6a8a';glow(x,y,'#ff7aa0');heart(x,y,it.r);}
 else if(it.type==='bag'){drawBag(x,y,it.r);}
 else if(ITEM_IMG[it.type]&&ITEM_IMG[it.type].complete&&ITEM_IMG[it.type].naturalWidth){
  const im=ITEM_IMG[it.type];const s=it.r*2.6;
  glow(x,y,it.type==='fire'?'#ffb24a':'#ff5a5a');
  ctx.drawImage(im,x-s/2,y-s/2,s,s*(im.naturalHeight/im.naturalWidth));}
}
function drawDrink(it){
 const x=it.x,y=it.y,r=it.r;
 const col=it.type==='juice'?'#ff8a3c':it.type==='soda'?'#7ad0ff':'#bfe8ff';
 glow(x,y,col);
 ctx.save();ctx.translate(x,y);
 // 컵
 ctx.fillStyle='rgba(255,255,255,.85)';
 ctx.beginPath();ctx.moveTo(-r*0.7,-r);ctx.lineTo(r*0.7,-r);ctx.lineTo(r*0.5,r);ctx.lineTo(-r*0.5,r);ctx.closePath();ctx.fill();
 // 음료
 ctx.fillStyle=col;
 ctx.beginPath();ctx.moveTo(-r*0.6,-r*0.5);ctx.lineTo(r*0.6,-r*0.5);ctx.lineTo(r*0.5,r*0.9);ctx.lineTo(-r*0.5,r*0.9);ctx.closePath();ctx.fill();
 // 빨대
 ctx.strokeStyle='#ff5a8a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(r*0.2,-r*1.4);ctx.lineTo(-r*0.1,r*0.3);ctx.stroke();
 // 광택
 ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(-r*0.4,-r*0.4,r*0.18,r);
 ctx.restore();
}
function drawTrash(it){
 const x=it.x,y=it.y,r=it.r;ctx.save();ctx.translate(x,y);ctx.rotate(it.rot);
 if(it.type==='butt'){ // 담배꽁초
  ctx.fillStyle='#f3efe2';ctx.fillRect(-r,-r*0.4,r*1.4,r*0.8);
  ctx.fillStyle='#e0a23c';ctx.fillRect(r*0.4,-r*0.4,r*0.6,r*0.8);
  ctx.fillStyle='#4a4a4a';ctx.fillRect(-r,-r*0.4,r*0.25,r*0.8);}
 else if(it.type==='can'){ // 캔
  ctx.fillStyle='#b8c4cc';ctx.fillRect(-r*0.6,-r,r*1.2,r*2);
  ctx.fillStyle='#8a98a2';ctx.fillRect(-r*0.6,-r,r*1.2,r*0.3);
  ctx.fillStyle='#e25a4a';ctx.fillRect(-r*0.6,-r*0.2,r*1.2,r*0.5);}
 else if(it.type==='bottle'){ // 페트병
  ctx.fillStyle='rgba(120,200,160,.85)';ctx.fillRect(-r*0.5,-r,r,r*2);
  ctx.fillRect(-r*0.25,-r*1.3,r*0.5,r*0.5);
  ctx.fillStyle='#5aa0d0';ctx.fillRect(-r*0.28,-r*1.4,r*0.56,r*0.25);}
 else{ // 종이/포장지
  ctx.fillStyle='#efe6d2';ctx.beginPath();
  ctx.moveTo(-r,-r*0.5);ctx.lineTo(r*0.3,-r);ctx.lineTo(r,r*0.4);ctx.lineTo(-r*0.4,r);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=1.5;ctx.stroke();}
 ctx.restore();
}
function drawBag(x,y,r){ // 비닐봉투(흡입 아이템)
 glow(x,y,'#9be0ff');
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='rgba(180,225,255,.85)';
 ctx.beginPath();ctx.moveTo(-r,-r*0.2);ctx.lineTo(-r*0.6,r);ctx.lineTo(r*0.6,r);ctx.lineTo(r,-r*0.2);ctx.closePath();ctx.fill();
 // 손잡이
 ctx.strokeStyle='rgba(180,225,255,.85)';ctx.lineWidth=4;
 ctx.beginPath();ctx.arc(-r*0.4,-r*0.4,r*0.4,Math.PI,0);ctx.stroke();
 ctx.beginPath();ctx.arc(r*0.4,-r*0.4,r*0.4,Math.PI,0);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(-r*0.5,0,r*0.25,r*0.7);
 ctx.restore();
}
function glow(x,y,c){ctx.save();ctx.shadowColor=c;ctx.shadowBlur=18;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,2,0,7);ctx.fill();ctx.restore();}
function heart(x,y,r){ctx.beginPath();ctx.moveTo(x,y+r*0.7);
 ctx.bezierCurveTo(x-r*1.4,y-r*0.4,x-r*0.5,y-r*1.3,x,y-r*0.4);ctx.bezierCurveTo(x+r*0.5,y-r*1.3,x+r*1.4,y-r*0.4,x,y+r*0.7);ctx.fill();}

function drawCookie(){
 const cur=COOKIES[selected];const img=imgs[selected];const scale=cur.scale;
 const drawW=P.w*scale, drawH=P.h*scale;
 const onGround=P.y>=GROUND-3&&P.bonus<=0;
 const bob=onGround&&!P.sliding?Math.sin(P.run)*4:0;
 const cx=P.x, cy=P.y-drawH/2+bob;
 if(P.bonus<=0){ctx.fillStyle='rgba(0,0,0,.3)';
  const sw=drawW*0.4*(1-Math.min((GROUND-P.y)/300,0.6));ctx.beginPath();ctx.ellipse(P.x,GROUND+4,Math.max(8,sw),9,0,0,7);ctx.fill();}
 ctx.save();ctx.translate(cx,cy);
 // 캐릭터 뒤 부드러운 빛 후광 (흰 배경을 오라처럼 녹임)
 {const halo=selected===0?'rgba(255,240,180,':'rgba(150,210,255,';
  const rg=ctx.createRadialGradient(0,0,drawW*0.15,0,0,drawW*0.72);
  rg.addColorStop(0,halo+'0.55)');rg.addColorStop(0.5,halo+'0.28)');rg.addColorStop(1,halo+'0)');
  ctx.fillStyle=rg;ctx.beginPath();ctx.arc(0,0,drawW*0.72,0,7);ctx.fill();}
 // 비닐봉투 흡입 오라
 if(P.bag>0){ctx.save();ctx.globalAlpha=0.35+Math.sin(P.run*3)*0.15;ctx.strokeStyle='#9be0ff';ctx.lineWidth=4;
  for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(0,0,drawW*0.55+i*16,0,7);ctx.stroke();}ctx.restore();}
 if(P.mag>0){ctx.save();ctx.globalAlpha=0.4+Math.sin(P.run*2)*0.15;ctx.strokeStyle='#ff7a7a';ctx.lineWidth=3;
  for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(0,0,drawW*0.5+i*14,0,7);ctx.stroke();}ctx.restore();}
 if(P.bonus>0){ctx.save();ctx.globalAlpha=0.6;ctx.shadowColor='#ffe9a0';ctx.shadowBlur=40;
  ctx.fillStyle='rgba(255,240,180,.2)';ctx.beginPath();ctx.arc(0,0,drawW*0.6,0,7);ctx.fill();ctx.restore();}
 // 슬라이드: 몸을 앞으로 기울여 눕는 자세 (납작하게 안 누름)
 ctx.rotate(P.sliding ? -0.95 : P.tilt);
 ctx.strokeStyle=selected===0?'#e8d49a':'#2a4a8a';ctx.lineWidth=8*scale;ctx.lineCap='round';
 const legTop=drawH*0.30, footY=drawH*0.5+2;
 if(P.sliding){ctx.beginPath();ctx.moveTo(-drawW*0.1,legTop);ctx.lineTo(drawW*0.35,footY*0.55);ctx.stroke();
  ctx.beginPath();ctx.moveTo(drawW*0.0,legTop);ctx.lineTo(drawW*0.42,footY*0.7);ctx.stroke();}
 else if(!onGround){ctx.beginPath();ctx.moveTo(-drawW*0.12,legTop);ctx.lineTo(-drawW*0.05,footY*0.78);ctx.stroke();
  ctx.beginPath();ctx.moveTo(drawW*0.12,legTop);ctx.lineTo(drawW*0.18,footY*0.7);ctx.stroke();}
 else{const sw=Math.sin(P.run)*drawW*0.28;
  ctx.beginPath();ctx.moveTo(-drawW*0.05,legTop);ctx.lineTo(-drawW*0.05+sw,footY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(drawW*0.08,legTop);ctx.lineTo(drawW*0.08-sw,footY);ctx.stroke();}
 // 이미지: 슬라이드 시 회전으로 눕는 효과(찌부 X)
 if(img.complete&&img.naturalWidth){const iw=drawW, ih=drawW*(img.naturalHeight/img.naturalWidth);
  ctx.drawImage(img,-iw/2,-ih/2-ih*0.05,iw,ih);}
 else{ctx.fillStyle=selected===0?'#ffe6b0':'#7ad0ff';ctx.beginPath();ctx.ellipse(0,0,drawW*0.4,drawH*0.45,0,0,7);ctx.fill();}
 ctx.restore();
}
function mix(a,b,t){const pa=hx(a),pb=hx(b);
 return 'rgb('+Math.round(pa[0]+(pb[0]-pa[0])*t)+','+Math.round(pa[1]+(pb[1]-pa[1])*t)+','+Math.round(pa[2]+(pb[2]-pa[2])*t)+')';}
function hx(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}

let last=0;
function loop(t){if(!running)return;const dt=Math.min((t-last)/1000,0.05);last=t;update(dt);draw();requestAnimationFrame(loop);}
function startGame(){document.getElementById('home').classList.add('hidden');
 document.getElementById('over').classList.add('hidden');
 document.getElementById('hud').classList.remove('hidden');
 document.getElementById('ctrl').classList.remove('hidden');
 reset();running=true;last=performance.now();requestAnimationFrame(loop);}
function over(){document.getElementById('hud').classList.add('hidden');
 document.getElementById('ctrl').classList.add('hidden');
 const o=document.getElementById('over');
 document.getElementById('overMsg').innerHTML='주운 쓰레기 <b style="font-size:30px;color:#9be29b">'+picked+'개</b><br>점수 '+Math.floor(score)+' · 거리 '+Math.floor(dist/100)+'m';
 o.classList.remove('hidden');}
document.getElementById('startBtn').onclick=startGame;
document.getElementById('retryBtn').onclick=startGame;
document.getElementById('homeBtn').onclick=()=>{document.getElementById('over').classList.add('hidden');
 document.getElementById('home').classList.remove('hidden');};
})();
