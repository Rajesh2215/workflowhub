import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGO_URI"),
        // Raise connection pool from the Mongoose default of 5.
        // Under load (500 VUs), 5 connections causes severe queuing.
        // Value is env-driven so it can be tuned per environment.
        maxPoolSize: Number(config.get("MONGO_MAX_POOL_SIZE") ?? 50),
        // Fail fast if MongoDB is unreachable rather than hanging indefinitely.
        serverSelectionTimeoutMS: 5000,
        // Drop a socket that has been idle > 45s so stale connections are recycled.
        socketTimeoutMS: 45000,
      })
    })
  ]
})
export class DatabaseModule {}