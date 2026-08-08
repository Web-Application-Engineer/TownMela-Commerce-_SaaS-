/* =========================================================
   METROPOLITAN POLICE STATION TYPES
========================================================= */

export type MetropolitanPoliceStation = {
  id: string;
  districtId: string;
  bn: string;
  en: string;
  type: "thana";
  commissionerate: string;
};

/* =========================================================
   DISTRICT IDS

   bangladesh-location-data package অনুযায়ী:
   Dhaka district ID = 26
========================================================= */

const DHAKA_DISTRICT_ID = "26";

/* =========================================================
   DHAKA METROPOLITAN POLICE — DMP

   Total police stations: 50
========================================================= */

const dhakaMetropolitanPoliceStations: MetropolitanPoliceStation[] =
  [
    {
      id: "dmp-adabor",
      districtId: DHAKA_DISTRICT_ID,
      bn: "আদাবর",
      en: "Adabor",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-airport",
      districtId: DHAKA_DISTRICT_ID,
      bn: "বিমানবন্দর",
      en: "Airport",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-badda",
      districtId: DHAKA_DISTRICT_ID,
      bn: "বাড্ডা",
      en: "Badda",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-banani",
      districtId: DHAKA_DISTRICT_ID,
      bn: "বনানী",
      en: "Banani",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-bangshal",
      districtId: DHAKA_DISTRICT_ID,
      bn: "বংশাল",
      en: "Bangshal",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-bhashantek",
      districtId: DHAKA_DISTRICT_ID,
      bn: "ভাসানটেক",
      en: "Bhashantek",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-cantonment",
      districtId: DHAKA_DISTRICT_ID,
      bn: "ক্যান্টনমেন্ট",
      en: "Cantonment",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-chawkbazar",
      districtId: DHAKA_DISTRICT_ID,
      bn: "চকবাজার",
      en: "Chawkbazar",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-dakshin-khan",
      districtId: DHAKA_DISTRICT_ID,
      bn: "দক্ষিণখান",
      en: "Dakshin Khan",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-darus-salam",
      districtId: DHAKA_DISTRICT_ID,
      bn: "দারুস সালাম",
      en: "Darus Salam",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-demra",
      districtId: DHAKA_DISTRICT_ID,
      bn: "ডেমরা",
      en: "Demra",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-dhanmondi",
      districtId: DHAKA_DISTRICT_ID,
      bn: "ধানমন্ডি",
      en: "Dhanmondi",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-gendaria",
      districtId: DHAKA_DISTRICT_ID,
      bn: "গেন্ডারিয়া",
      en: "Gendaria",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-gulshan",
      districtId: DHAKA_DISTRICT_ID,
      bn: "গুলশান",
      en: "Gulshan",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-hatirjheel",
      districtId: DHAKA_DISTRICT_ID,
      bn: "হাতিরঝিল",
      en: "Hatirjheel",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-hazaribagh",
      districtId: DHAKA_DISTRICT_ID,
      bn: "হাজারীবাগ",
      en: "Hazaribagh",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-jatrabari",
      districtId: DHAKA_DISTRICT_ID,
      bn: "যাত্রাবাড়ী",
      en: "Jatrabari",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-kadamtoli",
      districtId: DHAKA_DISTRICT_ID,
      bn: "কদমতলী",
      en: "Kadamtoli",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-kafrul",
      districtId: DHAKA_DISTRICT_ID,
      bn: "কাফরুল",
      en: "Kafrul",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-kalabagan",
      districtId: DHAKA_DISTRICT_ID,
      bn: "কলাবাগান",
      en: "Kalabagan",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-kamrangirchar",
      districtId: DHAKA_DISTRICT_ID,
      bn: "কামরাঙ্গীরচর",
      en: "Kamrangirchar",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-khilgaon",
      districtId: DHAKA_DISTRICT_ID,
      bn: "খিলগাঁও",
      en: "Khilgaon",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-khilkhet",
      districtId: DHAKA_DISTRICT_ID,
      bn: "খিলক্ষেত",
      en: "Khilkhet",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-kotwali",
      districtId: DHAKA_DISTRICT_ID,
      bn: "কোতোয়ালি",
      en: "Kotwali",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-lalbagh",
      districtId: DHAKA_DISTRICT_ID,
      bn: "লালবাগ",
      en: "Lalbagh",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-mirpur-model",
      districtId: DHAKA_DISTRICT_ID,
      bn: "মিরপুর মডেল",
      en: "Mirpur Model",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-mohammadpur",
      districtId: DHAKA_DISTRICT_ID,
      bn: "মোহাম্মদপুর",
      en: "Mohammadpur",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-motijheel",
      districtId: DHAKA_DISTRICT_ID,
      bn: "মতিঝিল",
      en: "Motijheel",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-mugda",
      districtId: DHAKA_DISTRICT_ID,
      bn: "মুগদা",
      en: "Mugda",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-new-market",
      districtId: DHAKA_DISTRICT_ID,
      bn: "নিউ মার্কেট",
      en: "New Market",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-pallabi",
      districtId: DHAKA_DISTRICT_ID,
      bn: "পল্লবী",
      en: "Pallabi",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-paltan-model",
      districtId: DHAKA_DISTRICT_ID,
      bn: "পল্টন মডেল",
      en: "Paltan Model",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-ramna-model",
      districtId: DHAKA_DISTRICT_ID,
      bn: "রমনা মডেল",
      en: "Ramna Model",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-rampura",
      districtId: DHAKA_DISTRICT_ID,
      bn: "রামপুরা",
      en: "Rampura",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-rupnagar",
      districtId: DHAKA_DISTRICT_ID,
      bn: "রূপনগর",
      en: "Rupnagar",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-sabujbag",
      districtId: DHAKA_DISTRICT_ID,
      bn: "সবুজবাগ",
      en: "Sabujbag",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-shah-ali",
      districtId: DHAKA_DISTRICT_ID,
      bn: "শাহ আলী",
      en: "Shah Ali",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-shahbag",
      districtId: DHAKA_DISTRICT_ID,
      bn: "শাহবাগ",
      en: "Shahbag",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-shahjahanpur",
      districtId: DHAKA_DISTRICT_ID,
      bn: "শাহজাহানপুর",
      en: "Shahjahanpur",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-sher-e-bangla-nagar",
      districtId: DHAKA_DISTRICT_ID,
      bn: "শেরেবাংলা নগর",
      en: "Sher-e-Bangla Nagar",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-shyampur",
      districtId: DHAKA_DISTRICT_ID,
      bn: "শ্যামপুর",
      en: "Shyampur",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-sutrapur",
      districtId: DHAKA_DISTRICT_ID,
      bn: "সূত্রাপুর",
      en: "Sutrapur",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-tejgaon",
      districtId: DHAKA_DISTRICT_ID,
      bn: "তেজগাঁও",
      en: "Tejgaon",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-tejgaon-industrial",
      districtId: DHAKA_DISTRICT_ID,
      bn: "তেজগাঁও শিল্পাঞ্চল",
      en: "Tejgaon Industrial",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-turag",
      districtId: DHAKA_DISTRICT_ID,
      bn: "তুরাগ",
      en: "Turag",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-uttar-khan",
      districtId: DHAKA_DISTRICT_ID,
      bn: "উত্তরখান",
      en: "Uttar Khan",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-uttara-east",
      districtId: DHAKA_DISTRICT_ID,
      bn: "উত্তরা পূর্ব",
      en: "Uttara East",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-uttara-west",
      districtId: DHAKA_DISTRICT_ID,
      bn: "উত্তরা পশ্চিম",
      en: "Uttara West",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-vatara",
      districtId: DHAKA_DISTRICT_ID,
      bn: "ভাটারা",
      en: "Vatara",
      type: "thana",
      commissionerate: "DMP",
    },
    {
      id: "dmp-wari",
      districtId: DHAKA_DISTRICT_ID,
      bn: "ওয়ারী",
      en: "Wari",
      type: "thana",
      commissionerate: "DMP",
    },
  ];

/* =========================================================
   ALL METROPOLITAN POLICE STATIONS

   পরবর্তী ধাপে অন্য Metropolitan Police station
   list এখানে যুক্ত হবে।
========================================================= */

export const metropolitanPoliceStations: MetropolitanPoliceStation[] =
  [...dhakaMetropolitanPoliceStations];

/* =========================================================
   GET POLICE STATIONS BY DISTRICT
========================================================= */

export function getMetropolitanPoliceStationsByDistrict(
  districtId: string,
): MetropolitanPoliceStation[] {
  if (!districtId) {
    return [];
  }

  return metropolitanPoliceStations
    .filter(
      (policeStation) =>
        policeStation.districtId === districtId,
    )
    .sort((firstStation, secondStation) =>
      firstStation.bn.localeCompare(
        secondStation.bn,
        "bn",
      ),
    );
}