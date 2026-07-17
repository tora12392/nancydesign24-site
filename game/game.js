const TYPES=['insight','idea','visual','copy','craft','production'];
const LEVELS=[
  {title:'AI-РОЛИК',text:'Создай ролик, в котором AI работает на идею, а не заменяет её.',moves:20,locked:3,goals:{insight:6,idea:7,visual:8,craft:5}},
  {title:'СПЕЦПРОЕКТ-ИГРА',text:'Собери механику, которая вовлекает аудиторию и работает на бизнес-задачу.',moves:22,locked:5,goals:{insight:5,idea:8,copy:5,production:7}},
  {title:'ОБРАЗОВАТЕЛЬНЫЙ ПРОЕКТ',text:'Сделай сложную тему понятной, яркой и полезной для аудитории.',moves:24,locked:7,goals:{insight:8,idea:6,visual:6,copy:7,craft:4}}
];

let level=0, board=[], selected=null, moves=0, score=0, collected={};
let dragState=null, suppressClickUntil=0, animating=false;
const $=s=>document.querySelector(s), boardEl=$('#board'), fxLayer=$('#fxLayer'), boardStage=$('#boardStage');
const tileAsset=(tile,state='normal')=>tile.specialKind?`assets/specials/${tile.specialKind}.png`:`assets/tiles/${state}/${tile.type}.png`;

$('#startBtn').onclick=()=>{$('.intro').classList.add('hidden');$('#gameShell').classList.remove('hidden');loadLevel()};
$('#restartBtn').onclick=loadLevel;
$('#nextBtn').onclick=()=>{
  level++;
  if(level>=LEVELS.length){level=0;$('#nextBtn').textContent='PLAY AGAIN ↗'}
  $('#result').classList.add('hidden');
  $('#gameShell').classList.remove('hidden');
  loadLevel();
};

function randomType(){return TYPES[Math.floor(Math.random()*TYPES.length)]}
function makeTile(){return {type:randomType(),locked:false,specialKind:null,justSpawned:false}}
function makeBoard(){
  board=Array.from({length:49},makeTile);
  while(findMatches().indices.size){ [...findMatches().indices].forEach(i=>board[i].type=randomType()) }
  const lockedCount=LEVELS[level].locked;
  const candidates=[...Array(49).keys()].sort(()=>Math.random()-.5);
  for(let n=0;n<lockedCount;n++) board[candidates[n]].locked=true;
}
function loadLevel(){
  const l=LEVELS[level];
  moves=l.moves; score=0; collected={}; selected=null; animating=false; dragState=null;
  clearFx();
  makeBoard();
  $('#levelNo').textContent=`0${level+1} / 03`;
  $('#briefTitle').textContent=l.title;
  $('#briefText').textContent=l.text;
  render();
  setTimeout(()=>pulseStage('is-ready',650),80);
}
function render(){
  boardEl.innerHTML='';
  board.forEach((tile,i)=>{
    const b=document.createElement('button');
    const state=tile.locked?'locked':selected===i?'active':'normal';
    b.className=`tile${tile.locked?' is-locked':''}${selected===i?' selected':''}${tile.specialKind?' is-special':''}${tile.justSpawned?' just-spawned':''}`;
    b.setAttribute('aria-label',tile.specialKind||tile.type);
    b.dataset.index=String(i);
    b.draggable=false;
    b.innerHTML=`<img src="${tileAsset(tile,state)}" alt="" draggable="false">`;
    b.addEventListener('pointerdown',e=>startTileDrag(e,i));
    b.addEventListener('pointermove',moveTileDrag);
    b.addEventListener('pointerup',e=>endTileDrag(e,i));
    b.addEventListener('pointercancel',cancelTileDrag);
    b.onclick=()=>{if(Date.now()<suppressClickUntil || animating)return;pick(i)};
    boardEl.appendChild(b);
  });
  $('#moves').textContent=moves;
  $('#score').textContent=score;
  renderGoals();
}
function renderGoals(){
  const goals=LEVELS[level].goals;
  $('#goals').innerHTML=Object.entries(goals).map(([k,v])=>
    `<div class="goal ${(collected[k]||0)>=v?'done':''}"><span>${k.toUpperCase()}</span><b>${Math.min(collected[k]||0,v)} / ${v}</b></div>`
  ).join('');
}
function clearSpawnFlags(){board.forEach(t=>{if(t)t.justSpawned=false})}

