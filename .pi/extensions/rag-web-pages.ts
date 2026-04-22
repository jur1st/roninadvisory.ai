/**
 * rag-web-pages — GitHub Pages lifecycle commands for the Pi TUI.
 *
 * Mirrors four CC primitives that share a skill surface:
 *   - /rag-web-pages-init     ↔ .claude/commands/rag-web-pages-init.md
 *   - /rag-web-pages-check    ↔ .claude/commands/rag-web-pages-check.md
 *   - /rag-web-pages-deploy   ↔ .claude/commands/rag-web-pages-deploy.md
 *   - /rag-web-pages-rollback ↔ .claude/commands/rag-web-pages-rollback.md
 *
 * Bundled together because they are four moments of a single lifecycle (init
 * → preflight → deploy → verify / rollback), all of them consuming the same
 * CC-side skill tree at `.claude/skills/rag-web-pages-deploy/` directly by
 * path (see plan 05 Decision 3 — Pi has no skill-primitive class; the skill
 * content is harness-agnostic and read by file path). Colocation here means
 * the helper code for agent dispatch and gh-cli shelling is written once.
 *
 * init       — scaffolds workflow + .nojekyll from skill templates, prints
 *              the GitHub-UI configuration checklist, does not push.
 * check      — dispatches rag-web-pages-preflight; relays its report.
 * deploy     — clean-tree + main-branch gates, runs preflight, pushes or
 *              workflow_dispatches, tails the run, dispatches verify on
 *              success, presents the commit gate. NEVER auto-commits.
 * rollback   — dispatches rag-web-pages-rollback-advisor, presents its
 *              proposal verbatim plus the two execution paths from the
 *              runbook. Stops. Does not execute either path.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawn, spawnSync } from "child_process";
import { existsSync, readFileSync, copyFileSync, mkdirSync } from "fs";
import { join } from "path";

// ── Constants ────────────────────────────────────

const SKILL_ROOT = ".claude/skills/rag-web-pages-deploy";
const TEMPLATES = `${SKILL_ROOT}/templates`;
const REFERENCE = `${SKILL_ROOT}/reference`;

const AGENT_PREFLIGHT = "rag-web-pages-preflight";
const AGENT_VERIFY = "rag-web-pages-verify";
const AGENT_ROLLBACK_ADVISOR = "rag-web-pages-rollback-advisor";

const TOOL_ALLOWLIST = "read,grep,find,ls,write,edit,bash";

// ── Helpers ──────────────────────────────────────

function sh(cwd: string, cmd: string, args: string[]): { code: number; stdout: string; stderr: string } {
	const res = spawnSync(cmd, args, { cwd, encoding: "utf-8" });
	return {
		code: res.status ?? 1,
		stdout: (res.stdout || "").toString(),
		stderr: (res.stderr || "").toString(),
	};
}

function readIfExists(p: string): string | null {
	try { return existsSync(p) ? readFileSync(p, "utf-8") : null; } catch { return null; }
}

function parseAgentFile(filePath: string): { tools: string } | null {
	try {
		const raw = readFileSync(filePath, "utf-8");
		const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return null;
		const frontmatter: Record<string, string> = {};
		for (const line of match[1].split("\n")) {
			const idx = line.indexOf(":");
			if (idx > 0) frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
		}
		return { tools: frontmatter.tools || TOOL_ALLOWLIST };
	} catch {
		return null;
	}
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

/**
 * Dispatch a Pi agent as a subprocess. Streams stdout to a buffer and returns
 * it on close. Uses the same pattern as rag-web-team.ts.
 */
function dispatchAgent(
	cwd: string,
	agentName: string,
	task: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
	return new Promise((resolve) => {
		const agentPath = join(cwd, ".pi", "agents", `${agentName}.md`);
		if (!existsSync(agentPath)) {
			resolve({ code: 127, stdout: "", stderr: `agent not found: ${agentPath}` });
			return;
		}
		const def = parseAgentFile(agentPath);
		if (!def) {
			resolve({ code: 2, stdout: "", stderr: `agent frontmatter malformed: ${agentPath}` });
			return;
		}

		const profileName = process.env.RAG_WEB_PI_PROFILE || "anthropic";
		const profileMap = loadProfile(cwd, profileName) || { default: "claude-opus-4-7" };
		const model = profileMap[agentName] || profileMap.default;

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

		let stdout = "";
		let stderr = "";
		proc.stdout!.setEncoding("utf-8");
		proc.stderr!.setEncoding("utf-8");
		proc.stdout!.on("data", (chunk) => { stdout += chunk; });
		proc.stderr!.on("data", (chunk) => { stderr += chunk; });

		proc.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
		proc.on("error", (err) => resolve({ code: 1, stdout, stderr: stderr + `\nspawn error: ${err.message}` }));
	});
}

