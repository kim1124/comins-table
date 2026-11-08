import { createElement as h, useEffect, useState } from 'react';
import { CominsTable } from './library/index.js';

export const caseNames = ['basic', 'virtualized', 'auto-height', 'empty', 'loading', 'multiple'];
const initialData = [{ id: 'z', name: 'Zulu' }, { id: 'a', name: 'Alpha' }, { id: 'm', name: 'Mike' }];
const columns = [{ field: 'name', label: 'Name', sort: true, filter: true }];
function Table({ caseName, mismatch }) {
  const [data, setData] = useState(() => ['empty', 'loading'].includes(caseName) ? [] :
    (caseName === 'virtualized' ? Array.from({ length: 100000 }, (_, i) => initialData[i] ?? { id: `large-${i}`, name: `Row ${String(i).padStart(6, '0')}` }) : initialData)
      .map((row, i) => ({ ...row, name: mismatch && i === 0 ? 'INTENTIONAL MISMATCH' : row.name })));
  const options = caseName === 'virtualized' ? { virtualized: true } : caseName === 'auto-height' ?
    { virtualized: true, getRowHeight: () => 'auto', estimatedRowHeight: 56 } : caseName === 'loading' ?
      { loading: true, skeletonRowCount: 3 } : {};
  return h(CominsTable, { columns, data, getRowId: row => row.id, onChangeData: setData,
    'data-testid': 'ssr-table', style: { height: 320 }, theme: { className: 'comins-table-theme--excel' }, ...options });
}
export function App({ caseName, mismatch = false }) {
  useEffect(() => { window.__ssrReady = true; }, []);
  return h('section', null, h(Table, { caseName, mismatch }), caseName === 'multiple' ? h(Table, { caseName, mismatch }) : null);
}
