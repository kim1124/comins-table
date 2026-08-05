import { useCallback, useMemo, useState } from "react";

import { CominsTable, type CominsTableColumn, type CominsVirtualListItem } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { createExampleRows, type PersonRow } from "../fixtures/people";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type ComponentExampleId =
  | "button"
  | "checkbox"
  | "input"
  | "menu"
  | "progress"
  | "radio"
  | "renderer"
  | "select"
  | "toggle"
  | "virtual-list"
  | "virtual-list-more"
  | "virtual-list-search";

type ComponentRow = PersonRow & {
  virtualListItems?: CominsVirtualListItem[];
};

type HeaderComponentState = {
  checkbox: boolean;
  input: string;
  progress: number;
  radio: string;
  select: string;
  toggle: boolean;
};

const componentExamples: Array<{
  description: string;
  id: ComponentExampleId;
  title: string;
}> = [
  {
    description: "header.components와 cell.components로 Button callback을 연결하고 공유 이벤트 로그를 갱신합니다.",
    id: "button",
    title: "Button 예제",
  },
  {
    description: "Cell 입력값을 내부 draft로 유지하고 Enter 또는 Blur에서 외부 data 변경을 commit하는 Input 예제입니다.",
    id: "input",
    title: "Input Field 예제",
  },
  {
    description: "Boolean 값을 checked 상태로 렌더링하고 immutable update로 갱신하는 Checkbox 예제입니다.",
    id: "checkbox",
    title: "Checkbox 예제",
  },
  {
    description: "역할 값을 선택하는 Radio Button 예제입니다.",
    id: "radio",
    title: "Radio Button 예제",
  },
  {
    description: "옵션 목록에서 값을 선택하고 Row data를 갱신하는 Select Option Box 예제입니다.",
    id: "select",
    title: "Select Option Box 예제",
  },
  {
    description: "Boolean 값을 토글 버튼으로 표현하는 Toggle Button 예제입니다.",
    id: "toggle",
    title: "Toggle Button 예제",
  },
  {
    description: "숫자 값을 진행률로 표현하는 Progress Component 예제입니다.",
    id: "progress",
    title: "Progress Component 예제",
  },
  {
    description: "Header 버튼 바로 아래에 popover 메뉴를 표시하고 item 선택 이벤트를 확인하는 Header Menu 예제입니다.",
    id: "menu",
    title: "Header Menu 예제",
  },
  {
    description: "미선택 상태에서는 5개 preview를 표시하고, 단일 Row 선택 시 전체 목록 virtual scroll을 활성화하는 기본 예제입니다.",
    id: "virtual-list",
    title: "Virtual Scroll Item List 기본 예제",
  },
  {
    description: "Item 클릭으로 일반 Row 선택 규칙을 적용하고, More 클릭으로 해당 Row를 단독 선택한 뒤 전체 목록을 확장하는 예제입니다.",
    id: "virtual-list-more",
    title: "Virtual Scroll Item List More 예제",
  },
  {
    description: "단일 Row 선택 시 검색 input을 표시하고 필터링된 virtual range를 확인하는 검색 예제입니다.",
    id: "virtual-list-search",
    title: "Virtual Scroll Item List Search 예제",
  },
  {
    description: "사용자가 직접 만든 React renderer를 Header와 Cell에 연결하는 커스텀 컴포넌트 예제입니다.",
    id: "renderer",
    title: "Custom Renderer 예제",
  },
];

const componentExampleEnglish: Record<ComponentExampleId, { description: string; title: string }> = {
  button: {
    description: "Connect Button callbacks through header.components and cell.components and update the shared event log.",
    title: "Button example",
  },
  input: {
    description: "Keep Cell input in an internal draft and commit external data changes on Enter or Blur.",
    title: "Input Field example",
  },
  checkbox: {
    description: "Render Boolean values as checked state and update them immutably.",
    title: "Checkbox example",
  },
  radio: { description: "Select a role with Radio Buttons.", title: "Radio Button example" },
  select: { description: "Select an option and update Row data.", title: "Select Option Box example" },
  toggle: { description: "Represent Boolean values with Toggle Buttons.", title: "Toggle Button example" },
  progress: { description: "Represent numeric values as progress.", title: "Progress Component example" },
  menu: {
    description: "Open a popover menu below the Header button and inspect item selection events.",
    title: "Header Menu example",
  },
  "virtual-list": {
    description: "Show a five-item preview with no selection and enable full virtual scrolling when one Row is selected.",
    title: "Virtual Scroll Item List basics",
  },
  "virtual-list-more": {
    description: "Apply standard Row selection on item click, then select only that Row and expand the full list on More.",
    title: "Virtual Scroll Item List More example",
  },
  "virtual-list-search": {
    description: "Show a search input for a single selected Row and inspect the filtered virtual range.",
    title: "Virtual Scroll Item List Search example",
  },
  renderer: {
    description: "Connect a custom React renderer to the Header and Cell.",
    title: "Custom Renderer example",
  },
};

