import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const script = fileURLToPath(new URL("../scripts/pack-fork-release.mjs", import.meta.url));
const pkg = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));

function git(cwd, ...args) {
	return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

test("fork metadata binds private releases to our repository and community baseline", async () => {
	assert.equal(pkg.private, true);
	assert.match(pkg.version, /^\d+\.\d+\.\d+-fork\.[1-9]\d*$/);
	assert.equal(pkg.repository.url, "git+https://github.com/chenhaoxiang/pi-web-access.git");
	assert.equal(pkg.forkMaintenance.repository, "chenhaoxiang/pi-web-access");
	assert.equal(pkg.forkMaintenance.upstreamRepository, "nicobailon/pi-web-access");
	assert.equal(pkg.version.split("-fork.")[0], pkg.forkMaintenance.upstreamVersion);
	assert.match(pkg.forkMaintenance.upstreamCommit, /^[a-f0-9]{40}$/);
	assert.match(pkg.scripts.release, /pack-fork-release/);
	const lock = JSON.parse(await readFile(join(repoRoot, "package-lock.json"), "utf8"));
	assert.equal(lock.version, pkg.version);
	assert.equal(lock.packages[""].version, pkg.version);
});

test("release asset packer stages compiled entry and preserves source manifest", async () => {
	const root = await mkdtemp(join(tmpdir(), "pi-web-access-fork-pack-"));
	try {
		const source = join(root, "source");
		await mkdir(join(source, "scripts"), { recursive: true });
		await cp(script, join(source, "scripts", "pack-fork-release.mjs"));
		const manifest = {
			name: "pi-web-access", version: "0.40.0-fork.2", private: true,
			type: "module", files: ["dist", "index.ts"],
			repository: { type: "git", url: "git+https://github.com/chenhaoxiang/pi-web-access.git" },
			pi: { extensions: ["./index.ts"] },
			forkMaintenance: { repository: "chenhaoxiang/pi-web-access", upstreamRepository: "nicobailon/pi-web-access", upstreamVersion: "0.40.0" },
		};
		git(source, "init", "-b", "main");
		git(source, "config", "user.name", "Fixture");
		git(source, "config", "user.email", "fixture@example.invalid");
		git(source, "remote", "add", "origin", "https://github.com/chenhaoxiang/pi-web-access.git");
		await writeFile(join(source, ".gitignore"), "dist/\n");
		await writeFile(join(source, "index.ts"), "export default () => {};\n");
		git(source, "add", ".gitignore", "index.ts", "scripts/pack-fork-release.mjs");
		git(source, "commit", "-m", "synthetic upstream baseline");
		manifest.forkMaintenance.upstreamCommit = git(source, "rev-parse", "HEAD");
		await writeFile(join(source, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
		git(source, "add", "package.json");
		git(source, "commit", "-m", "synthetic fork manifest");
		const head = git(source, "rev-parse", "HEAD");
		git(source, "update-ref", "refs/remotes/origin/main", head);
		await mkdir(join(source, "dist"));
		await writeFile(join(source, "dist/index.js"), "export default () => {};\n");
		await writeFile(join(source, "dist/mcp-cli.js"), "console.log('fixture');\n");
		const out = join(root, "release");
		const child = spawnSync(process.execPath, [join(source, "scripts/pack-fork-release.mjs"), "--out", out], { cwd: source, encoding: "utf8", timeout: 30_000 });
		assert.equal(child.status, 0, child.stderr);
		const provenance = JSON.parse(await readFile(join(out, "release-manifest.json"), "utf8"));
		assert.equal(provenance.sourceCommit, head);
		assert.equal(provenance.version, manifest.version);
		assert.equal(provenance.publishedToNpm, false);
		const tarball = join(out, provenance.packageFilename);
		const digest = createHash("sha256").update(await readFile(tarball)).digest("hex");
		assert.equal(digest, provenance.packageSha256);
		const packedManifest = JSON.parse(execFileSync("tar", ["-xOzf", tarball, "package/package.json"], { encoding: "utf8" }));
		assert.deepEqual(packedManifest.pi.extensions, ["./dist"]);
		assert.equal(packedManifest.private, true);
		assert.deepEqual(JSON.parse(await readFile(join(source, "package.json"), "utf8")).pi.extensions, ["./index.ts"]);
		const sums = await readFile(join(out, "SHA256SUMS"), "utf8");
		assert.match(sums, new RegExp(`${digest}  ${provenance.packageFilename.replaceAll(".", "\\.")}`));
		assert.equal(git(source, "status", "--porcelain"), "");

		const retry = spawnSync(process.execPath, [join(source, "scripts/pack-fork-release.mjs"), "--out", out], { cwd: source, encoding: "utf8" });
		assert.notEqual(retry.status, 0);
		assert.match(retry.stderr, /Refusing existing output directory/);
		await writeFile(join(source, "index.ts"), "// dirty\n");
		const dirty = spawnSync(process.execPath, [join(source, "scripts/pack-fork-release.mjs"), "--out", join(root, "dirty")], { cwd: source, encoding: "utf8" });
		assert.notEqual(dirty.status, 0);
		assert.match(dirty.stderr, /Source checkout must be clean/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