function startTileDrag(e,i){
  if(animating)return;
  if(e.button!==undefined && e.button!==0)return;
  if(board[i].locked){flash('CLIENT REVISION');return}
  dragState={pointerId:e.pointerId,startIndex:i,startX:e.clientX,startY:e.clientY,moved:false};
  e.currentTarget.classList.add('drag-source');
  try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){/* Safari may skip capture */}
}
function moveTileDrag(e){
  if(!dragState || dragState.pointerId!==e.pointerId)return;
  const dx=e.clientX-dragState.startX,dy=e.clientY-dragState.startY;
  if(Math.hypot(dx,dy)>8){ dragState.moved=true; e.preventDefault(); }
}
function indexFromPoint(x,y){
  const el=document.elementFromPoint(x,y)?.closest?.('.tile');
  if(!el || !boardEl.contains(el))return null;
  const n=Number(el.dataset.index);
  return Number.isInteger(n)?n:null;
}
function swipeTarget(start,dx,dy){
  if(Math.max(Math.abs(dx),Math.abs(dy))<18)return null;
  const r=Math.floor(start/7),c=start%7;
  let rr=r,cc=c;
  if(Math.abs(dx)>=Math.abs(dy))cc+=dx>0?1:-1;
  else rr+=dy>0?1:-1;
  if(rr<0||rr>6||cc<0||cc>6)return null;
  return rr*7+cc;
}
function endTileDrag(e){
  if(!dragState || dragState.pointerId!==e.pointerId)return;
  const state=dragState;
  dragState=null;
  e.currentTarget.classList.remove('drag-source');
  try{e.currentTarget.releasePointerCapture(e.pointerId)}catch(_){/* no-op */}
  if(animating)return;
  const dx=e.clientX-state.startX,dy=e.clientY-state.startY;
  let target=indexFromPoint(e.clientX,e.clientY);
  if(target===null || target===state.startIndex)target=swipeTarget(state.startIndex,dx,dy);
  if(!state.moved || target===null || target===state.startIndex)return;
  suppressClickUntil=Date.now()+450;
  e.preventDefault();
  if(!adjacent(state.startIndex,target))return;
  if(board[target].locked){selected=null;flash('CLIENT REVISION');render();return}
  selected=state.startIndex;
  pick(target);
}
function cancelTileDrag(e){
  if(!dragState || dragState.pointerId!==e.pointerId)return;
  dragState=null;
  e.currentTarget.classList.remove('drag-source');
}

