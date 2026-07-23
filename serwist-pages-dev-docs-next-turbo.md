[Skip to main content](https://serwist.pages.dev/docs/next/turbo#main-content)

# Turbopack

This quick guide is meant for Turbopack. If you are using webpack, head to [the webpack quick guide](https://serwist.pages.dev/docs/next/getting-started). Alternatively,
see if [configurator mode](https://serwist.pages.dev/docs/next/config) suits your use case more.

## Install

Run the following command:

npm yarn pnpm bun

```
npm i -D @serwist/turbopack esbuild serwist
```

## Implementation

### Step 1: Update your Next.js config

Update or create your Next.js configuration file with the following content:

next.config.mjs

```
import { withSerwist } from "@serwist/turbopack";

export default withSerwist({
  // Your Next.js configuration
});
```

### Step 2: Setup Serwist’s Route Handler

Add the following route to enable Serwist:

app/serwist/\[path\]/route.ts

```
import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
// If you are using Next.js versions older than 15.0.0, add the
// `nextConfig` option so that Serwist can configure the service
// worker according to your options. Serwist 10 and newer will
// only support Next.js 15.0.0 and above.
// import nextConfig from "$cwd/next.config.mjs";

// This is optional!
// A revision helps Serwist version a precached page. This
// avoids outdated precached responses being used. Using
// `git rev-parse HEAD` might not the most efficient way
// of determining a revision, however. You may prefer to use
// the hashes of every extra file you precache.
const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout ?? crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "app/sw.ts",
  // nextConfig,
  // If set to `false`, Serwist will attempt to use `esbuild-wasm`.
  useNativeEsbuild: true,
});
```

### Step 3: Create a service worker

Here is a basic service worker template to get Serwist up and running:

app/sw.ts

```
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [\
      {\
        url: "/~offline",\
        matcher({ request }) {\
          return request.destination === "document";\
        },\
      },\
    ],
  },
});

serwist.addEventListeners();
```

### Step 4: Add a web application manifest

Update app/manifest.json (App Router) or public/manifest.json (Pages Router) with the following content:

manifest.json

```
{
  "name": "My Awesome PWA app",
  "short_name": "PWA App",
  "icons": [\
    {\
      "src": "/icons/android-chrome-192x192.png",\
      "sizes": "192x192",\
      "type": "image/png",\
      "purpose": "maskable"\
    },\
    {\
      "src": "/icons/icon-512x512.png",\
      "sizes": "512x512",\
      "type": "image/png"\
    }\
  ],
  "theme_color": "#FFFFFF",
  "background_color": "#FFFFFF",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait"
}
```

### Step 5: Add metadata and SerwistProvider

Add the following content to app/layout.tsx and/or pages/\_app.tsx:

app/layout.tsx pages/\_app.tsx

```
import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

const APP_NAME = "PWA App";
const APP_DEFAULT_TITLE = "My Awesome PWA App";
const APP_TITLE_TEMPLATE = "%s - PWA App";
const APP_DESCRIPTION = "Best PWA app in the world!";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head />
      <body>
        <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
      </body>
    </html>
  );
}
```