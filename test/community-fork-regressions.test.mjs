import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const moduleUrl = (file) => new URL(`../${file}`, import.meta.url).href;
async function scenario(config, input) {
  const home = await mkdtemp(join(tmpdir(), "community-fork-"));
  try {
    await writeFile(join(home, "web-search.json"), JSON.stringify(config));
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", input], {
      cwd: home,
      env: { PATH: process.env.PATH, HOME: home, TMPDIR: home, PI_CODING_AGENT_DIR: home, PI_WEB_ACCESS_CACHE_ROOT: home },
      encoding: "utf8", timeout: 15000, maxBuffer: 2 * 1024 * 1024,
    });
    assert.equal(child.status, 0, child.stderr || String(child.error ?? child.signal));
    return JSON.parse(child.stdout.trim());
  } finally { await rm(home, { recursive: true, force: true }); }
}

test("default-array fallback retains array and route failures in raw, tool and stored results", async () => {
  const config = {
    provider: ["brave", "perplexity"], braveApiKey: "synthetic-brave", perplexityApiKey: "synthetic-perplexity", tavilyApiKey: "synthetic-tavily",
    searchRouting: { providers: ["brave", "exa", "tavily"], fallbackOn: ["transient"] },
  };
  const result = await scenario(config, `
    globalThis.fetch = async (url) => {
      const target = String(url);
      if (target.startsWith("https://api.search.brave.com/")) return new Response("unavailable", {status:500});
      if (target === "https://api.perplexity.ai/search" || target.startsWith("https://mcp.exa.ai/")) return new Response("unavailable", {status:503});
      if (target === "https://api.tavily.com/search") return Response.json({ answer:"Tavily route answer", results:[{title:"Tavily",url:"https://example.com/tavily",content:"Tavily result"}] });
      throw Error("Unexpected fixture request: " + target);
    };
    const { search } = await import(${JSON.stringify(moduleUrl("gemini-search.ts"))});
    const raw = await search("q");
    const { createStandaloneWebToolCore } = await import(${JSON.stringify(moduleUrl("web-tool-core.ts"))});
    const core = createStandaloneWebToolCore();
    const tool = await core.webSearch({query:"q"});
    const stored = await core.getSearchContent({responseId:tool.structuredContent.responseId,queryIndex:0});
    console.log(JSON.stringify({raw,tool,stored}));
  `);
  const query = result.tool.structuredContent.queries[0];
  assert.equal(query.error, null);
  assert.equal(query.provider, "tavily");
  assert.deepEqual(result.raw.providerErrors.map((item) => item.provider), ["brave", "perplexity", "exa"]);
  assert.deepEqual(query.providerErrors, result.raw.providerErrors);
  for (const view of [result.tool.content, result.stored.content]) {
    const text = JSON.stringify(view);
    assert.match(text, /Provider fallback diagnostics/);
    for (const provider of ["brave", "perplexity", "exa"]) assert.match(text, new RegExp(provider));
    assert.match(text, /500/);
    assert.match(text, /503/);
  }
});

for (const content of [
  "# Article\n\n``const tick = `; const re = /\\./;``",
  "# Article\n\n`const re = /\\./;` outside\\.",
  "# Article\n\n````a ``` b `` c ` /\\./````",
]) test(`DeepSeek Fetch protects equal-length code-span delimiters: ${JSON.stringify(content)}`, async () => {
  const result = await scenario({deepseekApiKey:"synthetic-ds"}, `
    globalThis.fetch = async () => Response.json({title:"Article",content:${JSON.stringify(content)}});
    const { extractWithDeepSeek } = await import(${JSON.stringify(moduleUrl("deepseek.ts"))});
    const result = await extractWithDeepSeek("https://example.com/article", undefined, {lookup:async()=>[{address:"93.184.216.34",family:4}]});
    console.log(JSON.stringify(result));
  `);
  assert.equal(result.content, content.replace(" outside\\.", " outside."));
});

for (const userinfo of ["user:synthetic-url-secret", "synthetic-user"]) test(`xAI endpoint rejects synthetic URL userinfo before request construction: ${userinfo}`, async () => {
  const result = await scenario({ xaiApiKey:"synthetic-api-key", xaiResponsesUrl:`https://${userinfo}@gateway.invalid/v1/responses` }, `
    let calls = 0;
    globalThis.fetch = async (url, init) => { calls++; new Request(url,init); throw Error("Unexpected network"); };
    const { searchWithXai } = await import(${JSON.stringify(moduleUrl("xai-search.ts"))});
    try { await searchWithXai("q"); console.log(JSON.stringify({success:true,calls})); }
    catch(error) { console.log(JSON.stringify({message:error.message,calls})); }
  `);
  assert.equal(result.calls, 0);
  assert.match(result.message, /xaiResponsesUrl.*must not include credentials/);
  assert.doesNotMatch(result.message, /synthetic-url-secret|synthetic-user|gateway\.invalid/);
});
