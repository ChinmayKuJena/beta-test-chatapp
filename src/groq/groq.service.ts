import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Groq from 'groq-sdk';
import { Prompts } from 'src/utils/promopts';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class GroqService {
  private groq;
  logger: any;

  constructor(private readonly configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GOOGLE_GEN_AI_API_KEY'),
    });
  }

  generateRequestId(): string {
    return uuidv4();
  }

  async getChatCompletionWithPrompt(request: string): Promise<any> {
    const requestId = this.generateRequestId();
    const behavior = Prompts.behavior;

    // Determine response type (whether it’s a greeting, small talk, or question)
    let systemMessage = `Your name is MANCHI0905, a friendly assistant. Your tone is ${behavior.tone} and your style is ${behavior.style}. You’re here to help users with direct answers or light conversation.`;
    let userMessage = `${request}`;

    if (
      request.toLowerCase().includes('hello') ||
      request.toLowerCase().includes('hi')
    ) {
      systemMessage = `Your name is MANCHI0905, a friendly assistant. You always respond warmly and succinctly.`;
      userMessage = `${Prompts.welcome[Math.floor(Math.random() * Prompts.welcome.length)]}`;
    } else if (
      request.toLowerCase().includes('how are you') ||
      request.toLowerCase().includes("how's it going")
    ) {
      userMessage = `I’m doing great! Thanks for asking! How can I assist you today?`;
    } else if (request.toLowerCase().includes('thank you')) {
      userMessage = `You're welcome! Let me know if you need anything else.`;
    }

    try {
      const response = await this.groq.chat.completions.create({
        messages: [
          // {
          //   role: 'system',
          //   content: systemMessage,
          // },
          { role: 'user', content: userMessage },
        ],
        model: process.env['MODEL'],
      });

      if (!response || !response.choices?.length) {
        throw new Error('Invalid response from Groq API');
      }

      return {
        requestId,
        content: response.choices[0]?.message?.content || '',
      };
    } catch (error) {
      this.logger.error('Error in getChatCompletionWithPrompt', error);
      return {
        requestId,
        content: 'Oops, something went wrong. Please try again later.',
      };
    }
  }
}
