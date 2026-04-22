/**
 * rag-web-checkpoint — per-turn git commit in interactive Pi TUI sessions.
 *
 * Fires once per turn. Writes an empty git commit so that `git reset --hard HEAD^`
 * restores pre-turn state if the agent makes a wrong move. Non-interactive
 * subprocess runs pass --no-extensions, so they bypass this and issue their own
 * checkpoints at the launcher / fanout layer (see tools/scripts/rag-web-pi-team.sh
 * and .pi/extensions/rag-web-team.ts).
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("turn_start", async (_event, ctx) => {
		const agentName = ctx.model?.id || "interactive";
		const iso = new Date().toISOString();
		const message = `pi-checkpoint: ${agentName} ${iso}`;

		try {
			await pi.exec("git", ["commit", "--allow-empty", "-m", message]);
			ctx.ui?.notify?.(`checkpoint: ${message}`, "info");
		} catch (err: any) {
			ctx.ui?.notify?.(`checkpoint failed: ${err?.message || err}`, "warning");
		}
	});
}
