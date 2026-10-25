import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

const built=await build({entryPoints:[fileURLToPath(new URL('../src/tracking-journey.jsx',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'tracking-view-surfaces',setup(builder){
 builder.onResolve({filter:/^(react|lucide-react)$/},args=>({path:args.path,namespace:'unit'}));
 builder.onLoad({filter:/.*/,namespace:'unit'},({path})=>({contents:path==='react'?`export default{createElement:(type,props,...children)=>({type,props:{...props,children}}),Fragment:Symbol.for('test.fragment')};`:`export const ArrowRight=()=>null,MapPin=ArrowRight,Package=ArrowRight;`,loader:'js'}));
}}]});
const{TrackingJourney}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const flatten=node=>node==null||typeof node==='boolean'?'':Array.isArray(node)?node.map(flatten).join(''):typeof node!=='object'?String(node):flatten(node.props?.children);
function nodes(tree){const result=[];function walk(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(walk);return;}result.push(node);walk(node.props?.children);}walk(tree);return result;}
const fixture=changes=>({status:'booked',from:'Dar es Salaam',to:'Zanzibar (Unguja)',eta:'2026-10-27T09:00:00Z',events:[],...changes});

test('legacy scheduled pickup is never presented as actual collection',()=>{
 const tree=TrackingJourney({record:fixture({pickupAt:'2026-10-26T06:00:00Z',status:'received'})}),text=flatten(tree),spans=nodes(tree).filter(node=>node.type==='span').map(flatten);
 assert.ok(spans.includes('Scheduled pickup'));assert.ok(!spans.includes('Picked up'));assert.match(text,/Cargo received/);assert.match(text,/Estimated delivery/);assert.doesNotMatch(text,/Cargo picked up/);
});

test('public milestones and pickup estimates use EAT and stay separate from actual pickup and delivery',()=>{
 const record=fixture({milestone:'driver_on_way_to_pickup',pickupEtaAt:'2026-10-26T07:00:00Z',pickupEtaWindow:'10:00–12:00 EAT',events:[{status:'at_collection_centre',description:'Cargo received at the centre.',occurredAt:'2026-10-25T08:00:00Z'},{status:'at_sorting_facility',description:'Sorting cargo.',occurredAt:'2026-10-25T09:00:00Z'}],driverPhone:'PRIVATE PHONE',driverName:'PRIVATE DRIVER'}),text=flatten(TrackingJourney({record}));
 for(const value of ['Driver on the way to pickup','Estimated pickup','10:00','12:00','EAT','At Fanaar collection centre','At sorting facility'])assert.ok(text.includes(value),value);assert.ok(!text.includes('PRIVATE'));
 const collected=TrackingJourney({record:{...record,milestone:'picked_up',pickedUpAt:'2026-10-25T08:00:00Z'}}),spans=nodes(collected).filter(node=>node.type==='span').map(flatten);assert.ok(spans.includes('Picked up'));assert.ok(!spans.includes('Estimated pickup'));assert.match(flatten(collected),/Cargo picked up/);
});

test('older responses with absent optional fields or invalid dates remain readable without invented collection',()=>{
 const record=fixture({status:'in_transit',pickupAt:'invalid',eta:null}),tree=TrackingJourney({record}),text=flatten(tree);assert.match(text,/In transit/);assert.match(text,/To be confirmed/);assert.ok(!nodes(tree).some(node=>node.type==='span'&&flatten(node)==='Picked up'));
});
