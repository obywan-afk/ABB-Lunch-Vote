// restore-data.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restore() {
  try {
    // Find the most recent backup file
    const files = fs.readdirSync('.').filter(f => f.startsWith('backup-') && f.endsWith('.json'));
    if (files.length === 0) {
      console.error('No backup file found. Make sure you ran backup-data.js first.');
      return;
    }
    
    // Sort by filename (date) and get the most recent
    const filename = files.sort().reverse()[0];
    console.log(`Restoring from ${filename}...`);
    
    const backup = JSON.parse(fs.readFileSync(filename, 'utf8'));
    
    // Restore users first
    console.log('Restoring users...');
    for (const user of backup.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionId: user.sessionId,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
    }
    
    // Restore restaurants
    console.log('Restoring restaurants...');
    for (const restaurant of backup.restaurants) {
      await prisma.restaurant.upsert({
        where: { id: restaurant.id },
        update: {},
        create: {
          id: restaurant.id,
          name: restaurant.name,
          location: restaurant.location,
          description: restaurant.description,
          createdAt: new Date(restaurant.createdAt),
          updatedAt: new Date(restaurant.updatedAt)
        }
      });
    }
    
    // Restore votes
    console.log('Restoring votes...');
    for (const vote of backup.votes) {
      await prisma.vote.upsert({
        where: { id: vote.id },
        update: {},
        create: {
          id: vote.id,
          restaurantId: vote.restaurantId,
          userId: vote.userId,
          weekOf: new Date(vote.weekOf),
          createdAt: new Date(vote.createdAt)
        }
      });
    }
    
    // Restore voting sessions
    console.log('Restoring voting sessions...');
    for (const session of backup.votingSessions) {
      await prisma.votingSession.upsert({
        where: { id: session.id },
        update: {},
        create: {
          id: session.id,
          weekOf: new Date(session.weekOf),
          isActive: session.isActive,
          winnerId: session.winnerId,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt)
        }
      });
    }
    
    console.log(`Restored successfully:`);
    console.log(`- ${backup.restaurants.length} restaurants`);
    console.log(`- ${backup.users.length} users`);  
    console.log(`- ${backup.votes.length} votes`);
    console.log(`- ${backup.votingSessions.length} voting sessions`);
    
    // Show current votes for verification
    if (backup.votes.length > 0) {
      console.log('\nCurrent votes:');
      backup.votes.forEach(vote => {
        const user = backup.users.find(u => u.id === vote.userId);
        const restaurant = backup.restaurants.find(r => r.id === vote.restaurantId);
        console.log(`- ${user?.name || user?.sessionId} voted for ${restaurant?.name}`);
      });
    }
    
  } catch (error) {
    console.error('Restore failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restore();