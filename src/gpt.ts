import { APIError } from 'openai/error';
import OpenAI from 'openai';
import { ChatCompletionCreateParams, ChatCompletionMessageParam } from 'openai/src/resources/chat/completions';
import { Chat, ChatCompletionContentPartImage } from 'openai/resources';
import ChatCompletionContentPart = Chat.ChatCompletionContentPart;

export interface SPGTResponse {
    success: boolean;
    usage?: {
        input: number;
        output: number;
        total: number;
    }
    result?: {
        message: string;
        reason: string;
    }
}

export async function requestAi(openai: OpenAI, content: string, imageBase64: string = ''): Promise<SPGTResponse> {
    try {
        const req: ChatCompletionCreateParams = {
            messages: [{
                role: 'user',
                content: [{
                    type: 'text',
                    text: content,
                }],
            }],
            model: 'gpt-4o',
            max_tokens: 4000,
        };

        if (imageBase64) {
            const image: ChatCompletionContentPartImage = {
                type: 'image_url',
                image_url: {
                    url: imageBase64,
                }
            };

            (req.messages[0].content as Array<ChatCompletionContentPart>).push(image);
        }

        const chatCompletion = await openai.chat.completions.create(req);

        return {
            success: true,
            usage: {
                total: chatCompletion.usage?.total_tokens ?? -1,
                input: chatCompletion.usage?.prompt_tokens ?? -1,
                output: chatCompletion.usage?.completion_tokens ?? -1,
            },
            result: {
                reason: chatCompletion.choices[0]?.finish_reason,
                message: chatCompletion.choices[0]?.message.content ?? '',
            }
        }

    } catch (e: unknown) {
        if (e instanceof APIError) {
            return {
                success: false,
                result: {
                    reason: 'OpenAI Error',
                    message: e.message,
                },
            }
        } else if (e instanceof Error) {
            return {
                success: false,
                result: {
                    reason: 'AppError',
                    message: e.message,
                },
            }
        }
    }

    return { success: false }
}

export function processAiMsg(aiMsg: SPGTResponse): string {
    if (!aiMsg.success) {
        return `💥 [${aiMsg.result?.reason}] ${aiMsg.result?.message ?? 'No error text'}`;
    }

    if (!aiMsg.result) {
        return `💥 No response from AI`;
    }

    let extra = '';
    if (aiMsg.result.reason === 'content_filter') {
        extra += '🔞';
    } else if (aiMsg.result.reason === 'function_call') {
        extra += '🤡';
    } else if (aiMsg.result.reason === 'length') {
        extra += '✂️';
    } else if (aiMsg.result.reason === 'stop') {
        // extra += '🤖';
    } else {
        extra += aiMsg.result.reason ?? '?';
    }

    const text = aiMsg.result.message.length > 3500
        ? `${aiMsg.result.message.substring(0, 3500)}...🔪`
        : aiMsg.result.message;

    return `${extra} ${text}`;
}
