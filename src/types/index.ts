// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ReturnType = 'image' | 'url';
export type WaitUntil = 'domcontentloaded' | 'load' | 'networkidle';

// ─────────────────────────────────────────────────────────────────────────────
// Website screenshot
// ─────────────────────────────────────────────────────────────────────────────

export interface WebsiteScreenshotOptions {
  /** Target URL. Protocol optional — https:// added if missing. */
  url: string;
  /** CSS selector to capture specific element(s). Omit for full page. */
  selector?: string;
  /** Viewport width in px. Default: 1280 */
  width?: number;
  /** Viewport height in px. Default: 800 */
  height?: number;
  /** Capture full scrollable page. Default: false */
  fullPage?: boolean;
  /** Output format. Default: 'png' */
  format?: ImageFormat;
  /** Compression quality 1–100 (jpeg/webp only). Default: 90 */
  quality?: number;
  /** Max number of elements to capture when using a selector. */
  limit?: number;
  /** How to wait for page load. Default: 'load' */
  waitUntil?: WaitUntil;
  /** CSS selector to wait for before screenshotting (useful for JS-rendered content). */
  waitFor?: string;
  /** Fixed delay in ms after page load. Max 30000. */
  waitMs?: number;
  /** Wait for all images to decode before screenshot. Default: true */
  waitForImages?: boolean;
  /** Block common ad/tracker domains. Default: true */
  blockAds?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML screenshot
// ─────────────────────────────────────────────────────────────────────────────

export interface HtmlScreenshotOptions {
  /** One or more HTML strings to render. Multiple are stitched vertically. */
  htmls: string[];
  /** Canvas width in px. Default: 1200 */
  width?: number;
  /** Canvas height in px. Default: 630 */
  height?: number;
  /** Output format. Default: 'png' */
  format?: ImageFormat;
  /** Compression quality 1–100 (jpeg/webp only). Default: 90 */
  quality?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Return value shapes
// ─────────────────────────────────────────────────────────────────────────────

/** Returned when returnType is 'image' — raw binary blob */
export interface ImageResult {
  type: 'image';
  blob: Blob;
  /** Object URL — pass directly to <img src={...} /> */
  url: string;
  format: ImageFormat;
  /** Call this when the component unmounts to free memory */
  revoke: () => void;
}

/** Single URL entry returned when returnType is 'url' */
export interface SavedImage {
  url: string;
  filename: string;
}

/** Returned when returnType is 'url' */
export interface UrlResult {
  type: 'url';
  count: number;
  format: ImageFormat;
  results: SavedImage[];
}

export type ScreenshotResult = ImageResult | UrlResult;

// ─────────────────────────────────────────────────────────────────────────────
// SDK client config
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenshotClientConfig {
  /** Base URL of your screenshot-api instance. e.g. 'http://localhost:3000' */
  baseUrl: string;
  /** Request timeout in ms. Default: 30000 */
  timeout?: number;
  /** Custom headers to attach to every request (e.g. Authorization). */
  headers?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook state (for React hooks)
// ─────────────────────────────────────────────────────────────────────────────

export interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export type UseScreenshotState<T extends ScreenshotResult = ScreenshotResult> = RequestState<T>;

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageStats {
  count: number;
  size: number;
}

export interface StorageListResult {
  files: string[];
  limit: number;
  offset: number;
}

export interface StorageDeleteResult {
  success: boolean;
  message: string;
}
