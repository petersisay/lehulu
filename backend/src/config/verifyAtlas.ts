import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { env } from './env';
import { User } from '../models/User';
import { ProviderProfile } from '../models/ProviderProfile';
import { ServiceCategory } from '../models/ServiceCategory';
import { AuditLog } from '../models/AuditLog';

export const runAtlasVerification = async (): Promise<boolean> => {
  const rawUri = env.MONGODB_URI;
  const sanitizedUri = rawUri.replace(/\/\/[^@]*@/, '//***:***@');
  const isAtlas = rawUri.includes('mongodb+srv') || rawUri.includes('mongodb.net');

  console.log('=============================================================');
  console.log('  LEHULU (ለሁሉ) — MONGODB ATLAS PERSISTENCE VERIFICATION');
  console.log('=============================================================');
  console.log(`[TARGET URI]:       ${sanitizedUri}`);
  console.log(`[STORAGE TARGET]:   ${isAtlas ? 'MongoDB Atlas Cloud Cluster' : 'Local / Custom Instance'}`);

  if (!isAtlas && (rawUri.includes('127.0.0.1') || rawUri.includes('localhost'))) {
    console.warn('\n[STATUS]: Local fallback URI detected in backend/.env.');
    console.warn('[NOTICE]: To connect to your MongoDB Atlas cluster:');
    console.warn('  1. Open backend/.env');
    console.warn('  2. Replace MONGODB_URI with your MongoDB Atlas staging connection string:');
    console.warn('     MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/lehulu-staging?retryWrites=true&w=majority');
    console.warn('  3. Re-run this verification tool or restart the server.\n');
    return false;
  }

  try {
    console.log('\n1. Connecting to MongoDB Atlas...');
    await mongoose.connect(rawUri, {
      serverSelectionTimeoutMS: 15000,
    });

    const dbName = mongoose.connection.name;
    const isConnected = mongoose.connection.readyState === 1;

    console.log(`[CONNECTED]:        ${isConnected ? 'SUCCESS (ReadyState = 1)' : 'FAILED'}`);
    console.log(`[DATABASE NAME]:    ${dbName}`);
    console.log(`[HOST / CLUSTER]:   ${mongoose.connection.host || 'remote'}`);

    console.log('\n2. Verifying & Syncing Model Indexes...');
    await User.syncIndexes();
    console.log('  - User indexes synced: googleId (unique), email (unique), username (unique)');

    await ProviderProfile.syncIndexes();
    console.log('  - ProviderProfile indexes synced: location (2dsphere), categoryIds, isVerified');

    await ServiceCategory.syncIndexes();
    console.log('  - ServiceCategory indexes synced: slug (unique), isActive');

    console.log('\n3. Executing Persistence Write Test...');
    const testId = uuidv4();
    const testActorId = new Types.ObjectId();
    const testRecord = await AuditLog.create({
      actorId: testActorId,
      actorEmail: 'test-persistence@lehulu.et',
      action: 'ATLAS_PERSISTENCE_TEST',
      entityType: 'TEST_DOCUMENT',
      entityId: testActorId,
      details: {
        testId,
        platform: 'Lehulu',
        clusterVerification: true,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`  - Test record written with ID: ${testRecord._id} (Test UUID: ${testId})`);

    console.log('\n4. Disconnecting and Reconnecting (Simulating Restart)...');
    await mongoose.connection.close();
    console.log('  - Connection closed cleanly.');

    await mongoose.connect(rawUri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('  - Reconnected successfully to Atlas.');

    console.log('\n5. Verifying Document Survived Restart...');
    const fetchedRecord = await AuditLog.findOne({ 'details.testId': testId });
    if (!fetchedRecord) {
      throw new Error(`Persistence failure: Test record ${testId} could not be retrieved after restart.`);
    }
    console.log(`  - SUCCESS: Record verified in Atlas after restart!`);
    console.log(`  - Persisted record action: ${fetchedRecord.action}`);

    console.log('\n6. Cleaning Up Isolated Test Record...');
    await AuditLog.deleteOne({ _id: testRecord._id });
    const postDeleteCheck = await AuditLog.findById(testRecord._id);
    if (postDeleteCheck) {
      throw new Error('Test cleanup failed: Record was not removed.');
    }
    console.log('  - Test record cleanly removed. No test artifacts remain.');

    console.log('\n=============================================================');
    console.log('  MONGODB ATLAS PERSISTENCE VERIFICATION: 100% PASSED');
    console.log('=============================================================\n');

    await mongoose.connection.close();
    return true;
  } catch (error: any) {
    console.error('\n[ATLAS VERIFICATION ERROR]:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    return false;
  }
};

if (require.main === module) {
  runAtlasVerification().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
