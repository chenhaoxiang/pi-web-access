import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const searchModuleUrl = new URL("../gemini-search.ts", import.meta.url).href;
const coreModuleUrl = new URL("../web-tool-core.ts", import.meta.url).href;
const primary = "Title: Primary\nURL: https://example.org/primary\nText: primary source";
const fallbackOn = ["transient", "quota", "network", "invalid-response", "unsupported"];
const defaultConfig = { searchRouting: { providers: ["exa", "anysearch"], fallbackOn } };

async function scenario(options = {}) {
	const home = await mkdtemp(join(tmpdir(), "search-diagnostics-"));
	try {
		await writeFile(join(home, "web-search.json"), JSON.stringify(options.config ?? defaultConfig));
		const env = {
			PATH: process.env.PATH,
			HOME: home,
			USERPROFILE: home,
			PI_CODING_AGENT_DIR: home,
			PI_WEB_ACCESS_CACHE_ROOT: home,
			TMPDIR: home,
		};
		const child = spawnSync(process.execPath, ["--input-type=module"], {
			cwd: home,
			env,
			encoding: "utf8",
			timeout: 15_000,
			input: `
				const options = ${JSON.stringify(options)};
				const calls = [];
				globalThis.fetch = async (url) => {
					const target = String(url);
					if (target.startsWith("https://mcp.exa.ai/")) {
						calls.push("exa");
						if (options.abort) throw new DOMException("Aborted", "AbortError");
						if (options.primaryStatus) return new Response("synthetic upstream failure", { status: options.primaryStatus });
						if (options.rawRpc !== undefined) return new Response(options.rawRpc);
						return Response.json({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: options.text ?? ${JSON.stringify(primary)} }] } });
					}
					if (target === "https://api.anysearch.com/v1/search") {
						calls.push("anysearch");
						if (options.backupStatus) return new Response("synthetic backup failure", { status: options.backupStatus });
						return Response.json({ code: 0, data: { metadata: {}, results: options.backupEmpty ? [] : [{ title: "Backup", url: "https://example.org/backup", snippet: "backup source" }] } });
					}
					throw new Error("Unexpected network request: " + target);
				};
				try {
					let result;
					if (options.tool) {
						const { createStandaloneWebToolCore } = await import(${JSON.stringify(coreModuleUrl)});
						const core = createStandaloneWebToolCore();
						result = await core.webSearch({ query: "public synthetic query", provider: options.provider });
						if (result.structuredContent) result.stored = await core.getSearchContent({ responseId: result.structuredContent.responseId, queryIndex: 0 });
					} else {
						const { search } = await import(${JSON.stringify(searchModuleUrl)});
						result = await search("public synthetic query", { provider: options.provider, includeContent: options.includeContent });
					}
					console.log(JSON.stringify({ ok: true, result, calls }));
				} catch (error) {
					console.log(JSON.stringify({ ok: false, error: { name: error.name, kind: error.kind, message: error.message }, calls }));
				}
			`,
		});
		assert.equal(child.status, 0, child.stderr || String(child.error ?? child.signal));
		return JSON.parse(child.stdout.trim());
	} finally {
		await rm(home, { recursive: true, force: true });
	}
}

// Characterization pins: do not weaken existing routing, opt-in, or auth behavior.
test("pin: a healthy Exa primary does not call the backup", async () => {
	const output = await scenario();
	assert.equal(output.ok, true);
	assert.deepEqual(output.calls, ["exa"]);
	assert.equal(output.result.provider, "exa");
	assert.equal(output.result.results[0].url, "https://example.org/primary");
});

test("pin: explicit provider selection bypasses the configured route", async () => {
	const output = await scenario({ provider: "anysearch" });
	assert.equal(output.ok, true);
	assert.deepEqual(output.calls, ["anysearch"]);
	assert.equal(output.result.provider, "anysearch");
});

test("pin: an explicit empty search is successful, not a missing-provider error", async () => {
	const output = await scenario({ provider: "anysearch", backupEmpty: true });
	assert.equal(output.ok, true);
	assert.deepEqual(output.result.results, []);
	assert.deepEqual(output.calls, ["anysearch"]);
});

test("pin: a transient primary error falls back in configured order", async () => {
	const output = await scenario({ primaryStatus: 503 });
	assert.equal(output.ok, true);
	assert.equal(output.result.provider, "anysearch");
	assert.deepEqual(output.calls, ["exa", "anysearch"]);
});

test("pin: authentication errors remain strict and never use the backup", async () => {
	const output = await scenario({ primaryStatus: 401 });
	assert.equal(output.ok, false);
	assert.equal(output.error.kind, "auth");
	assert.deepEqual(output.calls, ["exa"]);
});

