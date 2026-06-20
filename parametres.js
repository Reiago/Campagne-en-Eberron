import { requireAuth, logout } from './auth.js';

const user = await requireAuth('login.html');
if (!user) throw new Error('Non authentifié');

document.getElementById('param-user-email').textContent = user.email;
document.getElementById('btn-logout').addEventListener('click', logout);

const ficheId = new URLSearchParams(window.location.search).get('id');
const backLink = document.querySelector('.btn-gear');
if (backLink && ficheId) backLink.href = 'fiche.html?id=' + encodeURIComponent(ficheId);
