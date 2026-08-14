import { getDataTableOptionGuide } from "../docs/dataTableOptionGuide";
import { usePlaygroundLocale } from "../i18n/playground-locale";

export function OptionGuideSection() {
  const { locale } = usePlaygroundLocale();
  const guide = getDataTableOptionGuide(locale);

  return (
    <section className="option-guide" data-testid="option-guide">
      {guide.map((group) => (
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
