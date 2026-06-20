const THEME_KEY = 'eberron-theme';

export const THEMES = [
  { value: 'eberron-gold', label: 'Eberron Gold (dark)' },
  { value: 'light', label: 'Lumière de Sharn (light)' },
];

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'eberron-gold';
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme) {
  if (theme === 'eberron-gold') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

applyTheme(getTheme());
