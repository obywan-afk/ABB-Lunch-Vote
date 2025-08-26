import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')
  
  // Delete in dependency order (but handle if tables are empty)
  try {
    console.log('🧹 Clearing existing data...')
    await prisma.vote.deleteMany()
    await prisma.menuCache.deleteMany()
    await prisma.votingSession.deleteMany()
    await prisma.user.deleteMany()
    await prisma.restaurant.deleteMany()
    console.log('✅ Cleared existing data')
  } catch (error) {
    console.log('ℹ️  Tables were already empty or error occurred:', (error as Error).message)
  }

  const restaurants = [
    { id: 'tellus',           name: 'Tellus',                          location: 'ABB Campus',     description: 'Compass Group (RSS feed)' },
    { id: 'por',              name: 'Pitäjänmäen Osuusruokala (POR)',  location: 'Pitäjänmäki',    description: 'POR kitchen (WordPress / HTML)' },
    { id: 'valimo-park',      name: 'Valimo Park',                     location: 'Valimo',         description: 'ISS / Flockler feed' },
    { id: 'valaja',           name: 'Valaja',                          location: 'Pitäjänmäki',    description: 'Sodexo weekly_json/190' },
    { id: 'factory',          name: 'Factory Pitäjänmäki',             location: 'Pitäjänmäki',    description: 'AI extractor on Factory site' },
    { id: 'ravintola-valimo', name: 'Ravintola Valimo',                location: 'Pitäjänmäki',    description: 'AI extractor on Valimo site' },
  ]

  console.log('🍽️  Creating restaurants...')
  const createdRestaurants = await prisma.restaurant.createMany({ 
    data: restaurants
  })
  console.log(`✅ Created ${createdRestaurants.count} restaurants`)

  // weekOf = Monday 00:00
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1) // Sun=0, Mon=1
  monday.setHours(0, 0, 0, 0)

  console.log('🗳️  Creating voting session...')
  await prisma.votingSession.upsert({
    where: { weekOf: monday },
    update: { isActive: true },
    create: { weekOf: monday, isActive: true }
  })
  console.log('✅ Created voting session for this week')

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())