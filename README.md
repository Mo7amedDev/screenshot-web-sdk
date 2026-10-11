# screenshot-sdk

TypeScript SDK for the `screenshot-api` service. Works in Next.js (App Router & Pages), Node.js, and plain React.

---

## Installation

Install the package from npm:

```bash
npm install screenshot-web-sdk
```

---

## Quick start

```ts
import { createScreenshotClient } from 'screenshot-web-sdk';

const screenshot = createScreenshotClient({
  baseUrl: process.env.SCREENSHOT_API_URL!, // e.g. 'http://localhost:3000'
});
```

---

## Client-side usage (React / Next.js Client Components)

### Take a website screenshot

```tsx
'use client';

import { createScreenshotClient, useWebsiteScreenshot } from 'screenshot-web-sdk';

const client = createScreenshotClient({ baseUrl: '/api/screenshot-proxy' });

export function WebCapture() {
  const { data, loading, error, capture, reset } = useWebsiteScreenshot(client, {
    url: 'https://example.com',
    width: 1280,
    format: 'png',
  });

  return (
    <div>
      <button onClick={() => capture()} disabled={loading}>
        {loading ? 'Capturing...' : 'Take Screenshot'}
      </button>

      {error && <p style={{ color: 'red' }}>{error.message}</p>}

      {data && (
        <>
          {/* data.url is an object URL — works directly in <img /> */}
          <img src={data.url} alt="Screenshot" />

          <button onClick={reset}>Clear</button>

          {/* Download the screenshot */}
          <a href={data.url} download={`screenshot.${data.format}`}>
            Download
          </a>
        </>
      )}
    </div>
  );
}
```

### Render HTML to an image

```tsx
'use client';

import { createScreenshotClient, useHtmlScreenshot } from 'screenshot-web-sdk';

const client = createScreenshotClient({ baseUrl: '/api/screenshot-proxy' });

const OG_CARD = `
  <div style="display:flex; flex-direction:column; width:1200px; height:630px;
              background:#0f172a; color:white; padding:80px; justify-content:center;">
    <h1 style="font-size:64px; font-weight:800; margin:0;">Hello World</h1>
    <p style="font-size:32px; color:#94a3b8; margin-top:24px;">Generated with screenshot-sdk</p>
  </div>
`;

export function OgPreview() {
  const { data, loading, error, capture } = useHtmlScreenshot(client, {
    htmls: [OG_CARD],
    width: 1200,
    height: 630,
    format: 'png',
    immediate: true, // render on mount automatically
  });

  if (loading) return <p>Rendering...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return data ? <img src={data.url} alt="OG Card Preview" /> : null;
}
```

### Capture screenshot and save to a persistent URL

```tsx
'use client';

import { createScreenshotClient, useScreenshotToUrl } from 'screenshot-web-sdk';

const client = createScreenshotClient({ baseUrl: '/api/screenshot-proxy' });

export function SaveCapture() {
  const { data, loading, error, captureWebsite } = useScreenshotToUrl(client);

  const handleCapture = () => {
    captureWebsite({
      url: 'https://github.com',
      format: 'webp',
      quality: 85,
      fullPage: true,
    });
  };

  return (
    <div>
      <button onClick={handleCapture} disabled={loading}>
        {loading ? 'Saving...' : 'Capture & Save'}
      </button>

      {data?.results.map((r) => (
        <div key={r.filename}>
          <a href={r.url} target="_blank" rel="noreferrer">{r.url}</a>
        </div>
      ))}
    </div>
  );
}
```

---

## Server-side usage (Next.js Route Handlers & Server Actions)

### Route Handler — stream image directly to browser

```ts
// app/api/screenshot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createScreenshotClient } from 'screenshot-web-sdk';

const client = createScreenshotClient({
  baseUrl: process.env.SCREENSHOT_API_URL!,
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  const buffer = await client.screenshotWebsiteBuffer({
    url: body.url,
    format: 'png',
    width: 1280,
    waitForImages: true,
  });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
```

### Route Handler — OG image generation