const virtualListItemsFixture: CominsVirtualListItem[] = Array.from({ length: 10_000 }, (_value, index) => ({
  data: { index },
  label: `검색-${index + 1}`,
  value: `검색-${index + 1}`,
}));

function getVirtualListItems() {
  return virtualListItemsFixture;
}

function createComponentRows(componentId: ComponentExampleId): ComponentRow[] {
  return createExampleRows(30).map((row) => ({
    ...row,
    id: `${componentId}-${row.id}`,
    virtualListItems: componentId.startsWith("virtual-list") ? getVirtualListItems() : undefined,
  }));
}

function createInitialRowsByExample(): Record<ComponentExampleId, ComponentRow[]> {
  return componentExamples.reduce(
    (acc, example) => {
      acc[example.id] = createComponentRows(example.id);
      return acc;
    },
    {} as Record<ComponentExampleId, ComponentRow[]>,
  );
}

function getComponentField(componentId: ComponentExampleId): keyof ComponentRow {
  if (componentId === "checkbox" || componentId === "toggle") {
    return "active";
  }

  if (componentId === "progress") {
    return "age";
  }

  if (componentId === "menu") {
    return "name";
  }

  if (componentId.startsWith("virtual-list")) {
    return "virtualListItems";
  }

  if (componentId === "radio" || componentId === "select") {
    return "role";
  }

  return "name";
}

