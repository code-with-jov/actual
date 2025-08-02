// @ts-strict-ignore
import React, { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { SvgCalendar } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import { type PayPeriod } from 'loot-core/shared/payPeriods';

import { Link } from '@desktop-client/components/common/Link';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useResizeObserver } from '@desktop-client/hooks/useResizeObserver';
import { usePayPeriodCalculations } from '@desktop-client/hooks/usePayPeriodCalculations';

type PayPeriodPickerProps = {
  startPeriod: PayPeriod;
  numDisplayed: number;
  style: CSSProperties;
  onSelect: (period: PayPeriod) => void;
};

export const PayPeriodPicker = ({
  startPeriod,
  numDisplayed,
  style,
  onSelect,
}: PayPeriodPickerProps) => {
  const locale = useLocale();
  const { t } = useTranslation();
  const [hoverId, setHoverId] = useState(null);
  const [targetPeriodCount, setTargetPeriodCount] = useState(12);

  const calculations = usePayPeriodCalculations();
  const currentPeriod = calculations.currentPeriod;
  
  // Generate a range of pay periods around the current selection
  const allPeriods = [
    ...calculations.historicalPeriods,
    ...(currentPeriod ? [currentPeriod] : []),
    ...calculations.upcomingPeriods,
  ];

  // Find the index of the start period in the all periods array
  const startPeriodIndex = allPeriods.findIndex(p => p.id === startPeriod.id);
  
  // Create a range centered around the start period
  const rangeStart = Math.max(0, startPeriodIndex - Math.floor(targetPeriodCount / 2));
  const rangeEnd = Math.min(allPeriods.length, rangeStart + targetPeriodCount);
  const range = allPeriods.slice(rangeStart, rangeEnd);

  const firstSelectedIndex = Math.floor(range.length / 2) - Math.floor(numDisplayed / 2);
  const lastSelectedIndex = firstSelectedIndex + numDisplayed - 1;

  const [size, setSize] = useState('small');
  const containerRef = useResizeObserver(rect => {
    setSize(rect.width <= 400 ? 'small' : 'big');
    setTargetPeriodCount(
      Math.min(Math.max(Math.floor(rect.width / 50), 12), 24),
    );
  });

  const formatPeriodLabel = (period: PayPeriod) => {
    const startDate = monthUtils.parseDate(period.startDate);
    const endDate = monthUtils.parseDate(period.endDate);
    
    // If it's the same month, show "Jan 1-15"
    if (startDate.getMonth() === endDate.getMonth()) {
      const monthName = monthUtils.format(period.startDate, 'MMM', locale);
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      return `${monthName} ${startDay}-${endDay}`;
    }
    
    // If it spans months, show "Jan 15-Jan 31"
    const startMonth = monthUtils.format(period.startDate, 'MMM', locale);
    const endMonth = monthUtils.format(period.endDate, 'MMM', locale);
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
  };

  const getCurrentPeriodIndex = () => {
    return range.findIndex(p => p.id === currentPeriod?.id) ?? -1;
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <View
        innerRef={containerRef}
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Link
          variant="button"
          buttonVariant="bare"
          onPress={() => currentPeriod && onSelect(currentPeriod)}
          style={{
            padding: '3px 3px',
            marginRight: '12px',
          }}
        >
          <View title={t('Current Pay Period')}>
            <SvgCalendar
              style={{
                width: 16,
                height: 16,
              }}
            />
          </View>
        </Link>
        <Link
          variant="button"
          buttonVariant="bare"
          onPress={() => {
            const currentIndex = range.findIndex(p => p.id === startPeriod.id);
            if (currentIndex > 0) {
              onSelect(range[currentIndex - 1]);
            }
          }}
          style={{
            padding: '3px 3px',
            marginRight: '12px',
          }}
        >
          <View title={t('Previous pay period')}>
            <SvgCheveronLeft
              style={{
                width: 16,
                height: 16,
              }}
            />
          </View>
        </Link>
        {range.map((period, idx) => {
          const periodLabel = formatPeriodLabel(period);
          const selected =
            idx >= firstSelectedIndex && idx <= lastSelectedIndex;

          const lastHoverId = hoverId + numDisplayed - 1;
          const hovered =
            hoverId === null ? false : idx >= hoverId && idx <= lastHoverId;

          const current = currentPeriod?.id === period.id;
          const year = monthUtils.getYear(period.startDate);

          const isPeriodActive = period.isActive;

          return (
            <View
              key={period.id}
              style={{
                alignItems: 'center',
                padding: '3px 3px',
                width: size === 'big' ? '80px' : '60px',
                textAlign: 'center',
                userSelect: 'none',
                cursor: 'default',
                borderRadius: 2,
                border: 'none',
                ...(!isPeriodActive && {
                  textDecoration: 'line-through',
                  color: theme.pageTextSubdued,
                }),
                ...styles.smallText,
                ...(selected && {
                  backgroundColor: theme.tableBorderHover,
                  color: theme.buttonPrimaryText,
                }),
                ...((hovered || selected) && {
                  borderRadius: 0,
                  cursor: 'pointer',
                }),
                ...(hoverId !== null &&
                  !hovered &&
                  selected && {
                    filter: 'brightness(65%)',
                  }),
                ...(hovered &&
                  !selected && {
                    backgroundColor: theme.buttonBareBackgroundHover,
                  }),
                ...(!hovered &&
                  !selected &&
                  current && {
                    backgroundColor: theme.buttonBareBackgroundHover,
                    filter: 'brightness(120%)',
                  }),
                ...(hovered &&
                  selected &&
                  current && {
                    filter: 'brightness(120%)',
                  }),
                ...(hovered &&
                  selected && {
                    backgroundColor: theme.tableBorderHover,
                  }),
                ...((idx === firstSelectedIndex ||
                  (idx === hoverId && !selected)) && {
                  borderTopLeftRadius: 2,
                  borderBottomLeftRadius: 2,
                }),
                ...((idx === lastSelectedIndex ||
                  (idx === lastHoverId && !selected)) && {
                  borderTopRightRadius: 2,
                  borderBottomRightRadius: 2,
                }),
                ...(current && { fontWeight: 'bold' }),
              }}
              onClick={() => onSelect(period)}
              onMouseEnter={() => setHoverId(idx)}
              onMouseLeave={() => setHoverId(null)}
            >
              <View>
                {size === 'small' ? `P${idx + 1}` : periodLabel}
                {size === 'big' && (
                  <View
                    style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      color: isPeriodActive
                        ? theme.pageText
                        : theme.pageTextSubdued,
                      marginTop: 2,
                    }}
                  >
                    ${period.amount}
                  </View>
                )}
              </View>
            </View>
          );
        })}
        <Link
          variant="button"
          buttonVariant="bare"
          onPress={() => {
            const currentIndex = range.findIndex(p => p.id === startPeriod.id);
            if (currentIndex < range.length - 1) {
              onSelect(range[currentIndex + 1]);
            }
          }}
          style={{
            padding: '3px 3px',
            marginLeft: '12px',
          }}
        >
          <View title={t('Next pay period')}>
            <SvgCheveronRight
              style={{
                width: 16,
                height: 16,
              }}
            />
          </View>
        </Link>
        {/*Keep range centered*/}
        <span
          style={{
            width: '22px',
            marginLeft: '12px',
          }}
        />
      </View>
    </View>
  );
}; 