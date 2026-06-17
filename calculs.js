// Moteur de calcul D&D 5e — fonctions pures

export function modificateur(valeur) {
  return Math.floor((valeur - 10) / 2);
}

// Bonus de maîtrise selon le niveau (1-20)
// niv 1-4 → +2, 5-8 → +3, 9-12 → +4, 13-16 → +5, 17-20 → +6
export function bonusMaitrise(niveau) {
  return Math.ceil((niveau || 1) / 4) + 1;
}

// CA calculée selon le type d'armure
export function caCalculee(typeArmure, bonusArmure, modDex, bouclier, magie, autre) {
  let ca;
  switch (typeArmure) {
    case 'legere':        ca = (bonusArmure || 0) + modDex; break;
    case 'intermediaire': ca = (bonusArmure || 0) + Math.min(modDex, 2); break;
    case 'lourde':        ca = (bonusArmure || 0); break;
    default:              ca = 10 + modDex; // sans armure
  }
  if (bouclier) ca += 2;
  return ca + (magie || 0) + (autre || 0);
}

// PV max théoriques (règle de la valeur moyenne)
// Niv 1 : max du dé + mod Con ; niveaux suivants : floor(dé/2)+1 + mod Con
export function pvMax(niveau, typeDe, modCon) {
  if (!niveau || niveau < 1) return 0;
  const facesDe = parseInt(typeDe?.replace('d', '') || 8, 10);
  const moyenneDe = Math.floor(facesDe / 2) + 1;
  return facesDe + modCon + (niveau - 1) * (moyenneDe + modCon);
}

// Bonus à une compétence (mod carac + maîtrise/expertise)
export function bonusCompetence(modCarac, maitrise, expertise, niveau) {
  const bm = bonusMaitrise(niveau);
  if (expertise) return modCarac + bm * 2;
  if (maitrise)  return modCarac + bm;
  return modCarac;
}

// Perception passive = 10 + bonus Perception
export function perceptionPassive(modSagesse, maitrise, expertise, niveau) {
  return 10 + bonusCompetence(modSagesse, maitrise, expertise, niveau);
}

export function ddSorts(bm, modCaracIncantation) {
  return 8 + bm + modCaracIncantation;
}

export function bonusAttaqueSorts(bm, modCaracIncantation) {
  return bm + modCaracIncantation;
}

export function bonusToucher(modCarac, maitrise, bonusMagie, special, niveau) {
  return modCarac + (maitrise ? bonusMaitrise(niveau) : 0) + (bonusMagie || 0) + (special || 0);
}

// Sauts — valeurs en pieds (règles officielles D&D 5e)
export function sautLongueur(valeurForce, avecElan) {
  return avecElan ? valeurForce : Math.floor(valeurForce / 2);
}

export function sautHauteur(modForce, avecElan) {
  const base = 3 + modForce;
  return avecElan ? base : Math.floor(base / 2);
}

// Capacité de charge maximale en kg (valeur Force × 7,5 kg)
export function chargeMax(valeurForce) {
  return valeurForce * 7.5;
}
