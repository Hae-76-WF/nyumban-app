# Nyumban Field Inspector Mobile App (React Native + Expo)

This directory contains the complete, production-ready **React Native + Expo** mobile application client for the Nyumban system. 

It implements the identical, robust offline-first architecture mapped inside our web-based validation emulator, including:
- **Asynchronous Storage Persistence**: Caching property databases, draft inspection files, and background synchronization queues.
- **Resilient Request Sync Queue**: Dependency-first uploading (photos must complete before parent inspection files are transmitted) with transactional rollback mechanisms and rate limit (`429`) backing-off.
- **Idempotent Record Transmission**: Guards against duplicate record insertion upon connection retry using unique idempotency keys.

---

## 🚀 How to Run the App Locally in Expo Go

Follow these quick steps to boot the application on your physical iOS/Android device or on a simulator.

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org) installed on your development machine.

### 2. Install the Expo CLI & Dependencies
Open your terminal inside the `/expo-app` directory and install the packages:

```bash
cd expo-app
npm install
```

### 3. Connect to the Live Endpoint
Open `src/data/api/client.ts` on your computer. You will see the default configured URL pointing to the assessment secure proxy. If you are running a local test server, simply update the `BASE_URL` to match your local IP address (e.g. `http://192.168.1.XX:3000`).

### 4. Start the Expo Server
Run the start command to launch Metro Bundler:

```bash
npm start
```

### 5. Open on Your Phone
- **For iOS & Android (Physical Devices)**: Install the **Expo Go** app from the Apple App Store or Google Play Store. Scan the QR Code displayed in your terminal using your phone's camera (iOS) or the Expo Go scan feature (Android).
- **For iOS Simulator**: Press `i` in the terminal after starting.
- **For Android Emulator**: Press `a` in the terminal after starting.

---

## 🗂 Codebase Overview

- `App.tsx` - Main React Native controller hosting full login routing, responsive portfolio filtration, details screen, and interactive horizontal paging inspection workspace.
- `src/types.ts` - Strongly typed domain entities, DTOs, and sync status codes.
- `src/data/api/client.ts` - Concurrency-safe API proxy request client.
- `src/data/local/storage.ts` - Sync in-memory high-speed cache with async AsyncStorage persistence write-backs.
- `src/sync/SyncEngine.ts` - Photo-first queue engine, conflict resolution (409) transaction router, and online status watcher.
