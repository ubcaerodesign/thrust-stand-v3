import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the target version from package.json
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const newVersion = pkg.version;

console.log(`[VERSION SYNC] Synchronizing version to v${newVersion}...`);

// Update tauri.conf.json
const tauriConfPath = path.join(__dirname, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.package.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
  console.log(`✓ Updated src-tauri/tauri.conf.json -> ${newVersion}`);
}

// Update Cargo.toml
const cargoPath = path.join(__dirname, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoPath)) {
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');
  cargoContent = cargoContent.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`);
  fs.writeFileSync(cargoPath, cargoContent, 'utf8');
  console.log(`✓ Updated src-tauri/Cargo.toml -> ${newVersion}`);
}

console.log('[VERSION SYNC] All files synchronized successfully.');