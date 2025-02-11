import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Groq from 'groq-sdk';
import { Prompts } from 'src/utils/promopts';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import axios from 'axios'; // Import Axios
@Injectable()
export class GroqService {
  private groq;
  private readonly systemMessage: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GOOGLE_GEN_AI_API_KEY'),
    });

    this.systemMessage = `Your name is MANCHI0905, a friendly ROBONOID. Your tone is ${Prompts.behavior.tone} and your style is ${Prompts.behavior.style}. Developer: Chinmay Jena.Use up-to-date and reliable sources.`;
  }

  generateRequestId(): string {
    return uuidv4();
  }

  async fetchExternalApi(url: string): Promise<any> {
    try {
      const response = await axios.get(url); // Fetch data from API
      return response.data;
    } catch (error) {
      console.error(`Error fetching API: ${url}`, error);
      return { error: `Failed to fetch data from ${url}` };
    }
  }

  async searchGoogle(query: string): Promise<any> {
    const apiKey = this.configService.get<string>('GOOGLE_SEARCH_API_KEY');
    const cseId = this.configService.get<string>('GOOGLE_CSE_ID');

    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cseId}`;

    try {
      const response = await axios.get<{
        items: { title: string; link: string; snippet: string }[];
      }>(url);
      return response.data.items?.map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }));
    } catch (error) {
      console.error('Error fetching Google Search results:', error);
      return [{ error: 'Failed to fetch Google Search results' }];
    }
  }

  async getChatCompletionWithPrompt(
    request: string,
    username?: any,
  ): Promise<any> {
    const requestId = this.generateRequestId();
    const chatKey = 'user:chat:history'; // TODO : Update the chat key as per userName>

    // Retrieve the last conversation from Redis
    const lastMessage = await this.redisService.hashOperation(
      'get',
      chatKey,
      'lastMessage',
    );
    const lastResponse = await this.redisService.hashOperation(
      'get',
      chatKey,
      'lastResponse',
    );

    let messages = [{ role: 'system', content: this.systemMessage }];
    console.log('messages', request);

    if (lastMessage && lastResponse) {
      messages.push({ role: 'user', content: lastMessage });
      messages.push({ role: 'assistant', content: lastResponse });
    }
    // this part for api calling
    let apiData = null;
    const urlRegex = /(https?:\/\/[^\s]+)/g; // Regex to detect URLs
    const match = request.match(urlRegex);
    if (match) {
      const apiUrl = match[0]; // Extract the URL
      apiData = await this.fetchExternalApi(apiUrl); // Fetch API data
      messages.push({
        role: 'user',
        content: `User requested data from ${apiUrl}`,
      });
      messages.push({
        role: 'system',
        content: `API Response: ${JSON.stringify(apiData)}`,
      });
    }

    // Check if the query contains political-related keywords
    const politicalKeywords = [
      'politics',
      'government',
      'chief minister',
      'cm',
      'president',
      'political',
    ];
    const isPoliticalQuery = politicalKeywords.some((keyword) =>
      request.toLowerCase().includes(keyword),
    );

    if (isPoliticalQuery) {
      // Route the query to Google search if it's related to politics
      const searchResults = await this.searchGoogle(request);
      console.log('Political Search Results:', searchResults);

      messages.push({
        role: 'system',
        content: `Political Google Search Results: ${JSON.stringify(searchResults)}`,
      });
    }
    // <custom comment??? api calling>
    messages.push({ role: 'user', content: request });

    try {
      const response = await this.groq.chat.completions.create({
        messages,
        // model: 'gemma2-9b-it',//gemma2-9b-it
        model: process.env['MODEL'], //llama-3.3-70b-versatile
        temperature: 1,
        max_tokens: 1650,
        top_p: 1,
        stream: false,
      });

      if (!response || !response.choices?.length) {
        throw new Error('Invalid response from Groq API');
      }

      const responseContent = response.choices[0]?.message?.content || '';

      // Update Redis with the latest conversation
      await this.redisService.hashOperation(
        'set',
        chatKey,
        'lastMessage',
        request,
      );
      await this.redisService.hashOperation(
        'set',
        chatKey,
        'lastResponse',
        responseContent,
      );
      console.log(messages);

      return { requestId, content: responseContent };
    } catch (error) {
      console.error('Error in getChatCompletionWithPrompt', error);
      return {
        requestId,
        content: 'Oops, something went wrong. Please try again later.',
      };
    }
  }
}
