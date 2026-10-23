
# Manual QA checklist

- [ ] Screen loads without network access.
- [ ] 120/80 and pulse 72 are visibly marked as example defaults in this prototype.
- [ ] Save creates exactly one row in SQLite.
- [ ] Fast repeated taps do not create duplicate rows.
- [ ] Blank systolic or diastolic blocks save.
- [ ] Non-integer, zero, negative, and configured out-of-range values show clear errors.
- [ ] Systolic <= diastolic requires explicit confirmation.
- [ ] Systolic > 180 or diastolic > 120 opens the safety guidance before save.
- [ ] The safety message does not diagnose or recommend medication changes.
- [ ] Date/time can be changed and future time is rejected.
- [ ] Localized date display is readable in English and Urdu.
- [ ] Urdu RTL is tested on physical Android and iOS devices.
- [ ] Save failure shows an error and doesn't claim success.
- [ ] App restart preserves the saved reading.
- [ ] The app's production database encryption strategy has been selected and verified.

