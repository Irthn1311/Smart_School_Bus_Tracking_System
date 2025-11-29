import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontsDir = path.join(__dirname, "../assets/fonts");

// Ensure fonts directory exists
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Google Fonts API URLs for Noto Sans
const fonts = [
  {
    name: "NotoSans-Regular.ttf",
    url: "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Regular.ttf",
  },
  {
    name: "NotoSans-Bold.ttf",
    url: "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Bold.ttf",
  },
];

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          return downloadFile(response.headers.location, filepath)
            .then(resolve)
            .catch(reject);
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
  });
}

async function downloadFonts() {
  console.log("📥 Downloading Vietnamese fonts (Noto Sans)...\n");
  
  for (const font of fonts) {
    const filepath = path.join(fontsDir, font.name);
    
    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`✓ ${font.name} already exists, skipping...`);
      continue;
    }
    
    try {
      console.log(`⬇️  Downloading ${font.name}...`);
      await downloadFile(font.url, filepath);
      console.log(`✓ Successfully downloaded ${font.name}`);
    } catch (error) {
      console.error(`✗ Failed to download ${font.name}:`, error.message);
      console.log(`\n💡 Alternative: Please download manually from:`);
      console.log(`   https://fonts.google.com/noto/specimen/Noto+Sans`);
      console.log(`   And place the TTF files in: ${fontsDir}\n`);
    }
  }
  
  console.log("\n✅ Font download complete!");
  console.log(`📁 Fonts location: ${fontsDir}\n`);
}

downloadFonts().catch(console.error);

