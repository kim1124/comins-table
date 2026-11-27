export const memoryStateSignatureExpression = `(() => {
  const focus = [];
  let element = document.activeElement;
  while (element) {
    const parent = element.parentElement;
    focus.unshift([element.localName, parent ? Array.prototype.indexOf.call(parent.children, element) : null]);
    element = parent;
  }
  const overlays = [...document.querySelectorAll(
    '[data-playground-multi-select-portal], [role="dialog"], [role="menu"], [role="tooltip"]'
  )].map(node => [node.getAttribute('role'), node.hasAttribute('data-playground-multi-select-portal'),
    node.hasAttribute('hidden'), node.getAttribute('aria-hidden')]);
  return JSON.stringify({
      focus,
      overlays,
      route: location.pathname,
      viewport: [innerWidth, innerHeight],
      tables: [...document.querySelectorAll('[data-comins-table-instance-id]')].map(table => ({
        viewports: [...table.querySelectorAll('.comins-table__body-viewport')].map(view => [view.scrollTop, view.scrollLeft, view.clientWidth, view.clientHeight]),
        columns: [...table.querySelectorAll('th[data-comins-column-id]')].map(column => [column.getAttribute('data-comins-column-id'), column.offsetWidth]),
        rows: [...table.querySelectorAll('tr[data-comins-row-data-index]')].map(row => row.getAttribute('data-comins-row-data-index')),
        selection: [...table.querySelectorAll('[data-selected-row=true], [data-selected=true], [data-range-selected=true]')].flatMap(node => {
          const row = node.closest('tr[data-comins-row-data-index]');
          return row ? [[row.getAttribute('data-comins-row-data-index'), node.getAttribute('data-comins-cell-column-id'), node.getAttribute('data-range-selected')]] : [];
        })
      }))
  });
})()`;
