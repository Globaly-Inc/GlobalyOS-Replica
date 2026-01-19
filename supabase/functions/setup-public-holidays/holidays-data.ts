/**
 * Public holidays data by country code (ISO 3166-1 alpha-2)
 * Contains major fixed-date holidays for ~40 countries
 */

export interface PublicHoliday {
  month: number; // 1-12
  day: number;
  title: string;
}

export const COUNTRY_HOLIDAYS: Record<string, PublicHoliday[]> = {
  // Australia
  AU: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 1, day: 26, title: "Australia Day" },
    { month: 4, day: 25, title: "ANZAC Day" },
    { month: 12, day: 25, title: "Christmas Day" },
    { month: 12, day: 26, title: "Boxing Day" },
  ],

  // United States
  US: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 7, day: 4, title: "Independence Day" },
    { month: 11, day: 11, title: "Veterans Day" },
    { month: 12, day: 25, title: "Christmas Day" },
  ],

  // United Kingdom
  GB: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 12, day: 25, title: "Christmas Day" },
    { month: 12, day: 26, title: "Boxing Day" },
  ],

  // Canada
  CA: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 7, day: 1, title: "Canada Day" },
    { month: 11, day: 11, title: "Remembrance Day" },
    { month: 12, day: 25, title: "Christmas Day" },
    { month: 12, day: 26, title: "Boxing Day" },
  ],

  // Germany
  DE: [
    { month: 1, day: 1, title: "Neujahr" },
    { month: 5, day: 1, title: "Tag der Arbeit" },
    { month: 10, day: 3, title: "Tag der Deutschen Einheit" },
    { month: 12, day: 25, title: "Weihnachtstag" },
    { month: 12, day: 26, title: "Zweiter Weihnachtstag" },
  ],

  // France
  FR: [
    { month: 1, day: 1, title: "Jour de l'An" },
    { month: 5, day: 1, title: "Fête du Travail" },
    { month: 5, day: 8, title: "Victoire 1945" },
    { month: 7, day: 14, title: "Fête Nationale" },
    { month: 8, day: 15, title: "Assomption" },
    { month: 11, day: 1, title: "Toussaint" },
    { month: 11, day: 11, title: "Armistice" },
    { month: 12, day: 25, title: "Noël" },
  ],

  // India
  IN: [
    { month: 1, day: 26, title: "Republic Day" },
    { month: 8, day: 15, title: "Independence Day" },
    { month: 10, day: 2, title: "Gandhi Jayanti" },
  ],

  // Nepal
  NP: [
    { month: 1, day: 11, title: "Prithvi Jayanti" },
    { month: 1, day: 15, title: "Maghe Sankranti" },
    { month: 2, day: 19, title: "Democracy Day" },
    { month: 3, day: 8, title: "International Women's Day" },
    { month: 5, day: 1, title: "Labour Day" },
    { month: 5, day: 29, title: "Republic Day" },
    { month: 9, day: 17, title: "Constitution Day" },
  ],

  // Japan
  JP: [
    { month: 1, day: 1, title: "元日 (New Year's Day)" },
    { month: 2, day: 11, title: "建国記念の日 (National Foundation Day)" },
    { month: 2, day: 23, title: "天皇誕生日 (Emperor's Birthday)" },
    { month: 4, day: 29, title: "昭和の日 (Shōwa Day)" },
    { month: 5, day: 3, title: "憲法記念日 (Constitution Day)" },
    { month: 5, day: 4, title: "みどりの日 (Greenery Day)" },
    { month: 5, day: 5, title: "こどもの日 (Children's Day)" },
    { month: 8, day: 11, title: "山の日 (Mountain Day)" },
    { month: 11, day: 3, title: "文化の日 (Culture Day)" },
    { month: 11, day: 23, title: "勤労感謝の日 (Labour Thanksgiving Day)" },
  ],

  // China
  CN: [
    { month: 1, day: 1, title: "元旦 (New Year's Day)" },
    { month: 5, day: 1, title: "劳动节 (Labour Day)" },
    { month: 10, day: 1, title: "国庆节 (National Day)" },
  ],

  // Singapore
  SG: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 5, day: 1, title: "Labour Day" },
    { month: 8, day: 9, title: "National Day" },
    { month: 12, day: 25, title: "Christmas Day" },
  ],

  // United Arab Emirates
  AE: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 12, day: 2, title: "National Day" },
    { month: 12, day: 3, title: "National Day Holiday" },
  ],

  // Saudi Arabia
  SA: [
    { month: 9, day: 23, title: "National Day" },
  ],

  // South Korea
  KR: [
    { month: 1, day: 1, title: "신정 (New Year's Day)" },
    { month: 3, day: 1, title: "삼일절 (Independence Movement Day)" },
    { month: 5, day: 5, title: "어린이날 (Children's Day)" },
    { month: 6, day: 6, title: "현충일 (Memorial Day)" },
    { month: 8, day: 15, title: "광복절 (Liberation Day)" },
    { month: 10, day: 3, title: "개천절 (National Foundation Day)" },
    { month: 10, day: 9, title: "한글날 (Hangul Day)" },
    { month: 12, day: 25, title: "크리스마스 (Christmas Day)" },
  ],

  // Brazil
  BR: [
    { month: 1, day: 1, title: "Ano Novo" },
    { month: 4, day: 21, title: "Tiradentes" },
    { month: 5, day: 1, title: "Dia do Trabalhador" },
    { month: 9, day: 7, title: "Independência do Brasil" },
    { month: 10, day: 12, title: "Nossa Senhora Aparecida" },
    { month: 11, day: 2, title: "Finados" },
    { month: 11, day: 15, title: "Proclamação da República" },
    { month: 12, day: 25, title: "Natal" },
  ],

  // Mexico
  MX: [
    { month: 1, day: 1, title: "Año Nuevo" },
    { month: 2, day: 5, title: "Día de la Constitución" },
    { month: 3, day: 21, title: "Natalicio de Benito Juárez" },
    { month: 5, day: 1, title: "Día del Trabajo" },
    { month: 9, day: 16, title: "Día de la Independencia" },
    { month: 11, day: 20, title: "Día de la Revolución" },
    { month: 12, day: 25, title: "Navidad" },
  ],

  // Italy
  IT: [
    { month: 1, day: 1, title: "Capodanno" },
    { month: 1, day: 6, title: "Epifania" },
    { month: 4, day: 25, title: "Festa della Liberazione" },
    { month: 5, day: 1, title: "Festa dei Lavoratori" },
    { month: 6, day: 2, title: "Festa della Repubblica" },
    { month: 8, day: 15, title: "Ferragosto" },
    { month: 11, day: 1, title: "Tutti i Santi" },
    { month: 12, day: 8, title: "Immacolata Concezione" },
    { month: 12, day: 25, title: "Natale" },
    { month: 12, day: 26, title: "Santo Stefano" },
  ],

  // Spain
  ES: [
    { month: 1, day: 1, title: "Año Nuevo" },
    { month: 1, day: 6, title: "Epifanía del Señor" },
    { month: 5, day: 1, title: "Fiesta del Trabajo" },
    { month: 8, day: 15, title: "Asunción de la Virgen" },
    { month: 10, day: 12, title: "Fiesta Nacional de España" },
    { month: 11, day: 1, title: "Todos los Santos" },
    { month: 12, day: 6, title: "Día de la Constitución" },
    { month: 12, day: 8, title: "Inmaculada Concepción" },
    { month: 12, day: 25, title: "Navidad" },
  ],

  // Netherlands
  NL: [
    { month: 1, day: 1, title: "Nieuwjaarsdag" },
    { month: 4, day: 27, title: "Koningsdag" },
    { month: 5, day: 5, title: "Bevrijdingsdag" },
    { month: 12, day: 25, title: "Kerstmis" },
    { month: 12, day: 26, title: "Tweede Kerstdag" },
  ],

  // Belgium
  BE: [
    { month: 1, day: 1, title: "Jour de l'An" },
    { month: 5, day: 1, title: "Fête du Travail" },
    { month: 7, day: 21, title: "Fête Nationale" },
    { month: 8, day: 15, title: "Assomption" },
    { month: 11, day: 1, title: "Toussaint" },
    { month: 11, day: 11, title: "Armistice" },
    { month: 12, day: 25, title: "Noël" },
  ],

  // Switzerland
  CH: [
    { month: 1, day: 1, title: "Neujahr" },
    { month: 8, day: 1, title: "Nationalfeiertag" },
    { month: 12, day: 25, title: "Weihnachtstag" },
    { month: 12, day: 26, title: "Stephanstag" },
  ],

  // Austria
  AT: [
    { month: 1, day: 1, title: "Neujahr" },
    { month: 1, day: 6, title: "Heilige Drei Könige" },
    { month: 5, day: 1, title: "Staatsfeiertag" },
    { month: 8, day: 15, title: "Mariä Himmelfahrt" },
    { month: 10, day: 26, title: "Nationalfeiertag" },
    { month: 11, day: 1, title: "Allerheiligen" },
    { month: 12, day: 8, title: "Mariä Empfängnis" },
    { month: 12, day: 25, title: "Weihnachtstag" },
    { month: 12, day: 26, title: "Stefanitag" },
  ],

  // Poland
  PL: [
    { month: 1, day: 1, title: "Nowy Rok" },
    { month: 1, day: 6, title: "Święto Trzech Króli" },
    { month: 5, day: 1, title: "Święto Pracy" },
    { month: 5, day: 3, title: "Święto Konstytucji 3 Maja" },
    { month: 8, day: 15, title: "Wniebowzięcie NMP" },
    { month: 11, day: 1, title: "Wszystkich Świętych" },
    { month: 11, day: 11, title: "Święto Niepodległości" },
    { month: 12, day: 25, title: "Boże Narodzenie" },
    { month: 12, day: 26, title: "Drugi dzień Bożego Narodzenia" },
  ],

  // Sweden
  SE: [
    { month: 1, day: 1, title: "Nyårsdagen" },
    { month: 1, day: 6, title: "Trettondedag jul" },
    { month: 5, day: 1, title: "Första maj" },
    { month: 6, day: 6, title: "Sveriges nationaldag" },
    { month: 12, day: 25, title: "Juldagen" },
    { month: 12, day: 26, title: "Annandag jul" },
  ],

  // Norway
  NO: [
    { month: 1, day: 1, title: "Første nyttårsdag" },
    { month: 5, day: 1, title: "Arbeidernes dag" },
    { month: 5, day: 17, title: "Grunnlovsdagen" },
    { month: 12, day: 25, title: "Første juledag" },
    { month: 12, day: 26, title: "Andre juledag" },
  ],

  // Denmark
  DK: [
    { month: 1, day: 1, title: "Nytårsdag" },
    { month: 6, day: 5, title: "Grundlovsdag" },
    { month: 12, day: 25, title: "Juledag" },
    { month: 12, day: 26, title: "2. Juledag" },
  ],

  // Finland
  FI: [
    { month: 1, day: 1, title: "Uudenvuodenpäivä" },
    { month: 1, day: 6, title: "Loppiainen" },
    { month: 5, day: 1, title: "Vappu" },
    { month: 12, day: 6, title: "Itsenäisyyspäivä" },
    { month: 12, day: 25, title: "Joulupäivä" },
    { month: 12, day: 26, title: "Tapaninpäivä" },
  ],

  // Ireland
  IE: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 3, day: 17, title: "St. Patrick's Day" },
    { month: 12, day: 25, title: "Christmas Day" },
    { month: 12, day: 26, title: "St. Stephen's Day" },
  ],

  // Portugal
  PT: [
    { month: 1, day: 1, title: "Ano Novo" },
    { month: 4, day: 25, title: "Dia da Liberdade" },
    { month: 5, day: 1, title: "Dia do Trabalhador" },
    { month: 6, day: 10, title: "Dia de Portugal" },
    { month: 8, day: 15, title: "Assunção de Nossa Senhora" },
    { month: 10, day: 5, title: "Implantação da República" },
    { month: 11, day: 1, title: "Todos os Santos" },
    { month: 12, day: 1, title: "Restauração da Independência" },
    { month: 12, day: 8, title: "Imaculada Conceição" },
    { month: 12, day: 25, title: "Natal" },
  ],

  // New Zealand
  NZ: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 1, day: 2, title: "Day after New Year's Day" },
    { month: 2, day: 6, title: "Waitangi Day" },
    { month: 4, day: 25, title: "ANZAC Day" },
    { month: 12, day: 25, title: "Christmas Day" },
    { month: 12, day: 26, title: "Boxing Day" },
  ],

  // South Africa
  ZA: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 3, day: 21, title: "Human Rights Day" },
    { month: 4, day: 27, title: "Freedom Day" },
    { month: 5, day: 1, title: "Workers' Day" },
    { month: 6, day: 16, title: "Youth Day" },
    { month: 8, day: 9, title: "National Women's Day" },
    { month: 9, day: 24, title: "Heritage Day" },
    { month: 12, day: 16, title: "Day of Reconciliation" },
    { month: 12, day: 25, title: "Christmas Day" },
    { month: 12, day: 26, title: "Day of Goodwill" },
  ],

  // Philippines
  PH: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 4, day: 9, title: "Araw ng Kagitingan" },
    { month: 5, day: 1, title: "Labour Day" },
    { month: 6, day: 12, title: "Independence Day" },
    { month: 8, day: 21, title: "Ninoy Aquino Day" },
    { month: 8, day: 28, title: "National Heroes Day" },
    { month: 11, day: 30, title: "Bonifacio Day" },
    { month: 12, day: 25, title: "Christmas Day" },
    { month: 12, day: 30, title: "Rizal Day" },
  ],

  // Malaysia
  MY: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 2, day: 1, title: "Federal Territory Day" },
    { month: 5, day: 1, title: "Labour Day" },
    { month: 8, day: 31, title: "Merdeka Day" },
    { month: 9, day: 16, title: "Malaysia Day" },
    { month: 12, day: 25, title: "Christmas Day" },
  ],

  // Indonesia
  ID: [
    { month: 1, day: 1, title: "Tahun Baru" },
    { month: 5, day: 1, title: "Hari Buruh" },
    { month: 6, day: 1, title: "Hari Lahir Pancasila" },
    { month: 8, day: 17, title: "Hari Kemerdekaan" },
    { month: 12, day: 25, title: "Hari Natal" },
  ],

  // Thailand
  TH: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 4, day: 6, title: "Chakri Day" },
    { month: 4, day: 13, title: "Songkran" },
    { month: 4, day: 14, title: "Songkran" },
    { month: 4, day: 15, title: "Songkran" },
    { month: 5, day: 1, title: "Labour Day" },
    { month: 5, day: 4, title: "Coronation Day" },
    { month: 7, day: 28, title: "King's Birthday" },
    { month: 8, day: 12, title: "Queen's Birthday" },
    { month: 10, day: 13, title: "King Bhumibol Memorial Day" },
    { month: 10, day: 23, title: "Chulalongkorn Day" },
    { month: 12, day: 5, title: "King Bhumibol's Birthday" },
    { month: 12, day: 10, title: "Constitution Day" },
  ],

  // Vietnam
  VN: [
    { month: 1, day: 1, title: "Tết Dương lịch" },
    { month: 4, day: 30, title: "Ngày Giải phóng" },
    { month: 5, day: 1, title: "Quốc tế Lao động" },
    { month: 9, day: 2, title: "Quốc khánh" },
  ],

  // Taiwan
  TW: [
    { month: 1, day: 1, title: "元旦" },
    { month: 2, day: 28, title: "和平紀念日" },
    { month: 4, day: 4, title: "兒童節" },
    { month: 10, day: 10, title: "國慶日" },
  ],

  // Hong Kong
  HK: [
    { month: 1, day: 1, title: "New Year's Day" },
    { month: 5, day: 1, title: "Labour Day" },
    { month: 7, day: 1, title: "HKSAR Establishment Day" },
    { month: 10, day: 1, title: "National Day" },
    { month: 12, day: 25, title: "Christmas Day" },
    { month: 12, day: 26, title: "Boxing Day" },
  ],

  // Russia
  RU: [
    { month: 1, day: 1, title: "Новый год" },
    { month: 1, day: 7, title: "Рождество Христово" },
    { month: 2, day: 23, title: "День защитника Отечества" },
    { month: 3, day: 8, title: "Международный женский день" },
    { month: 5, day: 1, title: "Праздник Весны и Труда" },
    { month: 5, day: 9, title: "День Победы" },
    { month: 6, day: 12, title: "День России" },
    { month: 11, day: 4, title: "День народного единства" },
  ],

  // Turkey
  TR: [
    { month: 1, day: 1, title: "Yılbaşı" },
    { month: 4, day: 23, title: "Ulusal Egemenlik ve Çocuk Bayramı" },
    { month: 5, day: 1, title: "Emek ve Dayanışma Günü" },
    { month: 5, day: 19, title: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
    { month: 7, day: 15, title: "Demokrasi ve Milli Birlik Günü" },
    { month: 8, day: 30, title: "Zafer Bayramı" },
    { month: 10, day: 29, title: "Cumhuriyet Bayramı" },
  ],

  // Israel
  IL: [
    { month: 5, day: 14, title: "Yom Ha'atzmaut (Independence Day)" },
  ],

  // Egypt
  EG: [
    { month: 1, day: 7, title: "Coptic Christmas" },
    { month: 1, day: 25, title: "Revolution Day" },
    { month: 4, day: 25, title: "Sinai Liberation Day" },
    { month: 5, day: 1, title: "Labour Day" },
    { month: 7, day: 23, title: "Revolution Day" },
    { month: 10, day: 6, title: "Armed Forces Day" },
  ],

  // Argentina
  AR: [
    { month: 1, day: 1, title: "Año Nuevo" },
    { month: 5, day: 1, title: "Día del Trabajador" },
    { month: 5, day: 25, title: "Día de la Revolución de Mayo" },
    { month: 6, day: 20, title: "Día de la Bandera" },
    { month: 7, day: 9, title: "Día de la Independencia" },
    { month: 12, day: 8, title: "Inmaculada Concepción" },
    { month: 12, day: 25, title: "Navidad" },
  ],

  // Chile
  CL: [
    { month: 1, day: 1, title: "Año Nuevo" },
    { month: 5, day: 1, title: "Día del Trabajo" },
    { month: 5, day: 21, title: "Día de las Glorias Navales" },
    { month: 6, day: 29, title: "San Pedro y San Pablo" },
    { month: 8, day: 15, title: "Asunción de la Virgen" },
    { month: 9, day: 18, title: "Fiestas Patrias" },
    { month: 9, day: 19, title: "Día de las Glorias del Ejército" },
    { month: 10, day: 12, title: "Encuentro de Dos Mundos" },
    { month: 11, day: 1, title: "Día de Todos los Santos" },
    { month: 12, day: 8, title: "Inmaculada Concepción" },
    { month: 12, day: 25, title: "Navidad" },
  ],

  // Colombia
  CO: [
    { month: 1, day: 1, title: "Año Nuevo" },
    { month: 5, day: 1, title: "Día del Trabajo" },
    { month: 7, day: 20, title: "Día de la Independencia" },
    { month: 8, day: 7, title: "Batalla de Boyacá" },
    { month: 12, day: 8, title: "Inmaculada Concepción" },
    { month: 12, day: 25, title: "Navidad" },
  ],

  // Peru
  PE: [
    { month: 1, day: 1, title: "Año Nuevo" },
    { month: 5, day: 1, title: "Día del Trabajo" },
    { month: 6, day: 29, title: "San Pedro y San Pablo" },
    { month: 7, day: 28, title: "Fiestas Patrias" },
    { month: 7, day: 29, title: "Fiestas Patrias" },
    { month: 8, day: 30, title: "Santa Rosa de Lima" },
    { month: 10, day: 8, title: "Combate de Angamos" },
    { month: 11, day: 1, title: "Día de Todos los Santos" },
    { month: 12, day: 8, title: "Inmaculada Concepción" },
    { month: 12, day: 25, title: "Navidad" },
  ],

  // Greece
  GR: [
    { month: 1, day: 1, title: "Πρωτοχρονιά" },
    { month: 1, day: 6, title: "Θεοφάνεια" },
    { month: 3, day: 25, title: "Ευαγγελισμός" },
    { month: 5, day: 1, title: "Εργατική Πρωτομαγιά" },
    { month: 8, day: 15, title: "Κοίμηση της Θεοτόκου" },
    { month: 10, day: 28, title: "Επέτειος του Όχι" },
    { month: 12, day: 25, title: "Χριστούγεννα" },
    { month: 12, day: 26, title: "Σύναξη της Θεοτόκου" },
  ],

  // Czech Republic
  CZ: [
    { month: 1, day: 1, title: "Nový rok" },
    { month: 5, day: 1, title: "Svátek práce" },
    { month: 5, day: 8, title: "Den vítězství" },
    { month: 7, day: 5, title: "Den slovanských věrozvěstů" },
    { month: 7, day: 6, title: "Den upálení mistra Jana Husa" },
    { month: 9, day: 28, title: "Den české státnosti" },
    { month: 10, day: 28, title: "Den vzniku samostatného československého státu" },
    { month: 11, day: 17, title: "Den boje za svobodu a demokracii" },
    { month: 12, day: 24, title: "Štědrý den" },
    { month: 12, day: 25, title: "1. svátek vánoční" },
    { month: 12, day: 26, title: "2. svátek vánoční" },
  ],

  // Hungary
  HU: [
    { month: 1, day: 1, title: "Újév" },
    { month: 3, day: 15, title: "Nemzeti ünnep" },
    { month: 5, day: 1, title: "A munka ünnepe" },
    { month: 8, day: 20, title: "Államalapítás ünnepe" },
    { month: 10, day: 23, title: "1956-os forradalom" },
    { month: 11, day: 1, title: "Mindenszentek" },
    { month: 12, day: 25, title: "Karácsony" },
    { month: 12, day: 26, title: "Karácsony másnapja" },
  ],

  // Romania
  RO: [
    { month: 1, day: 1, title: "Anul Nou" },
    { month: 1, day: 2, title: "Anul Nou" },
    { month: 1, day: 24, title: "Ziua Unirii Principatelor Române" },
    { month: 5, day: 1, title: "Ziua Muncii" },
    { month: 6, day: 1, title: "Ziua Copilului" },
    { month: 8, day: 15, title: "Adormirea Maicii Domnului" },
    { month: 11, day: 30, title: "Sfântul Andrei" },
    { month: 12, day: 1, title: "Ziua Națională" },
    { month: 12, day: 25, title: "Crăciun" },
    { month: 12, day: 26, title: "Crăciun" },
  ],

  // Ukraine
  UA: [
    { month: 1, day: 1, title: "Новий рік" },
    { month: 1, day: 7, title: "Різдво" },
    { month: 3, day: 8, title: "Міжнародний жіночий день" },
    { month: 5, day: 1, title: "День праці" },
    { month: 5, day: 9, title: "День перемоги" },
    { month: 6, day: 28, title: "День Конституції" },
    { month: 8, day: 24, title: "День Незалежності" },
    { month: 12, day: 25, title: "Різдво" },
  ],
};

// Default/fallback holidays for countries not in the list
export const DEFAULT_HOLIDAYS: PublicHoliday[] = [
  { month: 1, day: 1, title: "New Year's Day" },
  { month: 5, day: 1, title: "Labour Day" },
  { month: 12, day: 25, title: "Christmas Day" },
];
