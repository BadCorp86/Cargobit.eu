// ============================================
// CARGOBIT DESIGN TOKENS
// Risk Dashboard Design System
// ============================================

export const colors = {
  // Risk Level Colors
  risk: {
    green: '#2ECC71',      // Low Risk (0-30)
    yellow: '#F1C40F',     // Medium Risk (31-60)
    red: '#E74C3C',        // High Risk (61-100)
    grey: '#BDC3C7',       // Neutral
  },

  // UI Grundfarben
  ui: {
    primary: '#2D8CFF',
    primaryDark: '#1B6ED6',
    background: '#F7F9FB',
    cardBackground: '#FFFFFF',
    border: '#E0E6ED',
    textPrimary: '#1F2D3D',
    textSecondary: '#6B7C93',
  },

  // State Colors
  state: {
    success: '#2ECC71',
    warning: '#F1C40F',
    error: '#E74C3C',
    info: '#2D8CFF',
  },

  // Chart Colors
  chart: {
    greenLine: '#2ECC71',
    yellowLine: '#F1C40F',
    redLine: '#E74C3C',
    gridlines: '#E0E6ED',
    bars: '#2D8CFF',
    barsHover: '#1B6ED6',
  },
} as const;

// ============================================
// BUTTON STYLES
// ============================================

export const buttonStyles = {
  primary: {
    background: colors.ui.primary,
    color: '#FFFFFF',
    hover: colors.ui.primaryDark,
    disabled: '#AFCBFF',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 500,
  },

  secondary: {
    background: '#FFFFFF',
    border: `1px solid ${colors.ui.primary}`,
    color: colors.ui.primary,
    hover: '#EAF3FF',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 500,
  },

  danger: {
    background: colors.risk.red,
    color: '#FFFFFF',
    hover: '#C0392B',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 500,
  },

  ghost: {
    background: 'transparent',
    color: colors.ui.textSecondary,
    hover: colors.ui.background,
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 500,
  },
} as const;

// ============================================
// BADGE STYLES
// ============================================

export const badgeStyles = {
  green: {
    background: '#E8F8F0',
    color: colors.risk.green,
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 500,
  },

  yellow: {
    background: '#FFF9E6',
    color: colors.risk.yellow,
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 500,
  },

  red: {
    background: '#FDEDEC',
    color: colors.risk.red,
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 500,
  },

  grey: {
    background: '#F2F4F7',
    color: colors.ui.textSecondary,
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 500,
  },

  // Entity Type Badges
  user: {
    background: '#E8F4FD',
    color: '#2D8CFF',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 500,
  },

  company: {
    background: '#F3E8FD',
    color: '#8B5CF6',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 500,
  },

  transaction: {
    background: '#FEF3E8',
    color: '#F59E0B',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 500,
  },
} as const;

// ============================================
// TABLE STYLES
// ============================================

export const tableStyles = {
  header: {
    background: colors.ui.background,
    color: colors.ui.textSecondary,
    borderBottom: `1px solid ${colors.ui.border}`,
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  row: {
    background: '#FFFFFF',
    hover: '#F2F6FA',
    selected: '#EAF3FF',
    borderBottom: `1px solid ${colors.ui.border}`,
  },

  cell: {
    padding: '12px 16px',
    fontSize: '14px',
    color: colors.ui.textPrimary,
  },
} as const;

// ============================================
// CHART STYLES
// ============================================

export const chartStyles = {
  lineChart: {
    colors: {
      green: colors.chart.greenLine,
      yellow: colors.chart.yellowLine,
      red: colors.chart.redLine,
    },
    gridlines: colors.chart.gridlines,
    background: '#FFFFFF',
    lineWidth: 2,
    pointRadius: 4,
  },

  barChart: {
    colors: {
      bar: colors.chart.bars,
      hover: colors.chart.barsHover,
    },
    borderRadius: 4,
  },
} as const;

// ============================================
// CARD STYLES
// ============================================

export const cardStyles = {
  default: {
    background: colors.ui.cardBackground,
    border: `1px solid ${colors.ui.border}`,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },

  elevated: {
    background: colors.ui.cardBackground,
    border: `1px solid ${colors.ui.border}`,
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },

  interactive: {
    background: colors.ui.cardBackground,
    border: `1px solid ${colors.ui.border}`,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    hoverShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    hoverBorder: colors.ui.primary,
    cursor: 'pointer',
  },
} as const;

// ============================================
// SCORE CIRCLE STYLES
// ============================================

export const scoreCircleStyles = {
  size: {
    small: 48,
    medium: 64,
    large: 96,
  },

  colors: {
    green: {
      background: colors.risk.green,
      text: '#FFFFFF',
    },
    yellow: {
      background: colors.risk.yellow,
      text: '#1F2D3D',
    },
    red: {
      background: colors.risk.red,
      text: '#FFFFFF',
    },
  },

  fontSize: {
    small: 14,
    medium: 18,
    large: 28,
  },
} as const;

// ============================================
// ANIMATIONS
// ============================================

export const animations = {
  fadeIn: {
    animation: 'fadeIn 0.3s ease-in-out',
  },

  slideIn: {
    animation: 'slideIn 0.3s ease-out',
  },

  pulse: {
    animation: 'pulse 2s infinite',
  },

  keyframes: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `,
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  h1: {
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: 1.2,
    color: colors.ui.textPrimary,
  },

  h2: {
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: 1.3,
    color: colors.ui.textPrimary,
  },

  h3: {
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: 1.4,
    color: colors.ui.textPrimary,
  },

  body: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
    color: colors.ui.textPrimary,
  },

  caption: {
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: 1.4,
    color: colors.ui.textSecondary,
  },

  mono: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '13px',
    lineHeight: 1.5,
  },
} as const;

// ============================================
// RISK THRESHOLDS
// ============================================

export const riskThresholds = {
  green: { min: 0, max: 30, label: 'GREEN', action: 'Allow' },
  yellow: { min: 31, max: 60, label: 'YELLOW', action: 'Allow + Mitigations' },
  red: { min: 61, max: 100, label: 'RED', action: 'Block + Support Ticket' },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getRiskLevel(score: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (score <= riskThresholds.green.max) return 'GREEN';
  if (score <= riskThresholds.yellow.max) return 'YELLOW';
  return 'RED';
}

export function getRiskColor(level: 'GREEN' | 'YELLOW' | 'RED'): string {
  return colors.risk[level.toLowerCase() as keyof typeof colors.risk];
}

export function getRiskBgColor(level: 'GREEN' | 'YELLOW' | 'RED'): string {
  const bgColors = {
    GREEN: '#E8F8F0',
    YELLOW: '#FFF9E6',
    RED: '#FDEDEC',
  };
  return bgColors[level];
}

export function getRiskAction(level: 'GREEN' | 'YELLOW' | 'RED'): string {
  return riskThresholds[level.toLowerCase() as keyof typeof riskThresholds].action;
}
