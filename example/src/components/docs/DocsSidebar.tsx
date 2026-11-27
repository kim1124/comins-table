import { memo, type MouseEvent } from "react";
import { createPath, resolvePath, useHref, useLocation, useNavigate } from "react-router";

import type { DocsPage } from "../../docs/types";
import { prepareDocsSidebarNavigation } from "./prepareDocsSidebarNavigation";
import { playgroundMessages } from "../../i18n/messages";
import { usePlaygroundLocale } from "../../i18n/playground-locale";

interface DocsSidebarProps {
  groups: Array<{ category: string; pages: DocsPage[] }>;
}

const DocsSidebarLink = memo(function DocsSidebarLink({ active, href, label, path }: {
  active: boolean;
  href: string;
  label: string;
  path: string;
}) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={`docs-sidebar__link${active ? " active" : ""}`}
      data-discover="true"
      data-docs-path={path}
      href={href}
      onClick={prepareDocsSidebarNavigation}
    >
      {label}
    </a>
  );
});

export const DocsSidebar = memo(function DocsSidebar({ groups }: DocsSidebarProps) {
  const { text } = usePlaygroundLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const rootHref = useHref("/");
  const hrefPrefix = rootHref.replace(/\/$/u, "");
  const pathname = location.pathname.toLowerCase();

  const handleNavigation = (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const node = event.target as Node;
    const target = node.nodeType === 1 ? node as Element : node.parentElement;
    const anchor = target?.closest<HTMLAnchorElement>("a[data-docs-path]");
    const to = anchor?.dataset.docsPath;
    if (!anchor || !to || !event.currentTarget.contains(anchor) || (anchor.target && anchor.target !== "_self")) return;
    const view = anchor.ownerDocument.defaultView;
    if (!view || anchor.origin !== view.location.origin) return;
    event.preventDefault();
    navigate(to, { replace: createPath(location) === createPath(resolvePath(to)) });
  };

  return (
    <aside className="docs-sidebar">
      <nav aria-label={text(playgroundMessages.docsNavigation)} onClick={handleNavigation}>
        {groups.map((group) => (
          <section className="docs-sidebar__group" key={group.category}>
            <h2>{group.category}</h2>
            <div className="docs-sidebar__links">
              {group.pages.map((page) => {
                const resolved = resolvePath(page.path);
                const toPathname = resolved.pathname.toLowerCase();
                const boundary = toPathname !== "/" && toPathname.endsWith("/") ? toPathname.length - 1 : toPathname.length;
                const active = pathname === toPathname || (pathname.startsWith(toPathname) && pathname.charAt(boundary) === "/");
                const href = resolved.pathname === "/" ? `${rootHref}${resolved.search}${resolved.hash}` : `${hrefPrefix}${createPath(resolved)}`;
                return <DocsSidebarLink active={active} href={href} key={page.path} label={page.label} path={page.path} />;
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
});
