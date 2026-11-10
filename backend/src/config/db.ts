import mongoose from 'mongoose';
import { env } from './env';

let memoryServer: any = null;
let isInMemoryActive = false;
let activeDatabaseUri = '';

export interface DatabaseStatus {
  isConnected: boolean;
  isInMemory: boolean;
  storageType: 'PERSISTENT_STORAGE' | 'TEMPORARY_IN_MEMORY_DEV';
  databaseName: string;
}

export const getDatabaseStatus = (): DatabaseStatus => {
  const isConnected = mongoose.connection.readyState === 1;
  return {
    isConnected,
    isInMemory: isInMemoryActive,
    storageType: isInMemoryActive ? 'TEMPORARY_IN_MEMORY_DEV' : 'PERSISTENT_STORAGE',
    databaseName: mongoose.connection.name || 'unknown',
  };
};

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);

    let uri = env.MONGODB_URI;
    const isStaging =
      env.IS_STAGING ||
      env.APP_ENV === 'staging' ||
      Boolean(process.env.RENDER_SERVICE_NAME?.includes('staging'));

    const targetDb = isStaging
      ? 'lehulu-staging'
      : (env.IS_PRODUCTION ? 'lehulu-production' : 'lehulu');

    // Parse URI to inspect if database name is missing or defaulted to 'test'
    const urlPattern = /^(mongodb(?:\+srv)?:\/\/[^\/?#]+)(?:\/([^?#]*))?(\?.*)?$/;
    const match = uri.match(urlPattern);

    const connectOptions: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000,
    };

    if (match) {
      const base = match[1];
      const existingDb = (match[2] || '').trim();
      const query = match[3] || '';

      if (!existingDb || existingDb === 'test' || (isStaging && existingDb === 'lehulu-production')) {
        uri = `${base}/${targetDb}${query}`;
        connectOptions.dbName = targetDb;
      }
    }

    // Direct connection attempt to configured MongoDB instance
    try {
      const sanitized = uri.replace(/\/\/[^@]*@/, '//***:***@');
      console.log(`[DATABASE]: Attempting connection to MongoDB at: ${sanitized}`);
      
      await mongoose.connect(uri, connectOptions);

      isInMemoryActive = false;
      activeDatabaseUri = uri;
      console.log(`===================================================================`);
      console.log(`[DATABASE PERSISTENCE]: CONNECTED TO PERSISTENT MONGODB`);
      console.log(`[STORAGE TYPE]: Persistent Database (${mongoose.connection.name})`);
      console.log(`[INFO]: Records WILL survive backend server restarts.`);
      console.log(`===================================================================`);
      return;
    } catch (err: any) {
      const isProductionOrStaging =
        env.IS_PRODUCTION || env.IS_STAGING || process.env.APP_ENV === 'staging' || process.env.STAGING === 'true';

      if (isProductionOrStaging) {
        console.error('FATAL ERROR: Failed to connect to persistent MongoDB instance in production/staging:', err.message);
        throw new Error(`Production/Staging MongoDB connection failed: ${err.message}. In-memory fallback is strictly prohibited.`);
      }

      console.warn(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
      console.warn(`[WARNING: PERSISTENT MONGODB NOT DETECTED ON PORT 27017]`);
      console.warn(`Reason: ${err.message}`);
      console.warn(`Falling back to standalone MongoMemoryServer for development/testing.`);
      console.warn(`[CRITICAL NOTICE]: DATA IS STORED IN MEMORY ONLY AND WILL NOT PERSIST ACROSS RESTARTS.`);
      console.warn(`To persist data locally, start a local MongoDB service or set MONGODB_URI in backend/.env.`);
      console.warn(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);

      const memoryModule: any = 'mongodb-memory-server';
      const { MongoMemoryServer } = await import(memoryModule);
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      isInMemoryActive = true;
      activeDatabaseUri = uri;

      await mongoose.connect(uri);
      console.log(`[DATABASE]: Standalone in-memory MongoDB initialized successfully at: ${uri}`);
    }
  } catch (error: any) {
    console.error('Database connection initialization failed:', error.message);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    isInMemoryActive = false;
  } catch (err: any) {
    console.error('Error during database disconnection:', err.message);
  }
};
