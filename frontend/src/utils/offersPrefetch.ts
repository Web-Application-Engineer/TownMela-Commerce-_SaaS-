"use client";

import type {
  Product,
  ProductsApiResponse,
} from "@/src/types/product";

import type {
  StockClearanceApiResponse,
  StockClearanceCampaign,
} from "@/src/utils/stockClearance";

/* =========================================================
   API
========================================================= */

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

/* =========================================================
   CACHE
========================================================= */

const OFFERS_CACHE_TTL_MS =
  30_000;

const OFFERS_STORAGE_PREFIX =
  "townmela:offers-source:";

export type OffersSourceData = {
  products: Product[];

  campaign:
    | StockClearanceCampaign
    | null;
};

type StoredOffersSourceData = {
  tenantId: string;

  timestamp: number;

  data: OffersSourceData;
};

const memoryCache =
  new Map<
    string,
    StoredOffersSourceData
  >();

const pendingRequests =
  new Map<
    string,
    Promise<OffersSourceData>
  >();

/* =========================================================
   HELPERS
========================================================= */

function getStorageKey(
  tenantId: string,
) {
  return `${OFFERS_STORAGE_PREFIX}${tenantId}`;
}

function normalizeProducts(
  payload:
    | ProductsApiResponse
    | Product[]
    | null,
): Product[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(
    payload.products,
  )
    ? payload.products
    : [];
}

function isFresh(
  timestamp: number,
) {
  return (
    Date.now() -
      timestamp <
    OFFERS_CACHE_TTL_MS
  );
}

function saveCache(
  tenantId: string,
  data: OffersSourceData,
) {
  const entry:
    StoredOffersSourceData = {
    tenantId,
    timestamp:
      Date.now(),
    data,
  };

  memoryCache.set(
    tenantId,
    entry,
  );

  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getStorageKey(
        tenantId,
      ),
      JSON.stringify(
        entry,
      ),
    );
  } catch {
    /*
     * sessionStorage can be unavailable in privacy-restricted
     * browsers. Memory cache still keeps navigation fast.
     */
  }
}

/* =========================================================
   READ CACHE
========================================================= */

export function getCachedOffersSourceData(
  tenantId: string,
): StoredOffersSourceData | null {
  const normalizedTenantId =
    String(
      tenantId || "",
    ).trim();

  if (!normalizedTenantId) {
    return null;
  }

  const memoryEntry =
    memoryCache.get(
      normalizedTenantId,
    );

  if (
    memoryEntry &&
    isFresh(
      memoryEntry.timestamp,
    )
  ) {
    return memoryEntry;
  }

  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      window.sessionStorage.getItem(
        getStorageKey(
          normalizedTenantId,
        ),
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(
        raw,
      ) as StoredOffersSourceData;

    if (
      parsed?.tenantId !==
        normalizedTenantId ||
      !parsed?.data ||
      !Array.isArray(
        parsed.data.products,
      ) ||
      !isFresh(
        Number(
          parsed.timestamp,
        ),
      )
    ) {
      window.sessionStorage.removeItem(
        getStorageKey(
          normalizedTenantId,
        ),
      );

      return null;
    }

    memoryCache.set(
      normalizedTenantId,
      parsed,
    );

    return parsed;
  } catch {
    return null;
  }
}

/* =========================================================
   PREFETCH / LOAD
========================================================= */

export async function prefetchOffersSourceData(
  tenantId: string,
  options?: {
    force?: boolean;
  },
): Promise<OffersSourceData> {
  const normalizedTenantId =
    String(
      tenantId || "",
    ).trim();

  if (!normalizedTenantId) {
    throw new Error(
      "Store tenant could not be resolved.",
    );
  }

  if (!options?.force) {
    const cached =
      getCachedOffersSourceData(
        normalizedTenantId,
      );

    if (cached) {
      return cached.data;
    }
  }

  const existingRequest =
    pendingRequests.get(
      normalizedTenantId,
    );

  if (existingRequest) {
    return existingRequest;
  }

  const request =
    (async () => {
      const headers:
        HeadersInit = {
        Accept:
          "application/json",

        "X-Tenant-Id":
          normalizedTenantId,
      };

      /*
       * These two requests start together.
       *
       * Products use the lightweight storefront payload already
       * added for Shop/Category performance.
       */
      const [
        productsResponse,
        campaignResponse,
      ] =
        await Promise.all([
          fetch(
            `${API_BASE_URL}/api/products?storefront=shop`,
            {
              method:
                "GET",

              credentials:
                "include",

              headers,
            },
          ),

          fetch(
            `${API_BASE_URL}/api/stock-clearance`,
            {
              method:
                "GET",

              credentials:
                "include",

              /*
               * Campaign state can change at any moment,
               * therefore network refresh remains explicit.
               */
              cache:
                "no-store",

              headers,
            },
          ),
        ]);

      const [
        productsPayload,
        campaignPayload,
      ] =
        await Promise.all([
          productsResponse
            .json()
            .catch(
              () => null,
            ) as Promise<
              | ProductsApiResponse
              | Product[]
              | null
            >,

          campaignResponse
            .json()
            .catch(
              () => null,
            ) as Promise<
              | StockClearanceApiResponse
              | null
            >,
        ]);

      if (
        !productsResponse.ok
      ) {
        const apiMessage =
          productsPayload &&
          !Array.isArray(
            productsPayload,
          )
            ? productsPayload.message
            : undefined;

        throw new Error(
          apiMessage ||
            `Products could not be loaded. Status: ${productsResponse.status}`,
        );
      }

      if (
        !campaignResponse.ok ||
        !campaignPayload?.success
      ) {
        throw new Error(
          campaignPayload?.message ||
            `Stock clearance campaign could not be loaded. Status: ${campaignResponse.status}`,
        );
      }

      const data:
        OffersSourceData = {
        products:
          normalizeProducts(
            productsPayload,
          ),

        campaign:
          campaignPayload.campaign,
      };

      saveCache(
        normalizedTenantId,
        data,
      );

      return data;
    })();

  pendingRequests.set(
    normalizedTenantId,
    request,
  );

  try {
    return await request;
  } finally {
    pendingRequests.delete(
      normalizedTenantId,
    );
  }
}
