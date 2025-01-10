import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  // General methods for key-value operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await this.redisClient.setex(key, ttl, stringValue);
    } else {
      await this.redisClient.set(key, stringValue);
    }
  }

  async get(key: string): Promise<any> {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  // Hash methods
  async hset(hashKey: string, field: string, value: any): Promise<void> {
    const stringValue = JSON.stringify(value);
    await this.redisClient.hset(hashKey, field, stringValue);
  }

  async hget(hashKey: string, field: string): Promise<any> {
    const value = await this.redisClient.hget(hashKey, field);
    return value ? JSON.parse(value) : null;
  }

  async hgetall(hashKey: string): Promise<any> {
    const data = await this.redisClient.hgetall(hashKey);
    return Object.entries(data).reduce((result, [key, value]) => {
      result[key] = JSON.parse(value);
      return result;
    }, {});
  }

  async hdel(hashKey: string, field: string): Promise<void> {
    await this.redisClient.hdel(hashKey, field);
  }

  // Sorted Set methods for maintaining ordered messages
  async addMessageToSortedSet(setKey: string, timestamp: number, message: any): Promise<void> {
    const stringValue = JSON.stringify(message);
    await this.redisClient.zadd(setKey, timestamp, stringValue);
  }

  async getMessagesFromSortedSet(setKey: string, start = 0, end = -1): Promise<any[]> {
    const messages = await this.redisClient.zrange(setKey, start, end);
    return messages.map((message) => JSON.parse(message));
  }

  async deleteMessageFromSortedSet(setKey: string, message: any): Promise<void> {
    const stringValue = JSON.stringify(message);
    await this.redisClient.zrem(setKey, stringValue);
  }

  async clearSortedSet(setKey: string): Promise<void> {
    await this.redisClient.del(setKey);
  }
}
