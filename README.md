# Nyumban Field Inspector App

A React Native (Expo) application for property field agents to perform inspections in low-connectivity environments. Built for the Nyumban Technical Assessment.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (LTS recommended)
- [Expo Go](https://expo.dev/client) app on your mobile device

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App
1. Start the Expo development server:
   ```bash
   npm start
   ```
2. Scan the QR code with your **Expo Go** app (Android) or Camera app (iOS).

> **Note:** The app is configured to use the Nyumban assessment API. The Assessment Key is pre-configured in `src/data/api/client.ts`.

---

## Decisions & Architecture

### 1. Offline-First via Queueing
Field agents often work in areas with zero reception. Instead of failing requests, I implemented a robust **Background Sync Queue**. 
- **Forks in the road:** I considered using a library like `react-query` or `RTK Query` for offline caching. However, for a specialized tool where data integrity is paramount (e.g., not losing a 20-photo inspection), I decided to build a custom `SyncEngine` with `AsyncStorage` persistence. This gives full control over the dependency order (ensuring photos upload before the inspection report).

### 2. Optimistic Concurrency & Conflicts
The server is the source of truth. If two agents edit the same unit, the server rejects the second write (409 Conflict).
- **Strategy:** I implemented a manual resolution flow in the "Sync Queue" panel. Agents can see exactly what failed and choose to "Override" (re-sync with server version) or "Discard" their changes. This ensures the agent is never "lied to" about what was saved.

### 3. Image Handling
Images are stored as local URIs until synced. I enabled multiple image selection in the inspection screen to speed up the workflow for agents.

---

## What was Cut (and Why)

1. **Native Camera UI:** I used `expo-image-picker` instead of building a custom camera UI with `expo-camera`. Building a custom camera that handles all edge cases (aspect ratios, flash, gallery integration) would have taken ~4 hours that I felt were better spent on the sync logic and offline stability.
2. **Advanced Filtering:** I implemented basic Search and Region/Status filters. More complex filters (by date range or agent assigned) were cut to ensure the core inspection flow was rock solid.
3. **Automated Conflict Merging:** Currently, a 409 requires manual intervention. In a production app, I would implement field-level merging (e.g., if Agent A changed the living room and Agent B changed the kitchen, both could be merged automatically).

---

## Known Bugs

1. **Large Image Uploads:** On very low-end devices, selecting 10+ high-res images at once might cause a memory spike during the `FormData` creation.
2. **Keyboard Avoidance:** In the `InspectionScreen`, the keyboard sometimes obscures the "Next" button on smaller screens despite using `KeyboardAvoidingView` (ongoing tuning).

---

## Testing
The project uses **Jest** and **React Native Testing Library**.

Run tests with:
```bash
npm test
```
- **Login Flow:** Verified input handling, demo login, and navigation state.
- **Portfolio Screen:** Verified property list rendering, empty states, and offline status integration.
- **Mocking:** Implemented a robust test environment in `jest.setup.js` to handle React Native animations, Async Storage, and navigation.
- **Offline Reliability:** Fixed several bugs in component cleanup (subscriptions and animations) discovered during unit testing to ensure the app remains stable on low-end devices.
