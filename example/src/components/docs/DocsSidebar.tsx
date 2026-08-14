import { NavLink } from "react-router";

import type { DocsPage } from "../../docs/types";
import { playgroundMessages } from "../../i18n/messages";
import { usePlaygroundLocale } from "../../i18n/playground-locale";

interface DocsSidebarProps {
  groups: Array<{ category: string; pages: DocsPage[] }>;
}

export function DocsSidebar({ groups }: DocsSidebarProps) {
  const { text } = usePlaygroundLocale();

  return (
    <aside className="docs-sidebar">
      <nav aria-label={text(playgroundMessages.docsNavigation)}>
        {groups.map((group) => (
          <section className="docs-sidebar__group" key={group.category}>
            <h2>{group.category}</h2>
            <div className="docs-sidebar__links">
              {group.pages.map((page) => (
                <NavLink className="docs-sidebar__link" key={page.path} to={page.path}>
                  {page.label}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
