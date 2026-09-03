import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const extensionDirectory = resolve("../../dist/extension");
const manifestPath = resolve(extensionDirectory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error("The production manifest must use Manifest V3.");
}

const permissions = manifest.permissions ?? [];
const allowedPermissions = new Set(["storage"]);
const unexpectedPermissions = permissions.filter(
  (permission) => !allowedPermissions.has(permission),
);

if (unexpectedPermissions.length > 0) {
  throw new Error(
    `Unexpected extension permissions: ${unexpectedPermissions.join(", ")}`,
  );
}

const referencedFiles = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  manifest.options_page,
].filter(Boolean);

await Promise.all(
  referencedFiles.map((file) => access(resolve(extensionDirectory, file))),
);

console.log(
  `Validated Manifest V3 with ${permissions.length} declared permission(s).`,
);
