import mongoose from 'mongoose';
import { env } from './env';

let memoryServer: any = null;

export const connectDB = async (): Promise<void> => {
  try {
    // Set Mongoose configurations
    mongoose.set('strictQuery', true);

    let uri = env.MONGODB_URI;

    // Check if we should attempt direct connection first
    try {
      console.log(`Connecting to MongoDB at: ${uri.replace(/\/\/[^@]*@/, '//***:***@')}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log('MongoDB successfully connected.');
      return;
    } catch (err: any) {
      if (env.NODE_ENV === 'production') {
        console.error('Fatal: Failed to connect to MongoDB Atlas in production:', err.message);
        throw err;
      }

      console.warn(`Local MongoDB instance not reachable (${err.message}). Starting MongoMemoryServer for standalone development...`);
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      
      await mongoose.connect(uri);
      console.log(`In-memory MongoDB instance started successfully at: ${uri}`);
    }
  } catch (error: any) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    if (memoryServer) {
      await memoryServer.stop();
    }
  } catch (err: any) {
    console.error('Error during database disconnection:', err.message);
  }
};
