import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// En local (Wampserver sur localhost/127.0.0.1), on pointe vers le stack
// Supabase local (Docker, `npx supabase start`) pour ne jamais toucher
// la base de production. Sur le domaine réel, on garde la config prod.
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const SUPABASE_URL      = isLocal
  ? 'http://127.0.0.1:54321'
  : 'https://prbpszazjxomjgrjheuz.supabase.co';

const SUPABASE_ANON_KEY = isLocal
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByYnBzemF6anhvbWpncmpoZXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzk5OTgsImV4cCI6MjA5Njg1NTk5OH0.dRNzJDrc-X6tLEJ7DnoI5eByWOm6T_w4IXuYLc9aB4Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
