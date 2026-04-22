/**
 * rag-web-preview — thin Pi-TUI wrapper over tools/scripts/preview.sh.
 *
 * Mirrors one CC primitive:
 *   - /rag-web-preview ↔ .claude/commands/rag-web-preview.md
 *
 * Why this is a standalone extension (not bundled): the preview server is a
 * dev tool, not part of either session lifecycle or the Pages pipeline. It
 * shares no state with the other rag-web commands — mixing it into the
 * session or pages extension would couple unrelated concerns. The Go binary
 * at tools/preview/ and the shell launcher at tools/scripts/preview.sh are
 * already harness-agnostic; this extension's job is just to expose the
 * subcommand verbs through a slash command and relay output verbatim.
 *
 * Accepts one arg — the subcommand: start | stop | status | restart | logs.
 * No arg defaults to `status`, matching the CC side.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const VALID_VERBS = new Set(["start", "stop", "status", "restart", "logs"]);

export default function (pi: ExtensionAPI) {
	pi.registerCommand("rag-web-preview", {
		description: "Manage the local preview server (start|stop|status|restart|logs; default: status)",
		getArgumentCompletions: (prefix) => {
			const verbs = Array.from(VALID_VERBS);
			const filtered = verbs.filter(v => v.startsWith(prefix));
			return filtered.length > 0 ? filtered.map(v => ({ value: v, label: v })) : null;
		},
		handler: async (args, ctx) => {
			const verb = (args || "").trim() || "status";

			if (!VALID_VERBS.has(verb)) {
				ctx.ui.notify(
					`/rag-web-preview: unknown subcommand "${verb}"\nValid: ${Array.from(VALID_VERBS).join(", ")}`,
					"error",
				);
				return;
			}

			const script = join(ctx.cwd, "tools", "scripts", "preview.sh");
			if (!existsSync(script)) {
				ctx.ui.notify(`/rag-web-preview: tools/scripts/preview.sh not found`, "error");
				return;
			}

			ctx.ui.setStatus("rag-web-preview", `preview.sh ${verb}`);

			// `logs` is `tail -f` — it would block the TUI. Print a pointer and
			// let the operator run it in a separate shell. This is a faithful
			// degradation: CC relays the script verbatim, which for `logs` means
			// CC would also never return while the tail runs; Pi's TUI handler
			// contract is turn-based, so we can't stream indefinitely.
			if (verb === "logs") {
				ctx.ui.notify(
					[
						"/rag-web-preview logs — `tail -f` cannot run inside a Pi slash command handler.",
						"Run this in a separate shell:",
						"",
						`  bash ${script} logs`,
						"",
						"Or invoke `status` here for a one-shot snapshot.",
					].join("\n"),
					"info",
				);
				ctx.ui.setStatus("rag-web-preview", "");
				return;
			}

			await new Promise<void>((resolve) => {
				const proc = spawn("bash", [script, verb], {
					cwd: ctx.cwd,
					stdio: ["ignore", "pipe", "pipe"],
					env: { ...process.env },
				});

				let stdout = "";
				let stderr = "";
				proc.stdout!.setEncoding("utf-8");
				proc.stderr!.setEncoding("utf-8");
				proc.stdout!.on("data", (chunk) => { stdout += chunk; });
				proc.stderr!.on("data", (chunk) => { stderr += chunk; });

				proc.on("close", (code) => {
					const body = (stdout.trim() + (stderr.trim() ? `\n${stderr.trim()}` : "")).trim()
						|| "(no output)";
					const level = (code ?? 1) === 0 ? "info" : "error";
					ctx.ui.notify(`/rag-web-preview ${verb} (exit ${code ?? 1})\n${body}`, level);
					ctx.ui.setStatus("rag-web-preview", "");
					resolve();
				});
				proc.on("error", (err) => {
					ctx.ui.notify(`/rag-web-preview: spawn failed — ${err.message}`, "error");
					ctx.ui.setStatus("rag-web-preview", "");
					resolve();
				});
			});
		},
	});
}
