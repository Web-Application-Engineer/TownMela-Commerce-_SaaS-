import {
  divisions_en,
  districts_en,
  upazilas_en,
} from "bangladesh-location-data/english";

import {
  divisions_bn,
  districts_bn,
  upazilas_bn,
} from "bangladesh-location-data/bangla";

import {
  getMetropolitanPoliceStationsByDistrict,
  type MetropolitanPoliceStation,
} from "./metropolitanPoliceStations";

/* =========================================================
   RAW PACKAGE TYPES
========================================================= */

type RawLocationItem = {
  value: string | number;
  title: string;
};

type RawLocationMap = Record<
  string,
  RawLocationItem[]
>;

/* =========================================================
   APPLICATION TYPES
========================================================= */

export type BilingualLocation = {
  id: string;
  bn: string;
  en: string;
};

export type DivisionLocation =
  BilingualLocation;

export type DistrictLocation =
  BilingualLocation & {
    divisionId: string;
  };

export type PoliceStationLocation =
  BilingualLocation & {
    districtId: string;
    type: "upazila" | "thana";
    commissionerate?: string;
  };

/* =========================================================
   NORMALIZED RAW DATA
========================================================= */

const englishDivisions =
  divisions_en as unknown as RawLocationItem[];

const banglaDivisions =
  divisions_bn as unknown as RawLocationItem[];

const englishDistricts =
  districts_en as unknown as RawLocationMap;

const banglaDistricts =
  districts_bn as unknown as RawLocationMap;

const englishUpazilas =
  upazilas_en as unknown as RawLocationMap;

const banglaUpazilas =
  upazilas_bn as unknown as RawLocationMap;

/* =========================================================
   HELPERS
========================================================= */

function normalizeId(
  value: string | number,
) {
  return String(value);
}

function normalizeLocationName(
  value: string,
) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

/*
  বাংলা ও English location একই ID দিয়ে
  সঠিকভাবে matching করা হচ্ছে।

  Array index ব্যবহার করা হচ্ছে না।
*/
function mergeLocationsById(
  englishItems: RawLocationItem[] = [],
  banglaItems: RawLocationItem[] = [],
): BilingualLocation[] {
  const banglaNameById = new Map(
    banglaItems.map((item) => [
      normalizeId(item.value),
      item.title.trim(),
    ]),
  );

  return englishItems
    .flatMap((englishItem) => {
      const id = normalizeId(
        englishItem.value,
      );

      const banglaName =
        banglaNameById.get(id);

      /*
        একই ID-এর বাংলা নাম পাওয়া না গেলে
        ভুল pairing দেখানোর বদলে item বাদ যাবে।
      */
      if (!banglaName) {
        return [];
      }

      return [
        {
          id,
          bn: banglaName,
          en: englishItem.title.trim(),
        },
      ];
    })
    .sort((firstLocation, secondLocation) =>
      firstLocation.bn.localeCompare(
        secondLocation.bn,
        "bn",
      ),
    );
}

/*
  একই থানা বা উপজেলা duplicate থাকলে
  একবারই দেখানো হবে।

  একই নামে upazila এবং metropolitan thana
  থাকলে thana record-কে priority দেওয়া হবে।
*/
function removeDuplicateLocations(
  locations: PoliceStationLocation[],
) {
  const uniqueLocationMap = new Map<
    string,
    PoliceStationLocation
  >();

  locations.forEach((location) => {
    const locationKey = [
      normalizeLocationName(location.bn),
      normalizeLocationName(location.en),
    ].join("|");

    const existingLocation =
      uniqueLocationMap.get(locationKey);

    if (
      !existingLocation ||
      location.type === "thana"
    ) {
      uniqueLocationMap.set(
        locationKey,
        location,
      );
    }
  });

  return Array.from(
    uniqueLocationMap.values(),
  ).sort((firstLocation, secondLocation) =>
    firstLocation.bn.localeCompare(
      secondLocation.bn,
      "bn",
    ),
  );
}

/* =========================================================
   DIVISIONS
========================================================= */

export const bangladeshDivisions: DivisionLocation[] =
  mergeLocationsById(
    englishDivisions,
    banglaDivisions,
  );

/* =========================================================
   DISTRICTS
========================================================= */

export const bangladeshDistricts: DistrictLocation[] =
  Object.entries(englishDistricts)
    .flatMap(
      ([
        divisionId,
        englishDistrictList,
      ]) => {
        const banglaDistrictList =
          banglaDistricts[divisionId] ?? [];

        return mergeLocationsById(
          englishDistrictList,
          banglaDistrictList,
        ).map((district) => ({
          ...district,
          divisionId,
        }));
      },
    )
    .sort((firstDistrict, secondDistrict) =>
      firstDistrict.bn.localeCompare(
        secondDistrict.bn,
        "bn",
      ),
    );

/* =========================================================
   LOCATION GETTERS
========================================================= */

export function getDivisionById(
  divisionId: string,
) {
  return bangladeshDivisions.find(
    (division) =>
      division.id === divisionId,
  );
}

export function getDistrictById(
  districtId: string,
) {
  return bangladeshDistricts.find(
    (district) =>
      district.id === districtId,
  );
}

/* =========================================================
   UPAZILA + METROPOLITAN POLICE STATIONS
========================================================= */

export function getPoliceStationsByDistrict(
  districtId: string,
): PoliceStationLocation[] {
  if (!districtId) {
    return [];
  }

  /*
    নির্বাচিত জেলার উপজেলা তালিকা।
  */
  const englishUpazilaList =
    englishUpazilas[districtId] ?? [];

  const banglaUpazilaList =
    banglaUpazilas[districtId] ?? [];

  const upazilaLocations: PoliceStationLocation[] =
    mergeLocationsById(
      englishUpazilaList,
      banglaUpazilaList,
    ).map((location) => ({
      ...location,
      districtId,
      type: "upazila" as const,
    }));

  /*
    নির্বাচিত জেলার metropolitan থানা তালিকা।
    বর্তমানে ঢাকা জেলার DMP থানাগুলো থাকবে।
  */
  const metropolitanLocations: PoliceStationLocation[] =
    getMetropolitanPoliceStationsByDistrict(
      districtId,
    ).map(
      (
        policeStation: MetropolitanPoliceStation,
      ) => ({
        id: policeStation.id,
        districtId:
          policeStation.districtId,
        bn: policeStation.bn,
        en: policeStation.en,
        type: "thana" as const,
        commissionerate:
          policeStation.commissionerate,
      }),
    );

  return removeDuplicateLocations([
    ...upazilaLocations,
    ...metropolitanLocations,
  ]);
}

/* =========================================================
   SINGLE POLICE STATION / UPAZILA
========================================================= */

export function getPoliceStationById(
  districtId: string,
  policeStationId: string,
) {
  if (
    !districtId ||
    !policeStationId
  ) {
    return undefined;
  }

  return getPoliceStationsByDistrict(
    districtId,
  ).find(
    (policeStation) =>
      policeStation.id ===
      policeStationId,
  );
}