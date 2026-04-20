const GREETING_REGEX = /^(hi|hello|hey|good\s?(morning|afternoon|evening))([!.\s]*)$/i;

const STARTER_PROMPTS = [
  "How do I register for NYSC?",
  "How can I print my call-up letter?",
  "What documents do I need for camp?",
  "I made a mistake in my details, what should I do?",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question, context } = req.body || {};

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Question is required" });
  }

  if (GREETING_REGEX.test(question.trim())) {
    return res.status(200).json({
      answer:
        "Hello. I can help with NYSC registration, call-up letters, dashboard access, camp requirements, and correction-related questions.",
      confidence: 1,
      fallback: false,
      answerId: null,
      followUpPrompts: STARTER_PROMPTS,
    });
  }

  const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT || process.env.AZURE_ENDPOINT;
  const apiKey = process.env.AZURE_LANGUAGE_KEY || process.env.AZURE_API_KEY;
  const projectName = process.env.AZURE_PROJECT_NAME;
  const deploymentName = process.env.AZURE_DEPLOYMENT_NAME || "production";
  const safeConfidence = Number(process.env.PUBLIC_SAFE_CONFIDENCE || 0.45);

  if (!endpoint || !apiKey || !projectName) {
    return res.status(500).json({
      answer:
        "The Azure connection is not complete yet. Add your environment variables and try again.",
      confidence: 0,
      fallback: true,
      answerId: null,
      followUpPrompts: STARTER_PROMPTS,
    });
  }

  try {
    const cleanedEndpoint = endpoint.replace(/\/$/, "");

    const response = await fetch(
      `${cleanedEndpoint}/language/:query-knowledgebases?api-version=2023-04-01&projectName=${encodeURIComponent(projectName)}&deploymentName=${encodeURIComponent(deploymentName)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": apiKey,
        },
        body: JSON.stringify({
          question: question.trim(),
          top: 1,
          confidenceScoreThreshold: 0,
          ...(context?.previousQnaId && context?.previousUserQuery
            ? {
                context: {
                  previousQnaId: context.previousQnaId,
                  previousUserQuery: context.previousUserQuery,
                },
              }
            : {}),
        }),
      }
    );

    const data = await response.json();
    const answer = data?.answers?.[0];

    if (!response.ok) {
      console.error("Azure query failed", data);
      return res.status(response.status).json({
        answer:
          "I could not reach the knowledge base right now. Please try again or verify on the official NYSC portal.",
        confidence: 0,
        fallback: true,
        answerId: null,
        followUpPrompts: STARTER_PROMPTS,
      });
    }

    if (!answer || typeof answer.confidenceScore !== "number" || answer.confidenceScore < safeConfidence) {
      return res.status(200).json({
        answer:
          "I’m not fully sure about that answer. Please confirm it on the official NYSC portal before taking action.",
        confidence: answer?.confidenceScore ?? 0,
        fallback: true,
        answerId: answer?.id ?? null,
        followUpPrompts: STARTER_PROMPTS,
      });
    }

    const followUpPrompts = Array.isArray(answer?.dialog?.prompts)
      ? answer.dialog.prompts
          .slice()
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map((prompt) => ({
            displayText: prompt.displayText,
            qnaId: prompt.qnaId,
          }))
      : [];

    return res.status(200).json({
      answer: answer.answer,
      confidence: answer.confidenceScore,
      fallback: false,
      answerId: answer.id ?? null,
      followUpPrompts,
    });
  } catch (error) {
    console.error("Azure API error:", error);
    return res.status(500).json({
      answer:
        "Something went wrong while contacting the knowledge base. Please try again or verify on the official NYSC portal.",
      confidence: 0,
      fallback: true,
      answerId: null,
      followUpPrompts: STARTER_PROMPTS,
    });
  }
      }
  
