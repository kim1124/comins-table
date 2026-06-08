import { dataTableOptionGuide } from "../docs/dataTableOptionGuide";

export function OptionGuideSection() {
  return (
    <section className="option-guide" data-testid="option-guide">
      {dataTableOptionGuide.map((group) => (
        <article className="option-guide__group" key={group.title}>
          <h2>{group.title}</h2>
          <dl>
            {group.items.map((item) => (
              <div className="option-guide__item" key={item.name}>
                <dt>{item.name}</dt>
                <dd>{item.description}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </section>
  );
}
