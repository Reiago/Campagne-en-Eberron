// Ajouts à la toile des relations tirés de la chronique « L'Ombre et la Marée »
// (session du 24 octobre, session-20261024.html).
//
// Contrairement à relations-seed.js (qui ne fait qu'ajouter), ces données se
// fusionnent avec une toile déjà remplie : relations.js (applySessionDelta)
// retrouve les personnages existants par leur nom exact. Dans les liens,
// « @Nom » désigne donc un personnage déjà présent, et un simple slug désigne
// un des nouveaux personnages ci-dessous. Les nouveaux sont placés à droite du
// graphe de la session 1 (qui occupe x 60–1630, y 60–1110).

export const SESSION2_LABEL = 'L\'Ombre et la Marée — session du 24 octobre';

// Si un personnage de ce nom existe déjà, la session est considérée comme chargée.
export const SESSION2_MARKER = 'Mireille';

// Préfixe ajouté aux descriptions mises à jour (sert aussi à ne pas les doubler).
export const SESSION2_NOTE = 'Session du 24 octobre :';

export const SESSION2_NODES = [
  // ── Sharn : les moines, la guilde, les enquêteurs ─────────────────────────
  { id: 'moines', nom: 'Les deux moines de la Griffe d\'Émeraude', type: 'pnj', statut: 'mort', pos_x: 1900, pos_y: 120,
    description: 'Deux moines qui suivaient les compagnons depuis chez Zarn et les ont attaqués sur les ponts de Sharn. Aristote a abattu l\'un, Marteau a frappé l\'autre en plein visage. L\'un portait un tatouage en forme de goutte rouge.' },
  { id: 'griffe', nom: 'Ordre de la Griffe d\'Émeraude', type: 'organisation', statut: 'vivant', pos_x: 2090, pos_y: 200,
    description: 'Branche extrémiste du Sang de Vol, qui sème la terreur par la nécromancie.' },
  { id: 'sang-de-vol', nom: 'Le Sang de Vol', type: 'organisation', statut: 'vivant', pos_x: 2280, pos_y: 120,
    description: 'Religion qui voit une étincelle de divinité en chaque être et dans la mort un mal absolu. Ses fidèles acceptent d\'être ramenés après leur mort pour continuer à faire le bien. Souvent prise à tort pour un culte de la mort.' },
  { id: 'mouette', nom: 'La mouette de cuivre', type: 'pnj', statut: 'inconnu', pos_x: 1900, pos_y: 330,
    description: 'Mouette au crâne de cuivre, un dispositif à l\'oreille : un animal modifié, au travail qui rappelle la maison Vadalis. Elle a suivi les compagnons à Sharn puis sur la route du nord, essayant de lire sur leurs lèvres, avant de faire demi-tour vers Sharn. Quelqu\'un les espionne.' },
  { id: 'maison-vadalis', nom: 'Maison Vadalis', type: 'organisation', statut: 'vivant', pos_x: 2090, pos_y: 420,
    description: 'Maison draconique dont le travail sur les animaux évoque celui de la mouette de cuivre.' },
  { id: 'vieux-marque', nom: 'Le vieux marqué à la marque minuscule', type: 'pnj', statut: 'vivant', pos_x: 2280, pos_y: 330,
    description: 'Membre de la guilde qui n\'a jamais perdu sa nuit : quand l\'ombre vient, il lui fait un bras d\'honneur et continue de dormir. Des dizaines ont essayé, personne n\'a compris comment il fait.' },
  { id: 'tonton', nom: 'Le tonton', type: 'pnj', statut: 'vivant', pos_x: 1900, pos_y: 540,
    description: 'Tenancier du prêteur sur gages du clan Boromar. Loue la lecture de ses livres dix pièces d\'or l\'heure et conseille aux compagnons de voir un certain Créla.' },
  { id: 'crela', nom: 'Créla', type: 'pnj', statut: 'vivant', pos_x: 2090, pos_y: 620,
    description: 'Maître enquêteur de l\'avant-dernier niveau de Sharn, au milieu des plus riches. Chaque information se paie cher, mais on peut marchander.' },
  { id: 'alberix', nom: 'Professeur Alberix', type: 'pnj', statut: 'vivant', pos_x: 2280, pos_y: 540,
    description: 'Spécialiste de l\'Argonnessen à l\'université de Morgrave, rencontré par Marteau. Il n\'en est ressorti aucun élément concret sur les marques.' },

  // ── La route du nord : Première-Tour et les brigands ──────────────────────
  { id: 'maison-orien', nom: 'Maison Orien', type: 'organisation', statut: 'vivant', pos_x: 2550, pos_y: 120,
    description: 'Maison draconique des relais et du transport. Son relais de Première-Tour a pris en charge les deux caisses rouges et la lettre cachetée, et a récompensé les compagnons de vingt-cinq pièces de platine.' },
  { id: 'responsable-relais', nom: 'La responsable du relais Orien', type: 'pnj', statut: 'vivant', pos_x: 2740, pos_y: 200,
    description: 'A examiné les caisses, la lettre et le scellé, puis a fait emmener le marchand par les gardes du relais.' },
  { id: 'marchand', nom: 'Le marchand nerveux', type: 'pnj', statut: 'inconnu', pos_x: 2930, pos_y: 120,
    description: 'Prétendait avoir perdu sa caravane et voulait récupérer deux caisses rouges de la maison Orien pour cent soixante-quinze pièces d\'or. Da Mao s\'en méfiait : il n\'avait pas prévenu le relais, juste à côté. Démasqué au relais et emmené par les gardes ; sa chambre était gardée par un automate sans tête.' },
  { id: 'brigands', nom: 'Les pillards de la caravane', type: 'organisation', statut: 'inconnu', pos_x: 2550, pos_y: 330,
    description: 'Une vingtaine de brigands, avec un loup géant et un sanglier géant, qui avaient attaqué la caravane à moins de deux jours de marche au nord-ouest de Première-Tour. Leur camp a été vidé pendant l\'orage.' },
  { id: 'dame', nom: 'La dame aux chaînes', type: 'pnj', statut: 'vivant', pos_x: 2740, pos_y: 420,
    description: 'Prisonnière des brigands, trente-cinq ans, d\'une famille cousine de la maison Cannith. Interrogée par Da Mao, elle a reconnu Elaydren d\'Vown, sa cousine par alliance, et laissé entendre qu\'elle travaille pour le compte d\'un autre : le baron Merrix de Sharn. Rendue au majordome après un verre de philtre d\'amour.' },
  { id: 'majordome', nom: 'Le majordome de la dame', type: 'pnj', statut: 'vivant', pos_x: 2930, pos_y: 330,
    description: 'Arrivé en diligence à l\'auberge avec la caisse de rançon piégée par un sortilège d\'explosion. A reconnu la dame, avec qui il est reparti.' },
  { id: 'baron-merrix', nom: 'Baron Merrix de Sharn', type: 'pnj', statut: 'inconnu', pos_x: 2740, pos_y: 620,
    description: 'Selon la dame aux chaînes, c\'est pour son compte que travaille Elaydren d\'Vown.' },

  // ── Le phare de Cornebrune ────────────────────────────────────────────────
  { id: 'gardien', nom: 'Le gardien du phare de Cornebrune', type: 'pnj', statut: 'vivant', pos_x: 1950, pos_y: 820,
    description: 'Demi-elfe blessé à la jambe, la main droite remplacée par un crochet. Retranché derrière des sacs et des caisses dans la cave, il avait bloqué l\'escalier mécanique : dès qu\'il s\'est déplié, l\'eau a commencé à ruisseler. Soigné par Frack, il a offert aux compagnons une perle qui aide à nager.' },
  { id: 'noyee', nom: 'La noyée', type: 'pnj', statut: 'mort', pos_x: 2200, pos_y: 900,
    description: 'Noyée revenue d\'entre les morts, corps gonflé, yeux entièrement blancs, qui rôdait dans la réserve du phare et animait l\'eau de mer. Disparue quand Da Mao a rallumé la lumière du phare.' },

  // ── Le moulin de Mireille ─────────────────────────────────────────────────
  { id: 'mireille', nom: 'Mireille', type: 'pnj', statut: 'vivant', pos_x: 2550, pos_y: 820,
    description: 'Vieille meunière aux mains calleuses et à la force qu\'on ne soupçonne pas. Offre le gîte, le couvert et un médaillon brisé à qui sauvera son moulin. Son mari, un ancien Manteau rouge, est mort il y a cinq lunes. D\'un coup de son grand couteau rouillé, sans la moindre magie, elle a défait l\'esprit de l\'eau noire.' },
  { id: 'rancel', nom: 'Frère Rancel', type: 'pnj', statut: 'vivant', pos_x: 2740, pos_y: 920,
    description: 'Prêtre itinérant aux yeux doux, au chapelet usé à cordelettes rouges, venu d\'un monastère de l\'est. Passe de temps en temps chez Mireille.' },
  { id: 'pretre-moulin', nom: 'Le prêtre du moulin', type: 'pnj', statut: 'mort', pos_x: 2930, pos_y: 820,
    description: 'Chef de sept incantateurs en plein rituel de purification sous le moulin, invoquant l\'Ost des Souverains. Renversé par l\'esprit de l\'eau noire, il est mort avec ses acolytes. Les compagnons l\'ont attaqué à vue, sans savoir qu\'il tentait de contenir le mal.' },
  { id: 'esprit-eau', nom: 'L\'esprit de l\'eau corrompue', type: 'pnj', statut: 'mort', pos_x: 2550, pos_y: 1020,
    description: 'Esprit majeur de l\'eau noire, né de la coupe du rituel. A vieilli les cultistes sur place, puis suivi la piste des compagnons jusqu\'à la ferme sous forme de flaque fumante, rongeant le métal de Marteau et de Frack, avant que Mireille ne le défasse.' },
  { id: 'contrebandiers', nom: 'Les contrebandiers du moulin', type: 'organisation', statut: 'inconnu', pos_x: 2930, pos_y: 1020,
    description: 'Utilisaient depuis longtemps la caverne sous le moulin comme entrepôt. Leur chaloupe a été coulée pendant le combat. Leurs caisses (tubes de quartz, pistons, engrenages, seringues) portaient le symbole de la maison Cannith.' },
];

