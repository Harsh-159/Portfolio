// Section 9.3: Figure 1, anatomy of an approval rule.
import { builders, type BuilderSlug } from '../../content/pipeline';
import { Frame, useUrlState, codecs } from '../shared/ui';
import { confirmed } from '../../content/site';

const slugs = builders.map((b) => b.slug);

export default function RuleAnatomy() {
  const [sel, setSel] = useUrlState<BuilderSlug>('builder', 'job-level-hierarchy', codecs.str(slugs));
  const b = builders.find((x) => x.slug === sel)!;
  const illustrative = sel !== 'job-level-hierarchy';
  return (
    <Frame
      id="rule"
      num={1}
      title="Anatomy of an approval rule"
      badge="reconstruction"
      onReset={() => setSel('job-level-hierarchy')}
      words={
        confirmed.builderExplanations ? (
          <>
            If the department is Sales, send to {b.name}: {b.explanation.charAt(0).toLowerCase() + b.explanation.slice(1)}.
          </>
        ) : (
          <>If the department is Sales, send to {b.name}. The JSON shows the settings that list builder's prompt returns.</>
        )
      }
      what="A rule has a condition and a list of approvers. The pipeline's job is to produce both from one typed sentence."
      tryThis={['Choose Management Hierarchy and compare its settings with Job Level Hierarchy.', 'Choose Users to see the simplest kind of approver list.']}
    >
      <p class="rule-sentence">
        If <span class="rule-slot">the department is Sales</span>, send to <span class="rule-slot rule-slot-approvers">{b.name}</span>.
      </p>
      <fieldset>
        <legend>Approvers come from one of seven list builders</legend>
        <div class="chips">
          {builders.map((x) => (
            <button class="chip" type="button" aria-pressed={x.slug === sel} onClick={() => setSel(x.slug)}>
              {x.name}
            </button>
          ))}
        </div>
      </fieldset>
      {confirmed.builderExplanations && (
        <p>
          <strong>{b.name}:</strong> {b.explanation}.
        </p>
      )}
      <p class="small soft">
        Settings this list builder's prompt returns{illustrative ? ', illustrative' : ''}:
      </p>
      <pre class="json" tabIndex={0} aria-label={`Example settings for ${b.name}`}>
        {JSON.stringify(b.example, null, 2)}
      </pre>
    </Frame>
  );
}
