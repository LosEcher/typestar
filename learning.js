// Local-only vocabulary and spaced review data. No account or background service.
const Learning = (() => {
  const KEY=['typestar','study','v1'].join('-');
  const DAY=86400000, intervals=[DAY,3*DAY,7*DAY,14*DAY,30*DAY];
  const presets={
    primary:{zh:['森林','阳光','花朵','云朵','星星','彩虹','学校','朋友','快乐','学习'],en:['sunny','happy','green','flower','school','friend','apple','water','family','smile']},
    secondary:{zh:['知识','探索','坚持','责任','思考','自然','科学','梦想','勇气','成长'],en:['knowledge','explore','responsibility','science','environment','confidence','discover','progress','challenge','creative']}
  };
  function parse(text){
    const rows=text.split(/\r?\n|[,，；;]/).map(x=>x.trim()).filter(Boolean);
    if(!rows.length)throw Error('请至少填写一个词语');
    if(rows.length>500)throw Error('每份词表最多 500 个词语');
    const words=[];
    for(const row of rows){
      if(!/^[\u3400-\u9fffA-Za-z]+$/.test(row)||[...row].length>24)throw Error(`「${row.slice(0,30)}」不符合格式：仅支持汉字或英文字母，每词最多 24 字符`);
      if(!words.includes(row))words.push(row);
    }
    return words;
  }
  function create(storage){
    let data={scope:'forest',custom:[],mistakes:{}};
    let warning='';
    try{
      const raw=storage?.getItem(KEY);
      if(raw){const saved=JSON.parse(raw);if(!saved||!Array.isArray(saved.custom)||!saved.mistakes||typeof saved.mistakes!=='object')throw Error();
        data.scope=['forest','primary','secondary','custom'].includes(saved.scope)?saved.scope:'forest';
        data.custom=saved.custom.filter(w=>typeof w==='string'&&/^[\u3400-\u9fffA-Za-z]{1,24}$/.test(w)).slice(0,500);
        for(const [word,r] of Object.entries(saved.mistakes)){if(/^[\u3400-\u9fffA-Za-z]{1,24}$/.test(word)&&Number.isFinite(r.due)&&Number.isInteger(r.stage)&&r.stage>=0&&r.stage<=5&&Number.isFinite(r.errors))data.mistakes[word]=r}
      }
    }catch{warning='本机记录读取失败，本次使用临时记录；原存储不会自动覆盖'}
    const readFailed=!!warning;
    function save(){try{if(!storage||readFailed)throw Error();storage.setItem(KEY,JSON.stringify(data));warning=''}catch{warning='记录仅保留在本次页面中：本机存储不可用'}return !warning}
    const isLanguage=(word,lang)=>lang==='mix'||(lang==='zh'?/[\u3400-\u9fff]/.test(word):/^[A-Za-z]+$/.test(word));
    return {
      get data(){return data},get warning(){return warning},save,
      setScope(scope){data.scope=scope;save()},
      setCustom(text){data.custom=parse(text);data.scope='custom';save();return data.custom},
      words(lang,fallback){const group=presets[data.scope];const list=group?[...group.zh,...group.en]:data.scope==='custom'?data.custom:fallback;return list.filter(w=>isLanguage(w,lang))},
      reviews(lang,dueOnly=false,now=Date.now()){return Object.keys(data.mistakes).filter(w=>isLanguage(w,lang)&&(!dueOnly||data.mistakes[w].due<=now)).sort((a,b)=>data.mistakes[a].due-data.mistakes[b].due)},
      fail(word,char,now=Date.now()){
        const old=data.mistakes[word];
        data.mistakes[word]={errors:(old?.errors||0)+1,stage:0,due:now+600000,lastWrong:char,lastPractice:now};save();
      },
      complete(word,failed,now=Date.now()){
        const r=data.mistakes[word];if(!r||failed)return;
        r.due=now+intervals[Math.min(r.stage,intervals.length-1)];r.stage=Math.min(r.stage+1,5);r.lastPractice=now;save();
      }
    };
  }
  return {create,parse,presets};
})();
if(typeof module!=='undefined')module.exports=Learning;