test("pin: cancellation does not start another search", async () => {
	const output = await scenario({ abort: true });
	assert.equal(output.ok, false);
	assert.equal(output.error.kind, "aborted");
	assert.deepEqual(output.calls, ["exa"]);
});

for (const text of [JSON.stringify({ results: [] }), "No results found."]) {
	test(`keyless Exa preserves a valid empty response: ${text}`, async () => {
		const output = await scenario({ provider: "exa", text });
		assert.equal(output.ok, true);
		assert.deepEqual(output.result.results, []);
		assert.equal(output.result.answer, "");
		assert.deepEqual(output.calls, ["exa"]);
	});
}

test("a malformed Exa response triggers invalid-response fallback instead of a no-results error", async () => {
	const output = await scenario({ text: "unrecognized payload" });
	assert.equal(output.ok, true);
	assert.equal(output.result.provider, "anysearch");
	assert.deepEqual(output.calls, ["exa", "anysearch"]);
	assert.match(output.result.providerErrors[0].error, /\[invalid-response\].*no parseable results/);
});

test("empty MCP content is an invalid response and can use the backup", async () => {
	const output = await scenario({ text: "" });
	assert.equal(output.ok, true);
	assert.equal(output.result.provider, "anysearch");
	assert.match(output.result.providerErrors[0].error, /\[invalid-response\]/);
});

test("an empty RPC body is an invalid response and can use the backup", async () => {
	const output = await scenario({ rawRpc: "" });
	assert.equal(output.ok, true);
	assert.equal(output.result.provider, "anysearch");
	assert.match(output.result.providerErrors[0].error, /\[invalid-response\].*no parseable response/);
});

test("an invalid nonempty results array is not reported as a valid empty search", async () => {
	const output = await scenario({ text: JSON.stringify({ results: [{}] }) });
	assert.equal(output.ok, true);
	assert.equal(output.result.provider, "anysearch");
	assert.match(output.result.providerErrors[0].error, /\[invalid-response\].*no parseable results/);
});

test("an empty primary tries the backup without inventing a provider error", async () => {
	const output = await scenario({ text: JSON.stringify({ results: [] }) });
	assert.equal(output.ok, true);
	assert.equal(output.result.provider, "anysearch");
	assert.equal(output.result.providerErrors, undefined);
	assert.deepEqual(output.calls, ["exa", "anysearch"]);
});

test("when both searches are empty the first successful empty response is retained", async () => {
	const output = await scenario({ text: JSON.stringify({ results: [] }), backupEmpty: true, tool: true });
	assert.equal(output.ok, true);
	assert.notEqual(output.result.isError, true);
	assert.equal(output.result.structuredContent.queries[0].provider, "exa");
	assert.equal(output.result.structuredContent.queries[0].error, null);
	assert.deepEqual(output.result.structuredContent.queries[0].results, []);
	assert.match(output.result.content[0].text, /No results found/);
	assert.deepEqual(output.calls, ["exa", "anysearch"]);
});

test("fallback diagnostics survive successful tool output, codemode data and stored retrieval", async () => {
	const output = await scenario({ primaryStatus: 503, tool: true });
	assert.equal(output.ok, true);
	assert.notEqual(output.result.isError, true);
	const query = output.result.structuredContent.queries[0];
	assert.equal(query.provider, "anysearch");
	assert.equal(query.error, null);
	assert.equal(query.providerErrors[0].provider, "exa");
	assert.match(query.providerErrors[0].error, /\[transient\].*503/);
	assert.match(output.result.content[0].text, /Provider fallback diagnostics[\s\S]*exa[\s\S]*transient/);
	assert.match(output.result.stored.content[0].text, /Provider fallback diagnostics[\s\S]*exa[\s\S]*503/);
});

test("both provider failures retain their names and classifications, not a missing-key hint", async () => {
	const output = await scenario({ text: "unrecognized payload", backupStatus: 503 });
	assert.equal(output.ok, false);
	assert.match(output.error.message, /Configured search routing exhausted/);
	assert.match(output.error.message, /exa \[invalid-response\]/);
	assert.match(output.error.message, /anysearch \[transient\]/);
	assert.doesNotMatch(output.error.message, /No search provider available/);
});

test("an empty first search never hides a later authentication failure", async () => {
	const output = await scenario({ text: JSON.stringify({ results: [] }), backupStatus: 401 });
	assert.equal(output.ok, false);
	assert.equal(output.error.kind, "auth");
});

test("an unparseable Exa AUTO response is a provider error, not an absent provider", async () => {
	const output = await scenario({ text: "unrecognized payload", config: { webSearch: { allowedProviders: ["exa"] } } });
	assert.equal(output.ok, false);
	assert.match(output.error.message, /Auto provider search failed[\s\S]*Exa.*no parseable results/);
	assert.doesNotMatch(output.error.message, /No search provider available/);
});
