// backup-data.js - Run this before the reset
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function backup() {
  try {
    console.log('📦 Backing up current data...');
    
    // Get all current data with relationships
    const restaurants = await prisma.restaurant.findMany({
      include: {
        votes: {
          include: {
            user: true
          }
        }
      }
    });
    
    const users = await prisma.user.findMany();
    const votes = await prisma.vote.findMany({
      include: {
        restaurant: true,
        user: true
      }
    });
    
    const votingSessions = await prisma.votingSession.findMany();
    
    // Save to JSON file with timestamp
    const backup = {
      timestamp: new Date().toISOString(),
      restaurants,
      users,
      votes,
      votingSessions
    };
    
    const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Data backed up to ${filename}`);
    console.log(`📊 Backed up: ${restaurants.length} restaurants, ${users.length} users, ${votes.length} votes`);
    
    // Show current votes for verification
    console.log('\n🗳️  Current votes:');
    votes.forEach(vote => {
      console.log(`- ${vote.user.name || vote.user.sessionId} voted for ${vote.restaurant.name}`);
    });
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backup();