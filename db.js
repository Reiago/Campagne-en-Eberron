import { supabase } from './supabase_config.js';

// ── Personnages ──────────────────────────────────────────────────────────────

export async function getPersonnage(userId) {
  const { data, error } = await supabase
    .from('personnages')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getPersonnageById(id) {
  const { data, error } = await supabase
    .from('personnages')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePersonnage(id, data) {
  const { error } = await supabase.from('personnages').update(data).eq('id', id);
  if (error) throw error;
}

export async function getAllPersonnages() {
  const { data, error } = await supabase
    .from('personnages')
    .select('id, nom, classe, niveau, race, user_id')
    .order('nom');
  if (error) throw error;
  return data;
}

// ── Caractéristiques ─────────────────────────────────────────────────────────

export async function getCaracteristiques(personnageId) {
  const { data, error } = await supabase
    .from('caracteristiques')
    .select('*')
    .eq('personnage_id', personnageId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCaracteristiques(id, data) {
  const { error } = await supabase.from('caracteristiques').update(data).eq('id', id);
  if (error) throw error;
}

// ── Compétences ──────────────────────────────────────────────────────────────

export async function getCompetences(personnageId) {
  const { data, error } = await supabase
    .from('competences')
    .select('*')
    .eq('personnage_id', personnageId)
    .order('nom');
  if (error) throw error;
  return data;
}

export async function updateCompetence(id, data) {
  const { error } = await supabase.from('competences').update(data).eq('id', id);
  if (error) throw error;
}

// ── Armes ────────────────────────────────────────────────────────────────────

export async function getArmes(personnageId) {
  const { data, error } = await supabase
    .from('armes')
    .select('*')
    .eq('personnage_id', personnageId);
  if (error) throw error;
  return data;
}

export async function addArme(data) {
  const { data: result, error } = await supabase.from('armes').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateArme(id, data) {
  const { error } = await supabase.from('armes').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteArme(id) {
  const { error } = await supabase.from('armes').delete().eq('id', id);
  if (error) throw error;
}

// ── Sorts ────────────────────────────────────────────────────────────────────

export async function getSorts(personnageId) {
  const { data, error } = await supabase
    .from('sorts')
    .select('*')
    .eq('personnage_id', personnageId)
    .order('niveau_sort');
  if (error) throw error;
  return data;
}

export async function addSort(data) {
  const { data: result, error } = await supabase.from('sorts').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateSort(id, data) {
  const { error } = await supabase.from('sorts').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteSort(id) {
  const { error } = await supabase.from('sorts').delete().eq('id', id);
  if (error) throw error;
}

export async function getEmplacementsSorts(personnageId) {
  const { data, error } = await supabase
    .from('emplacements_sorts')
    .select('*')
    .eq('personnage_id', personnageId)
    .order('niveau_sort');
  if (error) throw error;
  return data;
}

export async function updateEmplacementSorts(id, data) {
  const { error } = await supabase.from('emplacements_sorts').update(data).eq('id', id);
  if (error) throw error;
}

// ── Capacités ────────────────────────────────────────────────────────────────

export async function getCapacites(personnageId) {
  const { data, error } = await supabase
    .from('capacites')
    .select('*')
    .eq('personnage_id', personnageId);
  if (error) throw error;
  return data;
}

export async function addCapacite(data) {
  const { data: result, error } = await supabase.from('capacites').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateCapacite(id, data) {
  const { error } = await supabase.from('capacites').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteCapacite(id) {
  const { error } = await supabase.from('capacites').delete().eq('id', id);
  if (error) throw error;
}

// ── Équipement ───────────────────────────────────────────────────────────────

export async function getEquipement(personnageId) {
  const { data, error } = await supabase
    .from('equipement')
    .select('*')
    .eq('personnage_id', personnageId);
  if (error) throw error;
  return data;
}

export async function addEquipement(data) {
  const { data: result, error } = await supabase.from('equipement').insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateEquipement(id, data) {
  const { error } = await supabase.from('equipement').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteEquipement(id) {
  const { error } = await supabase.from('equipement').delete().eq('id', id);
  if (error) throw error;
}

// ── Monnaie ──────────────────────────────────────────────────────────────────

export async function getMonnaie(personnageId) {
  const { data, error } = await supabase
    .from('monnaie')
    .select('*')
    .eq('personnage_id', personnageId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMonnaie(id, data) {
  const { error } = await supabase.from('monnaie').update(data).eq('id', id);
  if (error) throw error;
}
