import "dotenv/config";

async function run() {
  const payload = {
    model: "gpt-4o",
    messages: [
      { role: "user", content: "Call the tool with testing" }
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "submit_report",
          description: "Submit a report",
          parameters: {
            type: "object",
            properties: {
              diff_summary: { type: "string" }
            },
            required: ["diff_summary"],
            additionalProperties: false
          },
          strict: true
        }
      }
    ],
    tool_choice: "required"
  };

  console.log("Sending raw payload to OpenAI...");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