```ts
// app/api/og/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createScreenshotClient } from 'screenshot-web-sdk';

const client = createScreenshotClient({
  baseUrl: process.env.SCREENSHOT_API_URL!,
});

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title') ?? 'Untitled';
  const description = req.nextUrl.searchParams.get('description') ?? '';

  const html = `
    <div style="display:flex; flex-direction:column; width:1200px; height:630px;
                background:linear-gradient(135deg,#667eea,#764ba2);
                color:white; padding:80px; justify-content:flex-end;">
      <h1 style="font-size:56px; font-weight:800; margin:0; line-height:1.1;">
        ${title}
      </h1>
      <p style="font-size:28px; margin-top:20px; opacity:0.85;">
        ${description}
      </p>
    </div>
  `;

  const buffer = await client.screenshotHtmlBuffer({
    htmls: [html],
    width: 1200,
    height: 630,
    format: 'png',
  });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
```

Use it in your metadata:

```ts
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }: { params: { slug: string } }) {
  return {
    openGraph: {
      images: [`/api/og?title=My+Post&description=Some+description`],
    },
  };
}
```

### Server Action — capture and save, return URL

```ts
// app/actions/screenshot.ts
'use server';

import { createScreenshotClient } from 'screenshot-web-sdk';

const client = createScreenshotClient({
  baseUrl: process.env.SCREENSHOT_API_URL!,
});

export async function captureAndSave(url: string): Promise<string[]> {
  const result = await client.screenshotWebsiteToUrl({
    url,
    format: 'webp',
    quality: 90,
    waitUntil: 'networkidle',
  });

  return result.results.map((r) => r.url);
}
```

```tsx
// app/some-page.tsx
'use client';
import { captureAndSave } from '@/app/actions/screenshot';

export function CaptureButton({ url }: { url: string }) {
  const handleClick = async () => {
    const urls = await captureAndSave(url);
    console.log('Saved at:', urls);
  };

  return <button onClick={handleClick}>Save Screenshot</button>;
}
```

---

## Storage management

### Using the `useStorage` hook (React)

```tsx
'use client';

import { createScreenshotClient, useStorage } from 'screenshot-web-sdk';

const client = createScreenshotClient({ baseUrl: '/api/screenshot-proxy' });

export function StorageDashboard() {
  const { stats, files, fetchStats, fetchFiles, deleteFile } = useStorage(client);

  return (
    <div>
      <button onClick={fetchStats}>Load Stats</button>
      {stats.data && (
        <p>Total files: {stats.data.count} ({Math.round(stats.data.size / 1024 / 1024)} MB)</p>
      )}

      <button onClick={() => fetchFiles({ limit: 10 })}>List Files</button>
      <ul>
        {files.data?.files.map(file => (
          <li key={file}>
            {file} 
            <button onClick={() => deleteFile(file)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Recommended: Proxy setup for client components

Never expose your internal `SCREENSHOT_API_URL` to the browser. Add a thin proxy route:

```ts
// app/api/screenshot-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM = process.env.SCREENSHOT_API_URL!;

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/screenshot-proxy', '');
  const body = await req.text();

  const upstream = await fetch(`${UPSTREAM}${path || '/screenshot/website'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
    },
  });
}
```

Then in client components use `baseUrl: '/api/screenshot-proxy'`.

---

## API reference

### `createScreenshotClient(config)`

| Option | Type | Description |
|--------|------|-------------|
| `baseUrl` | `string` | Base URL of your screenshot-api instance |
| `timeout` | `number` | Request timeout in ms. Default: `30000` |
| `headers` | `Record<string,string>` | Custom headers sent with every request |

### `client.screenshotWebsite(options)` → `Promise<ImageResult>`
### `client.screenshotHtml(options)` → `Promise<ImageResult>`

Returns an `ImageResult`:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'image'` | Discriminant |
| `blob` | `Blob` | Raw binary data |
| `url` | `string` | Object URL — use directly in `<img src>` |
| `format` | `ImageFormat` | `'png' \| 'jpeg' \| 'webp'` |
| `revoke()` | `() => void` | Free memory when image is no longer needed |

### `client.screenshotWebsiteToUrl(options)` → `Promise<UrlResult>`
### `client.screenshotHtmlToUrl(options)` → `Promise<UrlResult>`

Returns a `UrlResult`:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'url'` | Discriminant |
| `count` | `number` | Number of images saved |
| `format` | `ImageFormat` | Output format |
| `results` | `SavedImage[]` | `{ url, filename }` per image |

### `client.screenshotWebsiteBuffer(options)` → `Promise<Buffer>` *(Node.js only)*
### `client.screenshotHtmlBuffer(options)` → `Promise<Buffer>` *(Node.js only)*

For Route Handlers and Server Actions.

### `client.getStorageStats()` → `Promise<StorageStats>`
### `client.listStorageFiles(options)` → `Promise<StorageListResult>`
### `client.deleteStorageFile(filename)` → `Promise<StorageDeleteResult>`

Methods for managing files in the persistent storage.

---

## Environment variables

```env
# .env.local
SCREENSHOT_API_URL=http://localhost:3000
```

For Docker Compose setups where Next.js and screenshot-api share a network:

```env
SCREENSHOT_API_URL=http://screenshot-api:3000
```
