// src/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Connection } from 'typeorm';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly connection: Connection) {}

  async record(eventType: string, payload: any): Promise<void> {
    try {
      await this.connection.query(
        `INSERT INTO audit_events (event_type, payload, created_at) VALUES ($1, $2, now())`,
        [eventType, payload],
      );
    } catch (err) {
      this.logger.error('Failed to write audit event', err);
      // Fallback: log to stdout to avoid losing critical info
      this.logger.debug({ eventType, payload });
    }
  }

  async recordTransactional(manager: any, eventType: string, payload: any): Promise<void> {
    try {
      await manager.query(
        `INSERT INTO audit_events (event_type, payload, created_at) VALUES ($1, $2, now())`,
        [eventType, payload],
      );
    } catch (err) {
      this.logger.error('Failed to write transactional audit event', err);
      // Do not throw to avoid breaking outer transaction logging path
    }
  }

  async findByReference(refType: string, refId: string): Promise<any[]> {
    try {
      const rows = await this.connection.query(
        `SELECT id, event_type, payload, created_at FROM audit_events WHERE payload->>$1 = $2 ORDER BY created_at DESC LIMIT 100`,
        [refType, refId],
      );
      return rows;
    } catch (err) {
      this.logger.error('Failed to query audit events', err);
      return [];
    }
  }
}
