export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;

  if (!question || question.trim() === "") {
    return res.status(400).json({ error: "Question is required" });
  }

  const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT;
  const AZURE_API_KEY = process.env.AZURE_API_KEY;
  const PROJECT_NAME = process.env.AZURE_PROJECT_NAME;

  try {
    const response = await fetch(
      `${AZURE_ENDPOINT}/language/:query-knowledgebases?projectName=${PROJECT_NAME}&api-version=2021-10-01&deploymentName=production`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": AZURE_API_KEY,
        },
        body: JSON.stringify({
          question: question,
          top: 1,
          confidenceScoreThreshold: 0.3,
        }),
      }
    );

    const data = await response.json();

    const answer = data?.answers?.[0];

    if (!answer || answer.confidenceScore < 0.3) {
      return res.status(200).json({
        answer:
          "I'm not fully sure about that. Please confirm from the official NYSC portal at nysc.gov.ng",
        confidence: 0,
        fallback: true,
      });
    }

    return res.status(200).json({
      answer: answer.answer,
      confidence: answer.confidenceScore,
      fallback: false,
    });
  } catch (error) {
    console.error("Azure API error:", error);
    return res.status(500).json({
      answer:
        "Something went wrong. Please try again or visit the official NYSC portal at nysc.gov.ng",
      fallback: true,
    });
  }
        }
