import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions/completions';
import { toOpenAiTools } from './tools/tool-registry';

export type LlmMessage = ChatCompletionMessageParam;

export type LlmResponse = {
  outputText: string;
  functionCalls: Array<{
    callId: string;
    name: string;
    arguments: string;
  }>;
  assistantMessage: ChatCompletionMessageParam;
};

@Injectable()
export class LlmService {
  private clientInstance: OpenAI | null = null;

  async respond(params: {
    instructions: string;
    input: LlmMessage[];
    safetyIdentifier: string;
  }): Promise<LlmResponse> {
    try {
      const completion = await this.client().chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: params.instructions },
          ...params.input,
        ],
        tools: toOpenAiTools(),
        tool_choice: 'auto',
        parallel_tool_calls: false,
        max_completion_tokens: this.envInteger('OPENAI_MAX_OUTPUT_TOKENS', 800),
        store: false,
        safety_identifier: params.safetyIdentifier,
      });
      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error('Chat completion did not return a choice');
      }
      return this.toResponse(message);
    } catch {
      throw new ServiceUnavailableException({
        code: 'CHAT_PROVIDER_UNAVAILABLE',
        message: 'Trợ lý đang bận. Vui lòng thử lại sau.',
        details: [],
      });
    }
  }

  toolOutput(callId: string, output: unknown): LlmMessage {
    return {
      role: 'tool',
      tool_call_id: callId,
      content: JSON.stringify(output),
    };
  }

  private toResponse(message: {
    content: string | null;
    refusal: string | null;
    tool_calls?: ChatCompletionMessageToolCall[];
  }): LlmResponse {
    const functionCalls = (message.tool_calls ?? [])
      .filter((call) => call.type === 'function')
      .map((call) => ({
        callId: call.id,
        name: call.function.name,
        arguments: call.function.arguments,
      }));
    return {
      outputText: (message.content ?? message.refusal ?? '').trim(),
      functionCalls,
      assistantMessage: {
        role: 'assistant',
        content: message.content,
        refusal: message.refusal,
        tool_calls: message.tool_calls,
      },
    };
  }

  private client(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException({
        code: 'CHAT_NOT_CONFIGURED',
        message: 'Trợ lý chưa được cấu hình',
        details: [],
      });
    }
    this.clientInstance ??= new OpenAI({
      apiKey,
      timeout: this.envInteger('OPENAI_TIMEOUT_MS', 20000),
      maxRetries: 1,
    });
    return this.clientInstance;
  }

  private envInteger(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
