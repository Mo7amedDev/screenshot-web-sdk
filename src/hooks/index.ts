'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ScreenshotClient } from '../client';
import type {
  WebsiteScreenshotOptions,
  HtmlScreenshotOptions,
  ImageResult,
  UrlResult,
  UseScreenshotState,
  StorageStats,
  StorageListResult,
  StorageDeleteResult,
  RequestState,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// useWebsiteScreenshot
// ─────────────────────────────────────────────────────────────────────────────

export interface UseWebsiteScreenshotOptions extends WebsiteScreenshotOptions {
  /** If true, automatically take a screenshot when the hook mounts. Default: false */
  immediate?: boolean;
}

export interface UseWebsiteScreenshot extends UseScreenshotState<ImageResult> {
  /** Trigger a screenshot manually. Pass overrides to change options at call time. */
  capture: (overrides?: Partial<WebsiteScreenshotOptions>) => Promise<void>;
  /** Clear the current result and any error. */
  reset: () => void;
}

export function useWebsiteScreenshot(
  client: ScreenshotClient,
  options: UseWebsiteScreenshotOptions
): UseWebsiteScreenshot {
  const [state, setState] = useState<UseScreenshotState<ImageResult>>({
    data: null,
    loading: false,
    error: null,
  });

  // Keep latest options in a ref so capture() always uses fresh values
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  // Track current object URL so we can revoke it on cleanup / update
  const prevUrlRef = useRef<string | null>(null);

  const capture = useCallback(
    async (overrides?: Partial<WebsiteScreenshotOptions>) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const merged = { ...optionsRef.current, ...overrides };
        const result = await client.screenshotWebsite(merged);

        // Revoke previous object URL to avoid memory leaks
        if (prevUrlRef.current) {
          URL.revokeObjectURL(prevUrlRef.current);
        }
        prevUrlRef.current = result.url;

        setState({ data: result, loading: false, error: null });
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setState({ data: null, loading: false, error: null });
  }, []);

  // Auto-capture on mount if requested
  useEffect(() => {
    if (options.immediate) {
      capture();
    }
    // Cleanup object URL on unmount
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, capture, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// useHtmlScreenshot
// ─────────────────────────────────────────────────────────────────────────────

export interface UseHtmlScreenshotOptions extends HtmlScreenshotOptions {
  /** If true, automatically render on mount. Default: false */
  immediate?: boolean;
}

export interface UseHtmlScreenshot extends UseScreenshotState<ImageResult> {
  /** Trigger a render manually. Pass overrides to change options at call time. */
  capture: (overrides?: Partial<HtmlScreenshotOptions>) => Promise<void>;
  /** Clear the current result and any error. */
  reset: () => void;
}

export function useHtmlScreenshot(
  client: ScreenshotClient,
  options: UseHtmlScreenshotOptions
): UseHtmlScreenshot {
  const [state, setState] = useState<UseScreenshotState<ImageResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const prevUrlRef = useRef<string | null>(null);

  const capture = useCallback(
    async (overrides?: Partial<HtmlScreenshotOptions>) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const merged = { ...optionsRef.current, ...overrides };
        const result = await client.screenshotHtml(merged);

        if (prevUrlRef.current) {
          URL.revokeObjectURL(prevUrlRef.current);
        }
        prevUrlRef.current = result.url;

        setState({ data: result, loading: false, error: null });
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (options.immediate) {
      capture();
    }
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, capture, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// useScreenshotToUrl  (server-saved URLs — works in both client and server)
// ─────────────────────────────────────────────────────────────────────────────

export interface UseScreenshotToUrlState extends UseScreenshotState<UrlResult> {
  captureWebsite: (options: WebsiteScreenshotOptions) => Promise<void>;
  captureHtml: (options: HtmlScreenshotOptions) => Promise<void>;
  reset: () => void;
}

export function useScreenshotToUrl(client: ScreenshotClient): UseScreenshotToUrlState {
  const [state, setState] = useState<UseScreenshotState<UrlResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const run = useCallback(
    async (fn: () => Promise<UrlResult>) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await fn();
        setState({ data: result, loading: false, error: null });
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      }
    },
    []
  );

  const captureWebsite = useCallback(
    (options: WebsiteScreenshotOptions) => run(() => client.screenshotWebsiteToUrl(options)),
    [client, run]
  );

  const captureHtml = useCallback(
    (options: HtmlScreenshotOptions) => run(() => client.screenshotHtmlToUrl(options)),
    [client, run]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, captureWebsite, captureHtml, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// useStorage
// ─────────────────────────────────────────────────────────────────────────────

export interface UseStorage {
  stats: RequestState<StorageStats>;
  files: RequestState<StorageListResult>;
  fetchStats: () => Promise<void>;
  fetchFiles: (options?: { limit?: number; offset?: number }) => Promise<void>;
  deleteFile: (filename: string) => Promise<StorageDeleteResult>;
}

export function useStorage(client: ScreenshotClient): UseStorage {
  const [stats, setStats] = useState<RequestState<StorageStats>>({
    data: null,
    loading: false,
    error: null,
  });

  const [files, setFiles] = useState<RequestState<StorageListResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchStats = useCallback(async () => {
    setStats((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await client.getStorageStats();
      setStats({ data, loading: false, error: null });
    } catch (err) {
      setStats((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [client]);

  const fetchFiles = useCallback(
    async (options?: { limit?: number; offset?: number }) => {
      setFiles((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await client.listStorageFiles(options);
        setFiles({ data, loading: false, error: null });
      } catch (err) {
        setFiles((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      }
    },
    [client]
  );

  const deleteFile = useCallback(
    async (filename: string) => {
      try {
        const result = await client.deleteStorageFile(filename);
        // Automatically refresh stats and files if they were loaded
        if (stats.data) fetchStats();
        if (files.data) fetchFiles({ limit: files.data.limit, offset: files.data.offset });
        return result;
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [client, stats.data, files.data, fetchStats, fetchFiles]
  );

  return { stats, files, fetchStats, fetchFiles, deleteFile };
}
