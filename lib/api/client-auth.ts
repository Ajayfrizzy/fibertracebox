"use client";

const storageKey = "fibertracebox.apiKey";

export function getStoredApiKey() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(storageKey) ?? "";
}

export function storeApiKey(apiKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = apiKey.trim();
  if (normalized) {
    window.sessionStorage.setItem(storageKey, normalized);
    return;
  }

  window.sessionStorage.removeItem(storageKey);
}

export function apiHeaders(headers?: HeadersInit): Headers {
  const nextHeaders = new Headers(headers);
  const apiKey = getStoredApiKey();

  if (apiKey) {
    nextHeaders.set("x-api-key", apiKey);
  }

  return nextHeaders;
}
