import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { initSockets } from './sockets';
import { initialCategories } from './config/seed';
import { seedProviderLeads } from './config/seedLeads';
import { ServiceCategory } from './models/ServiceCategory';
import { User } from './models/User';

const startServer = async () => {
  try {
    // 1. Connect to Database (Atlas or memory-server fallback)
    await connectDB();

    // Auto-seed service categories and admin if fresh instance
    const catCount = await ServiceCategory.countDocuments();
    if (catCount === 0) {
      console.log('Auto-seeding initial service categories...');
      for (const cat of initialCategories) {
        await ServiceCategory.create(cat);
      }
    }

    // Auto-seed authentic provider research leads for Adama & Bishoftu
    try {
      const leadsCount = await seedProviderLeads();
      console.log(`Verified authentic provider research leads pipeline (${leadsCount} leads cataloged).`);
    } catch (leadSeedErr: any) {
      console.warn('Provider leads auto-seed notice:', leadSeedErr.message);
    }

    const adminEmail = env.ADMIN_EMAIL.toLowerCase();
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        googleId: 'admin-auto-init',
        email: adminEmail,
        displayName: 'Petros Sisay (Administrator)',
        username: 'petros_admin',
        role: 'ADMIN',
        preferredLanguage: 'am',
        city: 'Adama',
        isActive: true,
        isOnboarded: true,
      });
      console.log(`Auto-initialized administrator for: ${adminEmail}`);
    } else {
      const needsProfileRepair =
        !existingAdmin.username ||
        !existingAdmin.displayName ||
        !existingAdmin.googleId ||
        existingAdmin.role !== 'ADMIN' ||
        !existingAdmin.isOnboarded;

      if (needsProfileRepair) {
        existingAdmin.username = existingAdmin.username || 'petros_admin';
        existingAdmin.displayName = existingAdmin.displayName || 'Petros Sisay (Administrator)';
        existingAdmin.googleId = existingAdmin.googleId || 'admin-auto-init';
        existingAdmin.role = 'ADMIN';
        existingAdmin.isOnboarded = true;

        try {
          await existingAdmin.save();
        } catch (saveErr: any) {
          console.warn(`Admin save validation warning (${saveErr.message}). Performing atomic update.`);
          await User.updateOne(
            { _id: existingAdmin._id },
            {
              $set: {
                username: existingAdmin.username,
                displayName: existingAdmin.displayName,
                googleId: existingAdmin.googleId,
                role: 'ADMIN',
                isOnboarded: true,
              },
            }
          );
        }
        console.log(`Enforced ADMIN role and complete profile fields for: ${adminEmail}`);
      }
    }

    // 2. Initialize Express application
    const app = createApp();

    // 3. Create HTTP server & bind WebSockets
    const server = http.createServer(app);
    initSockets(server);

    // 4. Start listening
    server.listen(env.PORT, () => {
      console.log(`
=============================================================
  LEHULU (ለሁሉ) — LOCAL SERVICES MARKETPLACE API
  Environment: ${env.NODE_ENV}
  Server URL:  http://localhost:${env.PORT}
  Client URL:  ${env.CLIENT_URL}
  Health Check: http://localhost:${env.PORT}/api/v1/health
=============================================================
      `);
    });

    // 5. Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('HTTP and database connections closed. Process terminating.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err: any) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
};

startServer();
