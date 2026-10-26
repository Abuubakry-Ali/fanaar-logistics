import test from 'node:test';
import assert from 'node:assert/strict';
import {placeLabel,placeValue,prefillRoute,supportsRoute,ROUTE_PAIRS} from '../src/route-locations.js';

test('short customer place names retain stable service values and explicit Pemba routes',()=>{
 for(const [raw,label,value]of [['ZANZIBAR (UNGUJA)','Zanzibar','Zanzibar (Unguja)'],['zanzibar','Zanzibar','Zanzibar (Unguja)'],['Zanzibar ( PEMBA )','Pemba','Zanzibar (Pemba)'],['pemba','Pemba','Zanzibar (Pemba)'],['DAR   ES SALAAM','Dar es Salaam','Dar es Salaam'],['tanga','Tanga','Tanga']]){assert.equal(placeLabel(raw),label);assert.equal(placeValue(raw),value);}
 assert.equal(ROUTE_PAIRS.length,7);assert.ok(supportsRoute('DAR ES SALAAM','PEMBA'));assert.ok(!supportsRoute('Zanzibar','Pemba'));
 assert.deepEqual(prefillRoute({from:'Dar es Salaam',to:'Zanzibar'}),{from:'Dar es Salaam',to:'Zanzibar (Unguja)'});
 assert.deepEqual(prefillRoute({from:'Pemba',to:'Tanga'}),{from:'Zanzibar (Pemba)',to:'Tanga'});
 assert.deepEqual(prefillRoute({from:'Tanga',to:'Dar es Salaam'}),{from:'',to:'Dar es Salaam'});
});
