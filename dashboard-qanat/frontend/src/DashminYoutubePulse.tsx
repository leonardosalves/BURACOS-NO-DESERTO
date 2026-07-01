import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Youtube } from 'lucide-react';
import {
  DASH_CHART,
  dashApexGrid,
  dashApexTooltip,
  dashApexXAxis,
  dashApexYAxis,
  dashChartFont,
} from './dashminChartTheme';

type HotVideo = {
  projectName?: string;
  videoId?: string;
  views48h?: number;
  format?: string;
};

type DashminYoutubePulseProps = {
  hotVideos?: HotVideo[];
  viewsThreshold?: number;
  onOpenYoutube?: () => void;
};

export function DashminYoutubePulse({
  hotVideos = [],
  viewsThreshold,
  onOpenYoutube,
}: DashminYoutubePulseProps) {
  const top = useMemo(
    () =>
      [...hotVideos]
        .sort((a, b) => (b.views48h ?? 0) - (a.views48h ?? 0))
        .slice(0, 6),
    [hotVideos],
  );

  const options: ApexOptions = useMemo(
    () => ({
      ...dashChartFont(),
      chart: { ...dashChartFont().chart, type: 'bar' },
      plotOptions: {
        bar: { borderRadius: 5, columnWidth: '55%' },
      },
      colors: [DASH_CHART.danger],
      dataLabels: { enabled: false },
      grid: dashApexGrid(),
      xaxis: dashApexXAxis(
        top.map((v) => (v.projectName || v.videoId || '—').slice(0, 12)),
        -30,
      ),
      yaxis: dashApexYAxis(),
      tooltip: dashApexTooltip({
        y: { formatter: (v) => `${v} views (48h)` },
      }),
    }),
    [top],
  );

  return (
    <div className="dash-card dash-youtube-pulse">
      <div className="dash-card-header mb-3">
        <div>
          <p className="dash-card-eyebrow">YouTube · 48h</p>
          <h3 className="dash-card-title text-base">Pulso do canal</h3>
        </div>
        <Youtube className="w-5 h-5 text-red-400 shrink-0" />
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-dash-muted py-8 text-center">
          Nenhum vídeo acima do limiar
          {viewsThreshold != null ? ` (${viewsThreshold} views)` : ''} nas últimas 48h.
        </p>
      ) : (
        <Chart
          type="bar"
          height={200}
          width="100%"
          options={options}
          series={[{ name: 'Views 48h', data: top.map((v) => v.views48h ?? 0) }]}
        />
      )}
      {onOpenYoutube && (
        <button type="button" className="dash-link-btn mt-2" onClick={onOpenYoutube}>
          Abrir Canal YouTube →
        </button>
      )}
    </div>
  );
}