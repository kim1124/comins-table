import { Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { searchDataTableDocs, type DataTableSearchItem } from "../../docs/search";

export function DocsTopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchDataTableDocs(query), [query]);
  const showResults = focused && query.trim().length > 0;

  const navigateToResult = (item: DataTableSearchItem) => {
    setQuery("");
    setFocused(false);
    if (item.path !== location.pathname) {
      navigate(item.path);
    }
  };

  return (
    <header className="docs-top-nav">
      <div className="docs-top-nav__brand">
        <strong>comins-table</strong>
        <span>Docs Playground</span>
      </div>
      <div className="global-data-table-search" ref={searchRef}>
        <label className="example-search">
          <Search aria-hidden="true" size={16} />
          <input
            aria-label="Search all docs"
            onBlur={(event) => {
              if (event.relatedTarget instanceof Node && searchRef.current?.contains(event.relatedTarget)) {
                return;
              }
              setFocused(false);
            }}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search"
            type="search"
            value={query}
          />
        </label>
        {showResults ? (
          <div className="global-search-popup" role="listbox">
            {results.length > 0 ? (
              results.map((item) => (
                <button
                  aria-selected="false"
                  className="global-search-popup__item"
                  key={item.id}
                  onClick={() => navigateToResult(item)}
                  role="option"
                  type="button"
                >
                  <strong>{item.title}</strong>
                  <span>{item.category}</span>
                </button>
              ))
            ) : (
              <p className="global-search-popup__empty">No results.</p>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
