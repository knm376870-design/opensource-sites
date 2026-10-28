const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=__dirname;
const source=fs.readFileSync(path.join(root,'dist/russian-data.js'),'utf8');
const sandbox={window:{}};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
const sites=sandbox.window.RUSSIAN_SITES;
const output=path.join(root,'dist/assets/resource-icons');
const missingFile=path.join(root,'resource-icons-missing.json');
const checkOnly=process.argv.includes('--check');
fs.mkdirSync(output,{recursive:true});

const targetFor=site=>path.join(output,`${site.key}.png`);
const valid=file=>fs.existsSync(file)&&fs.statSync(file).size>=100;
const iconAliases={
  'isu-library':'isu-main',
  'isu-lka':'isu-main',
  'russia-edu':'minobrnauki'
};
const iconOverrides={
  '123pan':['https://icons.duckduckgo.com/ip3/www.123pan.com.ico'],
  'rjyst':['https://rjyst.peeavp.com.cn/yishiting/home/assets/rjystimg/favicon.ico'],
  'whatsapp':['https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fwww.whatsapp.com&sz=128'],
  'znanium':['https://znanium.ru/favicon.ico']
};
const iconSources=site=>{
  const domain=new URL(site.url).hostname;
  return [...(iconOverrides[site.key]||[]),
    `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(`https://${domain}`)}&sz=128`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    `https://${domain}/favicon.ico`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`
  ];
};

if(checkOnly){
  const documented=fs.existsSync(missingFile)?JSON.parse(fs.readFileSync(missingFile,'utf8')):[];
  const undocumented=sites.filter(site=>!valid(targetFor(site))&&!documented.includes(site.key));
  if(undocumented.length){
    console.error(`Undocumented missing resource icons: ${undocumented.map(site=>site.key).join(', ')}`);
    process.exit(1);
  }
  console.log(`Resource icons checked: ${sites.length-documented.length} local, ${documented.length} documented initial-letter fallbacks.`);
  process.exit(0);
}

let cursor=0;
let copied=0;
let downloaded=0;
const missing=[];
async function worker(){
  while(cursor<sites.length){
    const site=sites[cursor++];
    const target=targetFor(site);
    if(valid(target))continue;
    const alias=iconAliases[site.key];
    if(alias&&valid(path.join(output,`${alias}.png`))){
      fs.copyFileSync(path.join(output,`${alias}.png`),target);
      copied++;
      continue;
    }
    const employment=path.join(root,'dist/assets/job-icons',`${site.key}.png`);
    if(valid(employment)){
      fs.copyFileSync(employment,target);
      copied++;
      continue;
    }
    let ready=false;
    for(const source of iconSources(site)){
      try{
        const response=await fetch(source,{redirect:'follow',signal:AbortSignal.timeout(12000),headers:{'user-agent':'Mozilla/5.0 resource-icon-sync'}});
        if(!response.ok)continue;
        const type=response.headers.get('content-type')||'';
        const bytes=Buffer.from(await response.arrayBuffer());
        if(bytes.length<100||(!type.startsWith('image/')&&source.endsWith('favicon.png')))continue;
        fs.writeFileSync(target,bytes);
        downloaded++;
        ready=true;
        break;
      }catch{}
    }
    if(!ready)missing.push(site.key);
  }
}

Promise.all(Array.from({length:8},worker)).then(()=>{
  fs.writeFileSync(missingFile,JSON.stringify(missing.sort(),null,2)+'\n','utf8');
  console.log(`Resource icons ready: ${sites.length-missing.length} local, ${missing.length} initial-letter fallbacks, ${copied} copied, ${downloaded} downloaded.`);
}).catch(error=>{console.error(error);process.exitCode=1});
