import { mkdir, writeFile } from 'node:fs/promises';
import { fixture, MAIN } from './build-fixtures.mjs';
const headers = ['id','name','score','active','date'];
const cells = `<row r="1">${headers.map((v,i)=>`<c r="${String.fromCharCode(65+i)}1" t="str"><v>${v}</v></c>`).join('')}</row><row r="2"><c r="A2" t="str"><v>0001</v></c><c r="B2" t="str"><v>Cached formula</v></c><c r="C2"><f>1-1</f><v>0</v></c><c r="D2" t="b"><f>FALSE()</f><v>0</v></c><c r="E2" s="1"><f>60</f><v>60</v></c></row>`;
const styles = `<styleSheet xmlns="${MAIN}"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>`;
await mkdir('example/public/fixtures', { recursive: true });
await writeFile('example/public/fixtures/xlsx-import-sample.xlsx', await fixture({ cells, styles, dimension:'A1:E2' }));
