(function(){
  'use strict';
  const config=window.RUSSIAN_AUTH_CONFIG||{};
  const SDK_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.min.js';
  let clientPromise;

  const configured=()=>/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.url||'')&&/^sb_publishable_/.test(config.publishableKey||'');
  const safeJson=(key,fallback,max=100000)=>{
    try{
      const raw=localStorage.getItem(key);
      if(!raw||raw.length>max)return fallback;
      const value=JSON.parse(raw);
      return value??fallback;
    }catch{return fallback}
  };
  const loadSdk=()=>new Promise((resolve,reject)=>{
    if(window.supabase&&window.supabase.createClient){resolve(window.supabase);return}
    const existing=document.querySelector('script[data-supabase-sdk]');
    if(existing){existing.addEventListener('load',()=>resolve(window.supabase),{once:true});existing.addEventListener('error',()=>reject(new Error('认证服务组件加载失败')),{once:true});return}
    const script=document.createElement('script');
    script.src=SDK_URL;script.defer=true;script.crossOrigin='anonymous';script.dataset.supabaseSdk='true';
    script.onload=()=>resolve(window.supabase);
    script.onerror=()=>reject(new Error('认证服务组件加载失败'));
    document.head.appendChild(script);
  });
  const getClient=()=>{
    if(!configured())return Promise.reject(new Error('登录服务尚未配置'));
    if(!clientPromise)clientPromise=loadSdk().then(sdk=>sdk.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
    return clientPromise;
  };
  const getSession=async()=>{
    const client=await getClient();
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    return data.session;
  };
  const signIn=async email=>{
    const client=await getClient();
    const redirectTo=config.redirectUrl||location.href.split('#')[0].split('?')[0];
    const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo,shouldCreateUser:true}});
    if(error)throw error;
  };
  const verifyEmailOtp=async(email,token)=>{
    const client=await getClient();
    const {data,error}=await client.auth.verifyOtp({email,token,type:'email'});
    if(error)throw error;
    return data.session;
  };
  const signOut=async()=>{
    const client=await getClient();
    const {error}=await client.auth.signOut();
    if(error)throw error;
  };
  const syncLocalState=async()=>{
    const client=await getClient();
    const session=await getSession();
    if(!session)throw new Error('请先登录');
    const favorites=safeJson('russianFavorites',[],20000);
    const payload={
      user_id:session.user.id,
      favorites:Array.isArray(favorites)?favorites.filter(x=>typeof x==='string').slice(0,500):[],
      study_history:safeJson('russianStudyHistory',{},100000),
      roadmap:safeJson('russianRoadmap',{},100000),
      practice_best:safeJson('russianPracticeBestV1',{},50000),
      updated_at:new Date().toISOString()
    };
    const {error}=await client.from('user_state').upsert(payload,{onConflict:'user_id'});
    if(error)throw error;
    await client.from('profiles').upsert({id:session.user.id,last_seen_at:new Date().toISOString()},{onConflict:'id'});
    return payload;
  };
  const getCloudState=async()=>{
    const client=await getClient();
    const session=await getSession();
    if(!session)throw new Error('请先登录');
    const {data,error}=await client.from('user_state').select('favorites,study_history,roadmap,practice_best,updated_at').eq('user_id',session.user.id).maybeSingle();
    if(error)throw error;
    return data;
  };
  const restoreCloudState=async()=>{
    const data=await getCloudState();
    if(!data)throw new Error('云端还没有可恢复的数据');
    const entries=[['russianFavorites',data.favorites||[]],['russianStudyHistory',data.study_history||{}],['russianRoadmap',data.roadmap||{}],['russianPracticeBestV1',data.practice_best||{}]];
    entries.forEach(([key,value])=>localStorage.setItem(key,JSON.stringify(value)));
    return data;
  };
  const isAdmin=async()=>{
    try{
      const client=await getClient();
      const {data,error}=await client.rpc('current_user_is_admin');
      if(error)return false;
      return data===true;
    }catch{return false}
  };
  const getAdminOverview=async()=>{
    const client=await getClient();
    if(!await isAdmin())throw new Error('当前账号没有管理员权限');
    const weekAgo=new Date(Date.now()-7*86400000).toISOString();
    const [{data:profiles,count:userCount,error:profilesError},{data:states,count:syncCount,error:statesError},{count:activeCount,error:activeError}]=await Promise.all([
      client.from('profiles').select('id,display_name,created_at,last_seen_at',{count:'exact'}).order('created_at',{ascending:false}).limit(20),
      client.from('user_state').select('user_id,favorites,updated_at',{count:'exact'}).order('updated_at',{ascending:false}).limit(1000),
      client.from('profiles').select('id',{count:'exact',head:true}).gte('last_seen_at',weekAgo)
    ]);
    if(profilesError)throw profilesError;
    if(statesError)throw statesError;
    if(activeError)throw activeError;
    return {profiles:profiles||[],states:states||[],userCount:userCount||0,syncCount:syncCount||0,activeCount:activeCount||0};
  };
  const localSummary=()=>{
    const favorites=safeJson('russianFavorites',[],20000);
    const roadmap=safeJson('russianRoadmap',{},100000);
    const practice=safeJson('russianPracticeBestV1',{},50000);
    return {favorites:Array.isArray(favorites)?favorites.length:0,roadmap:Object.keys(roadmap||{}).length,practice:Object.keys(practice||{}).length};
  };
  const friendlyError=error=>{
    const message=String(error&&error.message||error||'操作失败');
    if(/rate limit|seconds/i.test(message))return '请求过于频繁，请稍后再试。';
    if(/invalid.*email|email.*invalid/i.test(message))return '请输入有效的邮箱地址。';
    if(/fetch|network|加载失败/i.test(message))return '无法连接登录服务，请检查网络后重试。';
    return message;
  };
  const updateNav=async()=>{
    const link=document.getElementById('accountNav');
    if(!link)return;
    if(!configured()){link.textContent='游客模式';link.href='auth.html';return}
    try{const session=await getSession();link.textContent=session?'我的账户':'登录';link.href=session?'account.html':'auth.html'}catch{link.textContent='登录';link.href='auth.html'}
  };
  window.RussianAuth={configured,getClient,getSession,signIn,verifyEmailOtp,signOut,syncLocalState,getCloudState,restoreCloudState,isAdmin,getAdminOverview,localSummary,friendlyError,updateNav};
  updateNav();
})();
