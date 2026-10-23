import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { t, type Language, type TranslationKey } from '../../i18n/strings';
import { validateReading, type ValidationKey } from '../../features/readings/validation';
import type { Arm, MeasurementContext, Position, BloodPressureReading } from '../../types/reading';

type Props = {
  language?: Language;
  onSaved?: (reading: BloodPressureReading) => void;
  onCancel?: () => void;
};

const BLUE = '#1769E0';
const PALE = '#EAF2FF';
const TEXT = '#14243A';
const MUTED = '#6A7B91';
const BORDER = 'rgba(75, 126, 190, 0.20)';

function Choice<T extends string>({
  value, options, onChange, label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AddReadingScreen({
  language: languageProp = 'en',
  onSaved,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const [language, setLanguage] = useState<Language>(languageProp);
  const rtl = language === 'ur';

  // Example defaults requested for the prototype. For a first-use production form,
  // consider empty fields so the user explicitly enters a real measurement.
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [pulse, setPulse] = useState('72');
  const [arm, setArm] = useState<Arm>('left');
  const [position, setPosition] = useState<Position>('sitting');
  const [context, setContext] = useState<MeasurementContext>('morning');
  const [notes, setNotes] = useState('');
  const [measuredAt, setMeasuredAt] = useState(new Date());
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorKeys, setErrorKeys] = useState<ValidationKey[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const validation = useMemo(() => validateReading({
    systolic, diastolic, pulse, measuredAt,
  }), [systolic, diastolic, pulse, measuredAt]);

  const tr = (key: TranslationKey) => t(language, key);

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setPicker(null);
    if (event.type === 'dismissed' || !selected) return;
    const next = new Date(measuredAt);
    if (picker === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    setMeasuredAt(next);
  };

  const save = async (forceOrdering = false, forceSafety = false) => {
    if (saving) return;
    const result = validateReading({ systolic, diastolic, pulse, measuredAt });
    setErrorKeys(result.errors);
    if (result.errors.length || result.systolic == null || result.diastolic == null) return;

    if (result.needsOrderingConfirmation && !forceOrdering) {
      Alert.alert(tr('ordering'), tr('review'), [
        { text: tr('review'), style: 'cancel' },
        { text: tr('confirm'), onPress: () => save(true, forceSafety) },
      ]);
      return;
    }

    if (result.needsHighReadingSafetyAcknowledgement && !forceSafety) {
      Alert.alert(tr('highTitle'), tr('highBody'), [
        { text: tr('review'), style: 'cancel' },
        { text: tr('confirm'), onPress: () => save(forceOrdering, true) },
      ]);
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const reading: BloodPressureReading = {
        id: createId(),
        profileId: 'local-profile',
        systolic: result.systolic,
        diastolic: result.diastolic,
        pulseBpm: result.pulseBpm,
        measuredAtUtc: measuredAt.toISOString(),
        timezoneOffsetMinutes: measuredAt.getTimezoneOffset(),
        arm,
        position,
        context,
        notes: notes.trim() || null,
        source: 'manual',
        createdAtUtc: now.toISOString(),
        updatedAtUtc: now.toISOString(),
      };

      await db.runAsync(
        `INSERT INTO readings (
          id, profile_id, systolic, diastolic, pulse_bpm, measured_at_utc,
          timezone_offset_minutes, arm, position, context, notes, source,
          created_at_utc, updated_at_utc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        reading.id, reading.profileId, reading.systolic, reading.diastolic,
        reading.pulseBpm, reading.measuredAtUtc, reading.timezoneOffsetMinutes,
        reading.arm, reading.position, reading.context, reading.notes,
        reading.source, reading.createdAtUtc, reading.updatedAtUtc,
      );

      Alert.alert(tr('saved'), undefined, [{ text: tr('ok'), onPress: () => onSaved?.(reading) }]);
    } catch {
      Alert.alert(tr('saveFailed'), tr('retry'));
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = measuredAt.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const formattedTime = measuredAt.toLocaleTimeString(language === 'ur' ? 'ur-PK' : 'en-PK', {
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, rtl && styles.rtl]}>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.backButton}>
            <Text style={styles.backText}>{rtl ? '→' : '←'}</Text>
          </Pressable>
          <View style={[styles.headerText, rtl && styles.alignEnd]}>
            <Text style={[styles.title, rtl && styles.alignRight]}>{tr('title')}</Text>
            <Text style={[styles.subtitle, rtl && styles.alignRight]}>{tr('subtitle')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('language')}
            onPress={() => setLanguage((old) => old === 'en' ? 'ur' : 'en')}
            style={styles.languageButton}
          >
            <Text style={styles.languageText}>{language === 'en' ? 'اردو' : 'EN'}</Text>
          </Pressable>
        </View>

        <View style={styles.exampleBanner}>
          <Text style={styles.exampleText}>ⓘ  {tr('example')}</Text>
        </View>

        <View style={[styles.introRow, rtl && styles.rtl]}>
          <View style={styles.introIcon}><Text style={styles.introIconText}>✓</Text></View>
          <View style={[styles.headerText, rtl && styles.alignEnd]}>
            <Text style={[styles.introTitle, rtl && styles.alignRight]}>{tr('easyTitle')}</Text>
            <Text style={[styles.introText, rtl && styles.alignRight]}>{tr('easySubtitle')}</Text>
          </View>
        </View>

        <View style={styles.glassCard}>
          <View style={[styles.cardHeading, rtl && styles.rtl]}>
            <View style={styles.pulseIcon}>
              <Text style={styles.pulseIconText}>♥</Text>
            </View>
            <View style={[styles.headerText, rtl && styles.alignEnd]}>
              <Text style={[styles.cardTitle, rtl && styles.alignRight]}>{tr('title')}</Text>
              <Text style={[styles.cardSubtitle, rtl && styles.alignRight]}>mmHg</Text>
            </View>
          </View>

          <Text style={[styles.fieldHint, rtl && styles.alignRight]}>{tr('bpHint')}</Text>
          <View style={[styles.bpRow, rtl && styles.rtl]}>
            <View style={styles.numberField}>
              <Text style={styles.label}>{tr('systolic')}</Text>
              <TextInput
                accessibilityLabel={tr('systolic')}
                value={systolic}
                onChangeText={setSystolic}
                keyboardType="number-pad"
                maxLength={3}
                selectTextOnFocus
                style={styles.numberInput}
                placeholder="120"
                placeholderTextColor="#93A5BB"
                returnKeyType="next"
              />
              <Text style={styles.unit}>{tr('topNumber')}</Text>
              <Text style={styles.unit}>{tr('mmhg')}</Text>
            </View>
            <Text style={styles.slash}>/</Text>
            <View style={styles.numberField}>
              <Text style={styles.label}>{tr('diastolic')}</Text>
              <TextInput
                accessibilityLabel={tr('diastolic')}
                value={diastolic}
                onChangeText={setDiastolic}
                keyboardType="number-pad"
                maxLength={3}
                selectTextOnFocus
                style={styles.numberInput}
                placeholder="80"
                placeholderTextColor="#93A5BB"
                returnKeyType="next"
              />
              <Text style={styles.unit}>{tr('bottomNumber')}</Text>
              <Text style={styles.unit}>{tr('mmhg')}</Text>
            </View>
          </View>

          <View style={styles.pulseField}>
            <Text style={styles.label}>{tr('pulse')}</Text>
            <View style={[styles.pulseInputWrap, rtl && styles.rtl]}>
              <ActivityIndicator animating={false} size="small" color={BLUE} />
              <TextInput
                accessibilityLabel={tr('pulse')}
                value={pulse}
                onChangeText={setPulse}
                keyboardType="number-pad"
                maxLength={3}
                selectTextOnFocus
                style={styles.pulseInput}
                placeholder="72"
                placeholderTextColor="#93A5BB"
              />
              <Text style={styles.unit}>{tr('bpm')}</Text>
            </View>
          </View>
        </View>

        {errorKeys.length > 0 && (
          <View accessibilityRole="alert" style={styles.errorCard}>
            {errorKeys.map((key) => (
              <Text key={key} style={styles.errorText}>• {tr(key as TranslationKey)}</Text>
            ))}
          </View>
        )}

        {validation.needsHighReadingSafetyAcknowledgement && (
          <View style={styles.warningCard} accessibilityRole="alert">
            <Text style={styles.warningTitle}>{tr('highTitle')}</Text>
            <Text style={styles.warningText}>{tr('highBody')}</Text>
            <Text style={styles.warningText}>{tr('urgentSymptoms')}</Text>
          </View>
        )}

        <View style={styles.glassCard}>
          <Text style={[styles.sectionTitle, rtl && styles.alignRight]}>{tr('dateTime')}</Text>
          <View style={[styles.dateTimeRow, rtl && styles.rtl]}>
            <Pressable style={styles.dateTimeButton} onPress={() => setPicker('date')}>
              <Text style={styles.dateTimeCaption}>▦  {tr('editDate')}</Text>
              <Text style={styles.dateTimeValue}>{formattedDate}</Text>
            </Pressable>
            <Pressable style={styles.dateTimeButton} onPress={() => setPicker('time')}>
              <Text style={styles.dateTimeCaption}>◷  {tr('editTime')}</Text>
              <Text style={styles.dateTimeValue}>{formattedTime}</Text>
            </Pressable>
          </View>
          {picker && (
            <DateTimePicker
              value={measuredAt}
              mode={picker}
              display={Platform.OS === 'ios' ? 'compact' : 'default'}
              maximumDate={new Date()}
              onChange={onPickerChange}
            />
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showDetails }}
          onPress={() => setShowDetails((value) => !value)}
          style={[styles.detailsToggle, rtl && styles.rtl]}
        >
          <View style={[styles.detailsIcon, rtl && styles.rtl]}><Text style={styles.detailsIconText}>{showDetails ? '−' : '+'}</Text></View>
          <View style={[styles.headerText, rtl && styles.alignEnd]}>
            <Text style={[styles.detailsTitle, rtl && styles.alignRight]}>{tr('moreDetails')}</Text>
            <Text style={[styles.detailsSubtitle, rtl && styles.alignRight]}>{tr('moreDetailsHint')}</Text>
          </View>
          <Text style={styles.chevron}>{showDetails ? '⌃' : '⌄'}</Text>
        </Pressable>

        {showDetails && <View style={styles.glassCard}>
          <Choice<Arm>
            label={tr('arm')}
            value={arm}
            onChange={setArm}
            options={[
              { value: 'left', label: tr('left') },
              { value: 'right', label: tr('right') },
            ]}
          />
          <Choice<Position>
            label={tr('position')}
            value={position}
            onChange={setPosition}
            options={[
              { value: 'sitting', label: tr('sitting') },
              { value: 'lying', label: tr('lying') },
              { value: 'standing', label: tr('standing') },
            ]}
          />
          <Choice<MeasurementContext>
            label={tr('context')}
            value={context}
            onChange={setContext}
            options={[
              { value: 'morning', label: tr('morning') },
              { value: 'evening', label: tr('evening') },
              { value: 'resting', label: tr('resting') },
              { value: 'other', label: tr('other') },
            ]}
          />
          <View style={styles.section}>
            <Text style={[styles.label, rtl && styles.alignRight]}>{tr('notes')}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={1000}
              placeholder={tr('notesPlaceholder')}
              placeholderTextColor="#93A5BB"
              textAlignVertical="top"
              style={[styles.notesInput, rtl && styles.alignRight]}
            />
          </View>
        </View>}

        <Pressable style={[styles.helpButton, rtl && styles.rtl]} onPress={() => Alert.alert(tr('helpTitle'), tr('helpBody'), [{ text: tr('ok') }])} accessibilityRole="button">
          <Text style={styles.helpIcon}>ⓘ</Text><Text style={styles.helpText}>{tr('helpTitle')}</Text><Text style={styles.helpArrow}>{rtl ? '←' : '→'}</Text>
        </Pressable>

        <View style={[styles.privacyRow, rtl && styles.rtl]}>
          <Text style={styles.privacyIcon}>⌑</Text>
          <Text style={[styles.privacyText, rtl && styles.alignRight]}>{tr('privacy')}</Text>
        </View>
        <Text style={[styles.disclaimer, rtl && styles.alignRight]}>{tr('safety')}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => save()}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{tr('save')}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createId(): string {
  // Random UUID when supported by the JS runtime; collision-resistant fallback.
  const cryptoObject = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID();
  return `reading-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EDF4FF' },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rtl: { flexDirection: 'row-reverse' },
  alignRight: { textAlign: 'right' },
  alignEnd: { alignItems: 'flex-end' },
  backButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#FFFFFFB8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  backText: { fontSize: 24, color: TEXT },
  headerText: { flex: 1, gap: 3 },
  title: { fontSize: 25, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: MUTED },
  languageButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, backgroundColor: '#FFFFFFC9', borderWidth: 1, borderColor: BORDER },
  languageText: { color: BLUE, fontWeight: '700' },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  introIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#DDF8EA', alignItems: 'center', justifyContent: 'center' },
  introIconText: { color: '#168653', fontSize: 20, fontWeight: '900' },
  introTitle: { fontSize: 15, color: TEXT, fontWeight: '800' },
  introText: { fontSize: 12, color: MUTED, lineHeight: 17 },
  fieldHint: { color: MUTED, fontSize: 12, lineHeight: 17 },
  topNumber: {},
  exampleBanner: { padding: 11, borderRadius: 14, backgroundColor: '#DDEBFF', borderWidth: 1, borderColor: '#C4DBFF' },
  exampleText: { color: '#24548D', fontSize: 12, fontWeight: '600' },
  glassCard: { backgroundColor: 'rgba(255,255,255,0.80)', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#FFFFFF', gap: 16, shadowColor: '#7EA4D4', shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pulseIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: PALE, alignItems: 'center', justifyContent: 'center' },
  pulseIconText: { color: BLUE, fontSize: 21 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: TEXT },
  cardSubtitle: { fontSize: 12, color: MUTED },
  bpRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numberField: { flex: 1, backgroundColor: '#F4F8FF', borderRadius: 18, padding: 13, borderWidth: 1, borderColor: BORDER },
  label: { fontSize: 12, color: MUTED, fontWeight: '600', marginBottom: 6 },
  numberInput: { color: TEXT, fontSize: 32, fontWeight: '800', padding: 0, minHeight: 42 },
  unit: { color: MUTED, fontSize: 11, marginTop: 2 },
  slash: { fontSize: 28, color: '#8DA2BD', fontWeight: '300' },
  pulseField: { gap: 7 },
  pulseInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F4F8FF', borderRadius: 15, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 13 },
  pulseInput: { flex: 1, fontSize: 19, fontWeight: '700', color: TEXT, paddingVertical: 12 },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: '#FFFFFF' },
  detailsIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: PALE, alignItems: 'center', justifyContent: 'center' },
  detailsIconText: { color: BLUE, fontSize: 23, fontWeight: '500', lineHeight: 26 },
  detailsTitle: { color: TEXT, fontWeight: '800', fontSize: 14 },
  detailsSubtitle: { color: MUTED, fontSize: 11, marginTop: 3 },
  chevron: { color: BLUE, fontSize: 22, paddingHorizontal: 3 },
  helpButton: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 17, backgroundColor: '#E3EEFF', borderWidth: 1, borderColor: '#C8DDFF' },
  helpIcon: { color: BLUE, fontSize: 18, fontWeight: '800' },
  helpText: { flex: 1, color: '#1D4F91', fontSize: 13, fontWeight: '700' },
  helpArrow: { color: BLUE, fontSize: 18 },
  errorCard: { backgroundColor: '#FFF0F0', borderRadius: 16, padding: 13, borderWidth: 1, borderColor: '#F5B8B8', gap: 5 },
  errorText: { color: '#A32929', fontSize: 13 },
  warningCard: { backgroundColor: '#FFF4E5', borderRadius: 18, padding: 15, borderWidth: 1, borderColor: '#F3C98B', gap: 8 },
  warningTitle: { color: '#8A4B08', fontSize: 15, fontWeight: '800' },
  warningText: { color: '#704C28', fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: TEXT, fontWeight: '800', fontSize: 15 },
  dateTimeRow: { flexDirection: 'row', gap: 10 },
  dateTimeButton: { flex: 1, backgroundColor: '#F4F8FF', borderRadius: 15, padding: 12, borderWidth: 1, borderColor: BORDER, gap: 8 },
  dateTimeCaption: { color: MUTED, fontSize: 11, fontWeight: '600' },
  dateTimeValue: { color: TEXT, fontSize: 14, fontWeight: '700' },
  section: { gap: 8, marginBottom: 5 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 13, backgroundColor: '#F4F8FF', borderWidth: 1, borderColor: BORDER },
  choiceSelected: { backgroundColor: '#E3EEFF', borderColor: '#8AB8FF' },
  choiceText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  choiceTextSelected: { color: BLUE },
  notesInput: { minHeight: 88, borderRadius: 15, backgroundColor: '#F4F8FF', borderWidth: 1, borderColor: BORDER, padding: 13, color: TEXT, fontSize: 14 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  privacyIcon: { color: BLUE, fontSize: 18, fontWeight: '800' },
  privacyText: { color: MUTED, fontSize: 12 },
  disclaimer: { color: MUTED, fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 10 },
  saveButton: { backgroundColor: BLUE, minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE, shadowOpacity: 0.23, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

