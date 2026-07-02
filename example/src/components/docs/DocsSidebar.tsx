import { NavLink } from "react-router";

import { docsNavGroups } from "../../docs/docsRoutes";

export function DocsSidebar() {
  return (
    <aside className="docs-sidebar">
      <nav aria-label="문서 메뉴">
        {docsNavGroups.map((group) => (
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
