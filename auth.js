import { supabase } from './supabase_config.js';

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const mj = await isMJ(data.user);
  window.location.href = mj ? 'mj.html' : 'fiche.html';
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function isMJ(user) {
  if (!user) return false;
  const { data, error } = await supabase
    .from('profils')
    .select('is_mj')
    .eq('id', user.id)
    .single();
  if (error) console.error('[auth] isMJ — erreur Supabase :', error);
  return data?.is_mj ?? false;
}

export async function requireAuth(redirectTo = 'login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

export async function requireMJ(redirectTo = 'index.html') {
  const user = await requireAuth();
  if (!user) return null;
  const mj = await isMJ(user);
  if (!mj) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}
