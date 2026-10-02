import { llm, DEFAULT_MODEL } from "@/lib/llm";
import type OpenAI from "openai";

export const maxDuration = 60;

type Body = {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  model?: string;
  system?: string;
};

export async function POST(req: Request) {
  const { messages, model, system } = (await req.json()) as Body;

  const stream = await llm().chat.completions.create({
    model: model ?? DEFAULT_MODEL,
    stream: true,
    messages: system ? [{ role: "system", content: system }, ...messages] : messages,
  });

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n[error: ${(err as Error).message}]`));
        } finally {
          controller.close();
        }
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
