# Componentization Guide

[Documentation](../README.md) · [Design contract](../../DESIGN.md)

This guide defines how Comins Table chooses an extension boundary. It documents current public behavior and the acceptance criteria for future public components; it does not claim that a Toolbar, general slot system, editor framework, or plugin API already exists.

## Choose the smallest boundary

| Need | Boundary | Owner |
| --- | --- | --- |
| Convert a value to display content | Cell `format` formatter | Table owns the Cell; application returns content. |
| Replace typed Header, Cell, or Group inner content | `renderer` or `renderGroupContent` | Table owns structure, geometry, and interaction shell. |
| Use a common interactive control inside a Cell | Built-in `component` | Table owns keyboard behavior, disabled state, focus, and Row/Cell event isolation. |
| Style all Tables or a reusable theme | Public CSS token | Application owns token values; Table owns fallback and surfaces. |
| Style one Table, Row, Group, or Cell | `className` / `style` hook | Application owns the final local override. |
| Replace a surrounding product surface | Future typed slot, only after public approval | Ownership must be specified before implementation. |

Do not introduce a new public component when a formatter, renderer, existing component, or style hook already expresses the requirement without losing semantics.

## Formatter

A formatter transforms a resolved value for presentation. It receives the typed Row and Column payload and must not mutate data. Use it for dates, currency, status labels, and small inline React content. A formatter does not own the `<td>`, selection border, focus, Clipboard address, or Row event policy.

## Renderer

A renderer replaces inner visual content while the Table retains its semantic Header or Cell. It must preserve the generic Row type, accept the documented payload, and return React content without assuming private DOM structure. `renderGroupContent` follows the same rule: the Table keeps the single `<th scope="rowgroup">`, disclosure, Group Drag handle, drop feedback, focus, and virtualization height.

## Built-in component

Use a built-in component when the Table must consistently isolate an interactive control from owning Cell and Row actions. A public component must define:

- typed value and callback payloads without erasing `TData`;
- keyboard, focus-visible, ARIA, label, and disabled behavior;
- event propagation boundaries for click, pointer, keyboard, context menu, and drag;
- class and style forwarding plus documented CSS tokens;
- controlled value ownership and commit/cancel timing;
- focus recovery after conditional rendering or popup closure;
- portal ownership and collision behavior when a popup is involved.

If these points are not specified and tested, keep the implementation application-owned through a renderer.

## Future typed slots

A slot is appropriate only for a replaceable structural surface used by multiple features, such as a future Toolbar or Column Panel. Before promotion to public API, a slot proposal must define its mounting location, data/state payload, generic preservation, default implementation, focus order, keyboard ownership, portal boundary, class/style forwarding, and SemVer behavior. A JSX prop that merely inserts arbitrary content is not automatically a stable slot contract.

## Styling boundary

Use public-stable CSS tokens for supported theme policy. Public-experimental tokens are suitable for controlled adoption with upgrade review. Internal tokens must not be used by consumer guides. Use `className` or `style` for application-specific business states, and keep overrides scoped to a Table instance or documented Row/Group/Cell hook.

## Promotion checklist

A shared UI abstraction becomes public only when it has at least two real feature consumers, one unambiguous owner for state and DOM, typed payloads, accessibility behavior, focused unit/component tests, a real Playground example, matching English/Korean guidance, Feature Manifest classification, and a documented compatibility boundary. Otherwise, keep it private or application-owned.
