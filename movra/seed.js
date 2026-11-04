// Dados de demonstração (professores, aulas e alunos fictícios). Usado só na primeira vez que o banco é criado.
function L(id,teacherId,artist,song,modality,category,level,o){
  return Object.assign({id,teacherId,artist,song,title:artist?`${artist} - ${song}`:song,modality,category,level,
    orientation:'h',cropMobile:true,price:15,duration:'15:00',bpm:110,turmaId:null,prereq:{mode:'all',ids:[]},hue:260,created:'2026-10-01'},o);
}
function seed(){
  const teachers = [
    {id:'yago',name:'Yago Tiger',city:'Aulas online',hue:262,styles:['kpop'],photo:null,
      bio:'Coreografias de boy group de K-pop, quebradas em blocos de 8 tempos, com versão lenta e espelhada.',
      pricing:{mode:'turmas',passPrice:60,billing:'mensal'},
      turmas:[
        {id:'t-yago-1',name:'Turma Iniciante',price:25,schedule:'Seg e Qua · 19h30',note:'Aula nova toda segunda'},
        {id:'t-yago-2',name:'Turma Intermediário',price:30,schedule:'Ter e Qui · 20h',note:'Coreos completas de comeback'},
        {id:'t-yago-3',name:'Turma Avançado',price:45,schedule:'Sábado · 10h',note:'Velocidade real e formação'}]},
    {id:'mila',name:'Mila Fernandes',city:'Aulas online',hue:330,styles:['kpop'],photo:null,
      bio:'Coreografias de girl group de K-pop, gravadas na vertical para treinar com o celular apoiado no espelho.',
      pricing:{mode:'passe',passPrice:50,billing:'mensal'},turmas:[]},
    {id:'bela',name:'Bela Góes',city:'Aulas online',hue:20,styles:['jazzfunk','autoral'],photo:null,
      bio:'Jazz Funk e coreografias: isolamento, atitude, chão e presença de palco.',
      pricing:{mode:'turmas',passPrice:65,billing:'mensal'},
      turmas:[
        {id:'t-bela-1',name:'Turma Básico',price:30,schedule:'Terça · 19h',note:'Base do Jazz Funk'},
        {id:'t-bela-2',name:'Turma Avançado',price:45,schedule:'Sexta · 20h',note:'Coreo completa + performance'}]}
  ];
  const lessons = [
    L('y1','yago','','Groove K-pop: Bounce e Hit','kpop','fundamentos',0,{price:0,duration:'14:20',bpm:110,hue:262}),
    L('y2','yago','','Contagem de 8 e Musicalidade','kpop','fundamentos',0,{price:0,duration:'11:05',bpm:100,hue:280}),
    L('y3','yago','BOYNEXTDOOR','Earth, Wind & Fire','kpop','coreografia',1,{price:15,duration:'19:00',bpm:118,hue:160,turmaId:'t-yago-1',prereq:{mode:'all',ids:['y1']}}),
    L('y4','yago','ENHYPEN','Bite Me','kpop','coreografia',1,{price:15,duration:'21:10',bpm:110,hue:345,orientation:'v',turmaId:'t-yago-1',prereq:{mode:'all',ids:['y1','y2']}}),
    L('y5','yago','ATEEZ','BAD','kpop','coreografia',2,{price:20,duration:'26:15',bpm:120,hue:15,cropMobile:false,turmaId:'t-yago-2',prereq:{mode:'any',ids:['y3','y4']}}),
    L('y6','yago','SEVENTEEN','MAESTRO','kpop','coreografia',2,{price:20,duration:'27:20',bpm:115,hue:215,turmaId:'t-yago-2',prereq:{mode:'all',ids:['y4']}}),
    L('y7','yago','ATEEZ','WORK','kpop','coreografia',2,{price:20,duration:'24:30',bpm:125,hue:40,orientation:'v',turmaId:'t-yago-2',prereq:{mode:'all',ids:['y5']}}),
    L('y8','yago','Stray Kids','S-Class','kpop','coreografia',3,{price:28,duration:'31:00',bpm:105,hue:0,turmaId:'t-yago-3',prereq:{mode:'all',ids:['y6','y7']}}),
    L('y9','yago','','Coreografia Autoral: Neon','autoral','coreografia',3,{price:30,duration:'33:10',bpm:128,hue:170,cropMobile:false,turmaId:'t-yago-3',prereq:{mode:'all',ids:['y8']}}),
    L('m1','mila','','Linhas, Extensões e Expressão','kpop','fundamentos',0,{price:0,duration:'12:00',bpm:95,hue:330,orientation:'v'}),
    L('m2','mila','NewJeans','Super Shy','kpop','coreografia',1,{price:0,duration:'18:40',bpm:150,hue:200,orientation:'v'}),
    L('m3','mila','ITZY','WANNABE','kpop','coreografia',1,{price:15,duration:'21:10',bpm:122,hue:310,prereq:{mode:'all',ids:['m1']}}),
    L('m4','mila','IVE','HEYA','kpop','coreografia',1,{price:16,duration:'20:30',bpm:115,hue:45,orientation:'v',prereq:{mode:'all',ids:['m1']}}),
    L('m5','mila','LE SSERAFIM','ANTIFRAGILE','kpop','coreografia',2,{price:20,duration:'24:30',bpm:105,hue:350,prereq:{mode:'any',ids:['m3','m4']}}),
    L('m6','mila','aespa','Supernova','kpop','coreografia',2,{price:20,duration:'22:50',bpm:120,hue:230,orientation:'v',prereq:{mode:'all',ids:['m2']}}),
    L('m7','mila','BLACKPINK','Shut Down','kpop','coreografia',2,{price:22,duration:'25:10',bpm:110,hue:300,orientation:'v',prereq:{mode:'all',ids:['m5']}}),
    L('m8','mila','BABYMONSTER','SHEESH','kpop','coreografia',3,{price:28,duration:'27:00',bpm:130,hue:5,prereq:{mode:'any',ids:['m6','m7']}}),
    L('g1','bela','','Isolamentos de Jazz Funk','jazzfunk','tecnica',0,{price:0,duration:'12:30',bpm:96,hue:20}),
    L('g2','bela','','Atitude, Olhar e Hair Flip','jazzfunk','performance',0,{price:0,duration:'15:10',bpm:100,hue:300,orientation:'v'}),
    L('g3','bela','Doja Cat','Paint The Town Red','jazzfunk','coreografia',1,{price:18,duration:'19:20',bpm:100,hue:355,orientation:'v',turmaId:'t-bela-1',prereq:{mode:'all',ids:['g1']}}),
    L('g4','bela','','Chão e Transições','jazzfunk','tecnica',1,{price:15,duration:'17:00',bpm:90,hue:275,cropMobile:false,turmaId:'t-bela-1',prereq:{mode:'all',ids:['g1']}}),
    L('g5','bela','Tinashe','Nasty','jazzfunk','coreografia',2,{price:22,duration:'23:45',bpm:112,hue:320,turmaId:'t-bela-1',prereq:{mode:'all',ids:['g2','g3']}}),
    L('g6','bela','','Freestyle Guiado de Jazz Funk','jazzfunk','performance',2,{price:18,duration:'16:40',bpm:100,hue:10,turmaId:'t-bela-2',prereq:{mode:'all',ids:['g4']}}),
    L('g7','bela','Beyoncé','Partition','jazzfunk','coreografia',3,{price:30,duration:'28:30',bpm:98,hue:40,turmaId:'t-bela-2',prereq:{mode:'all',ids:['g5']}}),
    L('g8','bela','','Coreografia Autoral: Brasa','autoral','coreografia',3,{price:30,duration:'30:00',bpm:120,hue:15,turmaId:'t-bela-2',prereq:{mode:'any',ids:['g6','g7']}})
  ];
  // alunos fake por professor
  const NAMES=['Ana Luiza','Bruna','Camila','Carol','Duda','Gabi','Giovanna','Isa','Júlia','Larissa','Lara','Letícia','Malu','Manu','Mariana','Nina','Pedro','Rafaela','Sofia','Thaís','Vitória','Yasmin','Kaio','Lucas','Mel','Helena','Clara','Enzo','Lívia','Hana','Jade','Luan'];
  const SUR=['Alves','Barbosa','Costa','Dias','Ferreira','Gomes','Kim','Lima','Moraes','Nunes','Oliveira','Park','Ramos','Souza','Tanaka','Vieira'];
  let seedN=7; const rnd=()=>{seedN=(seedN*16807)%2147483647;return (seedN-1)/2147483646};
  const MONTHS=['mai','jun','jul','ago','set','out','nov'];
  const students=[];
  const counts={yago:27,mila:22,bela:19};
  for(const t of teachers){
    for(let i=0;i<counts[t.id];i++){
      const name=`${NAMES[Math.floor(rnd()*NAMES.length)]} ${SUR[Math.floor(rnd()*SUR.length)]}`;
      let plan,paid;
      const tl=lessons.filter(l=>l.teacherId===t.id&&l.price>0);
      if(rnd()<.18){const n=1+Math.floor(rnd()*2);const ids=[...tl].sort(()=>rnd()-.5).slice(0,n).map(l=>l.id);plan={type:'avulso',ids};paid=ids.reduce((a,id)=>a+lessons.find(l=>l.id===id).price,0)}
      else if(t.pricing.mode==='turmas'){const w=rnd();const tm=t.turmas[w<.45?0:w<.8?1:Math.min(2,t.turmas.length-1)];plan={type:'turma',id:tm.id};paid=tm.price}
      else{plan={type:'passe'};paid=t.pricing.passPrice}
      students.push({id:`s-${t.id}-${i}`,teacherId:t.id,name,plan,paid,since:MONTHS[Math.floor(rnd()*MONTHS.length)],progress:Math.round(rnd()*100)});
    }
  }
  return {v:2,teachers,lessons,students,me:'yago',done:['y1'],access:{turmas:[],passes:[],lessons:[]}};
}


module.exports=seed;
