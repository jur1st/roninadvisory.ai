/**
 * rag-web-session — session-lifecycle slash commands for the Pi TUI.
 *
 * Mirrors two CC primitives:
 *   - /rag-web-prime  ↔ .claude/commands/rag-web-prime.md
 *   - /rag-web-close  ↔ .claude/commands/rag-web-close.md
 *
 * Bundled together because prime and close are the two halves of the same
 * three-way contract (prime / CLAUDE.md / close) — they share the same ground
 * truth (pi-agents.yaml, docs/agent/, .claude/) and the same mental model of
 * "what changed this session?". A single extension colocates the helper code
 * that both commands need (git inspection, profile loading, YAML drift check)
 * without inflating per-command boilerplate.
 *
 * /rag-web-prime is pure read — runs shell inspections, reports five axes.
 * /rag-web-close is adaptive dispatch — inspects diff, fans out docs-writers
 * the same way rag-web-team.ts does, surfaces cross-harness drift, presents
 * the four-option commit gate. It NEVER auto-commits (CLAUDE.md antipattern).
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawn, spawnSync } from "child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Constants ────────────────────────────────────

const DOCS_WRITERS = [
	"rag-web-docs-changelog-writer",
	"rag-web-docs-dev-writer",
	"rag-web-docs-user-writer",
	"rag-web-docs-agent-writer",
];

const TOOL_ALLOWLIST = "read,grep,find,ls,write,edit";

// ── Helpers ──────────────────────────────────────

function sh(cwd: string, cmd: string, args: string[]): { code: number; stdout: string; stderr: string } {
	const res = spawnSync(cmd, args, { cwd, encoding: "utf-8" });
	return {
		code: res.status ?? 1,
		stdout: (res.stdout || "").toString(),
		stderr: (res.stderr || "").toString(),
	};
}

function fileExists(p: string): boolean {
	try { return existsSync(p); } catch { return false; }
}

function readIfExists(p: string): string | null {
	try { return existsSync(p) ? readFileSync(p, "utf-8") : null; } catch { return null; }
}

function listIfExists(p: string): string[] {
	try { return existsSync(p) ? readdirSync(p) : []; } catch { return []; }
}

function loadProfile(cwd: string, profile: string): Record<string, string> | null {
	const path = join(cwd, ".pi", "profiles", `${profile}.json`);
	if (!existsSync(path)) return null;
	try {
		const parsed = JSON.parse(readFileSync(path, "utf-8"));
		const map: Record<string, string> = { default: parsed.default };
		for (const [k, v] of Object.entries(parsed.per_agent || {})) {
			map[k] = v as string;
		}
		return map;
	} catch {
		return null;
	}
}

function parseAgentFile(filePath: string): { tools: string; systemPrompt: string } | null {
	try {
		const raw = readFileSync(filePath, "utf-8");
		const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return null;
		const frontmatter: Record<string, string> = {};
		for (const line of match[1].split("\n")) {
			const idx = line.indexOf(":");
			if (idx > 0) frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
		}
		return {
			tools: frontmatter.tools || TOOL_ALLOWLIST,
			systemPrompt: match[2].trim(),
		};
	} catch {
		return null;
	}
}

// ── Prime: five-axis report ──────────────────────

function runPrime(cwd: string): string {
	const out: string[] = [];
	const section = (title: string) => out.push("", `── ${title} ────────────────────────────`);

	// Axis 1: Harness parity
	section("1. Harness parity");
	const ccCommands = listIfExists(join(cwd, ".claude", "commands")).filter(f => f.endsWith(".md"));
	const ccAgents = listIfExists(join(cwd, ".claude", "agents")).filter(f => f.endsWith(".md"));
	const piExts = listIfExists(join(cwd, ".pi", "extensions")).filter(f => f.endsWith(".ts"));
	const piAgents = listIfExists(join(cwd, ".pi", "agents")).filter(f => f.endsWith(".md"));
	out.push(`  CC commands:   ${ccCommands.length}`);
	out.push(`  CC agents:     ${ccAgents.length}`);
	out.push(`  Pi extensions: ${piExts.length}`);
	out.push(`  Pi agents:     ${piAgents.length}`);
	const piAgentsYaml = readIfExists(join(cwd, "pi-agents.yaml"));
	if (piAgentsYaml) {
		const pending = (piAgentsYaml.match(/mirror_status:\s*pending/g) || []).length;
		out.push(`  pi-agents.yaml: present; ${pending} pending entries`);
	} else {
		out.push("  pi-agents.yaml: ABSENT");
	}

	// Axis 2: Content state
	section("2. Content state");
	out.push(`  site/index.html:          ${fileExists(join(cwd, "site", "index.html")) ? "present" : "absent"}`);
	out.push(`  site/static/tokens.css:   ${fileExists(join(cwd, "site", "static", "tokens.css")) ? "present" : "absent"}`);
	out.push(`  site/.nojekyll:           ${fileExists(join(cwd, "site", ".nojekyll")) ? "present" : "absent"}`);

	// Axis 3: Publishing state
	section("3. Publishing state");
	const workflow = fileExists(join(cwd, ".github", "workflows", "deploy-pages.yml"));
	out.push(`  .github/workflows/deploy-pages.yml: ${workflow ? "present" : "absent"}`);
	if (workflow) {
		const ghCheck = sh(cwd, "bash", ["-lc", "command -v gh >/dev/null && gh run list --workflow=deploy-pages.yml --limit 1 2>/dev/null || echo 'gh unavailable or no runs'"]);
		out.push(`  Last run: ${(ghCheck.stdout || ghCheck.stderr).trim() || "n/a"}`);
	}

	// Axis 4: Work state
	section("4. Work state");
	const branch = sh(cwd, "git", ["rev-parse", "--abbrev-ref", "HEAD"]);
	out.push(`  Branch: ${branch.stdout.trim() || "(none)"}`);
	const status = sh(cwd, "git", ["status", "--short"]);
	const statusBody = status.stdout.trim();
	out.push(`  Uncommitted: ${statusBody ? `\n${statusBody.split("\n").map(l => "    " + l).join("\n")}` : "clean"}`);
	const log = sh(cwd, "git", ["log", "--oneline", "-5"]);
	out.push(`  Recent commits:\n${(log.stdout.trim() || "    (none)").split("\n").map(l => "    " + l).join("\n")}`);
	const plans = listIfExists(join(cwd, "docs", "dev", "plans")).filter(f => f.endsWith(".md"));
	out.push(`  Open plans: ${plans.length ? plans.join(", ") : "(none)"}`);

	// Axis 5: Preview server
	section("5. Preview server");
	const previewScript = join(cwd, "tools", "scripts", "preview.sh");
	if (fileExists(previewScript)) {
		const res = sh(cwd, "bash", [previewScript, "status"]);
		out.push((res.stdout + res.stderr).trim().split("\n").map(l => "  " + l).join("\n") || "  (no output)");
	} else {
		out.push("  preview.sh absent");
	}

	return out.join("\n");
}

// ── Close: adaptive docs-writer dispatch ─────────

interface WriterState {
	name: string;
	status: "idle" | "running" | "done" | "error";
	exitCode?: number;
	elapsed: number;
}

function pickWriters(diffOutput: string): string[] {
	const writers = new Set<string>();
	const paths = diffOutput.split("\n").map(l => l.trim()).filter(Boolean);

	const changedUnder = (prefix: string) => paths.some(p => p.includes(prefix));

	if (changedUnder("site/") || changedUnder("tools/") || changedUnder("docs/dev/")) {
		writers.add("rag-web-docs-dev-writer");
	}
	if (changedUnder("site/") || changedUnder("README")) {
		writers.add("rag-web-docs-user-writer");
	}
	if (changedUnder(".claude/") || changedUnder(".pi/") || changedUnder("CLAUDE.md") || changedUnder("pi-agents.yaml")) {
		writers.add("rag-web-docs-agent-writer");
	}
	// Any net change -> changelog
	if (paths.length > 0) writers.add("rag-web-docs-changelog-writer");

	return Array.from(writers);
}

function runWriter(
	cwd: string,
	name: string,
	task: string,
	profileMap: Record<string, string>,
	runDir: string,
	state: WriterState,
): Promise<void> {
	return new Promise((resolve) => {
		const agentPath = join(cwd, ".pi", "agents", `${name}.md`);
		const def = parseAgentFile(agentPath);
		if (!def) {
			state.status = "error";
			state.exitCode = 2;
			resolve();
			return;
		}

		state.status = "running";
		const startTime = Date.now();
		const model = profileMap[name] || profileMap.default;
		const logPath = join(runDir, `${name}.log`);
		writeFileSync(logPath, "");

		const args = [
			"-p",
			"--no-extensions",
			"--model", model,
			"--system-prompt", agentPath,
			"--tools", def.tools,
			"--thinking", "off",
			task,
		];

		const proc = spawn("pi", args, {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env },
		});

		proc.stdout!.on("data", (chunk) => appendFileSync(logPath, chunk));
		proc.stderr!.on("data", (chunk) => appendFileSync(logPath, chunk));

		proc.on("close", (code) => {
			state.elapsed = Date.now() - startTime;
			state.exitCode = code ?? 1;
			state.status = code === 0 ? "done" : "error";
			resolve();
		});
		proc.on("error", (err) => {
			state.elapsed = Date.now() - startTime;
			state.exitCode = 1;
			state.status = "error";
			appendFileSync(logPath, `\nspawn error: ${err.message}\n`);
			resolve();
		});
	});
}

function checkPiDrift(cwd: string, diffOutput: string): string[] {
	const flags: string[] = [];
	const changedClaude = diffOutput
		.split("\n")
		.map(l => l.trim())
		.filter(l => l.includes(".claude/"));
	if (changedClaude.length === 0) return flags;

	const yaml = readIfExists(join(cwd, "pi-agents.yaml"));
	if (!yaml) {
		flags.push(".claude/ modified but pi-agents.yaml absent — register Pi mirrors");
		return flags;
	}

	// Crude check: each changed .claude file maps to a name; see if the registry
	// marks it pending. We avoid parsing YAML (no dep) — substring on "mirrors:" line.
	for (const line of changedClaude) {
		const match = line.match(/(\.claude\/[^\s]+\.md)/);
		if (!match) continue;
		const rel = match[1];
		const idx = yaml.indexOf(rel);
		if (idx < 0) {
			flags.push(`  ${rel}: not registered in pi-agents.yaml`);
			continue;
		}
		// Look at the block around this mention for mirror_status.
		const window = yaml.slice(Math.max(0, idx - 200), idx + 400);
		if (/mirror_status:\s*pending/.test(window)) {
			flags.push(`  ${rel}: mirror_status=pending (Pi mirror missing)`);
		}
	}
	return flags;
}

// ── Extension ────────────────────────────────────

export default function (pi: ExtensionAPI) {

	// ── /rag-web-prime ──────────────────────────
	pi.registerCommand("rag-web-prime", {
		description: "Read-only session prime — harness parity, content, publishing, work, preview",
		handler: async (_args, ctx) => {
			ctx.ui.setStatus("rag-web-prime", "running five-axis prime report");
			try {
				const report = runPrime(ctx.cwd);
				ctx.ui.notify(`/rag-web-prime report\n${report}`, "info");
			} catch (err: any) {
				ctx.ui.notify(`/rag-web-prime failed: ${err?.message || err}`, "error");
			} finally {
				ctx.ui.setStatus("rag-web-prime", "");
			}
		},
	});

	// ── /rag-web-close ──────────────────────────
	pi.registerCommand("rag-web-close", {
		description: "Adaptive close — dispatch docs-writers, surface drift, gate the commit",
		handler: async (args, ctx) => {
			ctx.ui.setStatus("rag-web-close", "inspecting session changes");

			// 1. Session change discovery.
			const status = sh(ctx.cwd, "git", ["status", "--short"]);
			const diffStat = sh(ctx.cwd, "git", ["diff", "--stat", "HEAD"]);
			const statusBody = status.stdout.trim();
			const diffBody = diffStat.stdout.trim();

			if (!statusBody && !diffBody) {
				ctx.ui.notify("/rag-web-close: no changes this session; nothing to close", "info");
				ctx.ui.setStatus("rag-web-close", "");
				return;
			}

			// 2. Pick docs-writers adaptively.
			const pathList = `${statusBody}\n${diffBody}`;
			const writers = pickWriters(pathList).filter(w => DOCS_WRITERS.includes(w));

			// 3. Cross-harness drift surface.
			const driftFlags = checkPiDrift(ctx.cwd, pathList);

			// 4. Dispatch docs-writers in parallel via Pi subprocesses.
			const profileName = process.env.RAG_WEB_PI_PROFILE || "anthropic";
			const profileMap = loadProfile(ctx.cwd, profileName);

			const states: Map<string, WriterState> = new Map();
			let dispatchSummary = "  (no docs-writers selected)";

			if (writers.length > 0 && profileMap) {
				const task = (args || "").trim() || "Update the documentation surface you own for this session's changes.";
				const iso = new Date().toISOString();
				const runDir = join(ctx.cwd, ".the-grid", "pi-runs", iso.replace(/[:.]/g, "-"));
				mkdirSync(runDir, { recursive: true });
				writeFileSync(join(runDir, "task.prompt"), task);

				ctx.ui.setStatus("rag-web-close", `dispatching ${writers.length} docs-writer(s)`);
				ctx.ui.notify(`/rag-web-close: fanning out ${writers.join(", ")} via ${profileName}`, "info");

				for (const name of writers) {
					states.set(name, { name, status: "idle", elapsed: 0 });
				}
				await Promise.all(writers.map(name => runWriter(ctx.cwd, name, task, profileMap, runDir, states.get(name)!)));

				dispatchSummary = writers.map(n => {
					const s = states.get(n)!;
					return `  ${n}: ${s.status} (exit ${s.exitCode ?? "?"}, ${Math.round(s.elapsed / 1000)}s)`;
				}).join("\n");
				dispatchSummary += `\n  Logs: ${runDir}`;
			} else if (writers.length > 0 && !profileMap) {
				dispatchSummary = `  Would dispatch: ${writers.join(", ")}\n  Profile "${profileName}" not loadable — skipped dispatch`;
			}

			// 5. Present drift + commit gate (no auto-commit).
			const report: string[] = [];
			report.push("/rag-web-close report");
			report.push("");
			report.push("── Changes ─────────────────────────────");
			report.push(statusBody || "  (working tree clean; diff vs HEAD only)");
			report.push("");
			report.push("── Docs-writer dispatch ────────────────");
			report.push(dispatchSummary);
			report.push("");
			report.push("── Pi-harness drift ────────────────────");
			report.push(driftFlags.length ? driftFlags.join("\n") : "  clean");
			report.push("");
			report.push("── Commit gate (operator decision) ─────");
			report.push("  1. Commit as-is (operator authors message)");
			report.push("  2. Commit selected paths only");
			report.push("  3. Discard specific changes");
			report.push("  4. Leave uncommitted for next session");
			report.push("");
			report.push("  /rag-web-close never auto-commits.");
			ctx.ui.notify(report.join("\n"), driftFlags.length ? "warning" : "info");

			// Offer the gate as a selector for operator convenience (selection is
			// advisory — we do NOT execute the choice; operator runs git manually).
			try {
				const choice = await ctx.ui.select("Commit gate — operator choice (no execution)", [
					"1. Commit as-is (you author the message, you run git commit)",
					"2. Commit selected paths only (you stage + commit manually)",
					"3. Discard specific changes (you run git restore / git checkout)",
					"4. Leave uncommitted for next session",
				]);
				if (choice) {
					ctx.ui.notify(`Noted: ${choice}\n(This command does not execute the choice. Run git manually.)`, "info");
				}
			} catch {
				// ui.select may be unavailable in some transports; the printed gate above is authoritative.
			}

			ctx.ui.setStatus("rag-web-close", "");
		},
	});
}
