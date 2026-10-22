import { Request } from 'express';
import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';

interface AuditLogParams {
  actorId: Types.ObjectId | string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: Types.ObjectId | string;
  details?: Record<string, any>;
  req?: Request;
}

export const recordAuditLog = async (params: AuditLogParams): Promise<void> => {
  try {
    const ipAddress = params.req?.ip || params.req?.socket?.remoteAddress;
    const userAgent = params.req?.headers['user-agent'];

    await AuditLog.create({
      actorId: new Types.ObjectId(params.actorId),
      actorEmail: params.actorEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: new Types.ObjectId(params.entityId),
      details: params.details || {},
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (err: any) {
    console.error('Failed to create audit log entry:', err.message);
  }
};
