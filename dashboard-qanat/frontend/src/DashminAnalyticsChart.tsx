import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { ProjectListItem } from './ProjectsLibraryPanel';
import {
  DASH_CHART,
  dashApexGrid,
  dashApexTooltip,
  dashApexXAxis,
  dashApexYAxis,
  dashChartFont,
} from './dashminChartTheme';

type DashminAnalyticsChartProps = {
  projects: ProjectListItem[];
  nicheBreakdown?: { label: string; count: number }[];
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
      ...dashChartFont(),
      chart: { ...dashChartFont().chart, type: 'bar' },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '48%',
          distributed: true,
        },
      },
      colors: [DASH_CHART.primary, DASH_CHART.info],
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: { ...dashApexGrid(), xaxis: { lines: { show: false } } },
      xaxis: dashApexXAxis(['Longos', 'Shorts']),
      yaxis: dashApexYAxis(),
      tooltip: dashApexTooltip({
        y: { formatter: (v) => `${v} projeto(s)` },
      }),
    }),
    [],
  );

  const nicheOptions: ApexOptions = useMemo(
    () => ({
      ...dashChartFont(),
      chart: { ...dashChartFont().chart, type: 'area', sparkline: { enabled: false } },
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
      colors: [DASH_CHART.success],
      dataLabels: { enabled: false },
      grid: dashApexGrid(),
      xaxis: dashApexXAxis(
        niches.map((n) => n.label),
        -25,
      ),
      yaxis: dashApexYAxis(),
      tooltip: dashApexTooltip(),
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