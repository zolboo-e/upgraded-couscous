import { Hono } from "hono";
import { getSandboxContext, getSessionPaths, mountR2Bucket } from "../services/index.js";
import type { AppEnv, FileEntry } from "../types/index.js";

/**
 * Parse the output of find command into FileEntry array
 */
function parseFileOutput(output: string): FileEntry[] {
  if (output.trim() === "DIR_NOT_FOUND" || !output.trim()) {
    return [];
  }
  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [type, size, mtime, ...pathParts] = line.split(" ");
      const path = pathParts.join(" ");
      return {
        name: path || ".",
        type: type === "d" ? ("directory" as const) : ("file" as const),
        size: Number.parseInt(size, 10),
        modified: new Date(Number.parseFloat(mtime) * 1000).toISOString(),
      };
    });
}

/**
 * Build the find command for listing files
 */
function buildListCommand(path: string): string {
  return `
		if [ -d "${path}" ]; then
			find "${path}" -maxdepth 2 -printf '%y %s %T@ %P\\n' 2>/dev/null || echo ""
		else
			echo "DIR_NOT_FOUND"
		fi
	`;
}

export const filesRoute = new Hono<AppEnv>().get("/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const { sandbox, isProduction: isProd } = getSandboxContext(c.env, sessionId);

  // Mount R2 bucket only in production
  if (isProd) {
    await mountR2Bucket(sandbox, c.env);
  }

  const { persistentPath, localPath } = getSessionPaths(sessionId);

  // Query persistent and local storage
  const [persistentResult, localResult] = await Promise.all([
    isProd
      ? sandbox.exec(buildListCommand(persistentPath))
      : Promise.resolve({ stdout: "DIR_NOT_FOUND" }),
    sandbox.exec(buildListCommand(localPath)),
  ]);

  return c.json({
    sessionId,
    persistent: parseFileOutput(persistentResult.stdout),
    local: parseFileOutput(localResult.stdout),
  });
});
