# ecosystem-07 — Push Notifications (expo-notifications vs native)

> `expo-notifications@56.0.17` (npm-verified 2026-06-11). Two big shifts since training:
> (1) **remote push removed from Expo Go**, (2) **FCM v1 is now mandatory for Android**.

## Two architectures

### A) Expo Push Service (the managed path — default for Expo apps)
Expo abstracts FCM + APNs behind one API. You send to the **Expo Push API** with an **Expo push
token** (`ExponentPushToken[…]`); Expo queues + delivers to **FCM v1 (Android)** and **APNs (iOS)**.
You treat both platforms uniformly. Source:
[docs.expo.dev/push-notifications/overview](https://docs.expo.dev/push-notifications/overview/).

What you need:
1. **Expo push token** — from the app via `expo-notifications`.
2. **FCM v1 service account JSON** — for Android delivery (uploaded to EAS credentials).
3. **APNs key** — for iOS delivery (uploaded to EAS credentials).

### B) Native / raw FCM + APNs (bare or when you need provider features)
Talk to FCM v1 and APNs directly (or via `@react-native-firebase/messaging`). More control (data-only
messages, FCM topics, provider analytics) but you lose Expo's cross-platform uniformity and must
manage both transports yourself.

## ⚠️ Gotcha #1 — remote push removed from Expo Go (SDK 53+)

**Remote (push) notifications via `expo-notifications` are NOT available in Expo Go on Android from
SDK 53 onward. A development build is required.** SDK 52 and earlier let Expo Go use Expo's own push
credentials; SDK 53+ does not. **Local (in-app) notifications still work in Expo Go.** Source:
[docs.expo.dev/versions/latest/sdk/notifications](https://docs.expo.dev/versions/latest/sdk/notifications/),
[Courier — Expo Go Push Notifications guide](https://www.courier.com/blog/expo-notifications).

> Combined with the May-2026 Expo-Go App-Store situation (`ecosystem-03`), the practical rule is:
> **to test push you need a development build, full stop.** An agent that tries to verify push in
> Expo Go will get nothing and waste a cycle.

## ⚠️ Gotcha #2 — FCM v1 is mandatory for Android

Google **deprecated the legacy FCM protocol** and moved to the **FCM HTTP v1 API**, which requires
**OAuth via a Firebase service account**. After Expo migrated to v1, **a proper Firebase setup
(service-account key + project config) is mandatory for Android push.** A project that still assumes
the legacy server key will not deliver. Source:
[expo.dev/blog/expo-push-notifications-migrating-to-fcm-v1](https://expo.dev/blog/expo-push-notifications-migrating-to-fcm-v1),
[docs.expo.dev/push-notifications/sending-notifications-custom](https://docs.expo.dev/push-notifications/sending-notifications-custom/).

## The setup flow (what an agent actually does)

1. `npx expo install expo-notifications`.
2. **Android:** create a Firebase project, download the **service-account JSON**, upload to EAS
   credentials (`eas credentials`), add `google-services.json` to the project.
3. **iOS:** ensure an **APNs key** is on file (EAS can manage Apple credentials).
4. **Build a development build** (`eas build --profile development`) — push won't work in Expo Go.
5. In-app: request permission, then `getExpoPushTokenAsync()` → store the token server-side.
6. Send: POST to `https://exp.host/--/api/v2/push/send` with `{ to, title, body, data }`.

## iOS permission + entitlement notes
- iOS requires the **Push Notifications capability / aps-environment entitlement** — EAS handles this
  when credentials are set up, but a bare project must add it manually.
- iOS notification *permission* is a runtime prompt; request it at a sensible moment, not on cold start.

## Token lifecycle gotchas
- **Expo push tokens can rotate** — re-fetch on app launch and update your server; stale tokens
  silently fail.
- A token is tied to a specific build/credentials — a token from Expo Go (old SDK) won't work in a
  dev build and vice-versa.

## Local notifications (still simple, still Expo-Go-able)
`scheduleNotificationAsync()` for in-app reminders/alarms — no FCM/APNs, no dev build required, works
in Expo Go. Good for the harness's "remind me" style features that don't need a server.

## "Could not confirm"
- Whether the Expo Go **iOS** remote-push removal timing exactly matches the Android SDK-53 cutoff
  (the sources explicitly named **Android** SDK 53; iOS parity is implied by the "dev build required"
  framing but not separately dated in the sources read).
- Current Expo Push API rate limits / receipts-polling cadence (not covered in the overview page;
  check `docs.expo.dev/push-notifications/sending-notifications` + `/faq` before high-volume use).