function adjacent(a,b){
  const ar=Math.floor(a/7),ac=a%7,br=Math.floor(b/7),bc=b%7;
  return Math.abs(ar-br)+Math.abs(ac-bc)===1;
}
function pick(i){
  if(animating)return;
  if(board[i].locked){flash('CLIENT REVISION');return}
  if(selected===null){selected=i;render();return}
  if(selected===i){selected=null;render();return}
  if(!adjacent(selected,i)){selected=i;render();return}
  const a=selected; selected=null;
  if(board[a].specialKind || board[i].specialKind){ moves--; activateSpecial(a,i); return; }
  swap(a,i);
  const m=findMatches();
  if(!m.indices.size){ swap(a,i); pulseStage('is-error',320); flash('BACK TO THE BRIEF'); render(); return; }
  moves--;
  resolveMatches();
}
function swap(a,b){[board[a],board[b]]=[board[b],board[a]]}
function findMatches(){
  const indices=new Set();
  const groups=[];
  for(let r=0;r<7;r++){
    let start=0;
    for(let c=1;c<=7;c++){
      const current=c<7?board[r*7+c]:null;
      const first=board[r*7+start];
      const same=c<7 && !current.locked && !first.locked && !current.specialKind && !first.specialKind && current.type===first.type;
      if(same) continue;
      if(c-start>=3 && !first.locked && !first.specialKind){
        const group=[]; for(let x=start;x<c;x++){const idx=r*7+x;indices.add(idx);group.push(idx)}
        groups.push({orientation:'horizontal',indices:group});
      }
      start=c;
    }
  }
  for(let c=0;c<7;c++){
    let start=0;
    for(let r=1;r<=7;r++){
      const current=r<7?board[r*7+c]:null;
      const first=board[start*7+c];
      const same=r<7 && !current.locked && !first.locked && !current.specialKind && !first.specialKind && current.type===first.type;
      if(same) continue;
      if(r-start>=3 && !first.locked && !first.specialKind){
        const group=[]; for(let x=start;x<r;x++){const idx=x*7+c;indices.add(idx);group.push(idx)}
        groups.push({orientation:'vertical',indices:group});
      }
      start=r;
    }
  }
  return {indices,groups};
}
function resolveMatches(){
  animating=true;
  let chain=0;
  const loop=()=>{
    clearSpawnFlags();
    const match=findMatches();
    if(!match.indices.size){ render(); animating=false; checkEnd(); return; }
    chain++;
    const counts={};
    match.indices.forEach(i=>{counts[board[i].type]=(counts[board[i].type]||0)+1});
    Object.entries(counts).forEach(([k,v])=>collected[k]=(collected[k]||0)+v);
    score+=match.indices.size*100*chain;
    unlockAdjacent(match.indices);

    let specialAnchor=null, specialKind=null, specialType=null;
    const longest=[...match.groups].sort((a,b)=>b.indices.length-a.indices.length)[0];
    if(longest){ specialType=board[longest.indices[0]]?.type || randomType(); }
    if(longest && longest.indices.length>=5){specialAnchor=longest.indices[Math.floor(longest.indices.length/2)];specialKind='big-idea'}
    else if(longest && longest.indices.length===4){specialAnchor=longest.indices[Math.floor(longest.indices.length/2)];specialKind=longest.orientation==='horizontal'?'moodboard':'reference'}

    const clearIndices=[...match.indices];
    animateMatch(clearIndices,{specialKind,longest,chain},()=>{
      clearIndices.forEach(i=>board[i]=null);
      if(specialAnchor!==null) board[specialAnchor]={type:specialType||randomType(),locked:false,specialKind,justSpawned:true};
      collapse(); fill(); render();
      flash(specialKind==='big-idea'?'BIG IDEA':specialKind?specialKind==='moodboard'?'MOODBOARD':'REFERENCE':chain>1?`CREATIVE COMBO ×${chain}`:'MATCH');
      setTimeout(loop,280);
    });
  };
  loop();
}
function unlockAdjacent(matched){
  const toUnlock=new Set();
  matched.forEach(i=>{
    const r=Math.floor(i/7),c=i%7;
    [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([rr,cc])=>{
      if(rr>=0&&rr<7&&cc>=0&&cc<7){const idx=rr*7+cc;if(board[idx]?.locked)toUnlock.add(idx)}
    });
  });
  toUnlock.forEach(i=>board[i].locked=false);
  if(toUnlock.size) score+=toUnlock.size*150;
}
function activateSpecial(a,b){
  animating=true;
  const specialIndex=board[a].specialKind?a:b;
  const otherIndex=specialIndex===a?b:a;
  const kind=board[specialIndex].specialKind;
  const clear=new Set([specialIndex]);
  if(kind==='moodboard'){
    const row=Math.floor(specialIndex/7); for(let c=0;c<7;c++) clear.add(row*7+c);
  }else if(kind==='reference'){
    const col=specialIndex%7; for(let r=0;r<7;r++) clear.add(r*7+col);
  }else if(kind==='big-idea'){
    const targetType=board[otherIndex].type; board.forEach((t,i)=>{if(t.type===targetType)clear.add(i)});
  }else if(kind==='ai-assistant'){
    const r=Math.floor(specialIndex/7),c=specialIndex%7;
    for(let rr=Math.max(0,r-1);rr<=Math.min(6,r+1);rr++)for(let cc=Math.max(0,c-1);cc<=Math.min(6,c+1);cc++)clear.add(rr*7+cc);
  }
  const clearIndices=[...clear];
  const counts={};
  clearIndices.forEach(i=>{const t=board[i]; if(t && !t.specialKind){counts[t.type]=(counts[t.type]||0)+1} });
  Object.entries(counts).forEach(([k,v])=>collected[k]=(collected[k]||0)+v);
  score+=clearIndices.length*180;
  animateSpecial(kind,specialIndex,clearIndices,()=>{
    clearIndices.forEach(i=>board[i]=null);
    collapse(); fill();
    if(Math.random()<.24){
      const free=board.map((t,i)=>({t,i})).filter(x=>!x.t.locked&&!x.t.specialKind);
      if(free.length)board[free[Math.floor(Math.random()*free.length)].i].specialKind='ai-assistant';
    }
    render();
    flash(kind.replace('-',' ').toUpperCase());
    setTimeout(()=>resolveMatches(),260);
  });
}
function collapse(){
  for(let c=0;c<7;c++){
    const vals=[];
    for(let r=6;r>=0;r--){const t=board[r*7+c];if(t)vals.push(t)}
    for(let r=6;r>=0;r--)board[r*7+c]=vals[6-r]||null;
  }
}
function fill(){for(let i=0;i<49;i++)if(!board[i]){board[i]=makeTile(); board[i].justSpawned=true}}
function goalsDone(){return Object.entries(LEVELS[level].goals).every(([k,v])=>(collected[k]||0)>=v)}
function checkEnd(){if(goalsDone())return finish(true);if(moves<=0)return finish(false)}
function finish(win){
  $('#gameShell').classList.add('hidden');$('#result').classList.remove('hidden');
  let title,text;
  if(win){
    const ai=(collected.idea||0)+(collected.insight||0),vis=(collected.visual||0)+(collected.craft||0);
    if(ai>vis*1.4){title='CONCEPT THINKER';text='Сильная стратегическая основа. Теперь усили крафт и доведи идею до безупречной реализации.'}
    else if(vis>ai*1.5){title='VISUAL ENTHUSIAST';text='Визуал сильный, но ему не хватает ясной связи с задачей. Вернись к инсайту и идее.'}
    else{title='CREATIVE DIRECTOR';text='Ты удержала баланс между смыслом, идеей, визуалом и реализацией. Проект готов к питчу.'}
  }else{title='BACK TO THE BRIEF';text='Проект не собран в срок. Попробуй меньше собирать всё подряд и сосредоточься на целях брифа.'}
  $('#resultTitle').textContent=title;$('#resultText').textContent=text;
  $('#resultStats').innerHTML=`<span>SCORE ${score}</span><span>LEVEL 0${level+1}</span><span>${win?'CLIENT APPROVED':'NEEDS REVISION'}</span>`;
  $('#nextBtn').textContent=level===LEVELS.length-1?'PLAY AGAIN ↗':'NEXT BRIEF ↗';
}
function flash(t){
  const m=$('#message');
  m.textContent=t;
  m.classList.remove('hot');
  void m.offsetWidth;
  m.classList.add('hot');
  setTimeout(()=>m.classList.remove('hot'),620);
}

