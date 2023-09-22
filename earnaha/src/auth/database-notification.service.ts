import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DatabaseNotificationService implements OnModuleInit {
  private pgClient: Client;

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    this.pgClient = new Client({
      host: process.env.POSTGRES_HOST,
      port: +process.env.POSTGRES_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.POSTGRES_DB,
    });
    this.pgClient.connect();
    this.pgClient.query('LISTEN user_change');
    this.pgClient.on('notification', (msg) => {
      if (msg.channel === 'user_change') {
        // Invalidate the cache i【n Redis based on the user ID
        try {
          const p = JSON.parse(msg.payload);

          this.redisService.delUserData(p.data.id);
        } catch (err) {
          console.log('notify failed: ', err);
        }
      }
    });
  }
}
