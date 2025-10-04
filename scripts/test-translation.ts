// Test script to verify menu translation works correctly
import { EnhancedMenuProcessor } from '../src/lib/enhancedMenuProcessor'
import { prisma } from '../src/lib/db'

async function testTranslation() {
  console.log('🧪 Testing Menu Translation System\n')

  // Restaurants that need translation: valimo-park, factory, ravintola-valimo
  const restaurantsToTest = [
    { id: 'valimo-park', name: 'Faundori' },
    { id: 'factory', name: 'Factory Pitäjänmäki' },
    { id: 'ravintola-valimo', name: 'Ravintola Valimo' }
  ]

  for (const restaurant of restaurantsToTest) {
    console.log(`\n📍 Testing ${restaurant.name}...`)
    console.log('─'.repeat(60))

    try {
      // Test Finnish version first
      console.log('\n1️⃣ Fetching Finnish menu...')
      const fiResult = await EnhancedMenuProcessor.processRestaurantWithCache(
        restaurant.id,
        restaurant.name,
        'fi',
        { skipCache: true } // Force fresh to test scraping
      )
      
      console.log(`✅ Finnish menu length: ${fiResult.rawMenu.length} chars`)
      console.log(`   Preview: ${fiResult.rawMenu.substring(0, 100)}...`)

      // Test English version (should trigger translation)
      console.log('\n2️⃣ Fetching English menu (should trigger translation)...')
      const enResult = await EnhancedMenuProcessor.processRestaurantWithCache(
        restaurant.id,
        restaurant.name,
        'en',
        { skipCache: true } // Force fresh to test translation
      )
      
      console.log(`✅ English menu length: ${enResult.rawMenu.length} chars`)
      console.log(`   Preview: ${enResult.rawMenu.substring(0, 100)}...`)

      // Verify translation worked
      const hasFinnishWords = /keitto|kastike|peruna|broileri/i.test(enResult.rawMenu)
      const hasEnglishDays = /Monday|Tuesday|Wednesday|Thursday|Friday/i.test(enResult.rawMenu)
      
      if (!hasFinnishWords && hasEnglishDays) {
        console.log('✅ Translation appears successful!')
      } else if (hasFinnishWords) {
        console.log('⚠️  Warning: English menu still contains Finnish words')
      }

      // Test cache retrieval
      console.log('\n3️⃣ Testing cache retrieval...')
      const cachedEn = await EnhancedMenuProcessor.processRestaurantWithCache(
        restaurant.id,
        restaurant.name,
        'en',
        { skipCache: false } // Should use cache
      )
      
      if (cachedEn.fromCache) {
        console.log('✅ Cache working - English menu loaded from cache')
      } else {
        console.log('⚠️  Cache miss - this might indicate an issue')
      }

    } catch (error) {
      console.error(`❌ Error testing ${restaurant.name}:`, error)
    }
  }

  console.log('\n\n✨ Translation testing complete!')
  await prisma.$disconnect()
}

// Run the test
testTranslation().catch(console.error)
