import assert from 'node:assert/strict';
import { exportCominsRowsToXlsx, importCominsRowsFromXlsx, inspectCominsXlsx } from 'comins-table/xlsx';
const bytes = await exportCominsRowsToXlsx({ rows: [['001',0,false]], columns: ['id','score','active'].map((id,i)=>({id,value:r=>r[i]})) });
assert.equal((await inspectCominsXlsx({bytes})).sheets[0].name,'Sheet1');
assert.deepEqual(await importCominsRowsFromXlsx({bytes,mapRow:r=>r.cells}), [['001',0,false]]);
console.log('Node byte API: typed values passed');
