const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");

assert.match(html, /<!doctype html>/i);
assert.match(html, /<html[^>]+lang="zh-Hant"/i);
assert.match(html, /<script defer src="nutrition\.js"><\/script>\s*<script defer src="app\.js"><\/script>/);
assert.ok(!html.includes('capture="environment"'), "upload input should not force camera capture");
assert.match(html, /API key[\s\S]*localStorage/);
assert.match(html, /value="gemini-3\.5-flash"/);
assert.doesNotMatch(html, /value="gemini-2\.[05]-flash"/);
assert.match(app, /DEFAULT_GEMINI_MODEL = "gemini-3\.5-flash"/);
assert.doesNotMatch(app, /"gemini-2\.[05]-flash"/);
assert.match(html, /限制來源、配額或用途/);

const openBraces = (css.match(/{/g) || []).length;
const closeBraces = (css.match(/}/g) || []).length;
assert.equal(openBraces, closeBraces, "CSS brace count should be balanced");

console.log("static checks passed");