function animateMatch(indices,{specialKind,longest,chain},done){
  render();
  clearFx();
  if(chain>1){ pulseStage('is-cascade',420); showComboText(`COMBO ×${chain}`); }
  if(specialKind==='big-idea'){ pulseStage('is-big-idea',760); showComboText('BIG IDEA'); }
  else if(specialKind){ pulseStage('is-special',520); showComboText(specialKind==='moodboard'?'MOODBOARD':'REFERENCE'); }
  if(specialKind==='moodboard' && longest) spawnSweep('row',longest.indices[Math.floor(longest.indices.length/2)]);
  if(specialKind==='reference' && longest) spawnSweep('col',longest.indices[Math.floor(longest.indices.length/2)]);
  indices.forEach((i,n)=>{
    const el=boardEl.children[i];
    if(!el) return;
    setTimeout(()=>{
      el.classList.add('clearing');
      spawnParticlesFromElement(el, specialKind==='big-idea'?12:7);
    },n*10);
  });
  setTimeout(done, 430);
}
function animateSpecial(kind,specialIndex,clearIndices,done){
  render();
  clearFx();
  const specialEl=boardEl.children[specialIndex];
  if(specialEl) specialEl.classList.add('activating');
  if(kind==='moodboard'){ spawnSweep('row',specialIndex); showComboText('MOODBOARD'); }
  if(kind==='reference'){ spawnSweep('col',specialIndex); showComboText('REFERENCE'); }
  if(kind==='big-idea'){ pulseStage('is-big-idea',900); showComboText('BIG IDEA'); }
  if(kind==='ai-assistant'){ pulseStage('is-ai',700); showComboText('AI ASSISTANT'); }
  if(kind==='moodboard' || kind==='reference') pulseStage('is-special',420);
  clearIndices.forEach((i,n)=>{
    const el=boardEl.children[i];
    if(!el) return;
    setTimeout(()=>{
      el.classList.add('targeted');
      setTimeout(()=>{
        el.classList.add('clearing');
        spawnParticlesFromElement(el, kind==='big-idea'?14:8);
      },70);
    },n*8);
  });
  setTimeout(done, 560);
}

