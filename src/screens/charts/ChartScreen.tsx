import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../../theme';

// ---------------------------------------------------------------------------
// Symbols available in the chart picker
// ---------------------------------------------------------------------------

interface ChartSymbol {
  label: string;
  symbol: string; // TradingView symbol format
}

const SYMBOLS: ChartSymbol[] = [
  { label: 'EUR/USD', symbol: 'FX:EURUSD' },
  { label: 'GBP/USD', symbol: 'FX:GBPUSD' },
  { label: 'XAU/USD', symbol: 'TVC:GOLD' },
  { label: 'USD/JPY', symbol: 'FX:USDJPY' },
  { label: 'GBP/JPY', symbol: 'FX:GBPJPY' },
  { label: 'USD/CAD', symbol: 'FX:USDCAD' },
  { label: 'AUD/USD', symbol: 'FX:AUDUSD' },
  { label: 'NAS100',  symbol: 'NASDAQ:NDX' },
  { label: 'SP500',   symbol: 'SP:SPX' },
  { label: 'BTC/USD', symbol: 'BITSTAMP:BTCUSD' },
];

// ---------------------------------------------------------------------------
// Build a data: URI for the TradingView widget.
// Using data: URI instead of source={{ html }} avoids the
// Image.resolveAssetSource crash in react-native-webview on RN 0.76+.
// ---------------------------------------------------------------------------

function buildChartUri(symbol: string): string {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;background:#080B14;overflow:hidden;}
</style>
</head>
<body>
<div class="tradingview-widget-container" style="height:100%;width:100%">
  <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
  {
    "autosize":true,
    "symbol":"${symbol}",
    "interval":"H1",
    "timezone":"Etc/UTC",
    "theme":"dark",
    "style":"1",
    "locale":"en",
    "backgroundColor":"#080B14",
    "gridColor":"rgba(30,40,64,0.8)",
    "hide_top_toolbar":false,
    "hide_legend":false,
    "allow_symbol_change":true,
    "save_image":false,
    "calendar":false,
    "hide_volume":false,
    "support_host":"https://www.tradingview.com",
    "studies":["STD;MACD","STD;RSI"]
  }
  </script>
</div>
</body>
</html>`;

  // Encode as base64 data URI — avoids resolveAssetSource code path entirely
  const encoded = btoa(unescape(encodeURIComponent(html)));
  return `data:text/html;base64,${encoded}`;
}

// ---------------------------------------------------------------------------
// Chart screen component
// ---------------------------------------------------------------------------

export const ChartScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [selectedSymbol, setSelectedSymbol] = useState<ChartSymbol>(SYMBOLS[0]!);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const uri = buildChartUri(selectedSymbol.symbol);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.screenTitle}>Charts</Text>
        <Text style={styles.poweredBy}>Powered by TradingView</Text>
      </View>

      {/* Symbol picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.symbolScroll}
        contentContainerStyle={styles.symbolContent}
      >
        {SYMBOLS.map((s) => (
          <Pressable
            key={s.symbol}
            style={[
              styles.symbolChip,
              selectedSymbol.symbol === s.symbol && styles.symbolChipActive,
            ]}
            onPress={() => {
              setSelectedSymbol(s);
              setIsLoading(true);
            }}
            accessibilityRole="tab"
            accessibilityLabel={`Chart for ${s.label}`}
            accessibilityState={{ selected: selectedSymbol.symbol === s.symbol }}
          >
            <Text
              style={[
                styles.symbolChipText,
                selectedSymbol.symbol === s.symbol && styles.symbolChipTextActive,
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* TradingView chart */}
      <View style={styles.chartContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          style={styles.webView}
          source={{ uri }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          scrollEnabled={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          mixedContentMode="always"
          androidLayerType="hardware"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: COLORS.bg },
  header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: SPACING.md, paddingBottom: 10 },
  screenTitle:          { color: COLORS.text, fontSize: FONTS.sizes['3xl'], fontWeight: FONTS.weights.extrabold },
  poweredBy:            { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginBottom: 2 },
  symbolScroll:         { flexGrow: 0, marginBottom: 8 },
  symbolContent:        { paddingHorizontal: SPACING.md, gap: 8, paddingBottom: 4 },
  symbolChip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard },
  symbolChipActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  symbolChipText:       { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium },
  symbolChipTextActive: { color: COLORS.primary, fontWeight: FONTS.weights.bold },
  chartContainer:       { flex: 1, position: 'relative' },
  webView:              { flex: 1, backgroundColor: COLORS.bg },
  loadingOverlay:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingText:          { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 12 },
});
