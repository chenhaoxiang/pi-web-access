import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const coreUrl = new URL("../web-tool-core.ts", import.meta.url).href;

for (const fallbackOnEmpty of [false, true]) {
	test(`AnySearch domain-filtered fallback preserves Exa diagnostics (empty opt-in: ${fallbackOnEmpty})`, async () => {
		const home = await mkdtemp(join(tmpdir(), "anysearch-fork-routing-"));
		try {
			await writeFile(join(home, "web-search.json"), JSON.stringify({
				tavilyApiKey: "synthetic-tavily",
				searchRouting: {
					providers: ["exa", "anysearch", "tavily"],
					fallbackOn: ["transient", ...(fallbackOnEmpty ? ["empty"] : [])],
				},
			}));
			const child = spawnSync(process.execPath, ["--input-type=module"], {
				cwd: home,
				env: { PATH: process.env.PATH, HOME: home, TMPDIR: home, PI_CODING_AGENT_DIR: home, PI_WEB_ACCESS_CACHE_ROOT: home },
				encoding: "utf8", timeout: 15_000,
				input: `
					const calls = [];
					globalThis.fetch = async (url, init) => {
						const target = String(url);
						if (target.startsWith("https://mcp.exa.ai/")) {
							calls.push({ provider: "exa" });
							return new Response("synthetic outage", { status: 503 });
						}
						if (target === "https://api.anysearch.com/v1/search") {
							calls.push({ provider: "anysearch", body: JSON.parse(init.body) });
							return Response.json({ code: 0, data: { metadata: {}, results: [{ title: "Off domain", url: "https://other.example.org/", snippet: "off domain", content: "must not leak" }] } });
						}
						if (target === "https://api.tavily.com/search") {
							calls.push({ provider: "tavily" });
							return Response.json({ results: [{ title: "Docs", url: "https://docs.example.com/", content: "selected source" }] });
						}
						throw new Error("Unexpected fixture request: " + target);
					};
					const { createStandaloneWebToolCore } = await import(${JSON.stringify(coreUrl)});
					const core = createStandaloneWebToolCore();
					const tool = await core.webSearch({ query: "synthetic query", numResults: 20, domainFilter: ["example.com"], includeContent: true });
					const stored = await core.getSearchContent({ responseId: tool.structuredContent.responseId, queryIndex: 0 });
					console.log(JSON.stringify({ calls, tool, stored }));
				`,
			});
			assert.equal(child.status, 0, child.stderr || String(child.error ?? child.signal));
			const { calls, tool, stored } = JSON.parse(child.stdout.trim());
			assert.deepEqual(calls.map(call => call.provider), fallbackOnEmpty ? ["exa", "exa", "anysearch", "tavily"] : ["exa", "exa", "anysearch"]);
			assert.deepEqual(calls[2].body, { query: "synthetic query", max_results: 10 });
			const query = tool.structuredContent.queries[0];
			assert.equal(query.provider, fallbackOnEmpty ? "tavily" : "anysearch");
			assert.equal(query.error, null);
			assert.equal(query.results.length, fallbackOnEmpty ? 1 : 0);
			assert.deepEqual(query.providerErrors.map(error => error.provider), ["exa"]);
			for (const view of [tool.content, stored.content]) {
				assert.match(JSON.stringify(view), /Provider fallback diagnostics/);
				assert.match(JSON.stringify(view), /503/);
				assert.doesNotMatch(JSON.stringify(view), /must not leak|other\.example\.org/);
			}
		} finally {
			await rm(home, { recursive: true, force: true });
		}
	});
}
