// Données de départ du graphe des relations, tirées de la chronique
// « La Marque Noire » (session du 5 septembre, session-20260905.html).
// Les identifiants sont des slugs lisibles : relations.js les remplace par
// de vrais UUID au moment de l'import, ce fichier n'est donc jamais écrit
// tel quel en base.

export const SEED_LABEL = 'La Marque Noire — session du 5 septembre';

export const SEED_NODES = [
  // ── Les compagnons ────────────────────────────────────────────────────────
  { id: 'compagnons', nom: 'Les six compagnons', type: 'organisation', statut: 'vivant', pos_x: 850, pos_y: 600,
    description: 'Le groupe formé une nuit de pluie sur une passerelle de Sharn : deux frères féraux, deux cousins gnomes et deux forgeliers, tous porteurs de la marque noire.' },
  { id: 'marteau', nom: 'Marteau', type: 'pj', statut: 'vivant', pos_x: 850, pos_y: 420,
    description: 'Forgelier découvert par Zarn dans un atelier caché de la maison Cannith. Premier à sauter dans le noir face aux gardiens d\'acier ; abattu d\'un carreau d\'arbalète par Sabre. Sa marque lui a donné le pouvoir d\'invoquer les ténèbres.' },
  { id: 'frack', nom: 'Frack', type: 'pj', statut: 'vivant', pos_x: 1005, pos_y: 510,
    description: 'Forgelier découvert par Zarn dans le même atelier. Soigneur improvisé (« Souhaitez-vous être réparé ? »). Fouille les archives de Morgrave sous un faux nom.' },
  { id: 'zarn', nom: 'Zarn Grennik', type: 'pj', statut: 'vivant', pos_x: 1005, pos_y: 690,
    description: 'Artificier gnome, cousin de Brix. A découvert Marteau et Frack dans un atelier caché de la maison Cannith. Consigne chaque mesure des marques dans un petit carnet.' },
  { id: 'brix', nom: 'Brix Grennik « Filigrane »', type: 'pj', statut: 'vivant', pos_x: 850, pos_y: 780,
    description: 'Roublard gnome, cousin de Zarn, surnommé Filigrane par ses contacts dans l\'ombre. A crocheté le bureau et le coffre du conseiller Hruitt.' },
  { id: 'aristote', nom: 'Aristote l\'Empaleur', type: 'pj', statut: 'vivant', pos_x: 695, pos_y: 690,
    description: 'Barbare féral, frère de Da Mao. Philosophe des tavernes à la hache tranchante : a décapité Cutter, Sabre et sa complice. « La mort nous attend tous, mais moi je l\'attendrai debout. »' },
  { id: 'da-mao', nom: 'Da Mao', type: 'pj', statut: 'vivant', pos_x: 695, pos_y: 510,
    description: 'Rôdeur féral, frère d\'Aristote. Poignardé sur le pont par un assassin, il a survécu de justesse grâce aux potions du coffre de la forge.' },

  // ── Le clan Boromar ───────────────────────────────────────────────────────
  { id: 'clan-boromar', nom: 'Clan Boromar', type: 'organisation', statut: 'vivant', pos_x: 190, pos_y: 380,
    description: 'Le plus puissant clan criminel de Sharn. A intégré les compagnons à son réseau (contrebande, protection, remises) et leur a confié une première mission : voler les relevés bancaires du conseiller Hruitt.' },
  { id: 'saidan', nom: 'Saïdan Boromar', type: 'pnj', statut: 'vivant', pos_x: 150, pos_y: 170,
    description: 'Parrain du clan Boromar. Grand-père d\'Ariel.' },
  { id: 'mala', nom: 'Mala Boromar d\'Jorasco', type: 'pnj', statut: 'vivant', pos_x: 360, pos_y: 80,
    description: 'Héritière de la maison draconique Jorasco, épouse de Saïdan et mère d\'Ilyra.' },
  { id: 'maison-jorasco', nom: 'Maison Jorasco', type: 'organisation', statut: 'vivant', pos_x: 560, pos_y: 60,
    description: 'Maison draconique de la marque de Guérison, tenue par les hobbits.' },
  { id: 'ilyra', nom: 'Ilyra Boromar', type: 'pnj', statut: 'vivant', pos_x: 300, pos_y: 240,
    description: 'Membre du conseil municipal de Sharn, fille aînée de Mala et Saïdan, mère d\'Ariel.' },
  { id: 'ariel', nom: 'Ariel Boromar', type: 'pnj', statut: 'vivant', pos_x: 430, pos_y: 340,
    description: 'Jeune hobbit aux dagues, petite-fille du parrain Saïdan. Sauvée d\'une embuscade à Callestan par les compagnons, elle les a introduits dans le réseau du clan.' },
  { id: 'garde-ariel', nom: 'Le garde du corps d\'Ariel', type: 'pnj', statut: 'vivant', pos_x: 560, pos_y: 230,
    description: 'Hobbit aux poings cerclés, blessé en défendant Ariel lors de l\'embuscade de Callestan.' },
  { id: 'hruitt', nom: 'Hruitt', type: 'pnj', statut: 'vivant', pos_x: 110, pos_y: 560,
    description: 'Conseiller municipal, hibou géant qui s\'oppose ouvertement au clan Boromar. Habite un petit palais avec jardin à Sous-Belvédère ; son coffre a été vidé de son acte de propriété et de son registre de comptes.' },
  { id: 'comptable', nom: 'Le comptable de Hruitt', type: 'pnj', statut: 'vivant', pos_x: 60, pos_y: 700,
    description: 'Homme tout de noir vêtu, une mallette à la main, aperçu sortant d\'une chambre insonorisée du Champ du Coq après un long entretien avec Hruitt.' },
  { id: 'igor', nom: 'Igor « le charcutier »', type: 'pnj', statut: 'vivant', pos_x: 450, pos_y: 560,
    description: 'Ogre colossal payé pour tendre l\'embuscade contre Ariel. Épargné, soigné et relâché par les compagnons après avoir avoué qui le payait.' },
  { id: 'feral-oreille', nom: 'Le féral à l\'oreille déchirée', type: 'pnj', statut: 'vivant', pos_x: 420, pos_y: 760,
    description: 'Furoncle au visage, oreille à demi dévorée. A payé Igor pour l\'embuscade, observe les compagnons depuis l\'ombre (reflet du miroir au Marché aux Rats) et harangue les tavernes au sujet de l\'Arche Noire.' },
  { id: 'six-obscurs', nom: 'Culte des Six Obscurs', type: 'organisation', statut: 'vivant', pos_x: 170, pos_y: 840,
    description: 'Culte des dieux sombres dont le féral à l\'oreille déchirée prêche l\'Arche Noire dans les tavernes de Dura.' },

  // ── La maison Cannith et le Seigneur des Lames ────────────────────────────
  { id: 'maison-cannith', nom: 'Maison Cannith', type: 'organisation', statut: 'vivant', pos_x: 1420, pos_y: 250,
    description: 'Maison draconique des artificiers, fracturée en factions rivales depuis la destruction de Cyre, dont on soupçonne une invention Cannith d\'être la cause. Un comptoir a refusé tout crédit aux compagnons.' },
  { id: 'elaydren', nom: 'Elaydren d\'Vown', type: 'pnj', statut: 'vivant', pos_x: 1240, pos_y: 350,
    description: 'Cousine de la lignée de sang Cannith, sans être héritière. A engagé les compagnons pour récupérer la plaque d\'adamantine à sept branches et a fait effacer leurs noms des registres de la maison.' },
  { id: 'bonal', nom: 'Bonal Gelden', type: 'pnj', statut: 'mort', pos_x: 1240, pos_y: 140,
    description: 'Prévôt de l\'université de Morgrave. Travaillait avec Elaydren sur la piste de la fonderie perdue ; tué par Cutter sur une passerelle. Son carnet aux pages de mithril a tout déclenché.' },
  { id: 'morgrave', nom: 'Université de Morgrave', type: 'organisation', statut: 'vivant', pos_x: 1440, pos_y: 60,
    description: 'La grande université de Sharn. Bonal Gelden y était prévôt ; Frack y fouille les archives sur les marques draconiques sous une fausse identité.' },
  { id: 'cutter', nom: 'Cutter', type: 'pnj', statut: 'mort', pos_x: 1060, pos_y: 180,
    description: 'Forgelière assassin, agent du Seigneur des Lames. A tué Bonal Gelden ; vaincue puis décapitée par Aristote sur la passerelle.' },
  { id: 'seigneur-lames', nom: 'Le Seigneur des Lames', type: 'pnj', statut: 'vivant', pos_x: 1620, pos_y: 470,
    description: 'Forgelier devenu prophète : prêche l\'émancipation de son peuple et la destruction de toute créature pensante qui ne serait pas de métal. Cutter et Sabre étaient ses agents.' },
  { id: 'sabre', nom: 'Sabre', type: 'pnj', statut: 'mort', pos_x: 1440, pos_y: 620,
    description: 'Forgelier assassin, agent du Seigneur des Lames. A failli tuer Marteau et Da Mao d\'un carreau d\'arbalète ; décapité par Aristote. Portait la plaque d\'un escadron brelandais disparu à Cyre.' },
  { id: 'complice-sabre', nom: 'La complice elfe de Sabre', type: 'pnj', statut: 'mort', pos_x: 1630, pos_y: 700,
    description: 'Elfe qui épaulait Sabre à la sortie du temple d\'Onatar. Sa cape s\'est embrasée dans la mêlée ; décapitée par Aristote.' },
  { id: 'tarkanan', nom: 'Maison Tarkanan', type: 'organisation', statut: 'vivant', pos_x: 1380, pos_y: 880,
    description: 'Recrute et traque les porteurs de marques aberrantes. La raison pour laquelle les compagnons tenaient tant à l\'oubli de leurs noms.' },

  // ── Sharn, la ville ───────────────────────────────────────────────────────
  { id: 'sergent', nom: 'Le sergent de la garde', type: 'pnj', statut: 'vivant', pos_x: 620, pos_y: 400,
    description: 'Nain porteur d\'une lanterne. A enfermé les compagnons pour la nuit puis les a relâchés : « Vous devez avoir des amis très influents. »' },
  { id: 'skakan', nom: 'Skakan le Magnifique', type: 'pnj', statut: 'vivant', pos_x: 1180, pos_y: 760,
    description: 'Marchand du Marché aux Rats, dans les égouts. A vendu la pierre dracolite Sidérys et tracé, contre monnaie sonnante, le chemin vers la vanne E213… qui menait droit dans une embuscade.' },
  { id: 'sundry', nom: 'Sundry Charmpack', type: 'pnj', statut: 'vivant', pos_x: 1070, pos_y: 340,
    description: 'Antiquaire à la boutique poussiéreuse du Bazar de Mid-Dura. A expertisé les pièces anciennes du coffre ; expose une enclume géante de Xen\'drik à soixante mille pièces d\'or.' },

  // ── Les agresseurs du pont ────────────────────────────────────────────────
  { id: 'demi-elfe', nom: 'Le demi-elfe au gantelet violacé', type: 'pnj', statut: 'vivant', pos_x: 850, pos_y: 1000,
    description: 'Bandeau sur l\'œil, longue cape noire, gantelet violacé parcouru de veines. Ses flèches noires ont frappé chaque porteur de marque sur le pont. Décrit dans les tavernes comme un homme en armure noire, cornu, entouré de mercenaires.' },
  { id: 'pretre', nom: 'Le prêtre du pont', type: 'pnj', statut: 'vivant', pos_x: 690, pos_y: 1110,
    description: 'Accompagne le demi-elfe et identifie les porteurs de marques par un sortilège. Touché d\'un carreau d\'arbalète en pleine incantation.' },
  { id: 'assassin-pont', nom: 'L\'assassin aux dagues empoisonnées', type: 'pnj', statut: 'vivant', pos_x: 1010, pos_y: 1110,
    description: 'Caché sous le pont, a planté une dague empoisonnée dans le dos de Da Mao avant de s\'enfuir. Le poison de sa dague a été récupéré et concentré par le groupe.' },
  { id: 'elfe-balafree', nom: 'L\'elfe balafrée', type: 'pnj', statut: 'vivant', pos_x: 1160, pos_y: 960,
    description: 'Crâne rasé barré d\'une cicatrice. Houspillait sur une passerelle une bande redoutable (kobold couvert de symboles arcaniques, forgelier, féral, elfe qui apparaît et disparaît) qui semblait la craindre.' },

  // ── La guilde des marqués ─────────────────────────────────────────────────
  { id: 'guilde', nom: 'La guilde des marqués', type: 'organisation', statut: 'vivant', pos_x: 330, pos_y: 980,
    description: 'Organisation clandestine réunissant les porteurs de la marque noire à Sharn et alentour, jusqu\'à Karrnath. Quartier général derrière une porte cachée de l\'auberge Aux Berges.' },
  { id: 'trom', nom: 'Trom', type: 'pnj', statut: 'vivant', pos_x: 170, pos_y: 1080,
    description: 'Chef de la guilde des marqués, marqué au front. A recruté les compagnons et leur a montré les marqués à un stade avancé, preuve vivante de ce qui les attend.' },
  { id: 'civax', nom: 'Civax', type: 'pnj', statut: 'vivant', pos_x: 60, pos_y: 960,
    description: 'Changelin sous sa forme naturelle, fidèle bras droit de Trom.' },
  { id: 'sara', nom: 'Sara', type: 'pnj', statut: 'vivant', pos_x: 500, pos_y: 1090,
    description: 'Jeune femme porteuse de la marque noire. A abordé les compagnons dans la rue et les a menés à l\'auberge Aux Berges.' },
  { id: 'kate', nom: 'Kate', type: 'pnj', statut: 'inconnu', pos_x: 560, pos_y: 900,
    description: 'Femme dont on raconte l\'histoire à voix basse dans les bas-fonds : depuis qu\'elle a reçu une marque aberrante, une créature prend peu à peu possession d\'elle.' },
];

