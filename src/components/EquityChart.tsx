import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';

export interface EquityDataPoint {
  timestamp: string;
  equity: number;
}

interface EquityChartProps {
  data: EquityDataPoint[];
  height?: number;
}

/**
 * Equity curve chart component.
 * Renders a bar-based visual chart using React Native primitives.
 */
export const EquityChart: React.FC<EquityChartProps> = ({
  data,
  height = 160,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No equity data yet</Text>
        {/* Dashed baseline */}
        <View style={styles.dashedBaseline} />
      </View>
    );
  }

  const values = data.map((d) => d.equity);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const chartHeight = height - 32;

  const lastEquity = values[values.length - 1] ?? 0;
  const firstEquity = values[0] ?? 0;
  const isPositive = lastEquity >= firstEquity;
  const lineColor = isPositive ? COLORS.primary : COLORS.sell;

  return (
    <View style={[styles.container, { height }]}>
      {/* Y-axis labels */}
      <View style={styles.yAxisContainer}>
        <Text style={styles.axisLabel}>{maxVal.toFixed(0)}</Text>
        <Text style={styles.axisLabel}>{minVal.toFixed(0)}</Text>
      </View>

      {/* Chart area */}
      <View style={styles.chartArea}>
        {data.map((d, i) => {
          const normalizedHeight = ((d.equity - minVal) / range) * chartHeight;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: Math.max(normalizedHeight, 1),
                  backgroundColor: lineColor,
                  opacity: 0.7 + (i / data.length) * 0.3,
                },
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.placeholderNote}>
        Equity Curve · {data.length} points
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 12,
  },
  dashedBaseline: {
    width: '80%',
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  yAxisContainer: {
    position: 'absolute',
    left: 8,
    top: 16,
    bottom: 16,
    justifyContent: 'space-between',
  },
  axisLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    width: '100%',
    paddingLeft: 32,
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 1,
    minHeight: 1,
  },
  placeholderNote: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
});
