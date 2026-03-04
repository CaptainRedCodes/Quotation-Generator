import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create users in Supabase Auth
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase configuration')
    process.exit(1)
  }

  const users = [
    { email: 'admin@arinox.com', password: 'admin123', name: 'Admin User' },
    { email: 'test@gmail.com', password: 'Test@123', name: 'Test User' }
  ]

  for (const user of users) {
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            role: 'admin'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Created user: ${user.email}`)
        console.log(`   User ID: ${data.id}`)
      } else {
        const error = await response.json()
        console.log(`⚠️  User ${user.email} - ${error.message || 'Unknown error'}`)
        if (error.message?.includes('already exists')) {
          console.log(`   User already exists in Supabase Auth`)
        }
      }
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error)
    }
  }

  // Create company settings
  const companySettings = await prisma.companySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'ARINOX',
      address: 'Bangalore, India',
      gstNo: '29ABBCS1596E1Z6',
      panNo: 'ABBCS1596E',
      emailFrom: 'quotations@arinox.com',
      termsConditions: '1. Price valid 15 days from date of quotation.\n2. DELIVERY: 4 Weeks from the date of Order confirmation\n3. Commercials: 100% advance.\n4. Freight and insurance charges are extra.'
    }
  })
  console.log('Created company settings:', companySettings.companyName)

  // Create sample product
  const product = await prisma.product.upsert({
    where: { id: 'sample-product' },
    update: {},
    create: {
      id: 'sample-product',
      name: 'Sample Product',
      description: 'A sample product with components',
      active: true,
      components: {
        create: [
          { componentName: 'Component 1', quantity: 1, unitPrice: 1000, sacCode: '8471', sortOrder: 1 },
          { componentName: 'Component 2', quantity: 2, unitPrice: 500, sacCode: '8471', sortOrder: 2 }
        ]
      }
    }
  })
  console.log('Created product:', product.name)

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
