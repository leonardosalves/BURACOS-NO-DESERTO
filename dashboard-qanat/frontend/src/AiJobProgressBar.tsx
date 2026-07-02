import React, { useEffect, useState } from 'react';
import { subscribeAiJobProgress, type AiJobProgressState } from './aiJobProgressClient';

function GlobalProgressStrip({ job }: { job: AiJobProgressState }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] pointer-events-none"
      role="progressbar"
      aria-valuenow={job.percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${job.title}: ${job.percent}%`}
    >
      <div className="h-[3px] bg-zinc-900/80">
        <div
          className="h-full bg-gradient-to-r from-violet-600 via-dash-primary to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(130,128,253,0.45)]"
          style={{ width: `${Math.max(1, job.percent)}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-1 bg-zinc-950/90 backdrop-blur-sm border-b border-violet-500/20 text-[10px]">
        <span className="font-semibold text-violet-100 truncate">{job.title}</span>
        <span className="text-zinc-400 truncate hidden sm:inline">{job.label}</span>
        <span className="font-mono text-violet-300 tabular-nums shrink-0">{job.percent}%</span>
      </div>
    </div>
  );
}

export function AiJobProgressBar() {
  const [job, setJob] = useState<AiJobProgressState | null>(null);

  useEffect(() => subscribeAiJobProgress(setJob), []);

  if (!job?.active) return null;

  return <GlobalProgressStrip job={job} />;
}