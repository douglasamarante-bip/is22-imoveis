(function(){
  const USER_KEY='is22AdminUserV1', SESSION_KEY='is22AdminSessionV1';
  const SESSION_MS=12*60*60*1000;
  const defaultUser={email:'admin@is22.com.br',name:'Equipe Casal',role:'Administrador'};

  function user(){
    try{
      const saved=JSON.parse(localStorage.getItem(USER_KEY)||'null');
      return saved&&saved.email?saved:defaultUser;
    }catch{return defaultUser}
  }

  function saveUser(u){
    if(!u||!u.email)return;
    localStorage.setItem(USER_KEY,JSON.stringify({
      email:u.email,
      name:u.name||'Equipe Casal',
      role:u.role||'Administrador'
    }));
  }

  function setSession(u,token){
    const now=Date.now();
    const value={
      email:u?.email||defaultUser.email,
      name:u?.name||'Equipe Casal',
      role:u?.role||'Administrador',
      token:String(token||''),
      at:now,
      expiresAt:now+SESSION_MS
    };
    localStorage.setItem(SESSION_KEY,JSON.stringify(value));
    saveUser(value);
    return value;
  }

  function session(){
    try{
      const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
      if(!s||!s.email||!s.token||!Number(s.expiresAt)||Date.now()>=Number(s.expiresAt)){
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    }catch{
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function token(){return session()?.token||''}

  async function login(email,password){
    const r=await fetch('/api/auth/login',{
      method:'POST',
      credentials:'same-origin',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({email,password})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(d.error||'E-mail ou senha incorretos.');
    setSession(d.user||{email},d.token);
    return d.user;
  }

  async function logout(){
    try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'})}catch{}
    localStorage.removeItem(SESSION_KEY);
  }

  function requireAuth(){
    if(!session()){
      location.replace('login.html?motivo=sessao');
      return false;
    }
    return true;
  }

  async function verify(){
    const s=session();
    if(!s)return false;
    try{
      const r=await fetch('/api/auth/me',{
        credentials:'same-origin',
        headers:{Authorization:'Bearer '+s.token}
      });
      if(r.ok)return true;
    }catch{}
    localStorage.removeItem(SESSION_KEY);
    return false;
  }

  async function authorizedFetch(url,opt={}){
    const s=session();
    if(!s)throw Object.assign(new Error('Sua sessão expirou. Entre novamente.'),{status:401});
    const headers={...(opt.headers||{}),Authorization:'Bearer '+s.token};
    const r=await fetch(url,{...opt,credentials:'same-origin',headers});
    if(r.status===401){
      localStorage.removeItem(SESSION_KEY);
      throw Object.assign(new Error('Sua sessão expirou. Entre novamente.'),{status:401});
    }
    return r;
  }

  window.IS22Auth={user,saveUser,setSession,session,token,login,logout,requireAuth,verify,authorizedFetch,USER_KEY,SESSION_KEY};
})();