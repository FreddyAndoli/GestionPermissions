import dotenv from 'dotenv';
import path from 'path';

const envResult = dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (envResult.error) {
  console.error('Failed to load .env file:', envResult.error);
} else {
  console.log('.env loaded. DATABASE_URL exists?', !!process.env.DATABASE_URL);
}
