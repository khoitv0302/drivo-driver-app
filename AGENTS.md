# Drivo Driver App — Agent Instructions

## Before writing any code

- Read Expo SDK 54 docs at https://docs.expo.dev/versions/v54.0.0/ for any Expo API
- Read NativeWind v4 docs at https://www.nativewind.dev/v4/overview for styling
- Read TanStack Query v5 docs at https://tanstack.com/query/v5 for data fetching
- Never guess API signatures — always verify from versioned docs
- This app is the driver-facing twin of `drivo-customer-app` — reuse the same tech stack, folder structure, and conventions. Only business logic differs.

---

## Tech Stack

| Layer | Library | Version |
|-------|---------|---------|
| Framework | Expo | ~54.0.0 |
| Language | TypeScript | ~5.9.2 |
| UI | React Native + NativeWind v4 | 0.81.5 / ^4.1 |
| Styling | TailwindCSS | ^3.4 |
| Data fetching | TanStack Query | ^5 |
| Navigation | React Navigation | ^7 |
| Global state | Zustand | ^5 |
| HTTP client | Axios | ^1.7 |
| Maps | @rnmapbox/maps | ^10.3 |

---

## Folder Structure

```
src/
├── features/          # Feature modules — primary location for all business logic
│   └── [feature]/
│       ├── api/       # useQuery/useMutation hooks calling the API
│       ├── components/# UI components scoped to this feature only
│       ├── hooks/     # Business logic hooks (non-API)
│       ├── screens/   # Full screens registered in navigation
│       ├── types.ts   # TypeScript types scoped to this feature
│       └── index.ts   # Public exports — only import features through here
│
├── shared/
│   ├── components/
│   │   ├── ui/        # Design system primitives: Button, Input, Badge, ...
│   │   └── layout/    # Screen wrappers, SafeContainer, ...
│   ├── hooks/         # Cross-feature hooks: useDebounce, useAppState, ...
│   └── utils/         # Pure functions: formatCurrency, formatDate, ...
│
├── services/
│   ├── api/
│   │   ├── client.ts       # Single Axios instance — base URL, timeout, headers
│   │   ├── interceptors.ts # Attach token, handle 401, log errors
│   │   └── types.ts        # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   ├── storage/        # AsyncStorage abstraction
│   ├── location/       # GPS / maps SDK wrapper
│   └── notifications/  # Push notification setup
│
├── navigation/
│   ├── RootNavigator.tsx    # Auth gate: unauthenticated vs main app
│   └── types.ts             # RootStackParamList and all param lists
│
├── store/              # Zustand stores — global client state only
│   ├── auth.store.ts   # Authenticated driver, token
│   └── index.ts
│
├── constants/
│   ├── routes.ts       # Route name constants — no magic strings in navigation
│   ├── config.ts       # API_URL, timeouts, feature flags
│   └── theme.ts        # Brand colors, spacing scale, font sizes
│
└── types/
    ├── models.ts       # Domain models: Driver, Trip, Vehicle, Earning, ...
    └── common.ts       # Shared generics: Nullable<T>, LoadingState, ...
```

---

## Coding Rules

### Imports
- Always use path aliases — never relative paths with `../../`
- `@features/*` → `src/features/*`
- `@shared/*` → `src/shared/*`
- `@services/*` → `src/services/*`
- `@navigation/*` → `src/navigation/*`
- `@store/*` → `src/store/*`
- `@constants/*` → `src/constants/*`
- `@types/*` → `src/types/*`

### Features
- Features **never import from each other** — if code is needed by 2+ features, move it to `shared/` or `types/`
- Every feature **must have `index.ts`** — external code imports only from `index.ts`, never from internal paths
- Screens are thin: delegate all logic to hooks, render only JSX

### Styling (NativeWind v4)
- Use `className` for all styling — do not use `StyleSheet.create` in new code
- Use `tailwind.config.js` theme extensions for brand values (colors, spacing)
- Never use inline styles (`style={{ ... }}`) unless for dynamic values that Tailwind cannot express

### Data Fetching (TanStack Query v5)
- All server state lives in Query — never duplicate server data into Zustand
- Queries live in `features/[name]/api/` as custom hooks (`useGetTripRequests`, `useAcceptTrip`)
- Always type `useQuery<ResponseType, ErrorType>` explicitly
- Use `queryClient.invalidateQueries` after mutations — never manually update cache

### Global State (Zustand)
- Zustand stores hold **client-only** state: auth token, driver online/offline status, UI state
- Do not store server data in Zustand — that is Query's responsibility
- Each store file exports one `useXxxStore` hook

### TypeScript
- No `any` — use `unknown` and narrow with type guards
- Domain model types go in `src/types/models.ts` if shared across features
- Feature-local types go in `src/features/[name]/types.ts`
- Navigation param types must all be declared in `src/navigation/types.ts`

### API Layer
- All HTTP calls go through `services/api/client.ts` — never `fetch` directly
- Feature API hooks in `features/[name]/api/` call service functions — they do not call Axios directly
- Error handling is centralized in `interceptors.ts` — feature code should not re-handle 401/403/5xx

---

## Current Features

| Feature | Status | Description |
|---------|--------|--------------|
| _(none yet)_ | — | Project is an empty scaffold — first feature (likely `auth`) not yet started |

---

## Adding a New Feature Checklist

1. Create `src/features/[name]/` with: `api/`, `components/`, `hooks/`, `screens/`, `types.ts`, `index.ts`
2. Add domain model types to `src/types/models.ts` if shared
3. Add screens to the appropriate navigator in `src/navigation/` (replace `BootstrapScreen` once a real entry screen exists)
4. Add route name constants to `src/constants/routes.ts`
5. Export only what other parts of the app need via `index.ts`

---

## Environment

- **Platform**: iOS + Android (Expo managed workflow)
- **Min Expo Go SDK**: 54
- **Entry point**: `index.ts` → `App.tsx`
- **CSS entry**: `global.css` imported at top of `App.tsx`
- **Path aliases**: configured in `tsconfig.json`
- **Bundle ID / package**: `com.thanhtv62929.drivodriverapp`
