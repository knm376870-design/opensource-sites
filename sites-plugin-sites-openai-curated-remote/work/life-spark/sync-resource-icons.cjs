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
    const employment=path.join(root,'dist/assets/job-icons',`${site.key}.png`);
    if(valid(employment)){
      fs.copyFileSync(employment,target);
      copied++;
      continue;
    }
    const domain=new URL(site.url).hostname;
    try{
      const response=await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`);
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length<100)throw new Error('response is too small');
      fs.writeFileSync(target,bytes);
      downloaded++;
    }catch{missing.push(site.key)}
  }
}

Promise.all(Array.from({length:8},worker)).then(()=>{
  fs.writeFileSync(missingFile,JSON.stringify(missing.sort(),null,2)+'\n','utf8');
  console.log(`Resource icons ready: ${sites.length-missing.length} local, ${missing.length} initial-letter fallbacks, ${copied} copied, ${downloaded} downloaded.`);
}).catch(error=>{console.error(error);process.exitCode=1});
