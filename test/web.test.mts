import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkWebUrl,
  domainList,
  hostLabel,
  looksLikePdf,
  MAX_URL_CHARS,
  pdfFileName,
  uniqueByUrl,
  webError,
  webFailureRow,
} from "../src/lib/atlas/web.ts";

test("fetch_url takes http(s) addresses only, and gives a bare domain https://", () => {
  assert.deepEqual(checkWebUrl("https://www.adgm.com/fees#visas"), { url: "https://www.adgm.com/fees" });
  assert.deepEqual(checkWebUrl("  http://hub71.com/  "), { url: "http://hub71.com/" });
  assert.deepEqual(checkWebUrl("routely.io"), { url: "https://routely.io/" });
  assert.deepEqual(checkWebUrl("routely.io:8443/pricing"), { url: "https://routely.io:8443/pricing" });
  for (const bad of ["javascript:alert(1)", "file:///etc/passwd", "mailto:meera@routely.io", "data:text/html,hi", "ftp://x.org/a"]) {
    assert.ok("error" in checkWebUrl(bad), bad);
  }
  for (const bad of ["", "   ", 42, null, undefined, `https://a.com/${"x".repeat(MAX_URL_CHARS)}`, "https://"]) {
    assert.ok("error" in checkWebUrl(bad), String(bad).slice(0, 30));
  }
});

test("activity rows name hosts without www, unique and capped", () => {
  assert.equal(hostLabel("https://www.adgm.com/operating-in-adgm"), "adgm.com");
  assert.equal(hostLabel("not a url"), "the page");
  const urls = [
    "https://www.adgm.com/a",
    "https://adgm.com/b",
    "https://u.ae/en/x",
    "https://icp.gov.ae/y",
    "https://tax.gov.ae/z",
    "https://www.hub71.com/",
  ];
  assert.equal(domainList(urls), "adgm.com, u.ae, icp.gov.ae +2");
  assert.equal(domainList(urls.slice(0, 3)), "adgm.com, u.ae");
  assert.equal(domainList([]), "");
});

test("search sources are unique by URL and capped", () => {
  const hits = [
    { url: "https://u.ae/a", title: "1" },
    { url: "https://u.ae/a#part-2", title: "dup" },
    { url: "https://u.ae/b", title: "2" },
    { url: "https://u.ae/c", title: "3" },
  ];
  assert.deepEqual(uniqueByUrl(hits).map((h) => h.title), ["1", "2", "3"]);
  assert.deepEqual(uniqueByUrl(hits, 2).map((h) => h.title), ["1", "2"]);
});

test("a PDF is spotted by its path or by what the failed read said", () => {
  assert.ok(looksLikePdf("https://assets.adgm.com/download/assets/Fees.PDF?la=en&hash=1"));
  assert.ok(!looksLikePdf("https://www.adgm.com/pdf-guides"));
  assert.ok(!looksLikePdf("https://example.com/report?format=pdf"));
  assert.ok(looksLikePdf("https://example.com/download?id=7", "Unsupported content type: application/pdf"));
  assert.ok(!looksLikePdf("https://example.com/page", "Timeout"));
  assert.equal(pdfFileName("https://assets.adgm.com/download/assets/ADGM%20Fees%202026.pdf?x=1"), "ADGM Fees 2026.pdf");
  assert.equal(pdfFileName("https://example.com/download/fee-schedule"), "fee-schedule.pdf");
  assert.equal(pdfFileName("https://example.com/"), "document.pdf");
  assert.equal(pdfFileName("https://example.com/%E0%A4%A"), "document.pdf", "a malformed escape falls back");
  assert.equal(pdfFileName("https://example.com/<script>.pdf"), "_script_.pdf");
});

test("web failures tell the model what to do instead, and never pretend", () => {
  assert.match(webError("not_configured", "search"), /^Web search isn't set up on this deployment.*knowledge base/);
  assert.match(webError("not_configured", "read"), /^Reading web pages isn't set up/);
  assert.match(webError("limit", "read"), /quota/);
  assert.match(webError("unauthorized", "search"), /refused/);
  assert.match(webError("unavailable", "search"), /didn't answer/);
  assert.match(webError(undefined, "read"), /couldn't be read/);
  assert.equal(webFailureRow("not_configured", "x"), "The web isn't set up here");
  assert.equal(webFailureRow("unavailable", "Couldn't read adgm.com"), "Couldn't read adgm.com");
});
