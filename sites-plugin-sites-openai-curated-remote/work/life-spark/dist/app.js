const ideas=[
{id:0,title:'给自己开一家安静咖啡馆',icon:'☕',type:'rest',time:15,cost:0,desc:'用家里的饮品，把一小段时间留给自己。',steps:['泡一杯已有的茶、咖啡或温水。','把手机放远，找一个舒服的角落。','慢慢喝完，写下今天最想感谢的一件小事。']},
{id:1,title:'寻找街角的三种颜色',icon:'🌿',type:'explore',time:60,cost:0,desc:'不赶路，带着新的眼光走一段熟悉的路。',steps:['选一条熟悉且方便步行的路线。','寻找蓝、绿、黄三种颜色，各拍一张照片。','回来选出最喜欢的一张，为它取一个名字。']},
{id:2,title:'交换一首今天的歌',icon:'🎧',type:'connect',time:15,cost:0,desc:'用一首歌，打开一段轻松的对话。',steps:['选一首能代表今天心情的歌。','发给一位朋友，说说为什么想分享。','邀请对方也分享一首；不用催促回复。']},
{id:3,title:'整理一个能呼吸的角落',icon:'🪴',type:'rest',time:60,cost:0,desc:'不用整理整个家，只改变眼前的一小块。',steps:['选桌面或床头的一小块区域。','移开不需要的物品，把常用的东西放顺手。','坐下来感受变化，给新角落拍张照片。']},
{id:4,title:'做一本附近探索手册',icon:'🧭',type:'explore',time:120,cost:0,desc:'把附近值得再来的地方，变成你的私人地图。',steps:['走访两个方便到达的公共空间。','记录开放提示、坐下休息的地方和喜欢的细节。','整理成一页笔记，下次邀请朋友一起去。']},
{id:5,title:'举办一场纸笔小游戏',icon:'🎲',type:'connect',time:60,cost:0,desc:'不买道具，用纸笔让聚会多一点笑声。',steps:['邀请朋友，准备几张纸和笔。','轮流画一个日常物品，其他人猜答案。','最后一起给最有趣的画取个名字。']},
{id:6,title:'买一束小花送给自己',icon:'🌷',type:'rest',time:60,cost:50,desc:'一点小钱，换一整天的好心情。',steps:['找一家顺路的花店或小花摊。','挑一束最让你心动的，不追求名贵。','带回家摆在喜欢的角落，拍一张照。']},
{id:7,title:'去小店坐一坐',icon:'🍵',type:'explore',time:60,cost:50,desc:'换个屋檐，看看别人怎么生活。',steps:['选一家没去过的咖啡店或茶铺。','点一杯想喝的，不用着急走。','记下店里你最喜欢的一个细节。']},
{id:8,title:'看一场随机的电影',icon:'🎬',type:'connect',time:120,cost:150,desc:'不看预告，把两个小时交给运气。',steps:['约一位朋友，一个人去也很好。','随机选一部正在上映的片子。','散场后聊聊彼此最喜欢的一刻。']}
];

let saved=[];
try{saved=JSON.parse(localStorage.getItem('sparkSaved')||'[]');if(!Array.isArray(saved))saved=[]}catch{}

let filter='all',last=null;
const $=s=>document.querySelector(s);
let timer;

const timeText=i=>i.time===120?'半天':i.time+' 分钟';
const costText=i=>i.cost?('约 '+i.cost+' 元以内'):'无需额外花费';

function toast(t){
  $('#toast').textContent=t;
  $('#toast').hidden=false;
  clearTimeout(timer);
  timer=setTimeout(()=>$('#toast').hidden=true,2800);
}

function save(id){
  saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];
  try{localStorage.setItem('sparkSaved',JSON.stringify(saved))}catch{toast('浏览器未允许保存，收藏仅在本次访问保留')}
  render();
  if(last)show(last);
}

function render(){
  const list=ideas.filter(i=>filter==='all'||(filter==='saved'?saved.includes(i.id):i.type===filter));
  $('#count').textContent=saved.length;
  $('#cards').innerHTML=list.length?list.map(i=>`<article class="card"><div class="art" aria-hidden="true">${ideaArt(i.id)}</div><div class="cardbody"><span class="meta">${timeText(i)} · ${costText(i)}</span><h3>${i.title}</h3><p>${i.desc}</p><div class="actions"><button class="save" data-view="${i.id}">查看行动清单</button><button class="save" data-save="${i.id}" aria-pressed="${saved.includes(i.id)}">${saved.includes(i.id)?'♥ 已收藏':'♡ 收藏'}</button></div></div></article>`).join(''):'<p class="empty">还没有收藏。先在灵感卡片上点一下“收藏”，以后可以回来找。</p>';
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
}

function show(i){
  last=i;
  $('#result').hidden=false;
  $('#result').className='result';
  $('#result').innerHTML=`<span class="meta">你的今日行动清单 · ${timeText(i)} · ${costText(i)}</span><h3>${i.icon} ${i.title}</h3><p>${i.desc}</p><ol>${i.steps.map(s=>`<li>${s}</li>`).join('')}</ol><p class="notice">${i.cost?('这份计划预计花费约 '+i.cost+' 元以内。'):'用已有物品就能开始，无需购物。'}</p><div class="actions"><button class="primary" id="saveResult">${saved.includes(i.id)?'取消收藏':'收藏这个计划'}</button><button class="secondary" id="shareResult">分享计划</button><button class="secondary" id="download">下载灵感卡</button></div>`;
  $('#saveResult').onclick=()=>save(i.id);
  $('#shareResult').onclick=()=>share(`${i.title}\n${i.steps.map((s,n)=>`${n+1}. ${s}`).join('\n')}`);
  $('#download').onclick=()=>download(i);
}

