import "dotenv/config";
import pino, { type Logger, type LoggerOptions } from "pino";

export type LogFields = Record<string, unknown>;
export type AppLogger = Logger;

const ci = process.env.CI?.trim().toLowerCase();
const options: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? "info"
};

if (ci !== "true" && ci !== "1") {
    options.transport = {
        target: "pino-pretty",
        options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard"
        }
    };
}

export const rootLogger: AppLogger = pino(options);

export function createLogger(context: string): AppLogger {
    return rootLogger.child({ context });
}
