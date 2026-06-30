import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const publicRoot = path.join(root, "public");
const generatedRoot = path.join(publicRoot, "assets", "generated");
const manifestPath = path.join(publicRoot, "assets", "manifest.json");
const allowedDirectories = new Set(["avatars", "map", "items", "scenes"]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];

if (manifest.assets.length !== manifest.expectedCount) {
  failures.push(`manifest count ${manifest.assets.length} != ${manifest.expectedCount}`);
}

const ids = new Set();
const paths = new Set();

for (const asset of manifest.assets) {
  if (ids.has(asset.id)) failures.push(`duplicate id: ${asset.id}`);
  if (paths.has(asset.path)) failures.push(`duplicate path: ${asset.path}`);
  ids.add(asset.id);
  paths.add(asset.path);

  if (asset.review !== "approved") failures.push(`unreviewed asset: ${asset.id}`);
  if (!asset.promptId) failures.push(`missing promptId: ${asset.id}`);

  const relativePath = asset.path.replace(/^\/+/, "");
  const absolutePath = path.resolve(publicRoot, relativePath);
  const expectedPrefix = `${path.resolve(generatedRoot)}${path.sep}`;
  if (!absolutePath.startsWith(expectedPrefix)) {
    failures.push(`asset outside generated directory: ${asset.path}`);
    continue;
  }

  const relativeToGenerated = path.relative(generatedRoot, absolutePath);
  const directory = relativeToGenerated.split(path.sep)[0];
  if (!allowedDirectories.has(directory)) {
    failures.push(`asset in unexpected directory: ${asset.path}`);
  }

  try {
    const details = await stat(absolutePath);
    if (!details.isFile() || details.size === 0) {
      failures.push(`empty or non-file asset: ${asset.path}`);
    }
  } catch {
    failures.push(`missing asset: ${asset.path}`);
  }
}

const diskPaths = [];
for (const directory of allowedDirectories) {
  const directoryPath = path.join(generatedRoot, directory);
  for (const file of await readdir(directoryPath)) {
    const absolutePath = path.join(directoryPath, file);
    if ((await stat(absolutePath)).isFile()) {
      diskPaths.push(`/${path.relative(publicRoot, absolutePath).split(path.sep).join("/")}`);
    }
  }
}

for (const diskPath of diskPaths) {
  if (!paths.has(diskPath)) failures.push(`asset lacks manifest entry: ${diskPath}`);
}

if (diskPaths.length !== manifest.expectedCount) {
  failures.push(`disk count ${diskPaths.length} != ${manifest.expectedCount}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Validated ${manifest.expectedCount} approved imagegen assets.`);
