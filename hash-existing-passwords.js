import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function hashExistingPasswords() {
  try {
    // Get all users with their current passwords
    const result = await pool.query('SELECT id, username, password FROM users');
    const users = result.rows;
    
    console.log(`Found ${users.length} users to update`);
    
    for (const user of users) {
      // Skip if password already looks like a bcrypt hash
      if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
        console.log(`User ${user.username} already has hashed password, skipping`);
        continue;
      }
      
      // Hash the plain text password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Update the user's password in the database
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      console.log(`Updated password for user: ${user.username}`);
    }
    
    console.log('All passwords have been hashed successfully!');
  } catch (error) {
    console.error('Error hashing passwords:', error);
  } finally {
    await pool.end();
  }
}

hashExistingPasswords();