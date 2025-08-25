import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // wipe in dependency order
  await prisma.$transaction([
    prisma.vote.deleteMany(),
    prisma.menuCache.deleteMany(),
    prisma.votingSession.deleteMany(),
    prisma.user.deleteMany(),
    prisma.restaurant.deleteMany(),
  ])

  const restaurants = [
    { id: 'tellus',           name: 'Tellus',                          location: 'ABB Campus',     description: 'Compass Group (RSS feed)' },
    { id: 'por',              name: 'Pitäjänmäen Osuusruokala (POR)',  location: 'Pitäjänmäki',    description: 'POR kitchen (WordPress / HTML)' },
    { id: 'valimo-park',      name: 'Valimo Park',                     location: 'Valimo',         description: 'ISS / Flockler feed' },
    { id: 'valaja',           name: 'Valaja',                          location: 'Pitäjänmäki',    description: 'Sodexo weekly_json/190' },
    { id: 'factory',          name: 'Factory Pitäjänmäki',             location: 'Pitäjänmäki',    description: 'AI extractor on Factory site' },
    { id: 'ravintola-valimo', name: 'Ravintola Valimo',                location: 'Pitäjänmäki',    description: 'AI extractor on Valimo site' },
  ]

  await prisma.restaurant.createMany({ data: restaurants }) // <-- no skipDuplicates

  // weekOf = Monday 00:00
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1) // Sun=0, Mon=1
  monday.setHours(0, 0, 0, 0)

  await prisma.votingSession.create({
    data: { weekOf: monday, isActive: true },
  })

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
