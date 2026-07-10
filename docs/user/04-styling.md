# Styling

Table 전체 스타일은 `className`, `style`, `theme`로 제어한다. Row 스타일은 `rowProps`, column/cell 스타일은 `columns[].cell.props`로 둔다.

```tsx
<CominsTable
  className="example-table"
  columns={[
    {
      field: "name",
      header: { props: { className: "header-cell", title: "Name" } },
      label: "Name",
      cell: {
        props: {
          className: ({ row }) => (row.data.role === "Owner" ? "cell-owner" : undefined),
          style: { textAlign: "left" },
        },
      },
    },
  ]}
  data={data}
  getRowId={(row) => row.id}
  rowProps={{
    className: (row) => (row.role === "Owner" ? "row-owner" : undefined),
    disabled: (row) => row.locked === true,
    style: (row) => (row.active ? { background: "#2f0f5f" } : undefined),
  }}
  theme={{ density: "compact" }}
/>
```

`rowProps.disabled`는 해당 row의 row/cell interaction을 모두 차단한다.
`rowProps.style.background` 또는 `backgroundColor`를 지정하면 odd/even row 배경보다 우선해 실제 cell 배경까지 전달된다.
스타일링 예제는 COMINS 기본 mint 톤과 구분되도록 보라색 배경, 노란색 텍스트, serif/monospace font, 두꺼운 border를 함께 사용한다.

```css
.my-table .comins-table__td.cell-role-owner {
  background: #581c87;
  border-left: 4px solid #fbbf24;
  color: #fef3c7;
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 900;
  text-transform: uppercase;
}

.my-table .row-owner > .comins-table__td {
  border-left: 4px solid #f43f5e;
  color: #fef08a;
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 900;
  text-transform: uppercase;
}
```

## Theme

`comins-table/styles.css`는 기본 table shell과 theme override용 CSS custom properties를 포함한다.
1차 Theme API는 새 preset prop을 추가하지 않고 기존 `theme.className`, `theme.style`, `theme.density`를 사용한다.

```tsx
<CominsTable
  columns={columns}
  data={rows}
  rowHeight={32}
  theme={{
    className: "comins-table-theme--dark",
    style: {
      "--comins-table-row-height": "32px",
    } as React.CSSProperties,
  }}
  virtualized
/>
```

배포 CSS는 아래 샘플 theme class를 제공한다.

- `comins-table-theme--basic`
- `comins-table-theme--dark`
- `comins-table-theme--skyblue`
- `comins-table-theme--mint`
- `comins-table-theme--gray`
- `comins-table-theme--orange`

주요 override 변수는 아래와 같다.

- `--comins-table-accent`
- `--comins-table-accent-foreground`
- `--comins-table-accent-soft`
- `--comins-table-background`
- `--comins-table-border`
- `--comins-table-cell-border`
- `--comins-table-foreground`
- `--comins-table-header-background`
- `--comins-table-header-border`
- `--comins-table-header-color`
- `--comins-table-header-split-border`
- `--comins-table-row-border`
- `--comins-table-row-disabled-background`
- `--comins-table-row-disabled-color`
- `--comins-table-row-even-background`
- `--comins-table-row-odd-background`
- `--comins-table-row-selected-background`
- `--comins-table-scrollbar-corner`
- `--comins-table-scrollbar-thumb`
- `--comins-table-scrollbar-track`
- `--comins-table-range-background`
- `--comins-table-focus`

`tr` 높이는 virtualized row window 계산과 직접 연결된다.
Virtualized table에서 행 높이를 바꿀 때는 CSS의 `--comins-table-row-height`, `--comins-table-cell-height`만 바꾸지 말고 `rowHeight` prop도 같은 숫자로 맞춰야 한다.

`rowProps.disabled`가 `true`인 row는 `--comins-table-row-disabled-background`, `--comins-table-row-disabled-color`로 기본 비활성 스타일을 받는다. Row/cell별 커스텀 class나 style을 추가할 수 있지만, 비활성 row가 조작 불가 상태임을 시각적으로 구분할 수 있어야 한다.
