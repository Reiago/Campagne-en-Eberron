import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = 'https://prbpszazjxomjgrjheuz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByYnBzemF6anhvbWpncmpoZXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzk5OTgsImV4cCI6MjA5Njg1NTk5OH0.dRNzJDrc-X6tLEJ7DnoI5eByWOm6T_w4IXuYLc9aB4Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
