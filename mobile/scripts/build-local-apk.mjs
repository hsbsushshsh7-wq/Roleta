import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk || !existsSync(sdk)) {
  throw new Error(
    "Configure ANDROID_HOME com o caminho do Android SDK antes de compilar.",
  );
}
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(
  process.execPath,
  [
    "node_modules/expo/bin/cli",
    "prebuild",
    "--platform",
    "android",
    "--no-install",
  ],
  root,
);
run(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  [
    ":app:assembleRelease",
    "--no-daemon",
    "--max-workers=2",
    `-PreactNativeArchitectures=${process.env.ROLETA_BUILD_ABIS || "arm64-v8a,armeabi-v7a"}`,
  ],
  path.join(root, "android"),
);
const built = path.join(
  root,
  "android/app/build/outputs/apk/release/app-release.apk",
);
const directory = path.join(root, "artifacts");
mkdirSync(directory, { recursive: true });
const destination = path.join(directory, "roleta.apk");
copyFileSync(built, destination);
const sha256 = createHash("sha256")
  .update(readFileSync(destination))
  .digest("hex");
console.log(
  `\nAPK standalone de testes: ${destination}\nSHA-256: ${sha256}\nAssinatura local: certificado de testes do projeto. Para lojas, use EAS com sua chave de produção.`,
);