async function share(text){
  const full=text+'\n来自生活灵感实验室\n'+location.href.split('#')[0];
  try{
    if(navigator.share){await navigator.share({title:'生活灵感实验室',text,url:location.href.split('#')[0]});return}
    await navigator.clipboard.writeText(full);
    toast('已复制，粘贴给朋友就能分享');
  }catch(e){
    if(e.name==='AbortError')return;
    const a=document.createElement('textarea');
    a.value=full;
    document.body.append(a);
    a.select();
    const ok=document.execCommand('copy');
    a.remove();
    toast(ok?'已复制分享内容':'复制不可用，请下载灵感卡后分享');
  }
}

function download(i){
  const c=document.createElement('canvas');
  c.width=1080;c.height=1350;
  const x=c.getContext('2d');
  x.fillStyle='#faf8f3';x.fillRect(0,0,1080,1350);
  x.fillStyle='#7b5ce8';x.fillRect(0,0,1080,120);
  x.fillStyle='#fff';x.font='bold 40px sans-serif';x.fillText('生活灵感实验室',90,80);
  x.fillStyle='#26222e';x.font='bold 44px sans-serif';x.fillText(i.title,90,205);
  const finish=()=>{
    x.fillStyle='#575165';x.font='28px sans-serif';
    let y=850;
    i.steps.forEach((s,n)=>{y=wrap(`${n+1}. ${s}`,90,y,880,50)+36});
    x.fillStyle='#8a8496';x.font='24px sans-serif';
    x.fillText(timeText(i)+' · '+costText(i),90,y+30);
    x.fillText('用一件小事，给今天一点新鲜感。',90,y+78);
    const a=document.createElement('a');
    a.download='今日灵感 · '+i.title+'.png';
    a.href=c.toDataURL('image/png');
    a.click();
  };
  const img=new Image();
  img.onload=()=>{
    x.fillStyle='#f1edfc';x.fillRect(90,250,900,520);
    x.drawImage(img,100,260,880,500);
    finish();
  };
  img.onerror=finish;
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ideaArt(i.id));
  function wrap(t,px,py,max,line){
    let s='';
    for(const ch of t){
      if(x.measureText(s+ch).width>max){x.fillText(s,px,py);py+=line;s=ch}
      else s+=ch;
    }
    x.fillText(s,px,py);
    return py+line;
  }
}

$('#generate').onclick=()=>{
  const t=+$('#time').value,b=+$('#budget').value,m=$('#mood').value;
  let pool=ideas.filter(i=>i.type===m&&i.time<=t&&i.cost<=b);
  if(!pool.length)pool=ideas.filter(i=>i.time<=t&&i.cost<=b);
  if(!pool.length)pool=ideas.filter(i=>i.time<=t);
  if(!pool.length)pool=ideas;
  show(pool[Math.floor(Math.random()*pool.length)]);
};

$('#start').onclick=()=>{$('#planner').scrollIntoView({behavior:'smooth'});$('#generate').click()};

$('#shuffle').onclick=()=>{show(ideas[Math.floor(Math.random()*ideas.length)]);$('#planner').scrollIntoView({behavior:'smooth'})};

$('#cards').onclick=e=>{
  const s=e.target.closest('[data-save]'),v=e.target.closest('[data-view]');
  if(s)save(+s.dataset.save);
  if(v){show(ideas[+v.dataset.view]);$('#planner').scrollIntoView({behavior:'smooth'})}
};

document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render()});

$('#savedLink').onclick=()=>{filter='saved';render()};

const questions=['突然多出一小时，你更想……','什么时刻让你觉得今天很值得？','下个周末，你想给自己安排……'];
const answers=[['一个人慢慢喝杯茶','走一条没走过的小路','找朋友聊聊天'],['终于安静地做完一件小事','发现一个以前没注意的细节','和喜欢的人一起笑了'],['舒服的独处时光','没有目的地的小探索','一场轻松的小聚会']];
let q=0,scores=[0,0,0];

function quiz(){
  if(q===3){
    const m=Math.max(...scores);
    const tied=scores.map((s,i)=>s===m?i:-1).filter(i=>i>=0);
    const n=tied[Math.floor(Math.random()*tied.length)];
    const names=['蓝色 · 温柔充电家','黄色 · 日常探险家','绿色 · 快乐连接者'];
    const texts=['你的灵感往往来自放慢一点。给自己留一小块安静的时间。','你喜欢从熟悉的地方发现新意。带着好奇心，今天也有新风景。','你享受人与人之间的连接。从分享一首歌开始，让快乐流动。'];
    $('#quizbox').innerHTML=`<h3>${names[n]}</h3><p>${texts[n]}</p><p class="notice">结果来自本次选择，仅供娱乐。</p><div class="actions"><button class="primary" id="quizshare">分享我的颜色</button><button class="secondary" id="retry">再测一次</button></div>`;
    $('#quizshare').onclick=()=>share('我的生活灵感颜色是：'+names[n]+'。'+texts[n]);
    $('#retry').onclick=()=>{q=0;scores=[0,0,0];quiz()};
    return;
  }
  $('#quizbox').innerHTML=`<span class="meta">第 ${q+1} / 3 题</span><h3>${questions[q]}</h3><div class="quizopts">${answers[q].map((a,n)=>`<button data-answer="${n}">${a}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{scores[+b.dataset.answer]++;q++;quiz()});
}

render();
quiz();
