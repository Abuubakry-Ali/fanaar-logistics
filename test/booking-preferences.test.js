import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const built=await build({entryPoints:[fileURLToPath(new URL('../src/booking-completion.jsx',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'booking-preferences-test',setup(builder){
 builder.onResolve({filter:/^(react|lucide-react|\.\/config|\.\/customer-portal|\.\/booking-attachments)$/},args=>({path:args.path,namespace:'unit'}));
 builder.onLoad({filter:/.*/,namespace:'unit'},({path})=>({contents:path==='react'?`export const useState=(...a)=>globalThis.__bookingUI.useState(...a),useRef=(...a)=>globalThis.__bookingUI.useRef(...a),useEffect=(...a)=>globalThis.__bookingUI.useEffect(...a);export default{createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:Symbol.for('fragment')};`:path==='lucide-react'?`export const ArrowLeft=()=>null,ArrowRight=ArrowLeft,CalendarDays=ArrowLeft,Check=ArrowLeft,CheckCircle2=ArrowLeft,LoaderCircle=ArrowLeft,MapPin=ArrowLeft,ShieldCheck=ArrowLeft;`:path==='./config'?`export const SERVICE_API_URL='https://api.example.test';`:path==='./customer-portal'?`export const Field='Field',PortalDialog='PortalDialog',ContactFallback='ContactFallback';`:`export const BOOKING_ATTACHMENT_ACCEPT='application/pdf';export const prepareBookingAttachment=()=>{throw Error('No attachment was selected');};`,loader:'js'}));
}}]});
const{BookingDetailsDialog}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const reference='SYNTHETIC-BOOKING',token='a'.repeat(64),booking={reference,from:'Dar es Salaam',to:'Zanzibar (Pemba)',state:'pending',stage:'quotation',service:'standard',attachmentCount:0,attachmentLimit:20};
const flat=node=>node==null||typeof node==='boolean'?'':Array.isArray(node)?node.map(flat).join(''):typeof node==='object'?flat(node.props?.children):String(node);
function walk(node,list=[]){if(!node||typeof node!=='object')return list;if(Array.isArray(node)){node.forEach(child=>walk(child,list));return list;}list.push(node);walk(node.props?.children,list);return list;}
async function harness(){
 const h={hooks:[],cursor:0,effects:[],dirty:true,tree:null,calls:[]};
 h.useState=initial=>{const index=h.cursor++;if(!(index in h.hooks))h.hooks[index]={value:typeof initial==='function'?initial():initial};return[h.hooks[index].value,next=>{const value=typeof next==='function'?next(h.hooks[index].value):next;if(!Object.is(value,h.hooks[index].value)){h.hooks[index].value=value;h.dirty=true;}}];};
 h.useRef=initial=>{const index=h.cursor++;return h.hooks[index]??={current:initial};};
 h.useEffect=(effect,deps)=>{const index=h.cursor++,old=h.hooks[index];if(!old||deps.some((value,i)=>!Object.is(value,old.deps[i]))){h.hooks[index]={deps,cleanup:old?.cleanup};h.effects.push({index,effect});}};
 h.flush=()=>{globalThis.__bookingUI=h;let turns=0;while(h.dirty){assert.ok(turns++<30);h.cursor=0;h.dirty=false;h.tree=BookingDetailsDialog({token,reference,onClose(){}});for(const{index,effect}of h.effects.splice(0)){h.hooks[index].cleanup?.();h.hooks[index].cleanup=effect();}}return h.tree;};
 h.nodes=()=>walk(h.flush());h.text=()=>flat(h.flush());h.change=(name,value)=>{const input=h.nodes().find(node=>['input','textarea'].includes(node.type)&&node.props.name===name);assert.ok(input,name);input.props.onChange({target:{name,value}});h.flush();};h.submit=async()=>{await h.nodes().find(node=>node.type==='form').props.onSubmit({preventDefault(){}});h.flush();};
 const previous=globalThis.fetch;globalThis.fetch=async(url,options)=>{h.calls.push([url,options]);return{ok:true,status:200,json:async()=>({booking:options.method==='POST'?{reference,state:'submitted'}:booking})};};
 h.close=()=>{for(const hook of h.hooks)hook?.cleanup?.();globalThis.fetch=previous;};
 h.flush();for(let i=0;i<12;i++){await Promise.resolve();h.flush();}return h;
}
const required={pickupAddress:'Synthetic pickup street',pickupContactName:'Synthetic sender',pickupContactPhone:'+255650000001',deliveryAddress:'Synthetic delivery street',deliveryContactName:'Synthetic recipient',deliveryContactPhone:'+255650000002'};
function fillRequired(h){for(const[name,value]of Object.entries(required))h.change(name,value);}

test('customer can review and submit addresses and contacts with no collection date or time',async()=>{
 const h=await harness();try{
  for(const name of Object.keys(required))assert.equal(h.nodes().find(node=>node.props.name===name).props.required,true,name);
  for(const name of ['preferredCollectionDate','preferredCollectionWindow'])assert.ok(!h.nodes().find(node=>node.props.name===name).props.required,name);
  assert.match(h.text(),/request, not a guaranteed appointment/);fillRequired(h);await h.submit();
  assert.match(h.text(),/Collection date to be arranged/);assert.match(h.text(),/Time to be arranged/);assert.ok(!h.calls.some(([,options])=>options.method==='POST'));
  h.nodes().find(node=>node.type==='input'&&node.props.type==='checkbox').props.onChange({target:{checked:true}});h.flush();await h.submit();
  const sent=h.calls.filter(([,options])=>options.method==='POST');assert.equal(sent.length,1);const body=JSON.parse(sent[0][1].body);
  assert.deepEqual(body,{...required,preferredCollectionDate:'',preferredCollectionWindow:'',notes:'',packageDetails:'',confirmed:true});assert.match(h.text(),/contact you to confirm collection arrangements/);
 }finally{h.close();}
});

test('omitting pickup or delivery contacts still blocks completion without sending',async()=>{
 const h=await harness();try{fillRequired(h);h.change('deliveryContactName','');await h.submit();assert.match(h.text(),/complete the pickup and delivery addresses and contact details/);assert.ok(!h.calls.some(([,options])=>options.method==='POST'));}finally{h.close();}
});

test('a supplied date is validated while a time-only preference remains optional',async()=>{
 const h=await harness();try{fillRequired(h);h.change('preferredCollectionDate','2000-01-01');await h.submit();assert.match(h.text(),/today or a future collection date/);h.change('preferredCollectionDate','');h.change('preferredCollectionWindow','Please call before collection');await h.submit();assert.match(h.text(),/Please review before sending/);assert.match(h.text(),/Please call before collection/);assert.ok(!h.calls.some(([,options])=>options.method==='POST'));}finally{h.close();}
});
