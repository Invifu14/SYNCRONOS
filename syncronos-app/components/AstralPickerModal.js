import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const backgroundImage = require('../assets/date-picker-bg.png');
const ITEM_HEIGHT = 52;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const SIDE_PADDING_ROWS = Math.floor(VISIBLE_ROWS / 2);

const MONTHS = [
  { value: 0, label: 'ene' },
  { value: 1, label: 'feb' },
  { value: 2, label: 'mar' },
  { value: 3, label: 'abr' },
  { value: 4, label: 'may' },
  { value: 5, label: 'jun' },
  { value: 6, label: 'jul' },
  { value: 7, label: 'ago' },
  { value: 8, label: 'sep' },
  { value: 9, label: 'oct' },
  { value: 10, label: 'nov' },
  { value: 11, label: 'dic' },
];

const buildWheelItems = (items) => [
  ...Array.from({ length: SIDE_PADDING_ROWS }, (_, index) => ({ key: `pad-start-${index}`, label: '', value: null, spacer: true })),
  ...items.map((item) => ({ ...item, key: `${item.value}` })),
  ...Array.from({ length: SIDE_PADDING_ROWS }, (_, index) => ({ key: `pad-end-${index}`, label: '', value: null, spacer: true })),
];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

function WheelColumn({ items, selectedValue, onChange, width = 1 }) {
  const listRef = useRef(null);
  const wheelItems = useMemo(() => buildWheelItems(items), [items]);
  const isDraggingRef = useRef(false);
  const hasMomentumRef = useRef(false);
  const internalUpdateRef = useRef(false);
  const selectedValueRef = useRef(selectedValue);

  useEffect(() => {
    selectedValueRef.current = selectedValue;
  }, [selectedValue]);

  const scrollToValue = (value, animated = false) => {
    const targetIndex = wheelItems.findIndex((item) => item.value === value);
    if (targetIndex < 0 || !listRef.current) return;
    const centeredOffset = Math.max((targetIndex - SIDE_PADDING_ROWS) * ITEM_HEIGHT, 0);
    listRef.current.scrollToOffset({
      offset: centeredOffset,
      animated,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalUpdateRef.current) {
        internalUpdateRef.current = false;
        return;
      }
      if (isDraggingRef.current) return;
      scrollToValue(selectedValue, false);
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedValue, wheelItems]);

  const commitClosest = (offsetY) => {
    const index = Math.round(offsetY / ITEM_HEIGHT) + SIDE_PADDING_ROWS;
    const item = wheelItems[index];
    if (!item || item.spacer) return;

    if (selectedValueRef.current !== item.value) {
      internalUpdateRef.current = true;
      onChange(item.value);
    }
    scrollToValue(item.value, false);
  };

  return (
    <View style={[styles.columnWrapper, { flex: width }]}>
      <FlatList
        ref={listRef}
        data={wheelItems}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        bounces={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        getItemLayout={(_data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={styles.columnContent}
        renderItem={({ item }) => {
          const isSelected = item.value === selectedValue && !item.spacer;
          return (
            <View style={styles.itemRow}>
              <Text style={[styles.itemText, item.spacer && styles.spacerText, isSelected && styles.selectedItemText]}>
                {item.label}
              </Text>
            </View>
          );
        }}
        onScrollBeginDrag={() => {
          isDraggingRef.current = true;
          hasMomentumRef.current = false;
        }}
        onMomentumScrollBegin={() => {
          hasMomentumRef.current = true;
        }}
        onMomentumScrollEnd={(event) => {
          isDraggingRef.current = false;
          hasMomentumRef.current = false;
          commitClosest(event.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={(event) => {
          if (hasMomentumRef.current) return;
          isDraggingRef.current = false;
          commitClosest(event.nativeEvent.contentOffset.y);
        }}
      />
    </View>
  );
}

export default function AstralPickerModal({
  visible,
  mode,
  value,
  title,
  helperText,
  onClose,
  onConfirm,
}) {
  const initialDate = value ?? new Date();
  const currentYear = new Date().getFullYear();

  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = currentYear; year >= 1900; year -= 1) {
      years.push({ value: year, label: `${year}` });
    }
    return years;
  }, [currentYear]);

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, hourValue) => ({ value: hourValue, label: `${hourValue}`.padStart(2, '0') })),
    []
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, minuteValue) => ({ value: minuteValue, label: `${minuteValue}`.padStart(2, '0') })),
    []
  );

  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initialDate.getMinutes());
  const [confirmLocked, setConfirmLocked] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const nextDate = value ?? new Date();
    setSelectedYear(nextDate.getFullYear());
    setSelectedMonth(nextDate.getMonth());
    setSelectedDay(nextDate.getDate());
    setSelectedHour(nextDate.getHours());
    setSelectedMinute(nextDate.getMinutes());
    setConfirmLocked(false);
  }, [value, visible]);

  const dayOptions = useMemo(() => {
    const totalDays = getDaysInMonth(selectedYear, selectedMonth);
    return Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      return { value: day, label: `${day}`.padStart(2, '0') };
    });
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const totalDays = getDaysInMonth(selectedYear, selectedMonth);
    if (selectedDay > totalDays) {
      setSelectedDay(totalDays);
    }
  }, [selectedDay, selectedMonth, selectedYear]);

  const previewLabel = useMemo(() => {
    if (mode === 'time') {
      return `${`${selectedHour}`.padStart(2, '0')}:${`${selectedMinute}`.padStart(2, '0')}`;
    }
    return `${`${selectedDay}`.padStart(2, '0')} ${MONTHS[selectedMonth]?.label || ''} ${selectedYear}`;
  }, [mode, selectedDay, selectedHour, selectedMinute, selectedMonth, selectedYear]);

  const handleConfirm = () => {
    if (confirmLocked) return;
    setConfirmLocked(true);

    if (mode === 'time') {
      const nextDate = new Date(initialDate);
      nextDate.setHours(selectedHour, selectedMinute, 0, 0);
      onConfirm(nextDate);
      onClose();
      return;
    }

    const totalDays = getDaysInMonth(selectedYear, selectedMonth);
    const safeDay = Math.min(selectedDay, totalDays);
    const nextDate = new Date(selectedYear, selectedMonth, safeDay, initialDate.getHours(), initialDate.getMinutes(), 0, 0);
    onConfirm(nextDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ImageBackground source={backgroundImage} style={styles.card} imageStyle={styles.cardImage}>
          <View style={styles.scrim}>
            <Text style={styles.kicker}>SYNCRONOS</Text>
            <Text style={styles.title}>{title}</Text>
            {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

            <View style={styles.previewPill}>
              <Text style={styles.previewLabel}>{previewLabel}</Text>
            </View>

            <View style={styles.pickerShell}>
              <View style={styles.selectionGlow} pointerEvents="none" />
              {mode === 'time' ? (
                <View style={styles.columnsRow}>
                  <WheelColumn items={hourOptions} selectedValue={selectedHour} onChange={setSelectedHour} />
                  <View style={styles.separatorWrap}>
                    <Text style={styles.separator}>:</Text>
                  </View>
                  <WheelColumn items={minuteOptions} selectedValue={selectedMinute} onChange={setSelectedMinute} />
                </View>
              ) : (
                <View style={styles.columnsRow}>
                  <WheelColumn items={dayOptions} selectedValue={selectedDay} onChange={setSelectedDay} />
                  <WheelColumn items={MONTHS} selectedValue={selectedMonth} onChange={setSelectedMonth} width={1.2} />
                  <WheelColumn items={yearOptions} selectedValue={selectedYear} onChange={setSelectedYear} width={1.2} />
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={onClose} disabled={confirmLocked}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, confirmLocked && styles.primaryButtonDisabled]} onPress={handleConfirm} disabled={confirmLocked}>
                <Text style={styles.primaryButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 3, 12, 0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    shadowColor: '#5E2BFF',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  cardImage: {
    resizeMode: 'cover',
  },
  scrim: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    backgroundColor: 'rgba(10, 7, 28, 0.54)',
  },
  kicker: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  helper: {
    color: '#DDD8F5',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 14,
  },
  previewPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(11, 8, 25, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.24)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 16,
  },
  previewLabel: {
    color: '#F8F5FF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pickerShell: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(17, 9, 43, 0.8)',
    marginBottom: 18,
    position: 'relative',
    height: PICKER_HEIGHT,
    justifyContent: 'center',
  },
  selectionGlow: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: (PICKER_HEIGHT - ITEM_HEIGHT) / 2,
    height: ITEM_HEIGHT,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PICKER_HEIGHT,
  },
  columnWrapper: {
    height: PICKER_HEIGHT,
  },
  columnContent: {
    paddingVertical: 0,
  },
  itemRow: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    color: 'rgba(230, 224, 255, 0.54)',
    fontSize: 24,
    fontWeight: '600',
  },
  selectedItemText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textShadowColor: 'rgba(212, 175, 55, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  spacerText: {
    opacity: 0,
  },
  separatorWrap: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    color: '#D4AF37',
    fontSize: 28,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(12, 10, 28, 0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F4F1FF',
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#D4AF37',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: '#130E22',
    fontWeight: '800',
  },
});
