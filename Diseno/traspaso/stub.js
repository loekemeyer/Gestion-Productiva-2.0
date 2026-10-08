(function(){
  function cadena(){ var p = new Proxy(function(){}, { get: function(_, k){
        if (k === 'then') return function(res){ return Promise.resolve({ data: [], error: null, count: 0 }).then(res); };
        return function(){ return p; }; }, apply: function(){ return p; } }); return p; }
  window.supabase = { createClient: function(){ return {
    rpc: async function(name){ return { data: null, error: { message: 'stub: ' + name } }; },
    from: function(){ return cadena(); }, schema: function(){ return this; },
    auth: { getSession: async function(){ return { data: { session: null } }; }, signOut: async function(){}, onAuthStateChange: function(){} },
    channel: function(){ return { on: function(){ return this; }, subscribe: function(){ return this; } }; }
  }; } };
})();
