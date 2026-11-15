const { Types } = require('mongoose');
const { AuditLog } = require('../models/AuditLog');

const recordAuditLog = async (params) => {
  try {
    const ipAddress = params.req?.ip || params.req?.socket?.remoteAddress;
    const userAgent = params.req?.headers ? params.req.headers['user-agent'] : undefined;

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
  } catch (err) {
    console.error('Failed to create audit log entry:', err.message);
  }
};

module.exports = {
  recordAuditLog,
};
