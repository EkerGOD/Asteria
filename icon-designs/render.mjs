import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";

const dir = "icon-designs";
const files = (await readdir(dir)).filter((f) => f.endsWith(".svg"));

for (const file of files) {
  const input = join(dir, file);
  const output = join(dir, basename(file, ".svg") + ".png");
  await sharp(input, { density: 300 }).resize(1024, 1024).png().toFile(output);
  console.log(`✓ ${file} → ${basename(output)}`);
}
