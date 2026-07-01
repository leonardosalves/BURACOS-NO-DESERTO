import type { ApexOptions } from 'apexcharts';

export const DASH_CHART = {
  primary: '#8280fd',
  primaryDark: '#6045e2',
  info: '#09d1de',
  success: '#67cf94',
  warning: '#ffb959',
  danger: '#fc7383',
  grid: '#1a2230',
  muted: '#8b95a8',
  card: '#0c1018',
  tooltipBg: '#0c1018',
  tooltipBorder: '#1a2230',
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