function getEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/\/$/, "");
}

function cleanAnswer(text) {
  return String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\s{3,}/g, " ")
    .trim();
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const endpoint = getEnv("AZURE_LANGUAGE_ENDPOINT");
  const apiKey = getEnv("AZURE_LANGUAGE_KEY");
  const projectName = getEnv("AZURE_PROJECT_NAME");
  const deploymentName = getEnv("AZURE_DEPLOYMENT_NAME", "production");
  const safeConfidence = Number(getEnv("PUBLIC_SAFE_CONFIDENCE", "0.35"));

  if (!endpoint || !apiKey || !projectName || !deploymentName) {
    return res.status(500).json({
      error:
        "Server is missing Azure configuration. Add your endpoint, key, project name, and deployment name in the environment variables.",
    });
  }

  const question = String(req.body?.question || "").trim();

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const url = `${normalizeEndpoint(
      endpoint
    )}/language/:query-knowledgebases?api-version=2023-04-01&projectName=${encodeURIComponent(
      projectName
    )}&deploymentName=${encodeURIComponent(deploymentName)}`;

    const azureResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": apiKey,
      },
      body: JSON.stringify({
        question,
        top: 1,
        confidenceScoreThreshold: 0.2,
        answerSpanRequest: {
          enable: true,
          topAnswersWithSpan: 1,
          confidenceScoreThreshold: 0.2,
        },
      }),
    });

    const data = await azureResponse.json();

    if (!azureResponse.ok) {
      const upstreamMessage = data?.error?.message || data?.message || "Azure request failed.";
      return res.status(azureResponse.status).json({ error: upstreamMessage });
    }

    const topAnswer = data?.answers?.[0];
    const confidence = Number(topAnswer?.confidenceScore || 0);

    if (!topAnswer || !topAnswer.answer) {
      return res.status(200).json({
        answer:
          "I could not find a reliable answer in this demo knowledge base. Please verify on the official NYSC website.",
        confidence: 0,
        source: "Fallback",
        isSafe: false,
      });
    }

    if (confidence < safeConfidence) {
      return res.status(200).json({
        answer:
          "I am not fully sure about that answer from the current demo knowledge base. Please confirm from the official NYSC website before taking action.",
        confidence,
        source: topAnswer.source || "Azure KB",
        answerSpan: topAnswer.answerSpan?.text || "",
        isSafe: false,
      });
    }

    return res.status(200).json({
      answer: cleanAnswer(topAnswer.answer),
      confidence,
      source: topAnswer.source || "Azure KB",
      answerSpan: topAnswer.answerSpan?.text || "",
      isSafe: true,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error?.message ||
        "Something went wrong while contacting the Azure knowledge base. Please try again.",
    });
  }
};
      
