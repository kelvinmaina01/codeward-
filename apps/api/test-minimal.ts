import "dotenv/config";
import { generateText, tool, jsonSchema } from "ai";
import { z } from "zod";
import { getModel } from "./src/providers/model.provider.js";

async function run() {
  console.log("ZOD VERSION:", z.NEVER ? "v4 or modern" : "unknown", z.ZodFirstPartyTypeKind ? "v3" : "v4?");
  try {
    const res = await generateText({
      model: getModel("analyzer"),
      prompt: "Hello, call the tool with name: test and score: 5",
      tools: {
        submit_report: tool({
          description: "Submit report",
          parameters: z.object({
            name: z.string(),
            score: z.number()
          }),
          execute: async (args) => args
        })
      },
      toolChoice: "required"
    });
    console.log("Success:", JSON.stringify(res.toolCalls, null, 2));
  } catch (err: any) {
    console.error("Failed:", err.message);
    if (err.requestBodyValues) {
      console.dir(err.requestBodyValues, { depth: null });
    }
  }
}

run();
