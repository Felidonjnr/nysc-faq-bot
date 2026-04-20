# NYSC FAQ Demo Assistant

A simple demo frontend for an Azure AI Language Custom Question Answering project.

## What is inside

- `index.html` – landing page and chat interface
- `styles.css` – styling
- `app.js` – frontend chat logic
- `api/ask.js` – serverless proxy that talks to Azure
- `.env.example` – environment variables to set in Vercel

## Why this structure is better

Your Azure key should not be exposed in browser JavaScript. The chat page talks to `/api/ask`, and the serverless function calls Azure privately using environment variables.

## Environment variables

Add these in Vercel:

- `AZURE_LANGUAGE_ENDPOINT`
- `AZURE_LANGUAGE_KEY`
- `AZURE_PROJECT_NAME`
- `AZURE_DEPLOYMENT_NAME`
- `PUBLIC_SAFE_CONFIDENCE`

## Azure runtime endpoint used

This project calls the Azure Question Answering runtime endpoint:

`POST {Endpoint}/language/:query-knowledgebases?api-version=2023-04-01&projectName={projectName}&deploymentName={deploymentName}`

The request uses the `Ocp-Apim-Subscription-Key` header and sends the question in the JSON body.

## Deploy on Vercel

1. Upload this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Add the environment variables from `.env.example`.
4. Deploy.
5. Open the live site and test your KB.

## Presentation advice

Use a disclaimer on the page and present it as a student demo prototype, not an official NYSC product.
