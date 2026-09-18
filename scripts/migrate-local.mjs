import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wrangler = join(root, "node_modules", ".bin", "wrangler");
const config = join(root, "wrangler.local.jsonc");
const persist = join(root, ".wrangler", "state");

const migrationChecks = [
  ["0000_jittery_sunfire.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='projects'"],
  ["0001_large_martin_li.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='channels'"],
  ["0002_icy_skullbuster.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='subscriptions'"],
  ["0003_chemical_sinister_six.sql", "SELECT 1 AS present FROM pragma_table_info('clips') WHERE name='reason'"],
  ["0004_grey_harry_osborn.sql", "SELECT 1 AS present FROM pragma_table_info('clips') WHERE name='logo_key'"],
  ["0005_wise_sharon_ventura.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='campaigns'"],
  ["0006_nosy_jean_grey.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='revenue_entries'"],
  ["0007_local_render_controls.sql", "SELECT 1 AS present FROM pragma_table_info('clips') WHERE name='captions_enabled'"],
  ["0007_nifty_infant_terrible.sql", "SELECT 1 AS present FROM pragma_table_info('clips') WHERE name='font_family'"],
  ["0008_green_khan.sql", "SELECT 1 AS present FROM pragma_table_info('clips') WHERE name='title_effect'"],
  ["0009_worried_king_cobra.sql", "SELECT 1 AS present FROM pragma_table_info('clips') WHERE name='title_animation'"],
  ["0010_clean_the_leader.sql", "SELECT 1 AS present FROM pragma_table_info('clips') WHERE name='render_job_id'"],
  ["0011_green_xorn.sql", "SELECT 1 AS present FROM pragma_table_info('clips') WHERE name='transcript_cut'"],
  ["0012_flippant_night_nurse.sql", "SELECT 1 AS present FROM pragma_table_info('projects') WHERE name='target_duration'"],
  ["0013_sturdy_lady_ursula.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='studio_preferences'"],
  ["0014_marvelous_katie_power.sql", "SELECT 1 AS present FROM pragma_table_info('clips') WHERE name='reframe_mode'"],
  ["0015_bright_redwing.sql", "SELECT 1 AS present FROM pragma_table_info('studio_preferences') WHERE name='brand_voice'"],
  ["0016_sweet_starbolt.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='clip_versions'"],
  ["0017_soft_drax.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='activity_logs'"],
  ["0018_abnormal_starjammers.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='workspace_members'"],
  ["0019_tearful_synch.sql", "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='oauth_states'"],
];

function run(args, capture = false) {
  const result = spawnSync(wrangler, args, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.status !== 0) {
    if (capture) process.stderr.write(result.stderr || result.stdout || "");
    process.exit(result.status || 1);
  }
  return result.stdout || "";
}

function query(sql) {
  const output = run([
    "d1", "execute", "DB", "--local", "--config", config,
    "--persist-to", persist, "--command", sql, "--json",
  ], true);
  const result = JSON.parse(output);
  return result?.[0]?.results?.[0] || {};
}

const status = query(
  `SELECT ${migrationChecks.map(([, check], index) => `EXISTS(${check.replace(/^SELECT 1 AS present FROM /, "SELECT 1 FROM ")}) AS m${index}`).join(",")}`,
);
let applied = 0;
for (const [index, [filename]] of migrationChecks.entries()) {
  if (status[`m${index}`]) continue;
  console.log(`Applying local migration ${filename}`);
  run([
    "d1", "execute", "DB", "--local", "--config", config,
    "--persist-to", persist, "--file", join(root, "drizzle", filename), "--yes",
  ]);
  applied++;
}
console.log(applied ? `Local database updated (${applied} migrations).` : "Local database is up to date.");
