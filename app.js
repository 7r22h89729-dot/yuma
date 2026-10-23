(()=>{
const $=s=>document.querySelector(s);
const content=$(’#app-content’);
const appScreen=$(’#app-screen’);
const home=$(’#home-screen’);

let current=’’;
const store=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const load=(k,f)=>{
try{return JSON.parse(localStorage.getItem(k))??f}
catch{return f}
};

let messages=load(‘yumaMessages’,SIM_DATA.messages);
let kakao=load(‘yumaKakao’,SIM_DATA.kakao);
let liked=load(‘likedPosts’,[false,false]);

function updateTime(){
const d=new Date();
const t=d.toLocaleTimeString(‘ko-KR’,{
hour:‘2-digit’,minute:‘2-digit’,hour12:false
});
[’#status-time’,’#home-time’,’#app-time’,’#lock-time’].forEach(s=>{
const e=$(s);
if(e)e.textContent=t;
});
$(’#lock-date’).textContent=d.toLocaleDateString(‘ko-KR’,{
month:‘long’,day:‘numeric’,weekday:‘long’
});
$(’#home-date’).textContent=$(’#lock-date’).textContent;
}
updateTime();
setInterval(updateTime,15000);

const names={
photos:‘사진’,phone:‘전화’,messages:‘메시지’,kakao:‘KakaoTalk’,
calendar:‘캘린더’,music:‘음악’,instagram:‘Instagram’,
settings:‘설정’,camera:‘카메라’,clock:‘시계’
};

document.querySelectorAll(’[data-app]’).forEach(b=>{
b.addEventListener(‘click’,()=>openApp(b.dataset.app));
});
$(’#back-home’).onclick=goHome;
$(’#home-indicator’).onclick=goHome;

function openApp(n){
current=n;
home.classList.add(‘hidden’);
appScreen.classList.remove(‘hidden’);
$(’#app-title’).textContent=names[n];
render();
}

function goHome(){
appScreen.classList.add(‘hidden’);
home.classList.remove(‘hidden’);
current=’’;
}

function render(){
if(current===‘messages’)renderChat(‘messages’);
else if(current===‘kakao’)renderKakao();
else if(current===‘phone’)renderPhone();
else if(current===‘photos’)renderPhotos();
else if(current===‘calendar’){
content.innerHTML=’2027년 2월7일 일요일유마 생일🎂’;
}
else if(current===‘music’)renderMusic();
else if(current===‘instagram’)renderInstagram();
else if(current===‘settings’){
content.innerHTML=’설정가상 시뮬레이션 · 실제 연락이 전송되지 않습니다.’;
}
else content.innerHTML=’이 앱은 시뮬레이션에서 사용할 수 없어요.’;
}

function renderChat(type){
const list=type===‘messages’?messages:kakao;
content.innerHTML=’오늘 · 가상 대화↑’;
drawBubbles(list);

$(’#chat-form’).onsubmit=e=>{
e.preventDefault();
const inp=$(’#chat-text’);
const v=inp.value.trim();
if(!v)return;

list.push({from:‘me’,text:v});
store(type===‘messages’?‘yumaMessages’:‘yumaKakao’,list);
drawBubbles(list);
inp.value=’’;

if(type===‘messages’&&v.includes(‘나 이제 일어남’)){
setTimeout(()=>{
messages.push(
{from:‘yuma’,text:‘ㅋㅋㅋ 잘햇엉’},
{from:‘yuma’,text:‘잘잤어??’}
);
store(‘yumaMessages’,messages);
if(current===‘messages’)drawBubbles(messages);
},10000);
}
};
}

function drawBubbles(list){
const box=$(’#bubbles’);
if(!box)return;
box.innerHTML=’’;
list.forEach(m=>{
const el=document.createElement(‘div’);
el.className=’bubble ’+(m.from===‘me’?‘out’:‘in’);
el.textContent=m.text;
box.appendChild(el);
});
content.scrollTop=content.scrollHeight;
}

function renderKakao(){
content.innerHTML=’친구채팅’;

$(’#friends-tab’).onclick=()=>{
$(’#kakao-body’).innerHTML=
‘나나’+
‘🐱🐱유마채팅’+
‘민서엄마♥아빠♥동생’;
$(’#open-yuma’).onclick=()=>renderChat(‘kakao’);
};

$(’#chats-tab’).onclick=()=>{
$(’#kakao-body’).innerHTML=
‘🐱🐱한국 많이 춥지?’+
‘📝 나와의 채팅 · 레포트 제출 ~11/1’;
$(’#open-yuma-row’).onclick=()=>renderChat(‘kakao’);
};
$(’#chats-tab’).click();
}

function renderPhone(){
content.innerHTML=’최근 통화’+
SIM_DATA.phoneCalls.map((c,i)=>
‘’+
(c[0].includes(‘ユウマ’)?‘🐱’:‘☎️’)+
‘’+c[0]+’’+c[1]+’ · ‘+c[2]+
‘정보’
).join(’’);

content.querySelectorAll(’[data-call]’).forEach(b=>{
b.onclick=()=>{
if(!SIM_DATA.phoneCalls[+b.dataset.call][0].includes(‘ユウマ’)){
alert(‘이 연락처의 통화는 비활성화되어 있어요.’);
return;
}

content.innerHTML=’🐱ユウマ 🐱🖤통화 중…통화 종료’;

let sec=0;
const timer=setInterval(()=>{
sec++;
if($(’#call-state’))$(’#call-state’).textContent=‘통화 중 · 00:’+String(sec).padStart(2,‘0’);
if(sec>=10)end();
},1000);

function end(){
clearInterval(timer);
content.innerHTML=’통화가 종료되었습니다.최근 통화로’;

if(!load(‘callMessageAdded’,false)){
messages.push({from:‘yuma’,text:‘연습 중!’});
store(‘yumaMessages’,messages);
store(‘callMessageAdded’,true);
}
$(’#back-recent’).onclick=renderPhone;
}
$(’#end-call’).onclick=end;
};
});
}

function renderPhotos(){
content.innerHTML=’사진최근 항목앨범’+
Array.from({length:12},(_,i)=>’사진 ‘+(i+1)+’나중에 추가’).join(’’)+
‘’;
}

function renderMusic(){
content.innerHTML=’보관함🖤플레이리스트’+
SIM_DATA.songs.map((s,i)=>
‘’+s[1]+’’+s[0]+’’
).join(’’);

content.querySelectorAll(’[data-song]’).forEach(b=>{
b.onclick=()=>{
const s=SIM_DATA.songs[+b.dataset.song];
location.href=‘https://music.apple.com/kr/search?term=’+encodeURIComponent(s.join(’ ’));
};
});
}

function renderInstagram(){
content.innerHTML=’홈프로필’;
const body=$(’#ig-body’);

function feed(){
body.innerHTML=
‘nyang2777사진 업로드 예정’+(liked[0]?‘❤️’:‘♡’)+’이분 밤새고 한국 오셔서 피곤하시다네요..’+
‘nyang2777사진 업로드 예정’+(liked[1]?‘❤️’:‘♡’)+’고양이랑 머근 밥2nakakita7: なんでやねん！！😒’;

body.querySelectorAll(’[data-like]’).forEach(b=>{
b.onclick=()=>{
liked[+b.dataset.like]=!liked[+b.dataset.like];
store(‘likedPosts’,liked);
feed();
};
});
}

function profile(){
body.innerHTML=’🐱냐냐냥게시물 2 · 팔로워 2 · 팔로잉 3어떤 냥이 키우기..&TEAM 공식 Instagram’;
}

$(’#ig-home’).onclick=feed;
$(’#ig-profile’).onclick=profile;
feed();
}
})();
