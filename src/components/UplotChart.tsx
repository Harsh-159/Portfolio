import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import type { Options, AlignedData } from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface Props {
  data: AlignedData;
  options: Omit<Options, 'width'>;
  /** Called with the data index when the user clicks the plot. */
  onSelectIdx?: (idx: number | null) => void;
}

/** Thin React wrapper around uPlot with width tracking via ResizeObserver. */
export function UplotChart({ data, options, onSelectIdx }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const selectRef = useRef(onSelectIdx);
  selectRef.current = onSelectIdx;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const width = el.clientWidth || 600;
    const u = new uPlot({ ...options, width }, data, el);
    plotRef.current = u;

    const handleClick = () => selectRef.current?.(u.cursor.idx ?? null);
    u.over.addEventListener('click', handleClick);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        u.setSize({ width: containerRef.current.clientWidth, height: options.height });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      u.over.removeEventListener('click', handleClick);
      u.destroy();
      plotRef.current = null;
    };
    // Recreate only when the option object identity changes (memoise upstream).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return <div ref={containerRef} className="w-full" />;
}
