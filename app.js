let audio;
const PINYIN={森:['sēn','sen'],林:['lín','lin'],花:['huā','hua'],朵:['duǒ','duo'],小:['xiǎo','xiao'],鹿:['lù','lu'],星:['xīng','xing'],风:['fēng','feng'],筝:['zhēng','zheng'],云:['yún','yun'],阳:['yáng','yang'],光:['guāng','guang'],甜:['tián','tian'],果:['guǒ','guo'],冻:['dòng','dong'],彩:['cǎi','cai'],虹:['hóng','hong']};
Object.assign(PINYIN,{学:['xué','xue'],校:['xiào','xiao'],朋:['péng','peng'],友:['yǒu','you'],快:['kuài','kuai'],乐:['lè','le'],习:['xí','xi'],知:['zhī','zhi'],识:['shí','shi'],探:['tàn','tan'],索:['suǒ','suo'],坚:['jiān','jian'],持:['chí','chi'],责:['zé','ze'],任:['rèn','ren'],思:['sī','si'],考:['kǎo','kao'],自:['zì','zi'],然:['rán','ran'],科:['kē','ke'],梦:['mèng','meng'],想:['xiǎng','xiang'],勇:['yǒng','yong'],气:['qì','qi'],成:['chéng','cheng'],长:['zhǎng','zhang']});
let showPinyin=true,compositionText='',feedbackTimer=null,wordTimer=null,pending=[],processing=false;

