import React, { useEffect, useState, useRef } from 'react';

/**
 * AnimatedCounter
 * Smoothly interpolates numeric values from 0 to target on mount or value change.
 * Seamlessly handles numbers, decimals, and formatted currency/range strings (e.g. "₹65,000 – ₹98,000").
 */
export default function AnimatedCounter({ value, duration = 1100, className = '' }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') return 0;
    if (typeof value === 'string' && /\d/.test(value)) {
      return value.replace(/\d[\d,]*(?:\.\d+)?/g, '0');
    }
    return value ?? '';
  });

  const animRef = useRef(null);

  useEffect(() => {
    if (value === undefined || value === null || value === '') {
      setDisplayValue('');
      return;
    }

    // 1. Direct single numeric values (or plain numeric strings)
    if (typeof value === 'number' || (!isNaN(Number(value)) && typeof value === 'string' && value.trim() !== '')) {
      const targetNum = Number(value);
      const strVal = String(value);
      const decimalPlaces = strVal.includes('.') ? (strVal.split('.')[1] || '').length : 0;
      
      const startTime = performance.now();

      const updateCounter = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Smooth easeOutCubic curve
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = targetNum * easeOut;

        setDisplayValue(decimalPlaces > 0 ? current.toFixed(decimalPlaces) : Math.round(current).toString());

        if (progress < 1) {
          animRef.current = requestAnimationFrame(updateCounter);
        } else {
          setDisplayValue(decimalPlaces > 0 ? targetNum.toFixed(decimalPlaces) : targetNum.toString());
        }
      };

      animRef.current = requestAnimationFrame(updateCounter);
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }

    // 2. Formatted strings containing numbers (e.g. "₹65,000 – ₹98,000")
    if (typeof value === 'string') {
      const numberMatches = [];
      const regex = /\d[\d,]*(?:\.\d+)?/g;
      let match;
      while ((match = regex.exec(value)) !== null) {
        const rawStr = match[0];
        const numVal = parseFloat(rawStr.replace(/,/g, ''));
        const hasDecimals = rawStr.includes('.');
        const decCount = hasDecimals ? (rawStr.split('.')[1] || '').length : 0;
        const hasCommas = rawStr.includes(',');

        numberMatches.push({
          rawStr,
          numVal,
          decCount,
          hasCommas,
          index: match.index,
          length: rawStr.length,
        });
      }

      if (numberMatches.length === 0) {
        setDisplayValue(value);
        return;
      }

      const startTime = performance.now();

      const updateFormatted = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        let result = '';
        let lastIndex = 0;

        numberMatches.forEach((item) => {
          result += value.substring(lastIndex, item.index);
          const currentVal = item.numVal * easeOut;
          let formattedPart = '';
          if (item.decCount > 0) {
            formattedPart = currentVal.toFixed(item.decCount);
          } else {
            const rounded = Math.round(currentVal);
            formattedPart = item.hasCommas ? rounded.toLocaleString('en-IN') : rounded.toString();
          }
          result += formattedPart;
          lastIndex = item.index + item.length;
        });
        result += value.substring(lastIndex);

        setDisplayValue(result);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(updateFormatted);
        } else {
          setDisplayValue(value);
        }
      };

      animRef.current = requestAnimationFrame(updateFormatted);
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }

    setDisplayValue(value);
  }, [value, duration]);

  return <span className={className}>{displayValue}</span>;
}
