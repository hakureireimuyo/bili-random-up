import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = process.cwd();
const distExtension = join(root, "dist", "extension");
const outputDir = join(root, "dist", "packages");

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Read the manifest to get version
const manifestPath = join(distExtension, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const version = manifest.version;

console.log(`\n📦 Packaging extension version ${version}...`);

// Check if 7-Zip is available
let zipFile;
try {
  execSync("7z", { stdio: "pipe" });
  console.log("✅ Using 7-Zip for packaging...");

  // Create ZIP file
  zipFile = join(outputDir, `bili-random-up-v${version}.zip`);
  execSync(`7z a -tzip "${zipFile}" "${distExtension}\*"`, { stdio: "inherit" });

  console.log(`✅ ZIP file created: ${zipFile}`);

} catch (error) {
  console.log("⚠️  7-Zip not found, trying PowerShell Compress-Archive...");

  try {
    zipFile = join(outputDir, `bili-random-up-v${version}.zip`);
    execSync(
      `powershell -Command "Compress-Archive -Path '${distExtension}\*' -DestinationPath '${zipFile}' -Force"`,
      { stdio: "inherit" }
    );

    console.log(`✅ ZIP file created: ${zipFile}`);

  } catch (error) {
    console.error("❌ Failed to create package. Please manually zip the extension folder:");
    console.log(distExtension);
    process.exit(1);
  }
}

// Git operations
console.log(`\n📝 Preparing GitHub release for version ${version}...`);

try {
  // Stage all changes
  console.log("\n🔄 Staging changes...");
  execSync("git add -A", { stdio: "inherit" });

  // Commit changes
  console.log("\n💾 Committing changes...");
  execSync(`git commit -m "chore: release version ${version}"`, { stdio: "inherit" });

  // Tag the release
  console.log(`\n🏷️  Creating tag v${version}...`);
  execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: "inherit" });

  // Push to remote
  console.log("\n⬆️  Pushing to remote repository...");
  execSync("git push origin main", { stdio: "inherit" });
  execSync(`git push origin v${version}`, { stdio: "inherit" });

  console.log(`\n✅ Successfully released version ${version}!`);
  console.log(`\n📦 Package file: ${zipFile}`);
  console.log(`\n🎉 Don't forget to upload the ZIP file to GitHub Releases!`);
  console.log(`   Visit: https://github.com/your-username/bili-random-up/releases/new`);

} catch (error) {
  console.error("\n❌ Error during Git operations:");
  console.error(error.message);
  process.exit(1);
}
