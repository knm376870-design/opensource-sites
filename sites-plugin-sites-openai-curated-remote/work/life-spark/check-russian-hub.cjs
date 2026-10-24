const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const app=fs.readFileSync('dist/app.js','utf8');
const data=fs.readFileSync('dist/russian-data.js','utf8');
const box={window:{}};vm.createContext(box);vm.runInContext(data,box);
const sites=box.window.RUSSIAN_SITES;
assert(Array.isArray(sites),'resource data must be an array');
assert.equal(sites.length,85,'expect 85 curated resources');
for(const cat of ['web','app','tool','media','shop','core','ai']){
  assert.equal(sites.filter(x=>x.cat===cat).length,cat==='app'?25:10,cat+' resource count');
}
assert.equal(new Set(sites.map(x=>x.key)).size,sites.length,'resource keys must be unique');
assert(sites.every(x=>/^https:\/\//.test(x.url)),'all resources must use HTTPS');
assert(!data.match(/破解|盗版下载|网盘提取码/),'resource data must not advertise unauthorized copies');
assert(html.indexOf('id="pangyi"')<html.indexOf('id="navs"'),'Pangyi should stay visible near the top');
assert(html.includes('俄语星球')&&html.includes('俄语资源库'),'expect Russian-learning identity');
assert(html.includes('russian-data.js?v=1')&&html.indexOf('russian-data.js')<html.indexOf('app.js?v=9'),'resource data must load before app');
for(const id of ['navs','nav-web','nav-app','nav-tool','nav-media','nav-shop','nav-core','nav-ai','planner','ideas','quiz'])assert(html.includes(`id="${id}"`),id);
assert(app.includes('window.RUSSIAN_SITES||legacySites'),'expect safe resource-data fallback');
assert(css.includes('.resource-note')&&css.includes('prefers-reduced-motion'),'expect disclosure and motion accessibility');
assert(html.includes('style.css?v=15')&&css.includes('v13 俄语星球'),'expect premium layout with v15 resource icons');
assert(html.includes('id="study-desk"')&&html.includes('data-study-task="words"'),'expect daily study desk');
assert(app.includes('russianStudy:')&&app.includes('SpeechSynthesisUtterance')&&app.includes('renderStudy()'),'expect saved daily tasks and pronunciation');
assert(app.includes('www.google.com/s2/favicons')&&app.includes("siteIcon(s,'hap-ico')")&&css.includes('v15 资源品牌图标'),'expect branded icons with resilient fallbacks');
for(const file of ['assets/pangyi/icon-128.png','assets/pangyi/candidate-window.png'])assert(fs.existsSync('dist/'+file),file);
console.log('Passed: Russian hub identity, 85 HTTPS resources including 25 dictionaries, legal-resource disclosure, Pangyi prominence, original tools and accessibility hooks.');