function showComboText(text){
  if(!fxLayer)return;
  const label=document.createElement('div');
  label.className='combo-text';
  label.textContent=text;
  fxLayer.appendChild(label);
  setTimeout(()=>label.remove(),950);
}

function pulseStage(cls,duration=420){
  boardStage.classList.remove(cls);
  void boardStage.offsetWidth;
  boardStage.classList.add(cls);
  setTimeout(()=>boardStage.classList.remove(cls),duration);
}
function clearFx(){ if(fxLayer)fxLayer.innerHTML=''; }
function spawnParticlesFromElement(el,count=8){
  const stageRect=boardStage.getBoundingClientRect();
  const rect=el.getBoundingClientRect();
  const cx=rect.left-stageRect.left+rect.width/2;
  const cy=rect.top-stageRect.top+rect.height/2;
  for(let i=0;i<count;i++){
    const p=document.createElement('span');
    p.className='particle';
    const angle=Math.random()*Math.PI*2;
    const dist=24+Math.random()*42;
    const dx=Math.cos(angle)*dist;
    const dy=Math.sin(angle)*dist;
    const size=4+Math.random()*6;
    p.style.left=`${cx}px`;
    p.style.top=`${cy}px`;
    p.style.width=`${size}px`;
    p.style.height=`${size}px`;
    p.style.setProperty('--dx',`${dx}px`);
    p.style.setProperty('--dy',`${dy}px`);
    p.style.animationDelay=`${Math.random()*0.08}s`;
    fxLayer.appendChild(p);
    setTimeout(()=>p.remove(),700);
  }
}
function spawnSweep(kind,index){
  const tile=boardEl.children[index];
  if(!tile)return;
  const stageRect=boardStage.getBoundingClientRect();
  const rect=tile.getBoundingClientRect();
  const fx=document.createElement('div');
  fx.className=`fx-line ${kind}`;
  if(kind==='row'){
    const top=rect.top-stageRect.top+rect.height/2-26;
    fx.style.top=`${top}px`; fx.style.left='0'; fx.style.width='100%'; fx.style.height='52px';
  }else{
    const left=rect.left-stageRect.left+rect.width/2-26;
    fx.style.left=`${left}px`; fx.style.top='0'; fx.style.width='52px'; fx.style.height='100%';
  }
  fxLayer.appendChild(fx);
  setTimeout(()=>fx.remove(),540);
}

console.info('[Creative Match] FX v2 loaded');
