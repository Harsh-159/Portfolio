// Section 13.8: Figure 7, what the ingestion checks found in 45,600 hourly rows.
import { useMemo, useState } from 'preact/hooks';
import { dataChecks } from '../../content/forecast';
import { confirmed } from '../../content/site';
import { Frame, State, fmtN } from '../shared/ui';
import { useData } from './data';

interface Flagged {
  t: string;
  price: number | null;
  solar: number | null;
  reason: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

const SEV = ['ERROR', 'WARNING', 'INFO'] as const;
const SEV_LABEL = { ERROR: 'Error', WARNING: 'Warning', INFO: 'Info' } as const;
const PAGE = 50;

export default function DataChecks() {
  const [on, setOn] = useState<string[]>([...SEV]);
  const [page, setPage] = useState(0);
  const data = useData<Flagged[]>('/data/forecast/flagged.json');
  const rows = useMemo(() => (data.status === 'ready' ? data.data.filter((r) => on.includes(r.severity)) : []), [data, on]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const toggle = (s: string) => {
    setOn(on.includes(s) ? on.filter((x) => x !== s) : [...on, s]);
    setPage(0);
  };

  return (
    <Frame
      id="data-checks"
      num={7}
      title="Data checks"
      badge="real"
      onReset={() => {
        setOn([...SEV]);
        setPage(0);
      }}
      words={
        data.status === 'ready'
          ? `Showing ${fmtN(rows.length)} of 1,621 flagged rows. The report marks this run FAIL: 2 checks raised errors, 3 raised warnings.`
          : 'The report marks this run FAIL: 2 checks raised errors, 3 raised warnings. 1,621 rows were flagged.'
      }
      what="What the ingestion step found in 45,600 hourly rows from 1 January 2021 to 15 March 2026, and every row it flagged with the reason."
      tryThis={['Show only Error rows and look at their times of day.']}
    >
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Finding</th>
              <th scope="col" class="r">
                Count
              </th>
              <th scope="col">Severity in the report</th>
            </tr>
          </thead>
          <tbody>
            {dataChecks.map((d) => (
              <tr>
                <td>{d.finding}</td>
                <td class="r">{d.count}</td>
                <td>{d.severity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: '16px' }}>
        The report marks this run FAIL: 2 checks raised errors, 3 raised warnings. Flagged rows are written to a file with the reason for each.
      </p>
      {confirmed.dataCheckNote && (
        <p class="small">
          All 1,183 error flags fall between 02:00 and 04:00 UTC from April to September, which is after sunrise in a German
          summer. The night window in the check is too wide, so these are false alarms. I would switch the check to real
          sunrise times.
        </p>
      )}
      <div class="chips" role="group" aria-label="Filter by severity" style={{ margin: '12px 0' }}>
        {SEV.map((s) => (
          <button class="chip" type="button" aria-pressed={on.includes(s)} onClick={() => toggle(s)}>
            {SEV_LABEL[s]}
          </button>
        ))}
      </div>
      {data.status === 'ready' ? (
        <>
          <div class="table-wrap">
            <table>
              <caption>
                Flagged rows {fmtN(page * PAGE + 1)} to {fmtN(Math.min(rows.length, (page + 1) * PAGE))} of {fmtN(rows.length)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Time, UTC</th>
                  <th scope="col" class="r">
                    Price, EUR/MWh
                  </th>
                  <th scope="col" class="r">
                    Solar, MW
                  </th>
                  <th scope="col">Severity</th>
                  <th scope="col">Reason</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr>
                    <td class="num" style={{ whiteSpace: 'nowrap' }}>
                      {r.t.replace('T', ' ')}
                    </td>
                    <td class="r">{r.price === null ? '' : fmtN(r.price, 2)}</td>
                    <td class="r">{r.solar === null ? '' : fmtN(r.solar, 1)}</td>
                    <td>
                      <State kind={r.severity === 'ERROR' ? 'fail' : r.severity === 'WARNING' ? 'warn' : 'info'}>{SEV_LABEL[r.severity]}</State>
                    </td>
                    <td class="small mono">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div class="btn-row" style={{ marginTop: '10px' }}>
            <button class="btn btn-small" type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous rows
            </button>
            <span class="small soft">
              Page {page + 1} of {pages}
            </span>
            <button class="btn btn-small" type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
              Next rows
            </button>
          </div>
        </>
      ) : data.status === 'error' ? (
        <p>
          The data for this figure did not load.{' '}
          <button class="btn btn-small" type="button" onClick={data.retry}>
            Try again
          </button>
        </p>
      ) : (
        <p class="soft">Loading data</p>
      )}
    </Frame>
  );
}
