import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { searchDataTableDocs, type DataTableSearchItem } from "../../docs/search";
import type { DocsPage } from "../../docs/types";
import { playgroundMessages } from "../../i18n/messages";
import { defineLocalizedText, usePlaygroundLocale } from "../../i18n/playground-locale";

interface DocsTopNavProps {
  pages: DocsPage[];
}

export function DocsTopNav({ pages }: DocsTopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, setLocale, text } = usePlaygroundLocale();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchDataTableDocs(query, pages), [pages, query]);
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
        <strong>{"comins-table"}</strong>
        <span>{text(defineLocalizedText("문서 Playground", "Docs Playground"))}</span>
      </div>
      <div className="docs-top-nav__tools">
        <div
          aria-label={text(playgroundMessages.localeToggle)}
          className="playground-locale-toggle"
          data-testid="playground-locale-toggle"
          role="group"
        >
          <button aria-pressed={locale === "ko"} onClick={() => setLocale("ko")} type="button">
            {text(defineLocalizedText("한", "한"))}
          </button>
          <button aria-pressed={locale === "en"} onClick={() => setLocale("en")} type="button">
            EN
          </button>
        </div>
        <div className="global-data-table-search" ref={searchRef}>
        <label className="example-search">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="example-search__icon"
            data-example-icon="docs-search"
            focusable="false"
          />
          <input
            aria-label={text(playgroundMessages.searchLabel)}
            onBlur={(event) => {
              if (event.relatedTarget instanceof Node && searchRef.current?.contains(event.relatedTarget)) {
                return;
              }
              setFocused(false);
            }}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={text(playgroundMessages.searchPlaceholder)}
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
              <p className="global-search-popup__empty">{text(playgroundMessages.noSearchResults)}</p>
            )}
          </div>
        ) : null}
        </div>
      </div>
    </header>
  );
}
