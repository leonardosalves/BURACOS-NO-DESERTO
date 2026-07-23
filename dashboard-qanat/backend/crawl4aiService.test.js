import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  clearCrawl4aiAvailabilityCache,
  crawlDiscoveredSources,
  mergeCrawlWithDiscovery,
} from "./crawl4aiService.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  clearCrawl4aiAvailabilityCache();
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

describe("crawlDiscoveredSources", () => {
  it("crawls discovered URLs and normalizes markdown", async () => {
    process.env.CRAWL4AI_ENABLED = "true";
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
      calls.push({ url, options });
      if (url.endsWith("/health")) return jsonResponse({ status: "healthy" });
      return jsonResponse({
        results: [
          {
            url: "https://example.com/article",
            success: true,
            metadata: { title: "Example article" },
            markdown: { fit_markdown: "A clean and useful article body." },
          },
        ],
      });
    };

    const result = await crawlDiscoveredSources(
      [{ title: "Result", url: "https://example.com/article" }],
      { fetchImpl }
    );

    assert.equal(result.available, true);
    assert.equal(result.via, "crawl4ai");
    assert.equal(result.sources[0].title, "Example article");
    assert.equal(result.sources[0].excerpt, "A clean and useful article body.");
    assert.equal(calls.length, 2);
    assert.match(calls[1].options.body, /example\.com\/article/);
  });

  it("polls an asynchronous crawl task", async () => {
    process.env.CRAWL4AI_ENABLED = "true";
    process.env.CRAWL4AI_POLL_MS = "1";
    const fetchImpl = async (url) => {
      if (url.endsWith("/crawl")) return jsonResponse({ task_id: "task-1" });
      if (url.includes("/task/task-1")) {
        return jsonResponse({
          status: "completed",
          results: [
            {
              url: "https://example.com",
              markdown: "Page content",
              success: true,
            },
          ],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    };

    const result = await crawlDiscoveredSources(
      [{ url: "https://example.com" }],
      { fetchImpl, skipHealthCheck: true }
    );
    assert.equal(result.available, true);
    assert.equal(result.sources[0].excerpt, "Page content");
  });

  it("fails open when the service is unavailable", async () => {
    process.env.CRAWL4AI_ENABLED = "true";
    const result = await crawlDiscoveredSources(
      [{ url: "https://example.com" }],
      { fetchImpl: async () => jsonResponse({}, 503) }
    );
    assert.equal(result.available, false);
    assert.deepEqual(result.sources, []);
  });

  it("rejects non-http URLs before calling the service", async () => {
    let called = false;
    const result = await crawlDiscoveredSources(
      [{ url: "file:///etc/passwd" }, { url: "javascript:alert(1)" }],
      {
        fetchImpl: async () => {
          called = true;
        },
      }
    );
    assert.equal(result.available, false);
    assert.equal(called, false);
  });
});

describe("mergeCrawlWithDiscovery", () => {
  it("enriches matching sources without changing discovery order", () => {
    const merged = mergeCrawlWithDiscovery(
      {
        available: true,
        summary: "Search snippets",
        sources: [
          { title: "A", url: "https://a.example/page" },
          { title: "B", url: "https://b.example/page" },
        ],
        via: "agent-reach-exa",
      },
      {
        available: true,
        summary: "Extracted page",
        sources: [
          {
            title: "Crawled A",
            url: "https://a.example/page",
            excerpt: "Full text",
            crawled: true,
          },
        ],
        via: "crawl4ai",
      }
    );

    assert.equal(merged.sources[0].title, "Crawled A");
    assert.equal(merged.sources[0].excerpt, "Full text");
    assert.equal(merged.sources[1].title, "B");
    assert.match(merged.summary, /Search snippets/);
    assert.match(merged.summary, /Extracted page/);
    assert.equal(merged.via, "agent-reach-exa+crawl4ai");
  });
});
