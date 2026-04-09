/**
 * Centralized logging utility
 * Replaces console.log/warn/error with a structured logging system
 *
 * Behaviour:
 * - Development: debug/info/warn/error mirror to console.
 * - Production: warn/error mirror to console; debug/info are in-memory only (no console noise).
 * - Production: logger.error also forwards to Sentry when a DSN is configured.
 */

import * as Sentry from '@sentry/react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: number;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    const entry: LogEntry = {
      level,
      message,
      data: args.length ? args : undefined,
      timestamp: Date.now(),
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (import.meta.env.DEV) {
      switch (level) {
        case 'debug':
          console.debug(message, ...args);
          break;
        case 'info':
          console.info(message, ...args);
          break;
        case 'warn':
          console.warn(message, ...args);
          break;
        case 'error':
          console.error(message, ...args);
          break;
      }
      return;
    }

    if (level === 'warn') {
      console.warn(message, ...args);
    } else if (level === 'error') {
      console.error(message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
    // Forward to Sentry in production. captureException is a no-op when Sentry
    // has not been initialised (i.e. VITE_SENTRY_DSN is absent in dev).
    if (!import.meta.env.DEV) {
      const cause = args.find((a) => a instanceof Error) ?? new Error(message);
      Sentry.captureException(cause, { extra: { args } });
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
