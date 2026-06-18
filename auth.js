// AUTH DÉSACTIVÉE — branche dev-no-auth
// Remplacer DEV_USER_ID par le user_id réel présent dans la table `personnages`
// pour que getPersonnage(user.id) trouve un personnage sans passer par ?id=
const DEV_USER_ID = 'dev-placeholder-uuid';
const DEV_USER = { id: DEV_USER_ID, email: 'dev@eberron.local' };

export async function login(_email, _password) {
  window.location.href = 'fiche.html';
}

export async function logout() {
  window.location.href = 'index.html';
}

export async function getCurrentUser() {
  return DEV_USER;
}

export async function isMJ(_user) {
  return true;
}

export async function requireAuth(_redirectTo = 'login.html') {
  return DEV_USER;
}

export async function requireMJ(_redirectTo = 'index.html') {
  return DEV_USER;
}
