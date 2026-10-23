# BP Journey — Quick Add Reading (Expo + React Native + TypeScript)

This is a production-oriented feature starter for the Quick Add Reading screen. It is not a complete app or a medical device.

## Included
- React Native / Expo TypeScript screen with glass-inspired cards
- English and Urdu labels with RTL layout direction
- SQLite persistence and versioned schema initialization
- Date/time pickers
- Validation and cautious safety messaging
- Double-submit protection
- Beginner-friendly guided entry with plain-language hints for top/bottom values
- Collapsible optional details so first-time users see a short form first
- Bilingual measurement technique help (English/Urdu)
- Demo-only banner makes the prefilled sample values explicit
- Repository and domain types separated from UI

## Install into an Expo project

Use a current Expo SDK and install compatible versions with `npx expo install`:

```bash
npx expo install expo-sqlite @react-native-community/datetimepicker expo-localization
npx expo install react-native-safe-area-context
```

Copy `src/` into your project. Example route:
- Expo Router: copy `src/app/readings/add.tsx` to `app/readings/add.tsx`
- Make sure your app root has a `SafeAreaProvider` if your setup requires it.
- This screen uses a lightweight local translation helper; replace with your app-wide i18n provider if one exists.

## Important integration notes
- `getDatabase()` initializes the SQLite schema once per process. Keep a single connection in app-wide infrastructure for a larger app.
- The default `profile_id` is `"local-profile"` as a single-user placeholder. Replace it with your actual profile ID when profiles are implemented.
- Date/time is saved as ISO UTC plus the device's offset at measurement time. The local display uses the device locale.
- A high reading is saved only after the user acknowledges the safety notice. The app never diagnoses or recommends medication changes.
- Numeric validation bounds are data-entry safeguards, not clinical diagnostic thresholds. Have the bounds and all medical copy reviewed by a qualified clinician before release.
- This feature does not implement database encryption. SQLite persistence is not encryption. Before storing real health data in a public release, choose and verify an encryption/key-management approach.
- Demo defaults (120/80, pulse 72, left arm, sitting, morning) are explicitly marked as example defaults in code and should be removed or replaced with empty fields in a real first-use form if you don't want prefilled values.

## UX upgrade in this revision
- The main form prioritizes the two BP values and pulse. Optional metadata is collapsed by default to reduce cognitive load.
- “How to take a reading” explains quiet rest, posture, arm level, cuff placement and avoiding talking. This is general education, not a diagnosis.
- The 120/80 and pulse 72 defaults remain prototype-only; users must replace them with their own measurement before saving. For a real release, consider starting with blank values instead.
- English and Urdu helper copy is included. Validate Urdu typography and true RTL direction in the full app shell on real Android devices.

## Suggested tests
- blank, non-integer, negative and extreme inputs
- systolic <= diastolic confirmation
- high-reading safety acknowledgement
- past/future date/time behavior
- repeated Save taps
- SQLite initialization failure and write failure
- Urdu RTL layout on a physical Android device
- app restart persistence
