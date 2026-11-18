// Section 12.2: Figure 1, the routing explorer. The rule from router.py runs on the real catalogue.
import { useEffect, useState } from 'preact/hooks';
import { services, presets, route, outcomeText, routingInWords, ANCHOR_TOOLS, FULL_EXPOSURE_THRESHOLD, type ServiceSlug } from '../../lib/routing';
import { Frame, Slider, useUrlState, codecs } from '../shared/ui';

interface Tool {
  name: string;
  service: ServiceSlug;
  description: string;
}

const SLUGS = services.map((s) => s.slug);

export default function Routing() {
  const [svc, setSvc] = useUrlState<ServiceSlug[]>('svc', ['slack', 'perplexity'], codecs.list(SLUGS));
  const [limit, setLimit] = useUrlState('limit', FULL_EXPOSURE_THRESHOLD, codecs.int(10, 60));
  const [tools, setTools] = useState<Tool[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [listing, setListing] = useState<ServiceSlug | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const load = () => {
    setFailed(false);
    fetch('/data/orchestrator/tools.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setTools)
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  const outcome = route(svc, limit);
  const anchors = new Set(outcome.kind === 'finder' ? outcome.anchors : []);
  const toggle = (s: ServiceSlug) => setSvc(svc.includes(s) ? svc.filter((x) => x !== s) : SLUGS.filter((x) => x === s || svc.includes(x)));

  const squareClass = (s: ServiceSlug, name: string | null) => {
    if (!svc.includes(s)) return 'rt-sq';
    if (outcome.kind === 'all') return 'rt-sq sel';
    if (outcome.kind === 'finder') return name && anchors.has(name) ? 'rt-sq anchor' : 'rt-sq cand';
    return 'rt-sq';
  };

  const words = failed ? 'The data for this figure did not load.' : tools ? routingInWords(svc, limit) : `Loading data. ${routingInWords(svc, limit)}`;

  return (
    <Frame
      id="routing"
      num={1}
      title="Routing explorer"
      badge="live"
      wide
      onReset={() => {
        setSvc(['slack', 'perplexity']);
        setLimit(FULL_EXPOSURE_THRESHOLD);
      }}
      words={words}
      what="The services a request might touch, and the 191 real tools behind them, one square each. Tick services as the classifier would and watch the routing rule decide what the model sees."
      tryThis={['Press Gmail and Slack: 30 tools is over the limit, so the finder takes over.', 'Move the limit to 30 and press Gmail and Slack again.', 'Select a service name to read its real tools.']}
    >
      <div class="chips" role="group" aria-label="Presets" style={{ marginBottom: '16px' }}>
        {presets.map((p) => {
          const on = p.services.length === svc.length && p.services.every((s) => svc.includes(s));
          return (
            <button class="chip" type="button" aria-pressed={on} onClick={() => setSvc(p.services)}>
              {p.label} ({services.filter((s) => p.services.includes(s.slug)).reduce((t, s) => t + s.count, 0)})
            </button>
          );
        })}
      </div>
      <div class="rt">
        <div>
          <fieldset>
            <legend>Services</legend>
            {services.map((s) => (
              <div class="rt-svc">
                <label class="check">
                  <input type="checkbox" checked={svc.includes(s.slug)} onChange={() => toggle(s.slug)} />
                  <span class="visually-hidden">{s.name}</span>
                </label>
                <button type="button" class="rt-svc-name" aria-expanded={listing === s.slug} onClick={() => setListing(listing === s.slug ? null : s.slug)}>
                  {s.name}
                </button>
                <span class="num soft">{s.count} tools</span>
                <q class="rt-cap">{s.capability}</q>
              </div>
            ))}
          </fieldset>
          <Slider label="Limit" value={limit} min={10} max={60} step={1} onChange={setLimit} hint="28 is my working assumption. It is one constant in the code." />
        </div>
        <div>
          <div class="rt-groups">
            {services.map((s) => {
              const list = tools ? tools.filter((t) => t.service === s.slug) : Array.from({ length: s.count }, () => null);
              return (
                <div>
                  <p class="rt-group-label">
                    {s.name} <span class="soft num">{s.count}</span>
                  </p>
                  <div class="rt-squares">
                    {list.map((t) => (
                      <button
                        type="button"
                        class={squareClass(s.slug, t?.name ?? null)}
                        aria-label={t ? `${t.name}${anchors.has(t.name) ? ', anchor tool' : ''}` : `${s.name} tool`}
                        title={t?.name}
                        onMouseEnter={() => t && setHover(t.name)}
                        onFocus={() => t && setHover(t.name)}
                        onMouseLeave={() => setHover(null)}
                        onBlur={() => setHover(null)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p class="small mono" aria-live="polite" style={{ minHeight: '1.5em', margin: '10px 0 0' }}>
            {hover ?? ''}
          </p>
          <p class="rt-outcome">{outcomeText(outcome)}</p>
          {outcome.kind === 'finder' && (
            <p class="small soft">Filled squares with a ring are anchor tools. Hatched squares are candidates the finder chooses from.</p>
          )}
          {failed && (
            <p>
              The data for this figure did not load.{' '}
              <button class="btn btn-small" type="button" onClick={load}>
                Try again
              </button>
            </p>
          )}
        </div>
      </div>
      {listing && (
        <div>
          <h4 style={{ marginTop: '16px' }}>Tools in {services.find((s) => s.slug === listing)!.name}</h4>
          <dl class="rt-tools" tabIndex={0}>
            {(tools ?? [])
              .filter((t) => t.service === listing)
              .map((t) => (
                <>
                  <dt>
                    {t.name}
                    {ANCHOR_TOOLS[listing].includes(t.name) && <span class="soft"> (anchor)</span>}
                  </dt>
                  <dd>{t.description}</dd>
                </>
              ))}
            {!tools && <dd>Loading data</dd>}
          </dl>
        </div>
      )}
    </Frame>
  );
}
