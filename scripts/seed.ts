// scripts/seed.ts or app/api/seed/route.ts
import { prisma } from '@/lib/db'

const restaurants = [
  {
    id: 'tellus',
    name: 'Tellus',
    location: 'Helsinki',
    description: 'University restaurant with diverse menu options'
  },
  {
    id: 'por',
    name: 'Por',
    location: 'Helsinki',
    description: 'Modern restaurant with contemporary cuisine'
  },
  {
    id: 'valimo-park',
    name: 'Valimo Park',
    location: 'Helsinki',
    description: 'Park-side dining with seasonal menu'
  },
  {
    id: 'valaja',
    name: 'Valaja',
    location: 'Helsinki',
    description: 'Traditional Finnish restaurant'
  },
  {
    id: 'factory',
    name: 'Factory',
    location: 'Helsinki',
    description: 'Industrial-themed restaurant with hearty meals'
  },
  {
    id: 'ravintola-valimo',
    name: 'Ravintola Valimo',
    location: 'Helsinki',
    description: 'Classic restaurant with local specialties'
  }
]

async function main() {
  console.log('🌱 Seeding restaurants...')
  
  for (const restaurant of restaurants) {
    const created = await prisma.restaurant.upsert({
      where: { id: restaurant.id },
      update: {},
      create: restaurant
    })
    console.log(`✅ Created/Updated: ${created.name}`)
  }
  
  console.log('🎉 Seeding completed!')
}

// If this is a script file, run it directly
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

// If this is an API route, export as POST
export async function POST() {
  try {
    await main()
    return Response.json({ success: true, message: 'Restaurants seeded!' })
  } catch (error) {
    return Response.json({ error: 'Seeding failed' }, { status: 500 })
  }
}