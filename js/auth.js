(function(){
  const USER_KEY='is22AdminUserV1', SESSION_KEY='is22AdminSessionV1';
  const defaultUser={email:'admin@is22.com.br',password:'IS22@2026',name:'Equipe IS22',role:'Administrador'};
  function user(){try{return JSON.parse(localStorage.getItem(USER_KEY)||'null')||defaultUser}catch{return defaultUser}}
  function saveUser(u){localStorage.setItem(USER_KEY,JSON.stringify(u))}
  function login(email,password){const u=user();if(String(email).trim().toLowerCase()===u.email.toLowerCase()&&password===u.password){localStorage.setItem(SESSION_KEY,JSON.stringify({email:u.email,name:u.name,role:u.role,at:Date.now()}));return true}return false}
  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
  function logout(){localStorage.removeItem(SESSION_KEY)}
  function requireAuth(){if(!session()){location.replace('login.html');return false}return true}
  window.IS22Auth={user,saveUser,login,session,logout,requireAuth,USER_KEY,SESSION_KEY};
})();
