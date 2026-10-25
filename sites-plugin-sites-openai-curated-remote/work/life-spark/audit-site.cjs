const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {execFileSync}=require('child_process');

const root=__dirname;
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const html=read('dist/index.html');
const app=read('dist/app.js');
const data=read('dist/russian-data.js');
const sandbox={window:{}};
vm.createContext(sandbox);
vm.runInContext(data,sandbox);
const sites=sandbox.window.RUSSIAN_SITES;

assert(Array.isArray(sites)&&sites.length>0,'resource data is missing');
assert(!/javascript:/i.test(html+app+data),'javascript: URLs are forbidden');
assert(!/http:\/\//i.test(data),'resource URLs must use HTTPS');
assert(html.includes('name="referrer"'),'referrer policy meta is required');

for(const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/gi)||[]){
  assert(/rel="[^"]*noopener/i.test(tag),`external link is missing rel=noopener: ${tag}`);
}

const tracked=execFileSync('git',['ls-files','--','dist'],{cwd:root,encoding:'utf8'})
  .split(/\r?\n/).filter(Boolean);
const allowed=new Set(['.html','.js','.css','.png','.jpg','.jpeg','.svg','.webmanifest','.txt','.xml']);
for(const relative of tracked){
  const file=path.join(root,relative);
  assert(fs.existsSync(file),`tracked public file is missing: ${relative}`);
  assert(allowed.has(path.extname(relative).toLowerCase()),`unexpected public file type: ${relative}`);
  assert(fs.statSync(file).size<=2*1024*1024,`public file exceeds 2 MB: ${relative}`);
}

const normalized=new Map();
const duplicates=[];
for(const site of sites){
  const key=site.url.replace(/\/$/,'').toLowerCase();
  if(normalized.has(key))duplicates.push(`${normalized.get(key)} / ${site.key}`);
  else normalized.set(key,site.key);
}
assert(!duplicates.length,`duplicate resource URLs: ${duplicates.join(', ')}`);

async function liveAudit(){
  const results=[];
  let cursor=0;
  async function worker(){
    while(cursor<sites.length){
      const site=sites[cursor++];
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),12000);
      try{
        const response=await fetch(site.url,{method:'GET',redirect:'follow',signal:controller.signal,headers:{'user-agent':'RussianPlanet-LinkAudit/1.0'}});
        const state=response.status>=200&&response.status<400?'ok':[401,403,405,429].includes(response.status)?'restricted':'failed';
        results.push({key:site.key,status:response.status,state,url:site.url});
      }catch(error){
        results.push({key:site.key,status:0,state:'failed',url:site.url,error:error.cause?.code||error.name});
      }finally{clearTimeout(timeout)}
    }
  }
  await Promise.all(Array.from({length:8},worker));
  const summary=results.reduce((out,item)=>(out[item.state]=(out[item.state]||0)+1,out),{});
  console.log('Live link audit:',summary);
  for(const item of results.filter(item=>item.state==='failed'))console.log(`  ${item.key}: ${item.status||item.error} ${item.url}`);
}

console.log(`Audit passed: ${sites.length} HTTPS resources and ${tracked.length} tracked public files.`);
if(process.argv.includes('--live'))liveAudit().catch(error=>{console.error(error);process.exitCode=1});
