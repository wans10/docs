import urljoin from "url-join";

import { ProxyRequest } from "../types";
import { PlaygroundResponse } from "../types/playgroundResponse";
import { toBodyInit } from "./requestToBodyInit";

const PROXY_URL = "https://proxy.ferndocs.com/";

export async function executeProxyRest(
  req: ProxyRequest,
  disableProxy: boolean = false
): Promise<PlaygroundResponse> {
  const requestHeaders = new Headers(req.headers);

  // Only set proxy-specific headers when using the proxy
  if (!disableProxy) {
    requestHeaders.set(
      "X-Fern-Proxy-Request-Headers",
      Object.keys(req.headers).join(",")
    );
  }

  if (req.body?.type === "form-data") {
    requestHeaders.delete("Content-Type");
  }
  const fetchOptions: RequestInit = {
    method: req.method,
    headers: requestHeaders,
    body: await toBodyInit(req.body),
    mode: "cors" as RequestMode,
  };

  if (disableProxy) {
    fetchOptions.credentials = "include";
  }

  const res = await fetch(
    disableProxy ? req.url : urljoin(PROXY_URL, req.url),
    fetchOptions
  );

  // Only process proxy-specific headers when using the proxy
  const responseHeadersList = disableProxy
    ? Object.keys(req.headers)
    : (res.headers.get("X-Fern-Proxy-Response-Headers") ?? "").split(",");

  const responseHeaders: Record<string, string> = {};
  responseHeadersList.forEach((header) => {
    if (header) {
      const value = res.headers.get(header);
      if (value != null) {
        responseHeaders[header] = value;
      }
    }
  });

  const createBaseResponse = (body: unknown) => ({
    headers: responseHeaders,
    ok: res.ok,
    redirected: res.redirected,
    status: res.status,
    statusText: res.statusText,
    type: res.type,
    url: res.url,
    body,
  });

  const calculateTiming = (startTime: number, endTime: number) => {
    const fallbackTime =
      Number(res.headers.get("X-Fern-Proxy-Origin-Latency") ?? 0) +
      endTime -
      startTime;
    return Number(
      res.headers.get("X-Fern-Proxy-Response-Time") ?? fallbackTime
    );
  };

  const startTime = Date.now();
  const contentType = res.headers.get("Content-Type") ?? "";

  // Check if response is a blob/file first
  if (
    contentType.startsWith("application/octet-stream") ||
    contentType.startsWith("image/") ||
    contentType.startsWith("video/") ||
    contentType.startsWith("audio/")
  ) {
    const blob = await res.blob();
    const endTime = Date.now();
    return {
      type: "file",
      response: {
        ...createBaseResponse(URL.createObjectURL(blob)),
        body: URL.createObjectURL(blob),
      },
      contentType,
      time: calculateTiming(startTime, endTime),
      size: res.headers.get("Content-Length") ?? String(blob.size),
    };
  }

  // Try to parse as JSON and fallback to text
  try {
    const text = await res.text();
    const endTime = Date.now();
    const time = calculateTiming(startTime, endTime);
    const size =
      res.headers.get("Content-Length") ??
      String(new TextEncoder().encode(text).length);

    try {
      const json = JSON.parse(text);
      return {
        type: "json",
        response: createBaseResponse(json),
        contentType: contentType || "application/json",
        time,
        size,
      };
    } catch {
      return {
        type: "string",
        response: createBaseResponse(text),
        contentType: contentType || "text/plain",
        time,
        size,
      };
    }
  } catch {
    // If text() fails, try as blob
    const blob = await res.blob();
    const endTime = Date.now();
    return {
      type: "file",
      response: {
        ...createBaseResponse(URL.createObjectURL(blob)),
        body: URL.createObjectURL(blob),
      },
      contentType: contentType || "application/octet-stream",
      time: calculateTiming(startTime, endTime),
      size: res.headers.get("Content-Length") ?? String(blob.size),
    };
  }
}
