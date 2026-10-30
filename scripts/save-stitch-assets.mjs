import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../docs/stitch-workroom");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const stepsBase = "C:/Users/user/.gemini/antigravity/brain/f730e4e5-303d-4da1-b761-a0c73b0ca8d1/.system_generated/steps";

const files = [
  { step: 671, type: "html", file: "1-order.html" },
  { step: 701, type: "image", file: "1-order.png" },
  { step: 705, type: "html", file: "2-new-product.html" },
  { step: 707, type: "image", file: "2-new-product.png" },
  { step: 709, type: "html", file: "2-review-product.html" },
  { step: 711, type: "html", file: "3-makepossible-result.html" },
  { step: 713, type: "image", file: "3-makepossible-result.png" },
  { step: 715, type: "html", file: "4-proposal.html" },
  { step: 717, type: "image", file: "4-proposal.png" },
  { step: 719, type: "html", file: "5-inventory.html" },
  { step: 721, type: "image", file: "5-inventory.png" },
];

for (const item of files) {
  const p = path.join(stepsBase, `${item.step}/output.txt`);
  if (!fs.existsSync(p)) {
    console.error(`Step output not found: ${p}`);
    continue;
  }
  const raw = fs.readFileSync(p, "utf-8");
  const data = JSON.parse(raw);
  const outPath = path.join(outDir, item.file);
  if (item.type === "html") {
    fs.writeFileSync(outPath, data.html ?? raw, "utf-8");
    console.log(`Saved ${item.file} (${data.html?.length ?? 0} chars)`);
  } else if (item.type === "image") {
    const buffer = Buffer.from(data.image, "base64");
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved ${item.file} (${buffer.length} bytes)`);
  }
}
console.log("All Stitch assets processed successfully!");
