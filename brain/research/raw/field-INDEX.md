# Field Intelligence — Index (CP123 Wave-R, June 2026)

Mined from production postmortems, expo/eas-cli + expo/expo issue trackers, maintainer docs, and
attributed engineer opinions. Currency: June 2026. Every claim in each file carries URL + date.

| File | Covers |
| --- | --- |
| `field-store-review-ai-apps-2026.md` | App-Store review reality for AI/agent apps: 2026-06-09 guideline update (4.3b/1.2/4.5.3), the vibe-coding crackdown (Replit/Vibecode/"Anything" by Dhruv Amin pulled under Guideline 2.5.2), 4.3 spam, 4.2.6 template apps, appeal mechanics. |
| `field-eas-build-failures-2026.md` | Real EAS Build failures at scale: "Prepare project"/tar infra failures (#3529/#3532/#3449), eas-cli version regressions (#3754/#3749/#3764), VisionCamera/NitroModules vs forced Xcode 26 beta (#3616), Node-version coupling (#3589), official troubleshooting causes (Gradle OOM, filename case, gitignore). |
| `field-ota-update-boundaries-2026.md` | OTA boundaries + bricking: JS/asset-only = Apple 2.5.2 wall; runtimeVersion/fingerprint gotchas; the 100%-repro OTA-activation crash on SDK 54+55 New-Arch (#45772); the 10-second auto-rollback limit; CodePush dead. |
| `field-migration-war-stories-2026.md` | Migration timelines + breakage: 12-day 2-dev New-Arch migration (named lib version breaks), 2–8wk range, Fabric view-flattening null refs / white screen, Reanimated 3→4 (worklets split, withSpring ×1.5), RN 0.85 removed APIs, bare→Expo prebuild traps. |
| `field-pwa-vs-native-2026.md` | When PWA suffices vs native mandatory: "3+ → native" rule, 40-60% cost delta, exact iOS limits (push home-screen-only + EU-blocked, 7-day eviction, 50MB cap, no background sync, no BLE/NFC), agent-app implications. |
| `field-taste-disagreements-2026.md` | Verbatim attributed TASTE; 3 genuine source disagreements (bare-vs-Expo, OTA-aggressiveness-vs-compliance, "New-Arch done"-vs-long-tail) both sides; 10 specific 2025→2026 invalidations. |

Sibling ecosystem-*.md files in this dir are owned by the parallel ecosystem researcher — not
touched here.