// [source, cible, type, libellé, orienté]
const L = (source_id, cible_id, type, libelle, oriente = false, description = null) =>
  ({ source_id, cible_id, type, libelle, oriente, description });

export const SEED_LINKS = [
  // Compagnons
  L('da-mao', 'aristote', 'famille', 'Frères'),
  L('zarn', 'brix', 'famille', 'Cousins'),
  L('zarn', 'marteau', 'allie', 'L\'a découvert dans l\'atelier caché', true),
  L('zarn', 'frack', 'allie', 'L\'a découvert dans l\'atelier caché', true),
  L('frack', 'marteau', 'allie', 'L\'a ranimé dans les égouts', true),
  L('frack', 'aristote', 'allie', 'L\'a soigné en cellule', true),
  L('aristote', 'marteau', 'allie', '« La vie est courte et la bière est chère »'),
  L('marteau', 'compagnons', 'allie', 'Membre', true),
  L('frack', 'compagnons', 'allie', 'Membre', true),
  L('zarn', 'compagnons', 'allie', 'Membre', true),
  L('brix', 'compagnons', 'allie', 'Membre', true),
  L('aristote', 'compagnons', 'allie', 'Membre', true),
  L('da-mao', 'compagnons', 'allie', 'Membre', true),

  // Cannith, Gelden, le Seigneur des Lames
  L('cutter', 'bonal', 'ennemi', 'L\'a tué sur la passerelle', true),
  L('aristote', 'cutter', 'ennemi', 'L\'a décapitée', true),
  L('cutter', 'seigneur-lames', 'affaires', 'Agent', true),
  L('sabre', 'seigneur-lames', 'affaires', 'Agent', true),
  L('sabre', 'marteau', 'ennemi', 'L\'a abattu d\'un carreau d\'arbalète', true),
  L('aristote', 'sabre', 'ennemi', 'L\'a traqué et décapité', true),
  L('complice-sabre', 'sabre', 'allie', 'Complice'),
  L('bonal', 'elaydren', 'affaires', 'Cherchaient ensemble l\'héritage Cannith'),
  L('bonal', 'morgrave', 'affaires', 'Prévôt', true),
  L('frack', 'morgrave', 'affaires', 'Fouille les archives sous un faux nom', true),
  L('elaydren', 'maison-cannith', 'famille', 'Cousine de la lignée de sang', true),
  L('elaydren', 'compagnons', 'affaires', 'Commanditaire : la plaque d\'adamantine contre 100 po et l\'oubli', true),
  L('maison-cannith', 'seigneur-lames', 'ennemi', 'A intercepté un de ses agents'),
  L('maison-cannith', 'marteau', 'neutre', 'Abandonné dans un atelier caché d\'une faction dissidente', true),
  L('maison-cannith', 'frack', 'neutre', 'Abandonné dans un atelier caché d\'une faction dissidente', true),
  L('tarkanan', 'compagnons', 'ennemi', 'Traque les porteurs de marques aberrantes', true),

  // Boromar
  L('ariel', 'ilyra', 'famille', 'Fille', true),
  L('ilyra', 'saidan', 'famille', 'Fille', true),
  L('ilyra', 'mala', 'famille', 'Fille aînée', true),
  L('mala', 'saidan', 'famille', 'Époux'),
  L('mala', 'maison-jorasco', 'famille', 'Héritière', true),
  L('saidan', 'clan-boromar', 'affaires', 'Parrain', true),
  L('garde-ariel', 'ariel', 'allie', 'Garde du corps', true),
  L('ariel', 'compagnons', 'allie', 'Sauvée par eux ; les a intégrés au réseau du clan'),
  L('clan-boromar', 'compagnons', 'affaires', 'Mission : voler les relevés bancaires de Hruitt', true),
  L('igor', 'ariel', 'ennemi', 'A tendu l\'embuscade de Callestan', true),
  L('feral-oreille', 'igor', 'affaires', 'L\'a payé pour l\'embuscade', true),
  L('compagnons', 'igor', 'neutre', 'Épargné, soigné et relâché', true),
  L('feral-oreille', 'compagnons', 'ennemi', 'Les observe depuis l\'ombre', true),
  L('feral-oreille', 'six-obscurs', 'affaires', 'Prêche l\'Arche Noire', true),
  L('hruitt', 'clan-boromar', 'ennemi', 'S\'oppose ouvertement au clan'),
  L('compagnons', 'hruitt', 'ennemi', 'L\'ont filé puis cambriolé', true),
  L('comptable', 'hruitt', 'affaires', 'Comptable présumé', true),

  // Sharn
  L('skakan', 'compagnons', 'affaires', 'Leur a vendu la dracolite et le chemin vers la vanne E213'),
  L('sundry', 'marteau', 'affaires', 'A expertisé ses pièces anciennes'),
  L('sergent', 'compagnons', 'neutre', 'Les a enfermés une nuit puis relâchés', true),

  // Le pont
  L('demi-elfe', 'compagnons', 'ennemi', 'Les a frappés de ses flèches noires sur le pont', true),
  L('pretre', 'demi-elfe', 'allie', 'Son prêtre', true),
  L('assassin-pont', 'demi-elfe', 'allie', 'Son assassin', true),
  L('assassin-pont', 'da-mao', 'ennemi', 'L\'a poignardé d\'une dague empoisonnée', true),
  L('elfe-balafree', 'compagnons', 'neutre', 'Aperçue sur une passerelle ; évitée par prudence'),

  // La guilde
  L('trom', 'guilde', 'affaires', 'Chef', true),
  L('civax', 'trom', 'allie', 'Bras droit', true),
  L('sara', 'guilde', 'affaires', 'Recruteuse', true),
  L('sara', 'compagnons', 'allie', 'Les a abordés et menés à Aux Berges', true),
  L('trom', 'compagnons', 'allie', 'Les a recrutés dans la guilde', true),
  L('guilde', 'demi-elfe', 'ennemi', 'Marqués par les mêmes brigands'),
  L('kate', 'compagnons', 'neutre', 'Partage la même malédiction'),
];
