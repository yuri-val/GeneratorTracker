# Generator Tracker

A mobile app for tracking generator operating hours and fuel refills. Built with React Native and Expo.

## Features

- ⚡ Track multiple generators
- ▶️ Quick Start/Stop buttons for active work sessions
- 📝 Log work sessions with start/end times
- ⏱️ Real-time tracking of active sessions
- ⛽ Record fuel refills
- 📊 View analytics and statistics
- 🌓 Dark mode support
- 💾 Local data storage

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo Go app on your mobile device (for testing)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your device:
- Scan the QR code with Expo Go (Android) or Camera app (iOS)
- Or press `i` for iOS simulator or `a` for Android emulator

## Usage

### Adding a Generator

1. Tap the **+** button on the Home screen
2. Enter generator name, model (optional), and purchase date
3. Tap **Save**

### Quick Start/Stop Work Sessions

**Quick Start:**
1. Tap on a generator card
2. Tap the big **▶ START SESSION** button
3. The session begins immediately with the current time
4. A green card shows the active session with elapsed time

**Stop Session:**
1. While a session is running, tap the **⏹ STOP** button
2. The session ends with the current time
3. Hours are automatically calculated

**Edit Active Session:**
1. Tap the **Edit** button on the active session card
2. Modify start time, end time, date, or add notes
3. Saving will complete the session

### Manual Work Session Entry

1. Tap on a generator card
2. In the **Work Sessions** section, tap **+ Add**
3. Enter date, start time, and end time
4. Duration is calculated automatically
5. Tap **Save**

### Recording Refills

1. Tap on a generator card
2. In the **Refills** section, tap **+ Add**
3. Enter date and fuel amount (in liters)
4. Tap **Save**

### Viewing Analytics

1. Tap the **Analytics** tab at the bottom
2. View total generators, operating hours, fuel used, and averages

### Editing Items

- **Edit Generator**: (Coming soon)
- **Edit Work Session**: Tap on any work session item to edit it
- **Edit Refill**: (Coming soon)

### Deleting Items

- **Delete Generator**: Open generator detail → tap **Delete** (top-right)
- **Delete Work Session**: Long-press on a work session item
- **Delete Refill**: Long-press on a refill item

## Project Structure

```
src/
├── components/        # Reusable components (future)
├── constants/        # Colors and theme constants
├── models/          # TypeScript interfaces
├── navigation/      # Navigation types
├── screens/         # App screens
│   ├── home/       # Home screen
│   ├── generator/  # Generator-related screens
│   └── analytics/  # Analytics screen
└── utils/          # Helper functions and storage
```

## Data Storage

All data is stored locally on your device using AsyncStorage. Data persists between app sessions.

### Data Models

- **Generator**: id, name, model, purchaseDate
- **WorkSession**: id, generatorId, date, startTime, endTime, hours, notes
- **Refill**: id, generatorId, date, amount, notes

## Technologies

- React Native (Expo)
- TypeScript
- React Navigation (Bottom Tabs + Stack)
- AsyncStorage
- Native date/time inputs

## Future Enhancements

- Date/time pickers (native components)
- Charts for fuel consumption trends
- Data export (CSV/JSON)
- Backup/restore functionality
- Service reminders
- Multiple fuel types
- Cost tracking

## Development

### Building

See [BUILD.md](BUILD.md) for detailed build instructions.

```bash
make build-preview      # Local preview build
make build-prod         # Local production build
make eas-build-preview  # Remote preview build
make eas-build-prod     # Remote production build
```

### Versioning

This project follows [Semantic Versioning](https://semver.org/). See [VERSIONING.md](VERSIONING.md) for details.

```bash
make version-patch  # Bug fixes (x.y.Z)
make version-minor  # New features (x.Y.0)
make version-major  # Breaking changes (X.0.0)
```

## License

MIT