// ── Extension ────────────────────────────────────

export default function (pi: ExtensionAPI) {

	// ── /rag-web-pages-init ─────────────────────
	pi.registerCommand("rag-web-pages-init", {
		description: "One-time scaffold: copy deploy-pages.yml + .nojekyll from skill templates",
		handler: async (_args, ctx) => {
			ctx.ui.setStatus("rag-web-pages-init", "checking preconditions");

			const indexHtml = join(ctx.cwd, "site", "index.html");
			const tokensCss = join(ctx.cwd, "site", "static", "tokens.css");
			const workflowTarget = join(ctx.cwd, ".github", "workflows", "deploy-pages.yml");
			const nojekyllTarget = join(ctx.cwd, "site", ".nojekyll");
			const workflowSource = join(ctx.cwd, TEMPLATES, "deploy-pages.yml");
			const nojekyllSource = join(ctx.cwd, TEMPLATES, "nojekyll");

			if (!existsSync(indexHtml)) {
				ctx.ui.notify(
					`/rag-web-pages-init aborted: site/index.html absent.\nSee docs/dev/plans/02-web-frontend-localization.md.`,
					"error",
				);
				ctx.ui.setStatus("rag-web-pages-init", "");
				return;
			}
			if (!existsSync(tokensCss)) {
				ctx.ui.notify("/rag-web-pages-init aborted: site/static/tokens.css absent.", "error");
				ctx.ui.setStatus("rag-web-pages-init", "");
				return;
			}
			if (existsSync(workflowTarget)) {
				ctx.ui.notify(
					"/rag-web-pages-init aborted: .github/workflows/deploy-pages.yml already exists.\nThis is a one-time command.",
					"error",
				);
				ctx.ui.setStatus("rag-web-pages-init", "");
				return;
			}
			if (!existsSync(workflowSource) || !existsSync(nojekyllSource)) {
				ctx.ui.notify(
					`/rag-web-pages-init aborted: skill templates not found at ${TEMPLATES}/`,
					"error",
				);
				ctx.ui.setStatus("rag-web-pages-init", "");
				return;
			}

			// Copy templates.
			try {
				mkdirSync(join(ctx.cwd, ".github", "workflows"), { recursive: true });
				copyFileSync(workflowSource, workflowTarget);
				if (!existsSync(nojekyllTarget)) {
					copyFileSync(nojekyllSource, nojekyllTarget);
				}
			} catch (err: any) {
				ctx.ui.notify(`/rag-web-pages-init failed during copy: ${err?.message || err}`, "error");
				ctx.ui.setStatus("rag-web-pages-init", "");
				return;
			}

			const checklist = [
				"/rag-web-pages-init complete — two files written:",
				`  ${workflowTarget}`,
				`  ${nojekyllTarget}`,
				"",
				"GITHUB UI CONFIGURATION REQUIRED",
				"",
				"Settings → Pages",
				"  Source: GitHub Actions",
				"",
				"Settings → Environments → github-pages (created on first run)",
				"  Deployment branches: main only",
				"  Required reviewers: operator choice",
				"",
				"Settings → Actions → General",
				"  Workflow permissions: Read and write",
				"",
				"Next steps:",
				"  1. Commit the two new files.",
				"  2. Push to main. The workflow will run and establish the github-pages environment.",
				"  3. Complete the Settings checklist above.",
				"  4. Trigger the first deploy via: gh workflow run deploy-pages.yml --ref main",
				"  5. Verify with: /rag-web-pages-deploy or /rag-web-pages-check",
				"",
				"This command did not stage, commit, or push. Operator runs git.",
			].join("\n");

			ctx.ui.notify(checklist, "info");
			ctx.ui.setStatus("rag-web-pages-init", "");
		},
	});

	// ── /rag-web-pages-check ────────────────────
	pi.registerCommand("rag-web-pages-check", {
		description: `Run the Pages preflight agent (${AGENT_PREFLIGHT}); relay its structured report`,
		handler: async (args, ctx) => {
			ctx.ui.setStatus("rag-web-pages-check", `dispatching ${AGENT_PREFLIGHT}`);
			const task = (args || "").trim()
				|| "Run the Pages preflight checklist against the current working tree and report the structured result.";
			const result = await dispatchAgent(ctx.cwd, AGENT_PREFLIGHT, task);
			ctx.ui.setStatus("rag-web-pages-check", "");

			const body = result.stdout.trim() || result.stderr.trim() || "(no output)";
			if (result.code !== 0) {
				const remediation = readIfExists(join(ctx.cwd, REFERENCE, "preflight-checklist.md"));
				const pointer = remediation
					? `\n\nRemediation: see ${REFERENCE}/preflight-checklist.md`
					: "";
				ctx.ui.notify(`/rag-web-pages-check FAIL (exit ${result.code})\n${body}${pointer}`, "error");
			} else {
				ctx.ui.notify(`/rag-web-pages-check OK\n${body}`, "info");
			}
			// Exit code mirrors the agent — but Pi command handlers don't set
			// process exit directly; the caller sees status via the notify level.
		},
	});

	// ── /rag-web-pages-deploy ───────────────────
	pi.registerCommand("rag-web-pages-deploy", {
		description: "Deploy HEAD of main to GitHub Pages. Gates on clean tree + preflight. Never commits.",
		handler: async (_args, ctx) => {
			ctx.ui.setStatus("rag-web-pages-deploy", "gating clean tree + branch");

			// 1. Clean working tree.
			const status = sh(ctx.cwd, "git", ["status", "--porcelain"]);
			if (status.stdout.trim()) {
				ctx.ui.notify(
					`/rag-web-pages-deploy aborted: working tree dirty.\n${status.stdout.trim()}\nCommit or stash before deploying.`,
					"error",
				);
				ctx.ui.setStatus("rag-web-pages-deploy", "");
				return;
			}

			// 2. Branch must be main.
			const branch = sh(ctx.cwd, "git", ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
			if (branch !== "main") {
				ctx.ui.notify(`/rag-web-pages-deploy aborted: current branch is "${branch}", not "main".`, "error");
				ctx.ui.setStatus("rag-web-pages-deploy", "");
				return;
			}

			// 3. In-flight guard.
			const inflight = sh(ctx.cwd, "bash", ["-lc", "command -v gh >/dev/null && gh run list --workflow=deploy-pages.yml --status in_progress --json databaseId -q 'length' 2>/dev/null || echo 0"]);
			if ((inflight.stdout.trim() || "0") !== "0") {
				ctx.ui.notify(
					"/rag-web-pages-deploy aborted: a deploy is already in flight. Wait for it to finish.",
					"error",
				);
				ctx.ui.setStatus("rag-web-pages-deploy", "");
				return;
			}

			// 4. Run preflight.
			ctx.ui.setStatus("rag-web-pages-deploy", "running preflight");
			const preflight = await dispatchAgent(
				ctx.cwd,
				AGENT_PREFLIGHT,
				"Run preflight against the current working tree; report pass/fail.",
			);
			if (preflight.code !== 0) {
				ctx.ui.notify(
					`/rag-web-pages-deploy aborted: preflight failed.\n${preflight.stdout.trim() || preflight.stderr.trim()}`,
					"error",
				);
				ctx.ui.setStatus("rag-web-pages-deploy", "");
				return;
			}

			// 5. Push OR workflow_dispatch.
			ctx.ui.setStatus("rag-web-pages-deploy", "triggering deploy");
			const localSha = sh(ctx.cwd, "git", ["rev-parse", "HEAD"]).stdout.trim();
			const remoteSha = sh(ctx.cwd, "git", ["rev-parse", "origin/main"]).stdout.trim();

			let triggered: { code: number; stdout: string; stderr: string };
			if (localSha && localSha === remoteSha) {
				triggered = sh(ctx.cwd, "gh", ["workflow", "run", "deploy-pages.yml", "--ref", "main"]);
			} else {
				triggered = sh(ctx.cwd, "git", ["push", "origin", "main"]);
			}
			if (triggered.code !== 0) {
				ctx.ui.notify(
					`/rag-web-pages-deploy: trigger failed.\n${triggered.stdout}\n${triggered.stderr}`,
					"error",
				);
				ctx.ui.setStatus("rag-web-pages-deploy", "");
				return;
			}
			ctx.ui.notify(`/rag-web-pages-deploy: triggered.\n${triggered.stdout.trim()}`, "info");

			// 6. Tail the run.
			ctx.ui.setStatus("rag-web-pages-deploy", "tailing workflow run");
			const watch = sh(ctx.cwd, "gh", ["run", "watch", "--exit-status"]);
			const watchBody = (watch.stdout || watch.stderr).trim();
			if (watch.code !== 0) {
				const pointer = existsSync(join(ctx.cwd, REFERENCE, "troubleshooting.md"))
					? `\nSee ${REFERENCE}/troubleshooting.md`
					: "";
				ctx.ui.notify(`/rag-web-pages-deploy FAIL during run.\n${watchBody}${pointer}`, "error");
				ctx.ui.setStatus("rag-web-pages-deploy", "");
				return;
			}

			// 7. On success, dispatch verify.
			ctx.ui.setStatus("rag-web-pages-deploy", `dispatching ${AGENT_VERIFY}`);
			const verify = await dispatchAgent(
				ctx.cwd,
				AGENT_VERIFY,
				"Verify the deployed site against the live URL; report structured result.",
			);
			const verifyBody = verify.stdout.trim() || verify.stderr.trim() || "(no verify output)";

			// 8. Commit gate (never commits).
			const report = [
				"/rag-web-pages-deploy complete",
				"",
				"── Workflow run ────────────────────────",
				watchBody,
				"",
				"── Verify report ───────────────────────",
				verifyBody,
				"",
				"── Commit gate (operator decision) ─────",
				"  Deploys do not produce uncommitted changes in this repo; the",
				"  workflow publishes from the committed site/ tree. If you have",
				"  follow-up edits (e.g., notes in docs/), stage and commit them",
				"  manually. /rag-web-pages-deploy never auto-commits.",
			].join("\n");
			ctx.ui.notify(report, verify.code === 0 ? "info" : "warning");
			ctx.ui.setStatus("rag-web-pages-deploy", "");
		},
	});

	// ── /rag-web-pages-rollback ─────────────────
	pi.registerCommand("rag-web-pages-rollback", {
		description: `Dispatch ${AGENT_ROLLBACK_ADVISOR}; present proposal + both execution paths. Never executes.`,
		handler: async (args, ctx) => {
			ctx.ui.setStatus("rag-web-pages-rollback", `dispatching ${AGENT_ROLLBACK_ADVISOR}`);
			const task = (args || "").trim()
				|| "Propose a rollback given the last three deployments. Read-only; do not execute anything.";
			const result = await dispatchAgent(ctx.cwd, AGENT_ROLLBACK_ADVISOR, task);
			ctx.ui.setStatus("rag-web-pages-rollback", "");

			const proposal = result.stdout.trim() || result.stderr.trim() || "(no proposal)";
			const runbook = readIfExists(join(ctx.cwd, REFERENCE, "rollback-runbook.md")) || "";

			// Extract the two execution paths from the runbook. If the runbook is
			// missing, fall back to the canonical short form from the CC command.
			let pathA = "Path A — Pages UI. Fastest; recommended for speed.";
			let pathB = "Path B — gh workflow run deploy-pages.yml --ref <good-SHA>. Slower (full preflight + deploy), works when the Pages UI is unavailable.";

			if (runbook) {
				// Pass the runbook text through verbatim — paraphrasing rots per CC constraints.
				pathA = `Path A (from ${REFERENCE}/rollback-runbook.md):\n${runbook}`;
				pathB = ""; // runbook contains both paths already
			}

			const report = [
				"/rag-web-pages-rollback — advisor proposal (NOT executed)",
				"",
				"── Proposal (advisor, verbatim) ────────",
				proposal,
				"",
				"── Execution paths (operator runs one) ─",
				pathA,
				pathB,
				"",
				"STOP. /rag-web-pages-rollback never executes a rollback.",
				"Operator chooses a path and runs the commands manually.",
			].filter(l => l !== null).join("\n");
			ctx.ui.notify(report, "warning");
		},
	});
}
