export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });
  }


  try {

    const { alert } = req.body;


    if (!alert) {

      return res.status(400).json({
        error: "Alert data is required"
      });
    }


    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          "Authorization":
            `Bearer ${process.env.OPENROUTER_API_KEY}`,

          "HTTP-Referer":
            "https://your-project.vercel.app",

          "X-Title":
            "Disaster Alert Dashboard"
        },

        body: JSON.stringify({

          model:
            "openrouter/free",

          messages: [

            {
              role: "system",

              content:
                "You are a disaster alert assistant. Explain alerts in simple language. Be concise. Mention what happened, severity, and basic safety advice. Do not claim to be an official emergency authority."
            },

            {
              role: "user",

              content:
                `Explain this disaster alert:

Type: ${alert.type}
Location: ${alert.title}
Severity: ${alert.severity}
Details: ${alert.details}

Give a short, clear explanation and simple safety advice.`
            }

          ],

          temperature: 0.2

        })
      }
    );


    const data =
      await response.json();


    if (!response.ok) {

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter request failed"
      });
    }


    const answer =
      data?.choices?.[0]?.message?.content;


    if (!answer) {

      return res.status(500).json({
        error: "No AI response received"
      });
    }


    return res.status(200).json({
      answer
    });


  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "AI service unavailable"
    });
  }
}