// [source, cible, type, libellé, orienté] — « @Nom » = personnage déjà présent
const L = (source_id, cible_id, type, libelle, oriente = false, description = null) =>
  ({ source_id, cible_id, type, libelle, oriente, description });

export const SESSION2_LINKS = [
  // Sharn
  L('moines', 'griffe', 'allie', 'Membres', true),
  L('griffe', 'sang-de-vol', 'famille', 'Branche extrémiste', true),
  L('moines', '@Les six compagnons', 'ennemi', 'Les ont attaqués sur les ponts', true),
  L('@Marteau', 'moines', 'ennemi', 'En a abattu un', true),
  L('@Aristote l\'Empaleur', 'moines', 'ennemi', 'En a abattu un', true),
  L('mouette', 'maison-vadalis', 'neutre', 'Travail qui rappelle cette maison', true),
  L('mouette', '@Les six compagnons', 'neutre', 'Les espionne', true),
  L('vieux-marque', '@La guilde des marqués', 'allie', 'Membre', true),
  L('tonton', '@Clan Boromar', 'affaires', 'Tient son prêteur sur gages', true),
  L('tonton', 'crela', 'neutre', 'Le recommande', true),
  L('alberix', '@Université de Morgrave', 'affaires', 'Professeur', true),
  L('@Marteau', 'alberix', 'neutre', 'L\'a rencontré'),

  // La route du nord
  L('responsable-relais', 'maison-orien', 'affaires', 'Responsable du relais', true),
  L('responsable-relais', '@Les six compagnons', 'allie', 'Leur a remis vingt-cinq pièces de platine', true),
  L('responsable-relais', 'marchand', 'ennemi', 'L\'a fait arrêter', true),
  L('marchand', '@Les six compagnons', 'affaires', 'Commanditaire des caisses rouges (175 po)', true),
  L('brigands', 'dame', 'ennemi', 'L\'ont enlevée contre rançon', true),
  L('@Les six compagnons', 'brigands', 'ennemi', 'Ont vidé leur camp', true),
  L('@Les six compagnons', 'dame', 'allie', 'L\'ont libérée', true),
  L('majordome', 'dame', 'allie', 'Venu la chercher', true),
  L('dame', '@Elaydren d\'Vown', 'famille', 'Cousine par alliance'),
  L('dame', '@Maison Cannith', 'famille', 'Famille cousine', true),
  L('@Elaydren d\'Vown', 'baron-merrix', 'affaires', 'Travaille pour son compte', true),
  L('@Da Mao', 'dame', 'neutre', 'L\'a interrogée sur Elaydren', true),

  // Le phare
  L('gardien', '@Les six compagnons', 'allie', 'Sauvé par eux ; leur a offert une perle', true),
  L('noyee', 'gardien', 'ennemi', 'Rôdait dans son phare', true),
  L('@Les six compagnons', 'noyee', 'ennemi', 'L\'ont détruite en rallumant le phare', true),

  // Le moulin
  L('mireille', '@Les six compagnons', 'allie', 'Les héberge', true),
  L('mireille', 'esprit-eau', 'ennemi', 'L\'a défait d\'un coup de couteau', true),
  L('rancel', 'mireille', 'neutre', 'Passe la voir'),
  L('pretre-moulin', 'esprit-eau', 'ennemi', 'Tentait de le purifier', true),
  L('esprit-eau', 'pretre-moulin', 'ennemi', 'L\'a vieilli et tué', true),
  L('@Les six compagnons', 'pretre-moulin', 'neutre', 'L\'ont attaqué à vue', true),
  L('@Les six compagnons', 'contrebandiers', 'ennemi', 'Combattus sur la chaloupe', true),
  L('contrebandiers', '@Maison Cannith', 'neutre', 'Caisses à son symbole (volées ou envoyées par la maison ?)', true),
  L('contrebandiers', 'pretre-moulin', 'affaires', 'L\'avaient peut-être engagé pour nettoyer la corruption', true),
];