const WORDS={mix:['sunny','森林','bloom','花朵','happy','小鹿','magic','星星','peach','风筝','smile','云朵','green','阳光','dream','甜甜'],zh:['森林','花朵','小鹿','星星','风筝','云朵','阳光','甜甜','果冻','彩虹'],en:['sunny','bloom','happy','magic','peach','smile','green','dream','candy','flower']};
let duration=60;let lang='mix',difficulty='normal',target='',index=0,typed=0,correct=0,combo=0,best=0,seconds=60,running=false,timerId=null,startTime=0,sound=true;
const $=id=>document.getElementById(id);
let storage;try{storage=window.localStorage}catch{}
const learning=Learning.create(storage);
let practiceMode='normal',reviewQueue=[],wordFailed=false,roundFinished=false;
function pick(){
  const list=practiceMode==='normal'?learning.words(lang,WORDS[lang]):practiceMode==='due'?reviewQueue:learning.reviews(lang);
  if(!list.length){target='';index=0;roundFinished=true;renderTarget();$('hint').textContent=practiceMode==='normal'?'当前语言没有词汇，请切换语言或编辑词表':'本轮到期复习已完成，或当前语言暂无错词';renderLearning();return}
  target=practiceMode==='due'?reviewQueue.shift():list[Math.floor(Math.random()*list.length)];
  index=0;wordFailed=false;compositionText='';renderTarget();renderLearning();
}
function renderTarget(){$('target').style.fontSize=target.length>12?'18px':target.length>7?'26px':'';renderPinyin();updateKeyHint(); $('typed').textContent=target.slice(0,index);$('remaining').textContent=target.slice(index)||'✓';$('remaining').classList.remove('error');$('progress').style.width=`${index/target.length*100}%`; }
function beep(ok){if(!sound)return;const c=audio||(audio=new (window.AudioContext||window.webkitAudioContext)()),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=ok?560:170;g.gain.setValueAtTime(.045,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.12);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.12)}
function start(){if(running)return;running=true;startTime=Date.now();$('hint').textContent='跟着节奏输入，别忘了抬头看看小树精';timerId=setInterval(()=>{seconds--; $('timer').textContent=seconds;if(seconds<=0)end()},1000)}
function end(){clearTimeout(wordTimer);pending=[];processing=false;running=false;clearInterval(timerId);$('statusMessage').textContent=`练习完成！你正确输入了 ${correct} 个字符，继续保持 ✨`;$('hint').textContent='按“重新开始”再来一局';}
function updateStats(){const acc=typed?Math.round(correct/typed*100):0;$('accuracy').textContent=`${acc}%`;$('wpm').textContent=Math.round(correct/Math.max(1/60,(duration-seconds)/60))||0;$('typedCount').textContent=typed;$('correctCount').textContent=correct;$('bestCombo').textContent=best;$('combo').innerHTML=`连击 <b>${combo}</b> <span>✦</span>`;$('ring').style.strokeDashoffset=320-(320*acc/100);}
function renderPinyin(){
  $('pinyinGuide').textContent=showPinyin&&PINYIN[target[index]]?`【${target[index]}】${PINYIN[target[index]][0]} · ${index+1}/${target.length} 字`:'';
}
function feedback(ok,char){
  clearTimeout(feedbackTimer);
  $('target').classList.remove('char-success','char-error');
  void $('target').offsetWidth;
  $('target').classList.add(ok?'char-success':'char-error');
  $('statusMessage').textContent=ok?`✓ ${char} 输入成功${index===target.length?' · 整个词完成啦！':''}`:`再试一次 · 收到「${char}」，需要「${target[index]}」`;
  beep(ok);
  $('tree').classList.remove('pop');void $('tree').offsetWidth;
  if(ok)$('tree').classList.add('pop');
  feedbackTimer=setTimeout(()=>$('target').classList.remove('char-success','char-error'),350);
}
function consume(text){if(seconds<=0||roundFinished||!target)return;start();pending.push(...text);processNext()}
function processNext(){
  if(processing||!pending.length||seconds<=0)return;
  processing=true;
  const char=pending.shift(),ok=char===target[index];
  typed++;
  if(ok){correct++;combo++;best=Math.max(best,combo);index++;if(index===target.length)learning.complete(target,wordFailed)}else {combo=0;wordFailed=true;learning.fail(target,char)}
  renderLearning();
  renderTarget();updateStats();feedback(ok,char);
  // Keep the completed character visible; serialize multi-character IME commits.
  wordTimer=setTimeout(()=>{
    if(index===target.length){pick();if(roundFinished){pending=[];end()}}
    processing=false;processNext();
  },index===target.length?480:160);
}
let composing=false;
const input=$('typingInput');
function inputStatus(text){$('inputState').textContent=text}
function acceptInput(text){if(!text)return;inputStatus(/[\u3400-\u9fff]/u.test(text)?'中文输入 · 已提交汉字':/^[\x20-\x7e]+$/.test(text)?'英文 / 直接输入 · 已检测':'文字输入 · 已检测');consume(text)}
input.addEventListener('compositionstart',()=>{composing=true;compositionText='';updateKeyHint();inputStatus('输入法组词中 · 请选词后提交')});
input.addEventListener('compositionupdate',e=>{compositionText=e.data||'';updateKeyHint();inputStatus(`输入法组词中${e.data?' · '+e.data:''}`)});
input.addEventListener('compositionend',e=>{composing=false;compositionText='';const text=e.data??input.value;input.value='';updateKeyHint();acceptInput(text)});
input.addEventListener('input',e=>{if(composing||e.isComposing)return;if(input.value){const text=input.value;input.value='';acceptInput(text)}});
input.addEventListener('focus',()=>{if(!composing)inputStatus('已就绪 · 等待输入以检测中英文')});
input.addEventListener('blur',()=>{inputStatus('输入框未聚焦 · 点击词语继续');clearPressed()});
const keyboardRows=[['Backquote','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal','Backspace'],['Tab',...'QWERTYUIOP'.split('').map(c=>'Key'+c),'BracketLeft','BracketRight','Backslash'],['CapsLock',...'ASDFGHJKL'.split('').map(c=>'Key'+c),'Semicolon','Quote','Enter'],['ShiftLeft',...'ZXCVBNM'.split('').map(c=>'Key'+c),'Comma','Period','Slash','ShiftRight'],['ControlLeft','AltLeft','MetaLeft','Space','MetaRight','AltRight','ControlRight']];
const keyLabels={Backquote:'`',Minus:'−',Equal:'=',Backspace:'⌫',Tab:'Tab',BracketLeft:'[',BracketRight:']',Backslash:'\\',CapsLock:'Caps',Semicolon:';',Quote:"'",Enter:'Enter',ShiftLeft:'Shift',ShiftRight:'Shift',Comma:',',Period:'.',Slash:'/',ControlLeft:'Ctrl',ControlRight:'Ctrl',AltLeft:'Alt',AltRight:'Alt',MetaLeft:'⌘',MetaRight:'⌘',Space:'空格'};
const keyElements=new Map();
for(const row of keyboardRows){const line=document.createElement('div');line.className='key-row';for(const code of row){const key=document.createElement('span');key.className='keycap'+(code==='Space'?' space-key':'')+(code.length>6&&!code.startsWith('Digit')?' wide-key':'');key.textContent=keyLabels[code]||code.replace(/^(Key|Digit)/,'');key.dataset.code=code;line.append(key);keyElements.set(code,key)}$('virtualKeyboard').append(line)}
function clearPressed(){keyElements.forEach(k=>k.classList.remove('pressed'))}
function updateKeyHint(){
  keyElements.forEach(k=>k.classList.remove('next-key'));
  const next=target[index];let key=next&&/^[a-z]$/i.test(next)?next:null;
  const chinese=!!PINYIN[next];
  if(chinese&&showPinyin&&[...target.slice(index)].every(c=>PINYIN[c])){
    const expected=[...target.slice(index)].map(c=>PINYIN[c]?.[1]||'').join('');
    const raw=compositionText.toLowerCase().replace(/[\s']/g,'');
    const roman=/^[a-z]*$/.test(raw);
    const matched=roman&&expected.startsWith(raw);
    if(matched)key=expected[raw.length]||'Space';
    $('compositionProgress').textContent=raw?(matched?`全拼进度：${raw} · ${raw.length}/${expected.length} 键${key==='Space'?' · 请选词提交':''}`:roman?`正在组词：${compositionText} · 可使用简拼或其他方案，选词后确认`:`正在选词：${compositionText}`):`已完成 ${index}/${target.length} 字 · 下一个：${next}（${PINYIN[next][0]}）`;
    $('keyHint').textContent=key?(key==='Space'?'全拼已输入 · 空格选词或按数字选候选字':`全拼参考下一键：${key.toUpperCase()} · 选词提交后确认汉字`):'按你的输入法继续组词，提交后确认汉字';
  }else{
    $('compositionProgress').textContent=compositionText?`正在组词：${compositionText}`:index===target.length?'完成！稍等一下，下一词就来':`已完成 ${index}/${target.length} ${chinese?'字':'字符'}`;
    $('keyHint').textContent=key?`下一个键：${key.toUpperCase()} · 薄荷色提示，珊瑚色表示按下`:chinese?'中文输入：按自己的输入法组词并选词提交':'完成后稍作停留，再继续下一词';
  }
  if(key)keyElements.get(key==='Space'?'Space':'Key'+key.toUpperCase())?.classList.add('next-key');
}
$('pinyinToggle').addEventListener('change',e=>{showPinyin=e.target.checked;renderPinyin();updateKeyHint()});
document.addEventListener('keydown',e=>{keyElements.get(e.code)?.classList.add('pressed');if(e.getModifierState?.('CapsLock')&&!composing)inputStatus('Caps Lock 已开启 · 注意英文字母大小写');if(e.target===input||['BUTTON','SELECT','TEXTAREA','INPUT','SUMMARY'].includes(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;if(e.isComposing||e.key==='Process'||e.key==='Dead'){input.focus();return}if(e.key.length===1){input.focus();if(/^[\x20-\x7e]$/.test(e.key)){e.preventDefault();acceptInput(e.key)}}});
document.addEventListener('keyup',e=>keyElements.get(e.code)?.classList.remove('pressed'));
window.addEventListener('blur',clearPressed);
function reset(){roundFinished=false;if(practiceMode==='due')reviewQueue=learning.reviews(lang,true);clearTimeout(wordTimer);clearTimeout(feedbackTimer);pending=[];processing=false;compositionText='';$('target').classList.remove('char-success','char-error');composing=false;input.value="";clearPressed();inputStatus("输入状态待检测 · 点击词语开始");clearInterval(timerId);seconds=difficulty==='easy'?75:difficulty==='hard'?45:60;duration=seconds;typed=correct=combo=best=0;running=false;$('timer').textContent=seconds;$('statusMessage').textContent='准备好了吗？小树精在等你。';$('hint').textContent='按下键盘开始你的森林漫步 →';updateStats();pick()}
function renderLearning(){
  const all=learning.reviews(lang),due=learning.reviews(lang,true);
  $('scopeSummary').textContent=`${learning.words(lang,WORDS[lang]).length} 个当前语言词汇 · 小学/中学为示例，非完整教材`;
  $('reviewCounts').textContent=`${all.length} 词 · ${due.length} 词到期`;
  $('practiceMode').textContent=practiceMode==='due'?`到期复习 · 本轮还剩 ${reviewQueue.length+(roundFinished?0:1)} 词`:practiceMode==='mistakes'?'错词反复练习 · 可提前练习':'当前：范围练习';
  if(learning.warning)$('learningMessage').textContent=learning.warning;
  $('mistakeList').replaceChildren();
  if(!all.length){$('mistakeList').textContent='当前语言还没有错词，继续练习吧！';return}
  for(const word of all){const r=learning.data.mistakes[word];const row=document.createElement('div');row.className='mistake-row';row.textContent=`${word} · 错 ${r.errors} 次 · ${r.due<=Date.now()?'已到期':new Date(r.due).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · 复习阶段 ${r.stage}`;$('mistakeList').append(row)}
}
$('scopeSelect').value=learning.data.scope;
$('customWords').value=learning.data.custom.join('\n');
$('scopeSelect').addEventListener('change',e=>{learning.setScope(e.target.value);practiceMode='normal';reset()});
$('saveWords').onclick=()=>{try{learning.setCustom($('customWords').value);$('scopeSelect').value='custom';practiceMode='normal';$('learningMessage').textContent='词表已保存';reset()}catch(e){$('learningMessage').textContent=e.message}};
$('wordFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>100000){$('learningMessage').textContent='TXT 文件请小于 100KB';return}try{$('customWords').value=await file.text();$('learningMessage').textContent='已读入文本，请检查后点击保存'}catch{$('learningMessage').textContent='文件读取失败，请直接粘贴词表'}});
$('reviewDue').onclick=()=>{if(!learning.reviews(lang,true).length){$('learningMessage').textContent='当前语言没有到期词，可选择反复练错词';return}practiceMode='due';reset()};
$('reviewAll').onclick=()=>{if(!learning.reviews(lang).length){$('learningMessage').textContent='当前语言还没有错词';return}practiceMode='mistakes';reset()};
$('normalPractice').onclick=()=>{practiceMode='normal';reset()};
setInterval(renderLearning,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderLearning()});
$('restartBtn').onclick=reset;$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').innerHTML=sound?'♫ <span>音效开</span>':'♩ <span>音效关</span>'};document.querySelectorAll('#langControl button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#langControl button').forEach(x=>x.classList.remove('active'));b.classList.add('active');lang=b.dataset.lang;reset()});document.querySelectorAll('#difficultyControl button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#difficultyControl button').forEach(x=>x.classList.remove('active'));b.classList.add('active');difficulty=b.dataset.diff;reset()});reset();

// Fullscreen requires a user gesture and is unavailable in some mobile browsers.
const fullscreenButton=$('fullscreenBtn');
if (document.documentElement?.requestFullscreen && document.fullscreenEnabled !== false) {
  fullscreenButton.onclick=async()=>{
    try {
      if(document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { inputStatus('无法进入全屏 · 可继续在当前窗口练习'); }
  };
  document.addEventListener('fullscreenchange',()=>{
    const active=!!document.fullscreenElement;
    fullscreenButton.setAttribute('aria-pressed',String(active));
    fullscreenButton.setAttribute('aria-label',active?'退出全屏':'进入全屏');
    fullscreenButton.innerHTML=active?'⛶ <span>退出全屏</span>':'⛶ <span>全屏</span>';
  });
} else {
  fullscreenButton.hidden=true;
}
