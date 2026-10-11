import type {
  ScreenshotClientConfig,
  WebsiteScreenshotOptions,
  HtmlScreenshotOptions,
  ImageResult,
  UrlResult,
  ImageFormat,
  StorageStats,
  StorageListResult,
  StorageDeleteResult,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MIME: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Build an object URL from a binary response and return an ImageResult. */
async function toImageResult(response: Response, format: ImageFormat): Promise<ImageResult> {
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  return {
    type: 'image',
    blob,
    url: objectUrl,
    format,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

/** Parse a JSON response into a UrlResult. */
async function toUrlResult(response: Response, format: ImageFormat): Promise<UrlResult> {
  const json = await response.json();
  return {
    type: 'url',
    count: json.count,
    format,
    results: json.results,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ScreenshotClient
// ─────────────────────────────────────────────────────────────────────────────

export class ScreenshotClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(config: ScreenshotClientConfig) {
    this.baseUrl = stripTrailingSlash(config.baseUrl);
    this.timeout = config.timeout ?? 30_000;
    this.headers = config.headers ?? {};
  }

  // ── Internal fetch wrapper ────────────────────────────────────────────────

  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    queryParams?: Record<string, string | number>
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      let url = `${this.baseUrl}${path}`;
      if (queryParams) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, val]) => {
          params.append(key, String(val));
        });
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...this.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = `Screenshot API error: ${response.status} ${response.statusText}`;
        try {
          const err = await response.json();
          if (err?.message) message = err.message;
          else if (err?.error) message = err.error;
        } catch {
          // Response wasn't JSON — use status text
        }
        throw new ScreenshotApiError(message, response.status);
      }

      return response;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ScreenshotApiError(`Request timed out after ${this.timeout}ms`, 408);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Response> {
    return this.request('POST', path, body);
  }

  // ── Website screenshot → Blob (browser-friendly) ─────────────────────────

  async screenshotWebsite(options: WebsiteScreenshotOptions): Promise<ImageResult> {
    const format = options.format ?? 'png';
    const response = await this.post('/screenshot/website', {
      ...options,
      returnType: 'image',
      format,
    });
    return toImageResult(response, format);
  }

  /** Save screenshot server-side and get back a persistent URL. */
  async screenshotWebsiteToUrl(options: WebsiteScreenshotOptions): Promise<UrlResult> {
    const format = options.format ?? 'png';
    const response = await this.post('/screenshot/website', {
      ...options,
      returnType: 'url',
      format,
    });
    return toUrlResult(response, format);
  }

  // ── HTML screenshot → Blob ────────────────────────────────────────────────

  async screenshotHtml(options: HtmlScreenshotOptions): Promise<ImageResult> {
    const format = options.format ?? 'png';
    const response = await this.post('/screenshot/html', {
      ...options,
      returnType: 'image',
      format,
    });
    return toImageResult(response, format);
  }

  /** Render HTML server-side and get back a persistent URL. */
  async screenshotHtmlToUrl(options: HtmlScreenshotOptions): Promise<UrlResult> {
    const format = options.format ?? 'png';
    const response = await this.post('/screenshot/html', {
      ...options,
      returnType: 'url',
      format,
    });
    return toUrlResult(response, format);
  }

  // ── Server-side helpers (return Buffer — Node.js only) ───────────────────

  /**
   * Fetch a website screenshot as a Node.js Buffer.
   * Use in Next.js Route Handlers / API routes / server actions.
   */
  async screenshotWebsiteBuffer(options: WebsiteScreenshotOptions): Promise<Buffer> {
    const format = options.format ?? 'png';
    const response = await this.post('/screenshot/website', {
      ...options,
      returnType: 'image',
      format,
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Render HTML and return as a Node.js Buffer.
   * Use in Next.js Route Handlers / API routes / server actions.
   */
  async screenshotHtmlBuffer(options: HtmlScreenshotOptions): Promise<Buffer> {
    const format = options.format ?? 'png';
    const response = await this.post('/screenshot/html', {
      ...options,
      returnType: 'image',
      format,
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ── Health check ─────────────────────────────────────────────────────────

  async health(): Promise<{ status: string; ts: number }> {
    const response = await fetch(`${this.baseUrl}/health`, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new ScreenshotApiError('Health check failed', response.status);
    }
    return response.json();
  }

  // ── Storage management ───────────────────────────────────────────────────

  /** Get storage stats (total count and size). */
  async getStorageStats(): Promise<StorageStats> {
    const response = await this.request('GET', '/storage/stats');
    return response.json();
  }

  /** List files in storage with optional limit and offset. */
  async listStorageFiles(options?: {
    limit?: number;
    offset?: number;
  }): Promise<StorageListResult> {
    const response = await this.request('GET', '/storage/files', undefined, options);
    return response.json();
  }

  /** Delete a specific file from storage. */
  async deleteStorageFile(filename: string): Promise<StorageDeleteResult> {
    const response = await this.request('DELETE', `/storage/${filename}`);
    return response.json();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom error class
// ─────────────────────────────────────────────────────────────────────────────

export class ScreenshotApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ScreenshotApiError';
    this.statusCode = statusCode;
    // Restore prototype chain (needed when compiling to ES5)
    Object.setPrototypeOf(this, ScreenshotApiError.prototype);
  }
}
