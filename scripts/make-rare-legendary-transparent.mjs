/**
 * @deprecated Use `npm run sprites:transparent` (all sheets + feet baseline + text strip).
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync(process.execPath, [path.join(root, "scripts", "apply-sprite-sheet-transparency.mjs")], {
  stdio: "inherit",
  cwd: root,
});
process.exit(r.status ?? 0);
