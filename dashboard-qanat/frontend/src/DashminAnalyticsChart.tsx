import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { ProjectListItem } from './ProjectsLibraryPanel';

type DashminAnalyticsChartProps = {
  projects: ProjectListItem[];
  nicheBreakdown?: { label: string; count: number }[];
};

const DASH_CHART_THEME = {
  primary: '#8280fd',
  info: '#09d1de',
  success: '#67cf94',
  grid: '#2b3c57',
  muted: '#c4c4c4',
};

function buildNicheBreakdown(projects: ProjectListItem[]) {
  const map = new Map<string, number>();
  for (const p of projects) {
    const niche = (p.niche || 'Geral').trim() || 'Geral';
    map.set(niche, (map.get(niche) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function DashminAnalyticsChart({ projects, nicheBreakdown }: DashminAnalyticsChartProps) {
  const longCount = projects.filter((p) => p.format !== 'SHORTS').length;
  const shortCount = projects.filter((p) => p.format === 'SHORTS').length;
  const niches = nicheBreakdown ?? buildNicheBreakdown(projects);

  const formatOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'bar',
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: '"PT Sans", sans-serif',
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '48%',
          distributed: true,
        },
      },
      colors: [DASH_CHART_THEME.primary, DASH_CHART_THEME.info],
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: {
        borderColor: DASH_CHART_THEME.grid,
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
      },
      xaxis: {
        categories: ['Longos', 'Shorts'],
        labels: { style: { colors: DASH_CHART_THEME.muted, fontSize: '11px', fontWeight: 600 } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: DASH_CHART_THEME.muted, fontSize: '10px' } },
      },
      tooltip: {
        theme: 'dark',
        y: { formatter: (v) => `${v} projeto(s)` },
      },
    }),
    [],
  );

  const nicheOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'area',
        toolbar: { show: false },
        background: 'transparent',
        sparkline: { enabled: false },
        fontFamily: '"PT Sans", sans-serif',
      },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.4,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      colors: [DASH_CHART_THEME.success],
      dataLabels: { enabled: false },
      grid: {
        borderColor: DASH_CHART_THEME.grid,
        strokeDashArray: 4,
      },
      xaxis: {
        categories: niches.map((n) => n.label),
        labels: {
          style: { colors: DASH_CHART_THEME.muted, fontSize: '9px' },
          rotate: -25,
          trim: true,
          hideOverlappingLabels: true,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: DASH_CHART_THEME.muted, fontSize: '10px' } },
      },
      tooltip: { theme: 'dark' },
    }),
    [niches],
  );

  return (
    <div className="dash-analytics-charts">
      <div className="dash-analytics-block">
        <p className="dash-analytics-label">Por formato</p>
        <Chart
          type="bar"
          height={200}
          width="100%"
          options={formatOptions}
          series={[{ name: 'Projetos', data: [longCount, shortCount] }]}
        />
      </div>
      {niches.length > 0 && (
        <div className="dash-analytics-block">
          <p className="dash-analytics-label">Top nichos</p>
          <Chart
            type="area"
            height={200}
            width="100%"
            options={nicheOptions}
            series={[{ name: 'Projetos', data: niches.map((n) => n.count) }]}
          />
        </div>
      )}
    </div>
  );
}