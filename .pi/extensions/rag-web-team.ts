/**
 * rag-web-team — Pi-side parallel fanout for the four rag-web docs-writers.
 *
 * Mirror of .claude/commands/rag-web-pi-close.md. Operator runs Pi's TUI with
 * this extension loaded, types /rag-web-team <task>, and the four writers fan
 * out in parallel with an in-TUI grid widget showing per-agent progress.
 *
 * Crib source: examples/pi-vs-claude-code/extensions/agent-team.ts (reference
 * grid + subprocess-spawn + JSONL parsing). Dispatcher/team-selector layer is
 * removed — membership is fixed at the four rag-web writers.
 *
 * Safety: issues a `pi-checkpoint: rag-web-team <iso>` commit before fanout.
 * Subprocess Pi instances bypass the TUI-layer rag-web-checkpoint extension
 * via --no-extensions; this extension provides the equivalent safety at the
 * orchestrator layer.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { spawn } from "child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";

// ── Constants ────────────────────────────────────

const AGENTS = [
	"rag-web-docs-changelog-writer",
	"rag-web-docs-dev-writer",
	"rag-web-docs-user-writer",
	"rag-web-docs-agent-writer",
];

const TOOL_ALLOWLIST = "read,grep,find,ls,write,edit";

// ── Types ────────────────────────────────────────

interface AgentDef {
	name: string;
	description: string;
	tools: string;
	systemPrompt: string;
	file: string;
}

interface AgentState {
	def: AgentDef;
	status: "idle" | "running" | "done" | "error";
	task: string;
	toolCount: number;
	elapsed: number;
	lastWork: string;
	contextPct: number;
	exitCode?: number;
	timer?: ReturnType<typeof setInterval>;
}

// ── Helpers ──────────────────────────────────────

function displayName(name: string): string {
	return name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function parseAgentFile(filePath: string): AgentDef | null {
	try {
		const raw = readFileSync(filePath, "utf-8");
		const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return null;

		const frontmatter: Record<string, string> = {};
		for (const line of match[1].split("\n")) {
			const idx = line.indexOf(":");
			if (idx > 0) {
				frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
			}
		}

		if (!frontmatter.name) return null;

		return {
			name: frontmatter.name,
			description: frontmatter.description || "",
			tools: frontmatter.tools || TOOL_ALLOWLIST,
			systemPrompt: match[2].trim(),
			file: filePath,
		};
	} catch {
		return null;
	}
}

function loadProfile(cwd: string, profile: string): Record<string, string> {
	const path = join(cwd, ".pi", "profiles", `${profile}.json`);
	if (!existsSync(path)) throw new Error(`profile not found: ${path}`);
	const parsed = JSON.parse(readFileSync(path, "utf-8"));
	const map: Record<string, string> = { default: parsed.default };
	for (const [k, v] of Object.entries(parsed.per_agent || {})) {
		map[k] = v as string;
	}
	return map;
}

// ── Extension ────────────────────────────────────

export default function (pi: ExtensionAPI) {
	const states: Map<string, AgentState> = new Map();
	let widgetCtx: any;
	let gridCols = 2;
	let contextWindow = 0;

	function loadAgents(cwd: string) {
		states.clear();
		for (const name of AGENTS) {
			const def = parseAgentFile(join(cwd, ".pi", "agents", `${name}.md`));
			if (!def) throw new Error(`agent definition missing or malformed: ${name}`);
			states.set(name, {
				def,
				status: "idle",
				task: "",
				toolCount: 0,
				elapsed: 0,
				lastWork: "",
				contextPct: 0,
			});
		}
	}

	// ── Grid rendering ─────────────────────────

	function renderCard(state: AgentState, colWidth: number, theme: any): string[] {
		const w = colWidth - 2;
		const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max - 3) + "..." : s;

		const statusColor = state.status === "idle" ? "dim"
			: state.status === "running" ? "accent"
			: state.status === "done" ? "success" : "error";
		const statusIcon = state.status === "idle" ? "o"
			: state.status === "running" ? "*"
			: state.status === "done" ? "[v]" : "[x]";

		const name = displayName(state.def.name);
		const nameStr = theme.fg("accent", theme.bold(truncate(name, w)));
		const nameVisible = Math.min(name.length, w);

		const statusStr = `${statusIcon} ${state.status}`;
		const timeStr = state.status !== "idle" ? ` ${Math.round(state.elapsed / 1000)}s` : "";
		const statusLine = theme.fg(statusColor, statusStr + timeStr);
		const statusVisible = statusStr.length + timeStr.length;

		const filled = Math.ceil(state.contextPct / 20);
		const bar = "#".repeat(filled) + "-".repeat(5 - filled);
		const ctxStr = `[${bar}] ${Math.ceil(state.contextPct)}%`;
		const ctxLine = theme.fg("dim", ctxStr);
		const ctxVisible = ctxStr.length;

		const workRaw = state.task
			? (state.lastWork || state.task)
			: state.def.description;
		const workText = truncate(workRaw, Math.min(50, w - 1));
		const workLine = theme.fg("muted", workText);
		const workVisible = workText.length;

		const top = "┌" + "─".repeat(w) + "┐";
		const bot = "└" + "─".repeat(w) + "┘";
		const border = (content: string, visLen: number) =>
			theme.fg("dim", "│") + content + " ".repeat(Math.max(0, w - visLen)) + theme.fg("dim", "│");

		return [
			theme.fg("dim", top),
			border(" " + nameStr, 1 + nameVisible),
			border(" " + statusLine, 1 + statusVisible),
			border(" " + ctxLine, 1 + ctxVisible),
			border(" " + workLine, 1 + workVisible),
			theme.fg("dim", bot),
		];
	}

	function updateWidget() {
		if (!widgetCtx) return;

		widgetCtx.ui.setWidget("rag-web-team", (_tui: any, theme: any) => {
			const text = new Text("", 0, 1);

			return {
				render(width: number): string[] {
					if (states.size === 0) {
						text.setText(theme.fg("dim", "rag-web-team: no agents loaded"));
						return text.render(width);
					}

					const cols = Math.min(gridCols, states.size);
					const gap = 1;
					const colWidth = Math.floor((width - gap * (cols - 1)) / cols);
					const agents = Array.from(states.values());
					const rows: string[][] = [];

					for (let i = 0; i < agents.length; i += cols) {
						const rowAgents = agents.slice(i, i + cols);
						const cards = rowAgents.map(a => renderCard(a, colWidth, theme));

						while (cards.length < cols) {
							cards.push(Array(6).fill(" ".repeat(colWidth)));
						}

						const cardHeight = cards[0].length;
						for (let line = 0; line < cardHeight; line++) {
							rows.push(cards.map(card => card[line] || ""));
						}
					}

					const output = rows.map(cols => cols.join(" ".repeat(gap)));
					text.setText(output.join("\n"));
					return text.render(width);
				},
				invalidate() {
					text.invalidate();
				},
			};
		});
	}

	// ── Run one agent as a Pi subprocess ────────

	function runAgent(
		name: string,
		task: string,
		profileMap: Record<string, string>,
		runDir: string,
	): Promise<void> {
		return new Promise((resolve) => {
			const state = states.get(name);
			if (!state) { resolve(); return; }

			state.status = "running";
			state.task = task;
			state.toolCount = 0;
			state.elapsed = 0;
			state.lastWork = "";
			updateWidget();

			const model = profileMap[name] || profileMap.default;
			const startTime = Date.now();
			state.timer = setInterval(() => {
				state.elapsed = Date.now() - startTime;
				updateWidget();
			}, 1000);

			const logPath = join(runDir, `${name}.log`);
			writeFileSync(logPath, "");

			const args = [
				"--mode", "json",
				"-p",
				"--no-extensions",
				"--model", model,
				"--tools", state.def.tools,
				"--thinking", "off",
				"--append-system-prompt", state.def.systemPrompt,
				task,
			];

			const proc = spawn("pi", args, {
				stdio: ["ignore", "pipe", "pipe"],
				env: { ...process.env },
			});

			let buffer = "";
			const textChunks: string[] = [];

			proc.stdout!.setEncoding("utf-8");
			proc.stdout!.on("data", (chunk: string) => {
				appendFileSync(logPath, chunk);
				buffer += chunk;
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const event = JSON.parse(line);
						if (event.type === "message_update") {
							const delta = event.assistantMessageEvent;
							if (delta?.type === "text_delta") {
								textChunks.push(delta.delta || "");
								const full = textChunks.join("");
								const last = full.split("\n").filter((l: string) => l.trim()).pop() || "";
								state.lastWork = last;
								updateWidget();
							}
						} else if (event.type === "tool_execution_start") {
							state.toolCount++;
							updateWidget();
						} else if (event.type === "message_end") {
							const msg = event.message;
							if (msg?.usage && contextWindow > 0) {
								state.contextPct = ((msg.usage.input || 0) / contextWindow) * 100;
								updateWidget();
							}
						}
					} catch {}
				}
			});

			proc.stderr!.setEncoding("utf-8");
			proc.stderr!.on("data", (chunk: string) => {
				appendFileSync(logPath, chunk);
			});

			proc.on("close", (code) => {
				clearInterval(state.timer);
				state.elapsed = Date.now() - startTime;
				state.exitCode = code ?? 1;
				state.status = code === 0 ? "done" : "error";

				const full = textChunks.join("");
				state.lastWork = full.split("\n").filter((l: string) => l.trim()).pop() || "";
				updateWidget();
				resolve();
			});

			proc.on("error", (err) => {
				clearInterval(state.timer);
				state.elapsed = Date.now() - startTime;
				state.exitCode = 1;
				state.status = "error";
				state.lastWork = `spawn error: ${err.message}`;
				appendFileSync(logPath, `\nspawn error: ${err.message}\n`);
				updateWidget();
				resolve();
			});
		});
	}

	// ── Command ────────────────────────────────

	pi.registerCommand("rag-web-team", {
		description: "Fan out the four rag-web docs-writers in parallel on a single task",
		handler: async (args, ctx) => {
			widgetCtx = ctx;
			contextWindow = ctx.model?.contextWindow || 0;

			const task = (args || "").trim();
			if (!task) {
				ctx.ui.notify("Usage: /rag-web-team <task>", "error");
				return;
			}

			try {
				loadAgents(ctx.cwd);
			} catch (err: any) {
				ctx.ui.notify(`rag-web-team: ${err?.message || err}`, "error");
				return;
			}

			const profile = process.env.RAG_WEB_PI_PROFILE || "anthropic";
			let profileMap: Record<string, string>;
			try {
				profileMap = loadProfile(ctx.cwd, profile);
			} catch (err: any) {
				ctx.ui.notify(`rag-web-team: ${err?.message || err}`, "error");
				return;
			}

			const iso = new Date().toISOString();
			const runDir = join(ctx.cwd, ".the-grid", "pi-runs", iso.replace(/[:.]/g, "-"));
			mkdirSync(runDir, { recursive: true });
			writeFileSync(join(runDir, "task.prompt"), task);

			// Pre-fanout checkpoint — subprocess Pi runs pass --no-extensions, so
			// they bypass rag-web-checkpoint.ts; we cover the fanout boundary here.
			try {
				await pi.exec("git", [
					"commit", "--allow-empty",
					"-m", `pi-checkpoint: rag-web-team ${iso}`,
				]);
				ctx.ui.notify(`checkpoint: pi-checkpoint: rag-web-team ${iso}`, "info");
			} catch (err: any) {
				ctx.ui.notify(`checkpoint failed: ${err?.message || err}`, "warning");
			}

			updateWidget();
			ctx.ui.notify(`rag-web-team: fanning out ${AGENTS.length} agents via ${profile}`, "info");

			await Promise.all(AGENTS.map(name => runAgent(name, task, profileMap, runDir)));

			const summaryLines = AGENTS.map(n => {
				const s = states.get(n)!;
				const elapsed = Math.round(s.elapsed / 1000);
				return `  ${displayName(n)}: ${s.status} (exit ${s.exitCode ?? "?"}, ${elapsed}s)`;
			});

			const anyFail = AGENTS.some(n => (states.get(n)?.exitCode ?? 1) !== 0);
			const header = anyFail
				? "rag-web-team complete (with errors)"
				: "rag-web-team complete";
			ctx.ui.notify(
				`${header}\n${summaryLines.join("\n")}\nLogs: ${runDir}`,
				anyFail ? "warning" : "info",
			);
		},
	});

	// ── Session start ──────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		widgetCtx = ctx;
		contextWindow = ctx.model?.contextWindow || 0;

		try {
			loadAgents(ctx.cwd);
			updateWidget();
			ctx.ui.notify(
				`rag-web-team loaded (${AGENTS.length} agents)\n` +
				`/rag-web-team <task>   Fan out all four writers in parallel\n` +
				`Profile: $RAG_WEB_PI_PROFILE or "anthropic"`,
				"info",
			);
		} catch (err: any) {
			ctx.ui.notify(`rag-web-team: ${err?.message || err}`, "warning");
		}
	});
}
