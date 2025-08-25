
# iShip Vessel Inspection AI

Full-stack web app (React + Node/Express) to upload vessel photos, analyze with Azure OpenAI (GPT-4o), and render a clean inspection report.

## 1) Setup

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
# edit .env with your Azure details:
#  AZURE_OPENAI_KEY=...
#  AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
#  AZURE_OPENAI_DEPLOYMENT=gpt-4o
#  AZURE_OPENAI_API_VERSION=2024-08-01-preview
npm i
npm start
# http://localhost:5001
```

```bash
# Terminal 2 — frontend
cd frontend
npm i
npm start
# http://localhost:3000
```

## 2) Notes

- Upload multiple images; you can keep adding more without losing existing ones.
- Right-side “AI Analysis Pipeline” shows **ETA**, **Tokens**, **Queue**, stage-by-stage progress, and logs.
- Summary page uses a **Risk Heatmap**, proportional counters, and per-photo findings. Markdown symbols are cleaned.
- Branding: header shows **iShip Vessel Inspection AI**.

## 3) Environment

Make sure your Azure OpenAI resource is deployed with a `gpt-4o` (or similar vision-capable) deployment and your key/endpoint are correct.
