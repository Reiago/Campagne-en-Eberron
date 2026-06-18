// Système de lancer de dés + composant toast

export function lancerDe(nombreFaces) {
  return Math.floor(Math.random() * nombreFaces) + 1;
}

let toastTimer = null;

export function lancerJet(modificateur, label) {
  const d20 = lancerDe(20);
  const total = d20 + modificateur;
  const signe = modificateur >= 0 ? '+' : '';
  const classe = d20 === 20 ? 'critique' : d20 === 1 ? 'echec-critique' : '';
  const mention = d20 === 20 ? ' — CRITIQUE !' : d20 === 1 ? ' — Échec critique' : '';
  afficherToast(
    `<span class="toast-label">${label}</span>` +
    `<span class="toast-detail">1d20 (${d20}) ${signe}${modificateur}</span>` +
    `<span class="toast-total">${total}${mention}</span>`,
    classe
  );
  return total;
}

// Jet de sauvegarde contre la mort (d20 sans modificateur, mention spéciale)
export function lancerJetMort(label) {
  const d20 = lancerDe(20);
  const classe = d20 === 20 ? 'critique' : d20 === 1 ? 'echec-critique' : '';
  const mention = d20 === 20 ? ' — CRITIQUE !' : d20 === 1 ? ' — Échec critique' : (d20 >= 10 ? ' — Succès' : ' — Échec');
  afficherToast(
    `<span class="toast-label">${label}</span>` +
    `<span class="toast-detail">1d20</span>` +
    `<span class="toast-total">${d20}${mention}</span>`,
    classe
  );
  return d20;
}

function afficherToast(html, classe) {
  let toast = document.getElementById('des-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'des-toast';
    toast.className = 'des-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = html;
  toast.className = 'des-toast visible' + (classe ? ' ' + classe : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}