export function ComponentFeature() {
  const { locale, text } = usePlaygroundLocale();
  const roleOptions = useMemo(
    () => [
      { label: text(defineLocalizedText("소유자", "Owner")), value: "Owner" },
      { label: text(defineLocalizedText("편집자", "Editor")), value: "Editor" },
      { label: text(defineLocalizedText("조회자", "Viewer")), value: "Viewer" },
    ],
    [text],
  );
  const [rowsByExample, setRowsByExample] = useState<Record<ComponentExampleId, ComponentRow[]>>(() =>
    createInitialRowsByExample(),
  );
  const [headerState, setHeaderState] = useState<HeaderComponentState>({
    checkbox: true,
    input: "헤더 입력",
    progress: 65,
    radio: "Owner",
    select: "Owner",
    toggle: true,
  });
  const [eventLog, setEventLog] = useState("컴포넌트 이벤트 대기");
  const [eventAlert, setEventAlert] = useState("");

  const reportComponentEvent = useCallback((componentName: string, detail?: string) => {
    const message = detail ? `${componentName}:${detail}` : componentName;

    setEventAlert(message);
    setEventLog(message);
  }, []);

  const updateRow = useCallback((componentId: ComponentExampleId, rowId: string | number, patch: Partial<ComponentRow>) => {
    setRowsByExample((current) => ({
      ...current,
      [componentId]: current[componentId].map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    }));
  }, []);

  const createColumns = useCallback((componentId: ComponentExampleId): Array<CominsTableColumn<ComponentRow>> => {
    const field = getComponentField(componentId);
    const componentColumn: CominsTableColumn<ComponentRow> = {
      cell: {},
      field,
      id: `${componentId}-component`,
      label: "Column2",
      minWidth: 100,
      sort: true,
      width: 260,
    };

    if (componentId === "button") {
      componentColumn.header = {
        components: [
          {
            onClick: ({ column }) => reportComponentEvent("Header Button", column.id),
            props: { children: "Header Button" },
            type: "button",
          },
        ],
      };
      componentColumn.cell = {
        components: [
          {
            onClick: ({ row }) => reportComponentEvent("Cell Button", String(row.id)),
            props: ({ row }) => ({ children: `Data ${row.index + 1} Button` }),
            type: "button",
          },
        ],
      };
    }

    if (componentId === "input") {
      componentColumn.header = {
        components: [
          {
            onValueChange: ({ value }) => {
              setHeaderState((current) => ({ ...current, input: value }));
              reportComponentEvent("Header Input", value);
            },
            props: {
              "aria-label": text(defineLocalizedText("컴포넌트 헤더 입력", "Component Header input")),
              value: headerState.input,
            },
            type: "input",
          },
        ],
      };
      componentColumn.cell = {
        components: [
          {
            onValueChange: ({ row, value }) => {
              updateRow(componentId, row.id, { name: value });
              reportComponentEvent("Cell Input", value);
            },
            props: ({ value }) => ({
              "aria-label": text(defineLocalizedText("Cell 이름 입력", "Cell name input")),
              value: String(value),
            }),
            type: "input",
          },
        ],
      };
    }

    if (componentId === "checkbox") {
      componentColumn.header = {
        components: [
          {
            onCheckedChange: ({ checked }) => {
              setHeaderState((current) => ({ ...current, checkbox: checked }));
              reportComponentEvent("Header Checkbox", checked ? "checked" : "unchecked");
            },
            props: {
              "aria-label": text(defineLocalizedText("컴포넌트 헤더 체크박스", "Component Header checkbox")),
              checked: headerState.checkbox,
            },
            type: "checkbox",
          },
        ],
      };
      componentColumn.cell = {
        components: [
          {
            onCheckedChange: ({ row, checked }) => {
              updateRow(componentId, row.id, { active: checked });
              reportComponentEvent("Cell Checkbox", checked ? "checked" : "unchecked");
            },
            props: ({ value }) => ({
              "aria-label": text(defineLocalizedText("Cell 활성 체크박스", "Cell active checkbox")),
              checked: Boolean(value),
            }),
            type: "checkbox",
          },
        ],
      };
    }

    if (componentId === "radio") {
      componentColumn.header = {
        components: [
          {
            onValueChange: ({ value }) => {
              setHeaderState((current) => ({ ...current, radio: value }));
              reportComponentEvent("Header Radio", value);
            },
            options: roleOptions,
            props: {
              "aria-label": text(defineLocalizedText("컴포넌트 헤더 라디오", "Component Header radio")),
              value: headerState.radio,
            },
            type: "radio",
          },
        ],
      };
      componentColumn.cell = {
        components: [
          {
            onValueChange: ({ row, value }) => {
              updateRow(componentId, row.id, { role: value });
              reportComponentEvent("Cell Radio", value);
            },
            options: roleOptions,
            props: ({ value }) => ({
              "aria-label": locale === "ko" ? `Cell 역할 라디오 ${String(value)}` : `Cell role radio ${String(value)}`,
              value: String(value),
            }),
            type: "radio",
          },
        ],
      };
    }

    if (componentId === "select") {
      componentColumn.header = {
        components: [
          {
            onValueChange: ({ value }) => {
              setHeaderState((current) => ({ ...current, select: value }));
              reportComponentEvent("Header Select", value);
            },
            options: roleOptions,
            props: {
              "aria-label": text(defineLocalizedText("컴포넌트 헤더 셀렉트", "Component Header select")),
              value: headerState.select,
            },
            type: "select",
          },
        ],
      };
      componentColumn.cell = {
        components: [
          {
            onValueChange: ({ row, value }) => {
              updateRow(componentId, row.id, { role: value });
              reportComponentEvent("Cell Select", value);
            },
            options: roleOptions,
            props: ({ value }) => ({
              "aria-label": text(defineLocalizedText("Cell 역할 셀렉트", "Cell role select")),
              value: String(value),
            }),
            type: "select",
          },
        ],
      };
    }

    if (componentId === "toggle") {
      componentColumn.header = {
        components: [
          {
            onCheckedChange: ({ checked }) => {
              setHeaderState((current) => ({ ...current, toggle: checked }));
              reportComponentEvent("Header Toggle", checked ? "ON" : "OFF");
            },
            props: { checked: headerState.toggle, children: headerState.toggle ? "ON" : "OFF" },
            type: "toggle",
          },
        ],
      };
      componentColumn.cell = {
        components: [
          {
            onCheckedChange: ({ row, checked }) => {
              updateRow(componentId, row.id, { active: checked });
              reportComponentEvent("Cell Toggle", checked ? "ON" : "OFF");
            },
            props: ({ value }) => ({ checked: Boolean(value), children: Boolean(value) ? "ON" : "OFF" }),
            type: "toggle",
          },
        ],
      };
    }

    if (componentId === "progress") {
      componentColumn.header = {
        components: [
          {
            props: { max: 100, value: headerState.progress },
            type: "progress",
          },
        ],
      };
      componentColumn.cell = {
        components: [
          {
            props: ({ value }) => ({ max: 100, value: Number(value) }),
            type: "progress",
          },
        ],
      };
    }

    if (componentId === "menu") {
      componentColumn.header = {
        components: [
          {
            direction: "right",
            items: [
              { label: text(defineLocalizedText("메뉴", "Menu")), type: "label" },
              { label: text(defineLocalizedText("상태 확인", "Check status")), value: "status-check" },
              { type: "divider" },
              { disabled: true, label: text(defineLocalizedText("비활성 항목", "Disabled item")), value: "disabled" },
            ],
            onBeforeChange: ({ open }) => {
              setEventLog(`Header Menu before:${open}`);
              return true;
            },
            onOpenChange: ({ open }) => setEventLog(`Header Menu open:${open}`),
            onSelect: ({ value }) => {
              setEventAlert(`Header Menu:${String(value)}`);
              setEventLog(`Header Menu 선택:${String(value)}`);
            },
            props: { children: text(defineLocalizedText("메뉴", "Menu")) },
            type: "menu",
          },
        ],
      };
      componentColumn.cell = {
        format: ({ row }) => `Data ${row.index + 1}`,
      };
    }

    if (componentId.startsWith("virtual-list")) {
      componentColumn.header = {
        renderer: ({ column }) => <span>{column.label}</span>,
      };
      componentColumn.cell = {
        components: [
          {
            items: ({ row }) => row.data.virtualListItems ?? [],
            onClickItem: ({ item }) => setEventLog(`Virtual List 클릭:${String(item.label)}`),
            onContextMenuItem: ({ event, item }) => {
              event.preventDefault();
              setEventLog(`Virtual List 우클릭:${String(item.label)}`);
            },
            props: {
              "aria-label": text(defineLocalizedText("Virtual List 항목", "Virtual List Item")),
              height: 186,
              itemHeight: 28,
              limit: 5,
              more: componentId === "virtual-list-more",
              searchable: componentId === "virtual-list-search",
            },
            searchFilter: ({ item, value }) =>
              String(item.label).toLowerCase().includes(String(value).toLowerCase()),
            type: "virtual-list",
          },
        ],
      };
    }

    if (componentId === "renderer") {
      componentColumn.header = {
        renderer: ({ column }) => (
          <span data-testid="component-header-renderer">
            {`${text(defineLocalizedText("사용자 renderer", "Custom renderer"))}:${column.label}`}
          </span>
        ),
      };
      componentColumn.cell = {
        renderer: ({ row, value }) => (
          <span data-testid={`component-cell-renderer-${String(row.id)}`}>
            {`${text(defineLocalizedText("사용자 renderer", "Custom renderer"))}:${String(value)}`}
          </span>
        ),
      };
    }

    return [
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "id",
        label: "Column1",
        minWidth: 100,
        width: 150,
      },
      componentColumn,
      {
        cell: {
          format: ({ row }) => `Data ${row.index + 1}`,
        },
        field: "role",
        id: `${componentId}-state`,
        label: "Column3",
        minWidth: 100,
        width: 150,
      },
    ];
  }, [headerState, locale, reportComponentEvent, roleOptions, text, updateRow]);

  const columnsByExample = useMemo(
    () =>
      componentExamples.reduce(
        (acc, example) => {
          acc[example.id] = createColumns(example.id);
          return acc;
        },
        {} as Record<ComponentExampleId, Array<CominsTableColumn<ComponentRow>>>,
      ),
    [createColumns],
  );

  return (
    <section className="feature-panel feature-panel--components">
      <pre className="state-output" data-testid="component-event-log">
        {eventLog}
      </pre>
      {eventAlert ? (
        <Alert data-testid="component-event-alert">
          <AlertTitle>{text(defineLocalizedText("컴포넌트 이벤트", "Component event"))}</AlertTitle>
          <AlertDescription>{eventAlert}</AlertDescription>
        </Alert>
      ) : null}
      <div className="component-showcase">
        {componentExamples.map((example) => (
          <section className="component-example-section" data-testid={`component-section-${example.id}`} key={example.id}>
            <FeatureSampleSection
              description={locale === "ko" ? example.description : componentExampleEnglish[example.id].description}
              id={`component-${example.id}`}
              title={locale === "ko" ? example.title : componentExampleEnglish[example.id].title}
            >
              <div className="component-example-table-wrap" data-testid={`component-example-${example.id}`}>
                <CominsTable
                  className="example-table component-example-table"
                  columns={columnsByExample[example.id]}
                  data={rowsByExample[example.id]}
                  data-testid={`component-table-viewport-${example.id}`}
                  getRowId={(row) => row.id}
                  onChangeData={(nextData) => {
                    setRowsByExample((current) => ({ ...current, [example.id]: nextData }));
                  }}
                  pagination={{ pageIndex: 0, pageSize: 30 }}
                  rowHeight={example.id.startsWith("virtual-list") ? 190 : undefined}
                  theme={{ density: "compact" }}
                />
              </div>
            </FeatureSampleSection>
          </section>
        ))}
      </div>
    </section>
  );
}
