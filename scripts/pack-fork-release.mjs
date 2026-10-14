#!/usr/bin/env node
// Build an immutable, compiled GitHub Release asset set for this maintained fork.
// This script never pushes, publishes to npm, changes settings, or installs files.
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, rmSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
if (outIndex < 0 || !args[outIndex + 1]) {
	console.error("usage: npm run release -- --out <new-directory>");
	process.exit(2);
}
const outDir = resolve(args[outIndex + 1]);
if (existsSync(outDir)) {
	console.error(`Refusing existing output directory: ${outDir}`);
	process.exit(2);
}

function run(command, commandArgs, cwd = repoRoot) {
	return execFileSync(command, commandArgs, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function sha256(path) {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function fail(message) {
	console.error(message);
	process.exit(1);
}

const status = run("git", ["status", "--porcelain=v1", "--untracked-files=all"]);
if (status) fail(`Source checkout must be clean; found:\n${status}`);
const remote = run("git", ["remote", "get-url", "origin"]);
if (!/^(?:https:\/\/github\.com\/|git@github\.com:)chenhaoxiang\/pi-web-access(?:\.git)?$/.test(remote)) {
	fail(`origin must be the maintained fork, got: ${remote}`);
}
const head = run("git", ["rev-parse", "HEAD"]);
const main = run("git", ["rev-parse", "origin/main"]);
if (head !== main) fail(`Release source must match fetched origin/main exactly (${main}), got: ${head}`);
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
if (pkg.name !== "pi-web-access" || !/^\d+\.\d+\.\d+-fork\.[1-9]\d*$/.test(pkg.version) || pkg.private !== true) {
	fail("package.json must identify a private maintained fork version <stable-base>-fork.<positive revision>");
}
if (pkg.repository?.url !== "git+https://github.com/chenhaoxiang/pi-web-access.git") {
	fail("package.json repository must point to the maintained fork");
}
const maintenance = pkg.forkMaintenance;
if (!maintenance || maintenance.repository !== "chenhaoxiang/pi-web-access" || maintenance.upstreamRepository !== "nicobailon/pi-web-access") {
	fail("package.json forkMaintenance metadata is missing or incorrect");
}
if (pkg.version.split("-fork.")[0] !== maintenance.upstreamVersion) fail("fork version must use the declared upstream version as its base");
const upstreamCommit = maintenance.upstreamCommit;
try {
	const merged = run("git", ["merge-base", "--is-ancestor", upstreamCommit, head]);
	void merged;
} catch {
	fail(`upstream baseline ${upstreamCommit} is not an ancestor of ${head}`);
}
const dist = join(repoRoot, "dist");
if (!existsSync(join(dist, "index.js")) || !existsSync(join(dist, "mcp-cli.js"))) {
	fail("dist/index.js and dist/mcp-cli.js are required; run npm run build first");
}

mkdirSync(outDir, { recursive: true });
const stage = mkdtempSync(join(dirname(outDir), `.pi-web-access-release-${Date.now()}-`));
try {
	const archive = join(stage, "source.tar.gz");
	execFileSync("git", ["archive", "--format=tar.gz", "--output", archive, "HEAD"], { cwd: repoRoot, stdio: "inherit" });
	// Extract tracked source through the system tar, then add exactly the built bundles.
	mkdirSync(join(stage, "package"), { recursive: true });
	execFileSync("tar", ["-xzf", archive, "-C", join(stage, "package")]);
	rmSync(archive, { force: true });
	cpSync(dist, join(stage, "package", "dist"), { recursive: true, errorOnExist: true });
	const stagedManifestPath = join(stage, "package", "package.json");
	const stagedManifest = JSON.parse(readFileSync(stagedManifestPath, "utf8"));
	stagedManifest.pi = { ...(stagedManifest.pi ?? {}), extensions: ["./dist"] };
	writeFileSync(stagedManifestPath, `${JSON.stringify(stagedManifest, null, 2)}\n`);
	const packOutput = run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", outDir], join(stage, "package"));
	const packInfo = JSON.parse(packOutput)[0];
	const tarball = join(outDir, packInfo.filename);
	if (!existsSync(tarball)) fail(`npm pack did not create ${tarball}`);
	const manifest = {
		repository: "chenhaoxiang/pi-web-access",
		upstreamRepository: "nicobailon/pi-web-access",
		version: pkg.version,
		tag: `v${pkg.version}`,
		sourceCommit: head,
		upstreamVersion: maintenance.upstreamVersion,
		upstreamCommit,
		packageFilename: basename(tarball),
		packageSha256: sha256(tarball),
		builtFrom: "compiled dist/ bundle plus tracked source",
		publishedToNpm: false,
	};
	const manifestPath = join(outDir, "release-manifest.json");
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	const sums = `${manifest.packageSha256}  ${manifest.packageFilename}\n${sha256(manifestPath)}  release-manifest.json\n`;
	writeFileSync(join(outDir, "SHA256SUMS"), sums);
	console.log(JSON.stringify({ outDir, head, version: pkg.version, tarball: basename(tarball), sha256: manifest.packageSha256 }, null, 2));
} finally {
	rmSync(stage, { recursive: true, force: true });
}