// Précisions sur des personnages déjà présents : le texte est ajouté à la fin
// de la description (précédé de SESSION2_NOTE), sans rien effacer.
export const SESSION2_UPDATES = [
  { nom: 'Marteau', ajout: 'porte désormais les gantelets de propulsion pris aux moines de la Griffe d\'Émeraude. A absorbé l\'explosion de la caisse de rançon.' },
  { nom: 'Frack', ajout: 'a endormi les loups ordinaires, soigné les marins rescapés de Première-Tour et le gardien du phare. A eu les côtes fêlées par la main d\'eau de la noyée.' },
  { nom: 'Zarn Grennik', ajout: 'répare les jambes rongées de Marteau et de Frack avec le butin des contrebandiers : tubes de quartz, pistons, barres de fer.' },
  { nom: 'Da Mao', ajout: 'guide le groupe à travers champs, a rallumé le phare de Cornebrune et démasqué le marchand de Première-Tour.' },
  { nom: 'Trom', ajout: 'barde qui a beaucoup voyagé.' },
  { nom: 'Civax', ajout: 'une moitié du visage noire, l\'autre blanche. Chargé d\'endurcir les nouveaux marqués contre la douleur ; a conseillé de suivre la bande sans l\'affronter.' },
  { nom: 'Elaydren d\'Vown', ajout: 'la dame aux chaînes, sa cousine par alliance, révèle qu\'elle travaille pour le compte du baron Merrix de Sharn.' },
  { nom: 'Le demi-elfe au gantelet violacé', ajout: 'a quitté Sharn cinq jours avant les compagnons par la porte de Wroann, avec mercenaires, prêtre, druide et assassin, vers la route du nord. Aperçu au village de Refuge.' },
  { nom: 'Ariel Boromar', ajout: 'choisissait une étoffe pour une robe de bal quand les compagnons l\'ont retrouvée ; les a conduits au prêteur sur gages du clan.' },
];
