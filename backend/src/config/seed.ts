import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './db';
import { env } from './env';
import { ServiceCategory } from '../models/ServiceCategory';
import { User } from '../models/User';

export const initialCategories = [
  {
    nameEn: 'Home Maintenance',
    nameAm: 'የቤት ጥገና እና እድሳት',
    slug: 'home-maintenance',
    descriptionEn: 'Electricians, plumbers, carpenters, painters, and general repairs.',
    descriptionAm: 'የኤሌክትሪክ፣ የቧንቧ፣ የአናጢነት፣ የቀለም እና አጠቃላይ የቤት ጥገና ባለሙያዎች።',
    icon: 'Wrench',
    displayOrder: 1,
    isActive: true,
    subcategories: [
      { nameEn: 'Electricians', nameAm: 'ኤሌክትሪሺያኖች', slug: 'electricians' },
      { nameEn: 'Plumbers', nameAm: 'የቧንቧ ባለሙያዎች', slug: 'plumbers' },
      { nameEn: 'Carpenters', nameAm: 'አናጢዎች', slug: 'carpenters' },
      { nameEn: 'Painters', nameAm: 'ቀለም ቀቢዎች', slug: 'painters' },
      { nameEn: 'Appliance Repair', nameAm: 'የቤት እቃዎች ጥገና', slug: 'appliance-repair' },
      { nameEn: 'General Home Repairs', nameAm: 'አጠቃላይ የቤት ጥገና', slug: 'general-repairs' },
    ],
  },
  {
    nameEn: 'Automotive Care',
    nameAm: 'የተሽከርካሪ ጥገና እና ክትትል',
    slug: 'automotive',
    descriptionEn: 'Mechanics, auto electricians, tire services, and diagnostics.',
    descriptionAm: 'የመኪና መካኒኮች፣ አውቶ ኤሌክትሪክ፣ የጎማ እና የኮምፒውተር ዲያግኖስቲክስ አገልግሎት።',
    icon: 'Car',
    displayOrder: 2,
    isActive: true,
    subcategories: [
      { nameEn: 'Mechanics', nameAm: 'መካኒኮች', slug: 'mechanics' },
      { nameEn: 'Auto Electricians', nameAm: 'የመኪና ኤሌክትሪክ', slug: 'auto-electricians' },
      { nameEn: 'Tire Services', nameAm: 'የጎማ አገልግሎት', slug: 'tire-services' },
      { nameEn: 'Vehicle Diagnostics', nameAm: 'የመኪና ዲያግኖስቲክስ', slug: 'vehicle-diagnostics' },
    ],
  },
  {
    nameEn: 'Cleaning Services',
    nameAm: 'የጽዳት አገልግሎቶች',
    slug: 'cleaning',
    descriptionEn: 'House cleaning, commercial office cleaning, and deep sanitization.',
    descriptionAm: 'የመኖሪያ ቤት፣ የቢሮ እና ጥልቅ የጽዳት አገልግሎቶች በአስተማማኝ ባለሙያዎች።',
    icon: 'Sparkles',
    displayOrder: 3,
    isActive: true,
    subcategories: [
      { nameEn: 'House Cleaning', nameAm: 'የቤት ጽዳት', slug: 'house-cleaning' },
      { nameEn: 'Office Cleaning', nameAm: 'የቢሮ ጽዳት', slug: 'office-cleaning' },
      { nameEn: 'Deep Cleaning', nameAm: 'ጥልቅ ጽዳት', slug: 'deep-cleaning' },
    ],
  },
  {
    nameEn: 'Technology & IT',
    nameAm: 'ቴክኖሎጂ እና ኮምፒውተር ጥገና',
    slug: 'technology',
    descriptionEn: 'Computers, laptops, printers, CCTV security, and networking.',
    descriptionAm: 'የኮምፒውተር፣ የላፕቶፕ፣ የፕሪንተር፣ የኔትወርክ እና የCCTV ካሜራ ገጠማ።',
    icon: 'Monitor',
    displayOrder: 4,
    isActive: true,
    subcategories: [
      { nameEn: 'Computer Repair', nameAm: 'ኮምፒውተር ጥገና', slug: 'computer-repair' },
      { nameEn: 'Laptop Maintenance', nameAm: 'ላፕቶፕ ጥገና', slug: 'laptop-maintenance' },
      { nameEn: 'Printer Repair', nameAm: 'ፕሪንተር ጥገና', slug: 'printer-repair' },
      { nameEn: 'Network Installation', nameAm: 'ኔትወርክ ዝርጋታ', slug: 'network-installation' },
      { nameEn: 'CCTV Installation', nameAm: 'CCTV ካሜራ ገጠማ', slug: 'cctv-installation' },
    ],
  },
  {
    nameEn: 'Personal & Business',
    nameAm: 'የግል እና የንግድ አገልግሎቶች',
    slug: 'personal-business',
    descriptionEn: 'Tailoring, professional photography, event decor, and moving assistance.',
    descriptionAm: 'የልብስ ስፌት፣ የፎቶግራፍ፣ የዝግጅት ማስጌጥ እና የዕቃ ማጓጓዝ አገልግሎት።',
    icon: 'Scissors',
    displayOrder: 5,
    isActive: true,
    subcategories: [
      { nameEn: 'Tailoring', nameAm: 'ልብስ ስፌት', slug: 'tailoring' },
      { nameEn: 'Photography', nameAm: 'ፎቶግራፍ', slug: 'photography' },
      { nameEn: 'Event Decoration', nameAm: 'የዝግጅት ማስጌጥ', slug: 'event-decoration' },
      { nameEn: 'Moving Assistance', nameAm: 'ዕቃ ማጓጓዝ', slug: 'moving-assistance' },
    ],
  },
];

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('Seeding initial Lehulu database catalog...');
    await connectDB();

    // 1. Seed or update service categories
    for (const catData of initialCategories) {
      await ServiceCategory.findOneAndUpdate(
        { slug: catData.slug },
        { $set: catData },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${initialCategories.length} official trade categories.`);

    // 2. Ensure initial Administrator exists
    const adminEmail = env.ADMIN_EMAIL.toLowerCase();
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        googleId: 'admin-seed-id',
        email: adminEmail,
        displayName: 'Lehulu Platform Administrator',
        username: 'lehulu_admin',
        role: 'ADMIN',
        preferredLanguage: 'am',
        city: 'Adama',
        isActive: true,
        isOnboarded: true,
      });
      console.log(`Initialized super administrator account for: ${adminEmail}`);
    } else if (existingAdmin.role !== 'ADMIN') {
      existingAdmin.role = 'ADMIN';
      await existingAdmin.save();
      console.log(`Updated user ${adminEmail} to ADMIN role.`);
    }

    console.log('Database seeding completed successfully without fake records.');
  } catch (error: any) {
    console.error('Database seeding failed:', error.message);
  } finally {
    await disconnectDB();
  }
};

// Execute if run directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
