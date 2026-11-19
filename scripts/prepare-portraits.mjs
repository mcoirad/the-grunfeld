import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOT = path.resolve(
  process.argv[2] ?? path.join(ROOT, "assets/img/headshots"),
);
const OUTPUT_ROOT = path.join(ROOT, "public/images/executives");
const NEW_PORTRAITS = path.join(SOURCE_ROOT, "new portraits");

function findSources(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(png|jpe?g)$/i.test(entry.name))
    .map((entry) => path.join(directory, entry.name));
}

const sourceBySlug = new Map();
for (const source of findSources(SOURCE_ROOT)) {
  sourceBySlug.set(path.basename(source, path.extname(source)), source);
}
for (const source of findSources(NEW_PORTRAITS)) {
  sourceBySlug.set(path.basename(source, path.extname(source)), source);
}

fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
let prepared = 0;
for (const [slug, source] of sourceBySlug) {
  const image = sharp(source).rotate();
  const metadata = await image.metadata();
  const pipeline = image.resize({
    width: 520,
    height: 520,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    withoutEnlargement: true,
  });

  if (!metadata.hasAlpha && metadata.width && metadata.width >= 600) {
    const { data, info } = await pipeline
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let index = 0; index < data.length; index += info.channels) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const minimum = Math.min(red, green, blue);
      const maximum = Math.max(red, green, blue);
      if (minimum > 238 && maximum - minimum < 16) {
        data[index + 3] = 0;
      } else if (minimum > 218 && maximum - minimum < 22) {
        data[index + 3] = Math.round(((238 - minimum) / 20) * 255);
      }
    }
    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    })
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(path.join(OUTPUT_ROOT, `${slug}.webp`));
  } else {
    await pipeline
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(path.join(OUTPUT_ROOT, `${slug}.webp`));
  }
  prepared += 1;
}

process.stdout.write(`Prepared ${prepared} executive portraits.\n`);
