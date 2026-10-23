(()=>{
const lock=document.getElementById(‘lock-screen’);
const home=document.getElementById(‘home-screen’);
const keypad=document.getElementById(‘keypad’);
const dots=document.getElementById(‘pass-dots’);
let entered=’’;

function updateDots(){
dots.textContent=Array.from({length:4},(_,i)=>i<entered.length?‘●’:‘○’).join(’ ’);
}

function unlock(){
if(entered===‘0207’){
lock.classList.add(‘hidden’);
home.classList.remove(‘hidden’);
sessionStorage.setItem(‘unlocked’,‘1’);

if(!sessionStorage.getItem(‘toastShown’)){
const toast=document.getElementById(‘toast’);
toast.classList.remove(‘hidden’);
setTimeout(()=>toast.classList.add(‘hidden’),3000);
sessionStorage.setItem(‘toastShown’,‘1’);
}
}else{
entered=’’;
updateDots();
}
}

function addKey(value){
const button=document.createElement(‘button’);
button.textContent=value;

if(value){
button.addEventListener(‘click’,()=>{
if(value===‘⌫’){
entered=entered.slice(0,-1);
}else if(entered.length<4){
entered+=value;
}

updateDots();

if(entered.length===4){
unlock();
}
});
}

keypad.appendChild(button);
}

for(let n=1;n<=9;n++)addKey(String(n));
addKey(’’);
addKey(‘0’);
addKey(‘⌫’);

document.getElementById(‘delete-key’).addEventListener(‘click’,()=>{
entered=entered.slice(0,-1);
updateDots();
});

if(sessionStorage.getItem(‘unlocked’)){
lock.classList.add(‘hidden’);
home.classList.remove(‘hidden’);
}
})();
