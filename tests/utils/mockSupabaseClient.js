import { createClient } from '@supabase/supabase-js';
import { TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY } from '../msw/constants.js';

export const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: {
    fetch: (input, init) => fetch(input, init)
  }
});
