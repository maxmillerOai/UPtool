import { useEffect, useRef, useState } from 'react';

export interface TelemetrySample {
  throughput: number[];
  latency: number;
  integrity: number;
  load: number;
  cores: number[];
  signal: number;
}

const HISTORY = 48;

/**
 * Generates a smoothly-evolving stream of synthetic system metrics for the
 * command dashboard. When real transfers are active, `liveThroughput` (bytes/s)
 * is folded into the signal so the graphs visibly react to actual uploads.
 */
export function useTelemetry(liveThroughput = 0, active = false): TelemetrySample {
  const [sample, setSample] = useState<TelemetrySample>(() => ({
    throughput: Array.from({ length: HISTORY }, () => 20 + Math.random() * 30),
    latency: 18,
    integrity: 99.97,
    load: 32,
    cores: Array.from({ length: 8 }, () => 30 + Math.random() * 40),
    signal: 92,
  }));
  const ref = useRef(sample);
  ref.current = sample;

  useEffect(() => {
    const id = window.setInterval(() => {
      const prev = ref.current;
      const liveMbps = liveThroughput / (1024 * 1024);
      const base = active ? 45 + liveMbps * 1.5 : 18;
      const next = Math.max(
        2,
        Math.min(
          100,
          prev.throughput[prev.throughput.length - 1] * 0.6 +
            (base + Math.random() * 25) * 0.4,
        ),
      );
      const throughput = [...prev.throughput.slice(1), next];
      setSample({
        throughput,
        latency: Math.max(6, 18 + (Math.random() - 0.5) * 10 - (active ? 4 : 0)),
        integrity: Math.min(100, 99.6 + Math.random() * 0.4),
        load: Math.max(8, Math.min(96, prev.load * 0.7 + (active ? 65 : 28) * 0.3 + (Math.random() - 0.5) * 10)),
        cores: prev.cores.map((c) =>
          Math.max(5, Math.min(99, c * 0.6 + (active ? 60 : 30) * 0.4 + (Math.random() - 0.5) * 20)),
        ),
        signal: Math.max(60, Math.min(100, prev.signal + (Math.random() - 0.5) * 8)),
      });
    }, 1100);
    return () => window.clearInterval(id);
  }, [liveThroughput, active]);

  return sample;
}
