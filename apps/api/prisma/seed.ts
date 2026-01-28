import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // Create test user
    const passwordHash = await bcrypt.hash('T12345678#', 10);

    const testUser = await prisma.user.upsert({
        where: { email: 'teste@susmi.app' },
        update: {
            passwordHash,
            name: 'Usuário Teste',
        },
        create: {
            email: 'teste@susmi.app',
            passwordHash,
            name: 'Usuário Teste',
            role: 'USER',
        },
    });

    console.log(`✅ Test user created: ${testUser.email} (ID: ${testUser.id})`);

    // Create user preferences
    await prisma.userPreference.upsert({
        where: { userId: testUser.id },
        update: {},
        create: {
            userId: testUser.id,
            theme: 'dark',
            language: 'pt-BR',
            notifications: true,
            voiceEnabled: true,
            preferredModel: 'gpt-4-turbo-preview',
            temperature: 0.7,
        },
    });

    console.log('✅ User preferences created');

    // Create default transaction categories
    const categories = [
        { name: 'Alimentação', icon: 'utensils', color: '#ef4444', type: 'EXPENSE', isSystem: true },
        { name: 'Transporte', icon: 'car', color: '#f97316', type: 'EXPENSE', isSystem: true },
        { name: 'Moradia', icon: 'home', color: '#eab308', type: 'EXPENSE', isSystem: true },
        { name: 'Saúde', icon: 'heart', color: '#22c55e', type: 'EXPENSE', isSystem: true },
        { name: 'Educação', icon: 'book', color: '#3b82f6', type: 'EXPENSE', isSystem: true },
        { name: 'Lazer', icon: 'gamepad', color: '#8b5cf6', type: 'EXPENSE', isSystem: true },
        { name: 'Compras', icon: 'shopping-bag', color: '#ec4899', type: 'EXPENSE', isSystem: true },
        { name: 'Serviços', icon: 'wrench', color: '#6b7280', type: 'EXPENSE', isSystem: true },
        { name: 'Salário', icon: 'wallet', color: '#10b981', type: 'INCOME', isSystem: true },
        { name: 'Investimentos', icon: 'trending-up', color: '#14b8a6', type: 'INCOME', isSystem: true },
        { name: 'Freelance', icon: 'briefcase', color: '#06b6d4', type: 'INCOME', isSystem: true },
        { name: 'Outros', icon: 'more-horizontal', color: '#9ca3af', type: 'EXPENSE', isSystem: true },
    ];

    let categoriesCreated = 0;
    for (const category of categories) {
        const existing = await prisma.transactionCategory.findFirst({
            where: { name: category.name, isSystem: true },
        });
        if (!existing) {
            await prisma.transactionCategory.create({ data: category });
            categoriesCreated++;
        }
    }

    console.log(`✅ ${categoriesCreated} transaction categories created (${categories.length - categoriesCreated} already existed)`);

    // Create default exercise types
    const exerciseTypes = [
        { name: 'Caminhada', category: 'CARDIO', icon: 'footprints', tracksDistance: true, tracksDuration: true, tracksCalories: true, tracksHeartRate: true, metValue: 3.5, isSystem: true },
        { name: 'Corrida', category: 'CARDIO', icon: 'running', tracksDistance: true, tracksDuration: true, tracksCalories: true, tracksHeartRate: true, metValue: 8.0, isSystem: true },
        { name: 'Ciclismo', category: 'CARDIO', icon: 'bike', tracksDistance: true, tracksDuration: true, tracksCalories: true, tracksHeartRate: true, metValue: 7.5, isSystem: true },
        { name: 'Natação', category: 'CARDIO', icon: 'waves', tracksDistance: true, tracksDuration: true, tracksCalories: true, tracksHeartRate: true, metValue: 6.0, isSystem: true },
        { name: 'Musculação', category: 'STRENGTH', icon: 'dumbbell', tracksDuration: true, tracksCalories: true, tracksReps: true, tracksSets: true, tracksWeight: true, metValue: 5.0, isSystem: true },
        { name: 'Yoga', category: 'FLEXIBILITY', icon: 'flower', tracksDuration: true, tracksCalories: true, metValue: 2.5, isSystem: true },
        { name: 'Pilates', category: 'FLEXIBILITY', icon: 'stretch', tracksDuration: true, tracksCalories: true, metValue: 3.0, isSystem: true },
        { name: 'HIIT', category: 'CARDIO', icon: 'zap', tracksDuration: true, tracksCalories: true, tracksHeartRate: true, metValue: 10.0, isSystem: true },
        { name: 'Futebol', category: 'SPORTS', icon: 'football', tracksDuration: true, tracksCalories: true, tracksHeartRate: true, metValue: 7.0, isSystem: true },
        { name: 'Basquete', category: 'SPORTS', icon: 'basketball', tracksDuration: true, tracksCalories: true, tracksHeartRate: true, metValue: 6.5, isSystem: true },
    ];

    let exercisesCreated = 0;
    for (const exercise of exerciseTypes) {
        const existing = await prisma.exerciseType.findFirst({
            where: { name: exercise.name, isSystem: true },
        });
        if (!existing) {
            await prisma.exerciseType.create({ data: exercise });
            exercisesCreated++;
        }
    }

    console.log(`✅ ${exercisesCreated} exercise types created (${exerciseTypes.length - exercisesCreated} already existed)`);

    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('📧 Test user credentials:');
    console.log('   Email: teste@susmi.app');
    console.log('   Password: T12345678#');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
