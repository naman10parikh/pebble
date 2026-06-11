# ecosystem-04 — expo-router: The Load-Bearing Routing Flows

> `expo-router@56.2.10` (npm-verified 2026-06-11). expo-router is file-based routing built on top
> of React Navigation v7. For Expo apps you use expo-router, **not** raw React Navigation.

## The mental model

The filesystem under `app/` **is** the route tree. Each file is a route; `_layout.tsx` files define
how the routes in a directory relate (stack vs tabs); special `+`-prefixed files handle edge cases.
Source: [docs.expo.dev/router/basics/notation](https://docs.expo.dev/router/basics/notation/),
[docs.expo.dev/router/basics/navigation-layouts](https://docs.expo.dev/router/basics/navigation-layouts/).

## File-notation reference (the conventions an agent must know)

| File | Maps to URL | Meaning |
|---|---|---|
| `app/index.tsx` | `/` | Directory default (every dir's `index` is its root) |
| `app/about.tsx` | `/about` | Static route |
| `app/users/[userId].tsx` | `/users/123` | **Dynamic segment** — value via `useLocalSearchParams()` |
| `app/products/[...rest].tsx` | `/products/a/b/c` | **Catch-all / rest segment** |
| `app/(home)/feed.tsx` | `/feed` | **Route group** — `(parens)` are organizational, **stripped from URL** |
| `app/profile/index.tsx` | `/profile` | Default route of `profile/` |
| `app/_layout.tsx` | — (not a page) | **Layout** — defines stack/tabs for its directory; root `_layout` boots the app |
| `app/+not-found.tsx` | any unmatched | 404 catch |
| `app/+html.tsx` | — (web) | Customizes web HTML boilerplate |
| `app/+native-intent.tsx` | — | Handles deep links / native intents |
| `app/+middleware.ts` | — | Runs pre-render logic (server) |

> **Route groups are the key organizational primitive.** `(auth)` and `(app)` let you split
> authenticated vs unauthenticated stacks *without* polluting the URL — e.g. `(auth)/login.tsx` →
> `/login`. This is how you gate flows (see auth pattern below). Source:
> [docs.expo.dev/router/basics/common-navigation-patterns](https://docs.expo.dev/router/basics/common-navigation-patterns/).

## The root `_layout.tsx` (boots the app)

```tsx
// app/_layout.tsx — initializes the entire app; usually a Stack at the root
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* group screens; (tabs) is a route group containing the tab navigator */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
```

## A Tabs layout

```tsx
// app/(tabs)/_layout.tsx — bottom tab bar over the screens in (tabs)/
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
```

A **Stack** `_layout` (`return <Stack>`) renders a header with a back button by default; navigating
to a dynamic route pushes it onto the stack. Source:
[docs.expo.dev/router/advanced/stack](https://docs.expo.dev/router/advanced/stack/).

## The classic auth-gate file structure

```
app/
  _layout.tsx            # root Stack; decides which group to show based on auth state
  (auth)/
    _layout.tsx          # Stack for unauthenticated screens
    login.tsx            # -> /login
    register.tsx         # -> /register
  (app)/
    _layout.tsx          # Tabs for the authenticated app
    index.tsx            # -> / (home)
    profile/
      [userId].tsx       # -> /profile/:userId
  +not-found.tsx
```

Redirect between groups with `<Redirect href="/login" />` or imperative `router.replace("/login")`.

## Typed routes (compile-time navigation safety)

expo-router ships **typed routes** — enable them and `router.push()` / `<Link href>` are typechecked
against the actual file tree, so a renamed/missing route is a **compile error, not a runtime crash**.
Enable via the `experiments.typedRoutes` flag in app config (it generates a `.expo/types` declaration).
Source: [docs.expo.dev/router/basics/notation](https://docs.expo.dev/router/basics/notation/) ("Type
safety is built in. Enable typed routes and catch navigation bugs at compile time").

> **Agent value:** typed routes turn a whole class of navigation bugs into build failures the agent
> can catch in `tsc`/`expo-doctor` before shipping. The harness should enable them by default.

## Newer expo-router capabilities (SDK 55+)

From the SDK 55 changelog: **Colors API, Apple Zoom transitions, `Stack.Toolbar`, experimental
SplitView**, plus the new default template's **Native Tabs API**. SDK 56's default template adds
**Expo UI** primitives. Source: [expo.dev/changelog/sdk-55](https://expo.dev/changelog/sdk-55),
[expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56).

## Reading params (the two hooks)

- `useLocalSearchParams()` — params for the **current** screen (most common).
- `useGlobalSearchParams()` — params from **anywhere** in the URL (re-renders on any param change;
  use sparingly — a known foot-gun for over-rendering).

## "Could not confirm"
- The exact current app-config key for enabling typed routes in SDK 56 (`experiments.typedRoutes` is
  the historically stable key; the live notation page confirmed the *feature* but not the exact key
  string for 56 — verify against `docs.expo.dev/router` before scaffolding).
- `[...rest]` catch-all syntax: the notation page read did not render the catch-all row explicitly
  (it noted "doesn't cover catch-all"); `[...rest].tsx` is the long-standing convention but confirm
  against the live "Notation" + "Shared routes" pages.
