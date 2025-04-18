import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Create required tables
  try {
    // Create page_contents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "page_contents" (
        "id" SERIAL PRIMARY KEY,
        "slug" TEXT NOT NULL UNIQUE,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "is_published" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
    `);
    
    console.log('Database tables created successfully!');
  } catch (error) {
    console.error('Error creating database tables:', error);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error during migration:', err);
  process.exit(1);
});