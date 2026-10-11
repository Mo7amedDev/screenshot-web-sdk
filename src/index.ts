// ─────────────────────────────────────────────────────────────────────────────
// screenshot-sdk — main entry point
// ─────────────────────────────────────────────────────────────────────────────

export { ScreenshotClient, ScreenshotApiError } from './client';

export type {
  // Config
  ScreenshotClientConfig,
  // Options
  WebsiteScreenshotOptions,
  HtmlScreenshotOptions,
  // Results
  ImageResult,
  UrlResult,
  SavedImage,
  ScreenshotResult,
  // Shared primitives
  ImageFormat,
  ReturnType,
  WaitUntil,
  // Hook state shapes
  UseScreenshotState,
} from './types';

// React hooks — only imported when needed (tree-shakeable)
export {
  useWebsiteScreenshot,
  useHtmlScreenshot,
  useScreenshotToUrl,
} from './hooks';

export type {
  UseWebsiteScreenshotOptions,
  UseWebsiteScreenshot,
  UseHtmlScreenshotOptions,
  UseHtmlScreenshot,
  UseScreenshotToUrlState,
} from './hooks';

// ─────────────────────────────────────────────────────────────────────────────
// Convenience factory
// ─────────────────────────────────────────────────────────────────────────────

import { ScreenshotClient } from './client';
import type { ScreenshotClientConfig } from './types';

/**
 * Create a pre-configured ScreenshotClient instance.
 *
 * @example
 * const screenshot = createScreenshotClient({ baseUrl: 'http://localhost:3000' });
 * const result = await screenshot.screenshotWebsite({ url: 'https://example.com' });
 */
export function createScreenshotClient(config: ScreenshotClientConfig): ScreenshotClient {
  return new ScreenshotClient(config);
}
