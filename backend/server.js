
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// --- Azure OpenAI config ---
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || "";
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "";
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

if (!AZURE_OPENAI_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
  console.warn("⚠️ Missing Azure env vars. Set AZURE_OPENAI_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

// Save uploads on disk
const upload = multer({ dest: "uploads/" });

// Serve uploaded images back to the frontend
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Store last results in memory
let lastResults = {};

// Utility to call Azure OpenAI chat completions
async function azureChatCompletions(messages) {
  const base = AZURE_OPENAI_ENDPOINT.endsWith("/") ? AZURE_OPENAI_ENDPOINT : AZURE_OPENAI_ENDPOINT + "/";
  const url = `${base}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_OPENAI_KEY
    },
    body: JSON.stringify({
      temperature: 0.2,
      messages
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return content;
}

// Upload endpoint: accepts multiple images, returns analyses
app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).send("No files uploaded.");

    const results = {};
    for (const file of files) {
      const filePath = file.path;
      const b64 = fs.readFileSync(filePath, { encoding: "base64" });
      const contentType = "image/jpeg"; // demo-safe

      const messages = [
        { role: "system", content: "You are a senior marine safety inspector. Inspect the image and produce a concise report with bullets (prefix each line with '- '), clear headings (like 'Defects:'/'Hazards:'/'Recommendations:'), and finish with one 'Action:' line with exact steps. Do not include literal markdown characters like '*' or '#'." },
        {
          role: "user",
          content: [
            { type: "text", text: "Inspect this vessel/ship photo. Identify hazards, defects, and provide specific recommended improvements. Keep outputs very readable." },
            { type: "image_url", image_url: { url: `data:${contentType};base64,${b64}` } }
          ]
        }
      ];

      let analysis = "No analysis.";
      try {
        analysis = await azureChatCompletions(messages);
      } catch (e) {
        analysis = `Analysis failed: ${e.message}`;
      }

      results[file.originalname] = {
        filename: file.originalname,
        path: `/uploads/${path.basename(filePath)}`,
        analysis
      };
    }

    lastResults = results;
    res.json({ ok: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message || "Server error");
  }
});

// Summary endpoint for frontend
app.get("/summary", (req, res) => {
  res.json(lastResults || {});
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
