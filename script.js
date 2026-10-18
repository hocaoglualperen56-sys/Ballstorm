(() => {
  "use strict";
  const canvas = document.getElementById("game"), ctx = canvas.getContext("2d");
  const $ = id => document.getElementById(id);
  const ui = { score:$("score"), high:$("highScore"), stage:$("stage"), count:$("ballCount"), sound:$("soundBtn"), soundState:$("soundState"), speed:$("speedBtn"), start:$("startOverlay"), over:$("gameOverOverlay"), startBtn:$("startBtn"), restart:$("restartBtn"), final:$("finalScore"), best:$("finalBest"), status:$("status"), toast:$("toast") };
  const C = { green:"#00FF66", blue:"#00CCFF", purple:"#CC00FF", red:"#FF0055", cyan:"#00FFFF" };
  const patterns = [
    {name:"TREE", rows:["0001100000","0001100000","0011111000","0111111100","0011111000","0001100000","0001100000","0011111000"]},
    {name:"PILOT",rows:["0001110000","0001110000","0011111000","0001110000","0011111000","0111011100","0111011100","0010001000"]},
    {name:"MAZE",rows:["1111111111","1000000001","1011111101","1010000101","1010110101","1010000001","1000000001","1111111111"]},
    {name:"HEART",rows:["0110011000","1111111100","1111111100","0111111000","0011110000","0001100000","0001100000","0000000000"]},
    {name:"INVADER",rows:["0001101100","0011111110","0110110110","1111111111","1101111011","0001101100","0010010010","0100000001"]}
  ];
  let W=480,H=700,dpr=1,cols=10,cell=38,left=20,top=45,launcherX=240,launcherY=650,dangerY=615;
  let bricks=[],bonuses=[],balls=[],particles=[],score=0,stage=1,ballCount=50,highScore=0;
  let running=false,started=false,aiming=false,aimPointer=null,firing=false,fireAcc=0,toFire=0,fired=0,turnLanding=null;
  let fast=false,muted=false,gameOver=false,lastTime=0,toastTimer=0,audio=null,musicTimer=null,musicStep=0,musicGain=null,sfxGain=null;
  let launchVector={x:0,y:-1,speed:5};
  try { highScore=Number(localStorage.getItem("ballstorm-high-score")||0); } catch(e) {}
  ui.high.textContent=highScore;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const colorFor=hp=>hp<=10?C.green:hp<=30?C.blue:hp<=60?C.purple:C.red;

  function resize(){
    const r=canvas.getBoundingClientRect(); dpr=Math.min(devicePixelRatio||1,2);
    W=Math.max(300,r.width); H=Math.max(400,r.height); canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0); cols=W<400?8:10; cell=Math.min((W-28)/cols,(H-180)/12,42);
    left=(W-cell*cols)/2; top=Math.max(30,H*.055); launcherY=H-44; dangerY=H-85;
    if(!started) launcherX=W/2; else launcherX=clamp(launcherX,left+cell/2,left+cell*(cols-.5));
    draw();
  }
  function audioInit(){
    if(audio){if(audio.state==="suspended")audio.resume();return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    audio=new AC();musicGain=audio.createGain();musicGain.gain.value=muted?0:.12;musicGain.connect(audio.destination);
    sfxGain=audio.createGain();sfxGain.gain.value=muted?0:.28;sfxGain.connect(audio.destination);startMusic();
  }
  function tone(freq,dur,type,vol,slide,dest){
    if(!audio||muted)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type||"sine";
    o.frequency.setValueAtTime(Math.max(35,freq),audio.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(35,slide),audio.currentTime+dur);
    g.gain.setValueAtTime(Math.max(.0001,vol),audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);
    o.connect(g);g.connect(dest||sfxGain);o.start();o.stop(audio.currentTime+dur+.02);
  }
  function startMusic(){
    if(!audio||musicTimer)return;const bass=[55,55,82.41,73.42,55,55,98,82.41],lead=[220,261.63,329.63,293.66,196,246.94,293.66,246.94];
    musicTimer=setInterval(()=>{if(muted||!audio)return;const i=musicStep%8;tone(bass[i],.19,"triangle",.22,bass[i]*.98,musicGain);
      if(musicStep%2===0)tone(lead[i],.13,"sawtooth",.035,lead[i]*1.01,musicGain);
      if(musicStep%4===0)tone(110,.075,"sine",.14,48,musicGain);musicStep++;},210);
  }
  function blip(hp){tone(450+(1-Math.min(hp,60)/60)*850,.055,"sine",.22,780);}
  function burstSound(){tone(180,.19,"sawtooth",.28,48);tone(85,.22,"triangle",.24,38);}
  function pew(){tone(540,.07,"triangle",.08,180);}
  function gameOverSound(){tone(280,.6,"sawtooth",.22,70);setTimeout(()=>tone(180,.65,"triangle",.18,45),140);}
  function toast(s){ui.toast.textContent=s;ui.toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove("show"),1300);}
  function updateUI(){ui.score.textContent=score;ui.high.textContent=highScore;ui.stage.textContent=stage;ui.count.textContent=ballCount;}
  function startGame(){
    audioInit();score=0;stage=1;ballCount=50;bricks=[];bonuses=[];balls=[];particles=[];launcherX=W/2;gameOver=false;started=true;running=true;firing=false;aiming=false;
    ui.start.classList.add("hidden");ui.over.classList.add("hidden");const p=patterns[0];for(let r=0;r<5;r++)addRow(p.rows[r],r,false);
    updateUI();ui.status.textContent="50 top hazır — nişan al ve bırak.";lastTime=performance.now();requestAnimationFrame(loop);
  }
  function addRow(rowString,patternRow,shift){
    for(let c=0;c<10;c++){if(rowString[c]!=="1")continue;const col=c;if(col>=cols)continue;
      const hp=Math.max(1,Math.floor(stage*(1+((patternRow+c)%4)*.28)));const roll=Math.random();
      bricks.push({col,row:shift?0:patternRow,hp,maxHp:hp,type:roll<.045&&stage>1?"bomb":roll<.09&&stage>2?"laser":"normal",alive:true});
    }
  }
  function addBonus(){const col=Math.floor(rand(0,cols));bonuses.push({x:left+(col+.5)*cell,y:top+cell*2,r:Math.min(11,cell*.25),alive:true,pulse:Math.random()*5});}
  function rect(b){return{x:left+b.col*cell+2,y:top+b.row*cell+2,w:cell-4,h:cell-4};}
  function finishGame(){
    gameOver=true;running=false;firing=false;balls=[];highScore=Math.max(highScore,score);
    try{localStorage.setItem("ballstorm-high-score",String(highScore));}catch(e){}
    updateUI();ui.final.textContent=score;ui.best.textContent=highScore;ui.over.classList.remove("hidden");ui.status.textContent="Sinyal kesildi.";gameOverSound();
  }
  function launch(dx,dy){
    if(!running||firing||gameOver)return;audioInit();if(dy>-.18)dy=-Math.abs(dx)*.45-.2;
    const n=Math.hypot(dx,dy)||1;launchVector={x:dx/n,y:dy/n,speed:Math.min(7.2,Math.max(4.4,cell*.135))};
    turnLanding=null;balls=[];toFire=ballCount;fired=0;fireAcc=0;firing=true;ui.status.textContent="Toplar fırlatılıyor…";
  }
  function createBall(){
    const spread=(Math.random()-.5)*.07,vx=launchVector.x*Math.cos(spread)-launchVector.y*Math.sin(spread),vy=launchVector.x*Math.sin(spread)+launchVector.y*Math.cos(spread);
    balls.push({x:launcherX,y:launcherY-8,vx:vx*launchVector.speed,vy:vy*launchVector.speed,trail:[],active:true});fired++;if(fired%5===0)pew();
  }
  function burst(x,y,color,count){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=rand(.7,3.1);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.25,.65),max:.65,size:rand(1.5,3.5),color});}}
  function hitBrick(b){
    if(!b.alive)return;const old=b.hp;b.hp--;score++;blip(b.hp);
    if(b.hp<=0){b.alive=false;score+=4;const r=rect(b);burst(r.x+r.w/2,r.y+r.h/2,colorFor(old),13);burstSound();
      if(b.type==="bomb"){bricks.forEach(o=>{if(o.alive&&Math.abs(o.col-b.col)<=1&&Math.abs(o.row-b.row)<=1){o.alive=false;score+=5;const q=rect(o);burst(q.x+q.w/2,q.y+q.h/2,C.red,7);}});toast("BOMBA PATLAMASI");}
      if(b.type==="laser"){bricks.forEach(o=>{if(o.alive&&o.row===b.row){o.alive=false;score+=5;const q=rect(o);burst(q.x+q.w/2,q.y+q.h/2,C.blue,7);}});toast("SATIR LAZERİ");}
    }updateUI();
  }
  function hitCircleRect(ball,r){const x=clamp(ball.x,r.x,r.x+r.w),y=clamp(ball.y,r.y,r.y+r.h),dx=ball.x-x,dy=ball.y-y;return dx*dx+dy*dy<=5.5*5.5;}
  function updateBall(b,dt){
    const oldY=b.y;b.trail.unshift({x:b.x,y:b.y});if(b.trail.length>5)b.trail.pop();
    b.x+=b.vx*dt*60;b.y+=b.vy*dt*60;const l=left+4,r=left+cols*cell-4;
    if(b.x<l){b.x=l;b.vx=Math.abs(b.vx);blip(40);}if(b.x>r){b.x=r;b.vx=-Math.abs(b.vx);blip(40);}
    if(b.y<top+2){b.y=top+2;b.vy=Math.abs(b.vy);blip(40);}
    for(const brick of bricks){if(!brick.alive)continue;const rct=rect(brick);if(hitCircleRect(b,rct)){
      if(oldY<=rct.y||oldY>=rct.y+rct.h)b.vy*=-1;else b.vx*=-1;b.x+=b.vx*2.5;b.y+=b.vy*2.5;hitBrick(brick);break;
    }}
    for(const bonus of bonuses){if(bonus.alive&&Math.hypot(b.x-bonus.x,b.y-bonus.y)<bonus.r+5.5){
      bonus.alive=false;ballCount++;toFire++;score+=10;burst(bonus.x,bonus.y,C.green,15);tone(880,.12,"sine",.22,1320);toast("+1 TOP");updateUI();
    }}
    if(b.y>=launcherY-3){b.active=false;if(turnLanding===null)turnLanding=clamp(b.x,left+cell/2,left+cell*(cols-.5));}
  }
  function finishTurn(){
    firing=false;balls=[];if(turnLanding!==null)launcherX=turnLanding;bricks.forEach(b=>b.row++);bonuses.forEach(b=>b.y+=cell);stage++;
    const p=patterns[Math.floor((stage-1)/4)%patterns.length],row=(stage-1)%p.rows.length;addRow(p.rows[row],row,true);if(stage%3===0)addBonus();
    if(bricks.some(b=>b.alive&&rect(b).y+cell-4>=dangerY)){finishGame();return;}
    updateUI();ui.status.textContent="Tur bitti — yeni satır geldi. Nişan al.";
  }
  function update(dt){
    if(!running||gameOver)return;const scaled=dt*(fast?2:1);
    if(firing){fireAcc+=scaled;while(fireAcc>=.05&&fired<toFire){fireAcc-=.05;createBall();}
      for(const b of balls)if(b.active)updateBall(b,scaled);balls=balls.filter(b=>b.active);if(fired>=toFire&&balls.length===0)finishTurn();}
    for(const p of particles){p.x+=p.vx*scaled*60;p.y+=p.vy*scaled*60;p.life-=scaled;}particles=particles.filter(p=>p.life>0);
    bonuses=bonuses.filter(b=>b.alive&&b.y<dangerY);
  }
  function background(){
    ctx.fillStyle="#0A0A12";ctx.fillRect(0,0,W,H);ctx.save();ctx.strokeStyle="rgba(255,255,255,0.05)";ctx.lineWidth=1;
    for(let x=0;x<W;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    const g=ctx.createRadialGradient(W/2,H*.45,10,W/2,H*.45,H*.7);g.addColorStop(0,"rgba(0,255,255,.055)");g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
  }
  function drawBrick(b){
    if(!b.alive)return;const r=rect(b),c=b.type==="bomb"?C.red:b.type==="laser"?C.blue:colorFor(b.hp);ctx.save();ctx.shadowColor=c;ctx.shadowBlur=10;ctx.fillStyle=c+"20";ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeStyle=c;ctx.lineWidth=1.25;ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);ctx.shadowBlur=0;
    ctx.fillStyle=c;ctx.globalAlpha=.18;ctx.fillRect(r.x+3,r.y+3,r.w-6,2);ctx.globalAlpha=1;
    ctx.fillStyle="#f5ffff";ctx.font="800 "+Math.max(9,Math.min(15,cell*.31))+"px ui-monospace,monospace";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(b.type==="bomb"?"✹":b.type==="laser"?"━":String(b.hp),r.x+r.w/2,r.y+r.h/2);ctx.restore();
  }
  function drawBonus(b){if(!b.alive)return;const p=1+Math.sin(performance.now()/140+b.pulse)*.12;ctx.save();ctx.shadowColor=C.green;ctx.shadowBlur=15;ctx.strokeStyle=C.green;ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r*p,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(b.x-b.r*.5,b.y);ctx.lineTo(b.x+b.r*.5,b.y);ctx.moveTo(b.x,b.y-b.r*.5);ctx.lineTo(b.x,b.y+b.r*.5);ctx.stroke();ctx.restore();}
  function drawBall(b){b.trail.forEach((t,i)=>{const a=(1-i/5)*.34,s=5.5*(1-i/6);ctx.fillStyle="rgba(0,255,255,"+a+")";ctx.fillRect(t.x-s/2,t.y-s/2,s,s);});ctx.save();ctx.shadowColor=C.cyan;ctx.shadowBlur=15;ctx.fillStyle="#eaffff";ctx.beginPath();ctx.arc(b.x,b.y,4.3,0,Math.PI*2);ctx.fill();ctx.fillStyle=C.cyan;ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(b.x,b.y,6.2,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawAim(){
    if(!aiming||!aimPointer||firing)return;let dx=aimPointer.x-launcherX,dy=aimPointer.y-launcherY;if(dy> -18)dy=-Math.abs(dx)*.45-20;const n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;
    let x=launcherX,y=launcherY-10,vx=dx,vy=dy,dist=0,reflected=false;ctx.save();ctx.setLineDash([4,6]);ctx.strokeStyle="rgba(180,255,220,.88)";ctx.lineWidth=1.5;ctx.shadowColor=C.green;ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(x,y);
    while(dist<Math.min(H*.72,420)&&y>top){x+=vx*4;y+=vy*4;dist+=4;if(x<left+4){x=left+4;vx=Math.abs(vx);reflected=true;}if(x>left+cols*cell-4){x=left+cols*cell-4;vx=-Math.abs(vx);reflected=true;}ctx.lineTo(x,y);if(reflected&&dist>35)break;}
    ctx.stroke();ctx.setLineDash([]);if(reflected){ctx.fillStyle=C.green;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  function drawLauncher(){ctx.save();ctx.strokeStyle="#00ffff99";ctx.lineWidth=1;ctx.shadowColor=C.cyan;ctx.shadowBlur=13;ctx.beginPath();ctx.arc(launcherX,launcherY,12,0,Math.PI*2);ctx.stroke();ctx.fillStyle=C.cyan;ctx.beginPath();ctx.arc(launcherX,launcherY,3,0,Math.PI*2);ctx.fill();ctx.restore();}
  function draw(){
    if(!ctx)return;background();ctx.save();ctx.strokeStyle="#00ffff2c";ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left+cols*cell,top);ctx.stroke();ctx.strokeStyle=C.red;ctx.shadowColor=C.red;ctx.shadowBlur=9;ctx.beginPath();ctx.moveTo(left,dangerY);ctx.lineTo(left+cols*cell,dangerY);ctx.stroke();ctx.restore();
    bricks.forEach(drawBrick);bonuses.forEach(drawBonus);particles.forEach(p=>{ctx.save();ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.fillRect(p.x,p.y,p.size,p.size);ctx.restore();});
    drawAim();balls.forEach(drawBall);drawLauncher();ctx.save();ctx.fillStyle="#8a8da8";ctx.font="9px ui-monospace,monospace";ctx.textAlign="left";ctx.fillText("PATTERN: "+patterns[Math.floor((stage-1)/4)%patterns.length].name,left,H-12);ctx.textAlign="right";ctx.fillText(fast?"SPEED 2×":"SPEED 1×",left+cols*cell,H-12);ctx.restore();
  }
  function loop(now){if(!running&&!gameOver)return;const dt=Math.min(.035,Math.max(0,(now-(lastTime||now))/1000));lastTime=now;update(dt);draw();if(running)requestAnimationFrame(loop);}
  function pointer(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  canvas.addEventListener("pointerdown",e=>{if(!running||firing||gameOver)return;audioInit();aiming=true;aimPointer=pointer(e);try{canvas.setPointerCapture(e.pointerId);}catch(err){}});
  canvas.addEventListener("pointermove",e=>{if(aiming)aimPointer=pointer(e);});
  canvas.addEventListener("pointerup",e=>{if(!aiming)return;const p=pointer(e);aiming=false;aimPointer=null;let dx=p.x-launcherX,dy=p.y-launcherY;if(dy> -18)dy=-Math.abs(dx)*.45-20;if(Math.hypot(dx,dy)<20)dy=-100;launch(dx,dy);});
  canvas.addEventListener("pointercancel",()=>{aiming=false;aimPointer=null;});
  ui.startBtn.addEventListener("click",startGame);ui.restart.addEventListener("click",startGame);
  ui.speed.addEventListener("click",()=>{fast=!fast;ui.speed.textContent=fast?"2× SPEED":"1× SPEED";ui.speed.setAttribute("aria-pressed",String(fast));toast(fast?"2× HIZ AKTİF":"NORMAL HIZ");});
  ui.sound.addEventListener("click",()=>{muted=!muted;if(!audio&&!muted)audioInit();if(audio){musicGain.gain.setTargetAtTime(muted?0:.12,audio.currentTime,.03);sfxGain.gain.setTargetAtTime(muted?0:.28,audio.currentTime,.03);}ui.soundState.textContent=muted?"SESSİZ":"SES AÇIK";ui.sound.style.color=muted?"#8a8da8":C.cyan;if(!muted)audioInit();});
  window.addEventListener("resize",resize);resize();draw();
})();