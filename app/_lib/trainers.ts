export interface TrainerStat {
  label: string;
  value: string;
}

export interface Trainer {
  id: string;
  name: string;
  role: string;
  bio: string[];
  stats: TrainerStat[];
  photoSrc: string;
  cta: string;
  bookable: boolean;
  returnNote?: string;
}

export const TRAINERS: Trainer[] = [
  {
    id: "arn",
    name: "Arn Braunschweiger",
    role: "Founder & Trainer",
    bookable: true,
    bio: [
      "Ik ben Arn Braunschweiger, padeltrainer in Hoorn. Met 6 jaar ervaring en een notering in de Nederlandse top-150 help ik spelers van alle niveaus hun spel naar een hoger niveau tillen.",
      "Na mijn opleiding aan de ALO heb ik ruime ervaring opgebouwd als trainer. Mijn lessen zijn persoonlijk, to-the-point en altijd afgestemd op jouw niveau en doelen.",
    ],
    stats: [
      { label: "Nederland ranking", value: "Top 150" },
      { label: "Ervaring", value: "6 jaar" },
      { label: "Opleiding", value: "ALO" },
    ],
    photoSrc: "/arn-photo.jpg",
    cta: "Boek bij Arn",
  },
  {
    id: "wessel",
    name: "Wessel Molenkamp",
    role: "De Molenkampioen · Trainer",
    bookable: true,
    bio: [
      "Ik ben Wessel Molenkamp, binnen padellend Hoorn beter bekend als de Molenkampioen. Ik heb padel in 2020 opgepakt na 20+ jaar te hebben getennist en speel hoofdklasse competitie met KNLTB-rating 3.",
      "Naast padeltrainer ben ik full-time verpleegkundige. Ik haal motivatie uit het verder helpen van mensen, op- en naast de padelbaan. Mijn lessen kenmerken zich door veel enthousiasme, persoonlijke aandacht, oog voor detail en een heldere opbouw.",
    ],
    stats: [
      { label: "KNLTB-rating", value: "3" },
      { label: "Achtergrond", value: "Tennis 20+ jaar" },
      { label: "Competitie", value: "Hoofdklasse" },
    ],
    photoSrc: "/wessel-photo.jpg",
    cta: "Boek bij Wessel",
  },
  {
    id: "floris",
    name: "Floris Coffeng",
    role: "Top 100 NL · Trainer",
    bookable: false,
    returnNote: "Binnenkort beschikbaar",
    bio: [
      "Floris Coffeng speelt in de Top 100 van Nederland en geeft al 5 jaar padelles. Daarvoor gaf hij jarenlang tennistraining op hoog niveau.",
      "Met zijn ALO-achtergrond en brede sportkennis tilt hij spelers op alle niveaus naar een hogere versnelling. Op dit moment is Floris een jaar onderweg door Azië — vanaf zijn terugkomst weer beschikbaar voor lessen.",
    ],
    stats: [
      { label: "Nederland ranking", value: "Top 100" },
      { label: "Ervaring", value: "5 jaar" },
      { label: "Opleiding", value: "ALO" },
    ],
    photoSrc: "/floris-photo.png",
    cta: "Binnenkort beschikbaar",
  },
];
