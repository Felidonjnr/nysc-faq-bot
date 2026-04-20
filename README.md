# NYSC FAQ Assistant – Rebuilt UI

This version is a cleaner Next.js rebuild of the chat interface.

## Files
- `pages/index.js` – minimal light-theme chat UI
- `pages/api/chat.js` – Azure Question Answering API proxy with follow-up prompt support
- `styles/globals.css` – clean layout and drawer styles

## Environment variables
Use these in Vercel:

```env
AZURE_LANGUAGE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_LANGUAGE_KEY=your-key
AZURE_PROJECT_NAME=nysc-faq-assistant
AZURE_DEPLOYMENT_NAME=production
PUBLIC_SAFE_CONFIDENCE=0.45
```

## What changed
- Full-height clean chat layout
- Very light UI with reduced clutter
- Follow-up prompts now show under assistant replies
- Greeting messages return starter prompts
- Review button saves answers to local browser storage
- Review drawer lets you inspect or export flagged answers

## Local run
```bash
npm install
npm run dev
```
