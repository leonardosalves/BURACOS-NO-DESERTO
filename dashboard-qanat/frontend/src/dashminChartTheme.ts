import type { ApexOptions } from 'apexcharts';

export const DASH_CHART = {
  primary: '#8280fd',
  primaryDark: '#6045e2',
  info: '#09d1de',
  success: '#67cf94',
  warning: '#ffb959',
  danger: '#fc7383',
  grid: '#2b3c57',
  muted: '#c4c4c4',
  card: '#182335',
  tooltipBg: '#182335',
  tooltipBorder: '#2b3c57',
} as const;

export function dashChartFont(): Pick<ApexOptions, 'chart'> {
  return {
    chart: {
      fontFamily: '"PT Sans", sans-serif',
      background: 'transparent',
      toolbar: { show: false },
    },
  };
}

export function dashApexGrid(): ApexOptions['grid'] {
  return {
    borderColor: DASH_CHART.grid,
    strokeDashArray: 4,
  };
}

export function dashApexTooltip(extra?: ApexOptions['tooltip']): ApexOptions['tooltip'] {
  return {
    theme: 'dark',
    style: { fontSize: '11px', fontFamily: '"PT Sans", sans-serif' },
    ...extra,
  };
}

export function dashApexXAxis(categories: string[], rotate = 0): ApexOptions['xaxis'] {
  return {
    categories,
    labels: {
      style: { colors: DASH_CHART.muted, fontSize: '10px', fontWeight: 600 },
      rotate,
      trim: true,
      hideOverlappingLabels: true,
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  };
}

export function dashApexYAxis(): ApexOptions['yaxis'] {
  return {
    labels: { style: { colors: DASH_CHART.muted, fontSize: '10px' } },
  };
}