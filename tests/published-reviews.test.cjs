const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('published-reviews.js','utf8');
function client(){
  const listeners={}, timers=new Map(); let poll;
  function element(tag){ return {tag,hidden:false,children:[],attrs:{},textContent:'',
    append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},remove(){this.removed=true;},
    setAttribute(k,v){this.attrs[k]=v;},set innerHTML(_){throw new Error('Unsafe HTML');}}; }
  const grid=element('div'),section=element('section'),body=element('body'); section.hidden=true;section.querySelector=()=>grid;
  const document={hidden:false,body,querySelector:()=>section,createElement:element,addEventListener:(type,fn)=>{listeners[type]=fn;}};
  const window={crypto:webcrypto,ELEMENTALES_REVIEWS:{endpoint:'https://script.google.com/macros/s/test/exec'},addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener:type=>{delete listeners[type];}};
  vm.runInNewContext(source,{document,window,location:{origin:'https://elementales.biz'},URL,Uint8Array,Array,Number,Object,JSON,String,
    setInterval:fn=>{poll=fn;},setTimeout:fn=>{const id={};timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)});
  return {section,grid,document,body,poll:()=>poll(),timeout:()=>[...timers.values()].forEach(fn=>fn()),
    currentId:()=>new URL(body.children.at(-1).src).searchParams.get('requestId'),
    ack(reviews,changes={},origin='https://n-example-script.googleusercontent.com'){listeners.message?.({origin,data:{type:'elementales-published-reviews',requestId:this.currentId(),ok:true,reviews,...changes}});}};
}
const review={name:'Approved client',service:'Family',rating:5,message:'</script><img src=x onerror=alert(1)>'};
test('renders only matching Google responses and uses plain text for customer content',()=>{
  const c=client(); c.ack([review],{},'https://attacker.example');assert.equal(c.section.hidden,true);
  c.ack([review],{requestId:'wrong'});assert.equal(c.section.hidden,true);
  c.ack([review]);assert.equal(c.section.hidden,false);
  const card=c.grid.children[0];assert.equal(card.children[1].children[0].textContent,review.message);
  assert.equal(card.children[2].textContent,review.name);
  assert.equal(card.children[0].attrs['aria-label'],'5 out of 5 stars');
});
test('polling removes revoked reviews, avoids parallel requests and pauses in hidden tabs',()=>{
  const c=client();const first=c.currentId();c.poll();assert.equal(c.body.children.length,1);
  c.ack([review]);c.poll();assert.notEqual(c.currentId(),first);c.ack([]);assert.equal(c.section.hidden,true);assert.equal(c.grid.children.length,0);
  const count=c.body.children.length;c.document.hidden=true;c.poll();assert.equal(c.body.children.length,count);
});
test('timeouts and private/invalid response fields fail closed instead of retaining old testimonials',()=>{
  const c=client();c.ack([review]);c.poll();c.timeout();assert.equal(c.section.hidden,true);
  c.poll();c.ack([{...review,email:'private@example.com'}]);assert.equal(c.section.hidden,true);
  c.poll();c.ack([review]);c.poll();c.ack([],{ok:false});assert.equal(c.section.hidden,true);
});
