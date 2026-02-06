# Version 2.2.0 - February 6, 2026

## Overview
This update introduces comprehensive localization and improved data entry components, making Generator Tracker more accessible and easier to use.

## What's New
- **Multi-language Support**: Full application translation in English and Ukrainian.
- **Language Selection**: Manually pick your preferred language in the Settings screen. Your choice is remembered across app restarts.
- **Native Date & Time Pickers**: Say goodbye to manual typing! We've integrated native calendar and clock pickers for all date and time fields.
- **Localized Formatting**: Dates and times now automatically adapt to your selected language (e.g., Ukrainian users will see dates like "26 січ. 2026 р.").
- **Improved Forms**: The Add Generator, Add Work Session, and Add Refill screens have been redesign to support the new pickers and provide a smoother experience.

## Technical Improvements
- Integrated `i18next` for robust translation management.
- Added `@react-native-community/datetimepicker` for native platform interaction.
- Enhanced storage utilities to persist user language preferences locally.
