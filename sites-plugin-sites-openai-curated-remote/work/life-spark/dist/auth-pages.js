(function(){
  'use strict';
  const auth=window.RussianAuth;
  const $=selector=>document.querySelector(selector);
  const setStatus=(text,type='')=>{const el=$('#authStatus');if(!el)return;el.textContent=text;el.dataset.type=type};
  const setText=(selector,value)=>{const el=$(selector);if(el)el.textContent=value};
  const formatDate=value=>value?new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';

  async function initAuth(){
    if(!auth.configured()){setStatus('登录服务尚未完成数据库配置，游客浏览不受影响。','warning');$('#authForm').hidden=true;return}
    try{
      const session=await auth.getSession();
      if(session){$('#authForm').hidden=true;$('#signedIn').hidden=false;setText('#signedInEmail',session.user.email||'已登录');setStatus('登录成功，可以进入个人账户。','success')}
    }catch(error){setStatus(auth.friendlyError(error),'error')}
    $('#authForm').addEventListener('submit',async event=>{
      event.preventDefault();
      const button=$('#authSubmit');const email=$('#authEmail').value.trim();
      if(!email)return;
      button.disabled=true;setStatus('正在发送验证码…');
      try{await auth.signIn(email);sessionStorage.setItem('russianLoginEmail',email);$('#otpEmail').textContent=email;$('#authForm').hidden=true;$('#otpForm').hidden=false;$('#authCode').focus();setStatus('验证码已发送，请在这台设备输入。','success')}catch(error){setStatus(auth.friendlyError(error),'error')}finally{button.disabled=false}
    });
    $('#otpForm').addEventListener('submit',async event=>{
      event.preventDefault();
      const button=$('#otpSubmit');const email=sessionStorage.getItem('russianLoginEmail')||$('#authEmail').value.trim();const token=$('#authCode').value.replace(/\D/g,'');
      if(!email||token.length<6||token.length>8){setStatus('请输入邮件中的完整验证码。','warning');return}
      button.disabled=true;setStatus('正在验证…');
      try{await auth.verifyEmailOtp(email,token);sessionStorage.removeItem('russianLoginEmail');setStatus('验证成功，正在进入账户…','success');location.href='account.html'}catch(error){setStatus(auth.friendlyError(error),'error')}finally{button.disabled=false}
    });
    $('#changeEmail').addEventListener('click',()=>{$('#otpForm').hidden=true;$('#authForm').hidden=false;$('#authCode').value='';setStatus('可以重新输入邮箱。');$('#authEmail').focus()});
  }
  async function initAccount(){
    if(!auth.configured()){setStatus('登录服务尚未完成数据库配置。','warning');return}
    try{
      const session=await auth.getSession();
      if(!session){$('#accountSignedOut').hidden=false;setStatus('当前以游客身份使用，所有本地功能仍然可用。');return}
      $('#accountPanel').hidden=false;
      setText('#accountEmail',session.user.email||'已登录用户');
      setText('#accountCreated',formatDate(session.user.created_at));
      const local=auth.localSummary();setText('#localFavorites',local.favorites);setText('#localRoadmap',local.roadmap);setText('#localPractice',local.practice);
      const cloud=await auth.getCloudState();
      setText('#cloudUpdated',cloud?formatDate(cloud.updated_at):'尚未同步');
      if(await auth.isAdmin())$('#adminLink').hidden=false;
      setStatus('登录状态正常。','success');
    }catch(error){setStatus(auth.friendlyError(error),'error')}
    $('#syncNow').addEventListener('click',async()=>{if(!confirm('把本机收藏和学习进度覆盖到云端吗？'))return;setStatus('正在同步…');try{const data=await auth.syncLocalState();setText('#cloudUpdated',formatDate(data.updated_at));setStatus('本机进度已同步到云端。','success')}catch(error){setStatus(auth.friendlyError(error),'error')}});
    $('#restoreNow').addEventListener('click',async()=>{if(!confirm('用云端数据覆盖当前浏览器中的收藏和学习进度吗？'))return;setStatus('正在恢复…');try{await auth.restoreCloudState();setStatus('云端数据已恢复，请刷新相关页面查看。','success')}catch(error){setStatus(auth.friendlyError(error),'error')}});
    $('#signOut').addEventListener('click',async()=>{try{await auth.signOut();location.href='auth.html'}catch(error){setStatus(auth.friendlyError(error),'error')}});
  }
  async function initAdmin(){
    if(!auth.configured()){setStatus('登录服务尚未完成数据库配置。','warning');return}
    try{
      const session=await auth.getSession();
      if(!session){setStatus('请先登录管理员账号。','warning');$('#adminLogin').hidden=false;return}
      if(!await auth.isAdmin()){setStatus('当前账号没有管理员权限。','error');$('#adminDenied').hidden=false;return}
      const {profiles,states,userCount,syncCount,activeCount}=await auth.getAdminOverview();
      setText('#metricUsers',userCount);
      setText('#metricActive',activeCount);
      setText('#metricSynced',syncCount);
      setText('#metricFavorites',states.reduce((sum,item)=>sum+(Array.isArray(item.favorites)?item.favorites.length:0),0));
      const list=$('#recentUsers');
      profiles.slice(0,20).forEach(item=>{const row=document.createElement('tr');const name=document.createElement('td');const joined=document.createElement('td');const seen=document.createElement('td');name.textContent=item.display_name||item.id.slice(0,8)+'…';joined.textContent=formatDate(item.created_at);seen.textContent=formatDate(item.last_seen_at);row.append(name,joined,seen);list.appendChild(row)});
      $('#adminPanel').hidden=false;setStatus('后台数据已更新。','success');
    }catch(error){setStatus(auth.friendlyError(error),'error')}
  }
  const page=document.body.dataset.authPage;
  if(page==='login')initAuth();
  if(page==='account')initAccount();
  if(page==='admin')initAdmin();
})();
