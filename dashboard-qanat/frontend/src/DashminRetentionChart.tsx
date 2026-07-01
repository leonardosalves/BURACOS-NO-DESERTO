import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Activity } from 'lucide-react';
import {
  DASH_CHART,
  dashApexGrid,
  dashApexTooltip,
  dashApexYAxis,
  dashChartFont,
} from './dashminChartTheme';

type RetentionPoint = {
  watchRatio?: number;
  ratio?: number;
};

type DashminRetentionChartProps = {
  points?: RetentionPoint[];
  videoLabel?: string;
};

function normalizePoints(points: RetentionPoint[]) {
  return points
    .map((p, i) => ({
      x: i,
      y: Math.round((p.watchRatio ?? p.ratio ?? 0) * 1000) / 10,
    }))
    .filter((p) => Number.isFinite(p.y));
}

export function DashminRetentionChart({ points = [], videoLabel }: DashminRetentionChartProps) {
  const series = useMemo(() => normalizePoints(points), [points]);

  const options: ApexOptions = useMemo(
    () => ({
      ...dashChartFont(),
      chart: { ...dashChartFont().chart, type: 'area', sparkline: { enabled: false } },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.35,
          opacityFrom: 0.5,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      colors: [DASH_CHART.success],
      dataLabels: { enabled: false },
      grid: dashApexGrid(),
      xaxis: {
        type: 'numeric',
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        ...dashApexYAxis(),
        max: 100,
        labels: {
          style: { colors: DASH_CHART.muted, fontSize: '10px' },
          formatter: (v) => `${Math.round(Number(v))}%`,
        },
      },
      tooltip: dashApexTooltip({
        x: { formatter: (v) => `Ponto ${v}` },
        y: { formatter: (v) => `${v}% retenção` },
      }),
    }),
    [],
  );

  return (
    <div className="dash-card">
      <div className="dash-card-header mb-3">
        <div>
          <p className="dash-card-eyebrow">Projeto ativo</p>
          <h3 className="dash-card-title text-base">Curva de retenção</h3>
          {videoLabel && (
            <p className="text-[10px] text-dash-muted mt-1 truncate" title={videoLabel}>
              {videoLabel}
            </p>
          )}
        </div>
        <Activity className="w-5 h-5 text-dash-success shrink-0" />
      </div>
      {series.length < 2 ? (
        <p className="text-sm text-dash-muted py-8 text-center">
          Abra IA · Metadados com vídeo publicado para carregar a curva de retenção.
        </p>
      ) : (
        <Chart
          type="area"
          height={200}
          width="100%"
          options={options}
          series={[{ name: 'Retenção', data: series }]}
        />
      )}
    </div>
  );
}