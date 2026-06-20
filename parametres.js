import { requireAuth, logout } from './auth.js';
import { THEMES, getTheme, setTheme } from './theme.js';

const user = await requireAuth('login.html');
if (!user) throw new Error('Non authentifié');

document.getElementById('param-user-email').textContent = user.email;
document.getElementById('btn-logout').addEventListener('click', logout);

const ficheId = new URLSearchParams(window.location.search).get('id');
const backLink = document.querySelector('.btn-gear');
if (backLink && ficheId) backLink.href = 'fiche.html?id=' + encodeURIComponent(ficheId);

const themeSelect = document.getElementById('param-theme');
THEMES.forEach(({ value, label }) => {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label;
  themeSelect.appendChild(opt);
});
themeSelect.value = getTheme();
themeSelect.addEventListener('change', () => setTheme(themeSelect.value));
