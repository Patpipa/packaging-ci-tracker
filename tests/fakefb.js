(function(){
  const store = {}; const subs = {};
  function snap(id){ const d = store[id]; return {exists: !!d, data: ()=>d, id}; }
  function docRef(id){ return {id,
    get: async()=>snap(id),
    set: async(data, opt)=>{ store[id] = (opt&&opt.merge) ? {...(store[id]||{}), ...data} : data; (subs[id]||[]).forEach(f=>f(snap(id))); },
    onSnapshot: (cb)=>{ (subs[id]=subs[id]||[]).push(cb); return ()=>{}; } }; }
  const db = { enablePersistence: async()=>{}, collection: ()=>({ doc: docRef, get: async()=>({docs: Object.keys(store).map(k=>({id:k, exists:true, data:()=>store[k]})), forEach(f){ this.docs.forEach(f); }}) }) };
  window.__fbstore = store;
  window.firebase = { initializeApp(){}, firestore: ()=>db, auth: ()=>({ onAuthStateChanged(cb){ setTimeout(()=>cb({uid:'t', email:'t@t'}),0); }, signOut: async()=>{}, signInWithEmailAndPassword: async()=>{}, currentUser:{uid:'t'} }) };
})();
