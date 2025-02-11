import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  // General method for key-value operations
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

  // General method for hash operations
  async hashOperation(
    operation: 'set' | 'get' | 'getAll' | 'delete',
    hashKey: string,
    field?: string,
    value?: any,
  ): Promise<any> {
    switch (operation) {
      case 'set':
        if (!field || !value)
          throw new Error('Field and value are required for set operation');
        await this.redisClient.hset(hashKey, field, JSON.stringify(value));
        break;
      case 'get':
        if (!field) throw new Error('Field is required for get operation');
        const hashValue = await this.redisClient.hget(hashKey, field);
        return hashValue ? JSON.parse(hashValue) : null;
      case 'getAll':
        const data = await this.redisClient.hgetall(hashKey);
        return Object.entries(data).reduce((result, [key, value]) => {
          result[key] = JSON.parse(value);
          return result;
        }, {});
      case 'delete':
        if (!field) throw new Error('Field is required for delete operation');
        await this.redisClient.hdel(hashKey, field);
        break;
      default:
        throw new Error('Invalid hash operation');
    }
  }
  // Get the last few messages (for context)

  // General method for sorted set operations
  async sortedSetOperation(
    operation: 'add' | 'get' | 'delete' | 'clear',
    setKey: string,
    timestamp?: number,
    message?: any,
  ): Promise<any> {
    switch (operation) {
      case 'add':
        if (timestamp === undefined || !message)
          throw new Error(
            'Timestamp and message are required for add operation',
          );
        const stringValue = JSON.stringify(message);
        await this.redisClient.zadd(setKey, timestamp, stringValue);
        break;
      case 'get':
        const messages = await this.redisClient.zrange(setKey, 0, -1);
        return messages.map((message) => JSON.parse(message));
      case 'delete':
        if (!message)
          throw new Error('Message is required for delete operation');
        const deleteMessage = JSON.stringify(message);
        await this.redisClient.zrem(setKey, deleteMessage);
        break;
      case 'clear':
        await this.redisClient.del(setKey);
        break;
      default:
        throw new Error('Invalid sorted set operation');
    }
  }
}
