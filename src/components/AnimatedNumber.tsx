import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  style?: TextStyle;
  color?: string;
}

/**
 * Animates a number by interpolating displayed value over the given duration.
 * Uses setInterval for compatibility with all architectures.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 800,
  style,
  color,
}) => {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const startValue = displayed;
    const diff = value - startValue;
    if (diff === 0) return;

    const steps = 30;
    const stepDuration = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      const progress = step / steps;
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(startValue + diff * eased);
      if (step >= steps) {
        setDisplayed(value);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const sign = value > 0 ? '+' : '';
  const text = `${prefix}${sign}${displayed.toFixed(decimals)}${suffix}`;

  return (
    <Text style={[{ color: color ?? '#FFFFFF', fontSize: 22, fontWeight: '700' }, style]}>
      {text}
    </Text>
  );
};
