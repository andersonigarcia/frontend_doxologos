import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ppwjtvzrhvjinsutrjwk.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '...'; // I don't have the anon key.

// Let's try to find it in .env
import fs from 'fs';
import path from 'path';

try {
  const envFile = fs.readFileSync(path.resolve('.env'), 'utf8');
  let url = '';
  let key = '';
  envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
  });
  
  if (url && key) {
    const supabase = createClient(url, key);
    supabase.storage.listBuckets().then(({ data, error }) => {
      if (error) console.error('Error listing buckets:', error);
      else {
        console.log('Buckets:', data.map(b => b.name));
      }
    });
  } else {
    console.log('Could not find Supabase credentials in .env');
  }
} catch (e) {
  console.log('Error reading .env', e.message);
}
