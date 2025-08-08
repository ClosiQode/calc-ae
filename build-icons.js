/*
  Génère les icônes nécessaires pour electron-builder à partir de logo.jpeg
  - build/icons/icon.ico (Windows)
  - build/icons/icon.icns (macOS)
  - build/icons/png/<sizes>.png (Linux)
*/
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const icongen = require('icon-gen');
const pngToIco = require('png-to-ico');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'logo.jpeg');
const OUT = path.join(ROOT, 'build', 'icons');
const OUT_PNG_DIR = path.join(OUT, 'png');

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function generateBasePng() {
  const basePng = path.join(OUT, 'base-1024.png');
  await sharp(SRC)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(basePng);
  return basePng;
}

async function generateLinuxPngs(basePng) {
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  await ensureDir(OUT_PNG_DIR);
  await Promise.all(sizes.map(async (s) => {
    const dest = path.join(OUT_PNG_DIR, `icon_${s}x${s}.png`);
    await sharp(basePng).resize(s, s).png().toFile(dest);
  }));
}

async function generateIcns(basePng) {
  // icon-gen sait générer ICNS depuis un PNG 1024
  await icongen(basePng, OUT, { icns: { name: 'icon' }, ico: false, report: false });
}

async function generateIco(basePng) {
  // png-to-ico depuis plusieurs tailles donne un ICO de bonne qualité
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = await Promise.all(sizes.map(async (s) => sharp(basePng).resize(s, s).png().toBuffer()));
  const ico = await pngToIco(buffers);
  await fs.promises.writeFile(path.join(OUT, 'icon.ico'), ico);
}

(async () => {
  try {
    if (!fs.existsSync(SRC)) throw new Error(`Fichier introuvable: ${SRC}`);
    await ensureDir(OUT);
    const basePng = await generateBasePng();
    await Promise.all([
      generateLinuxPngs(basePng),
      generateIcns(basePng),
      generateIco(basePng),
    ]);
    console.log('Icônes générées dans', OUT);
  } catch (e) {
    console.error('Échec génération icônes:', e.message);
    process.exitCode = 1;
  }
})();
