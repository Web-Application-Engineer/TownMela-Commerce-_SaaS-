"use strict";

/* =========================================================
   COURIER FACTORY CONFIGURATION
========================================================= */

/*
  Service files are loaded lazily.

  Benefit:
  - Missing optional courier service does not crash the app at startup.
  - A service is required only when that courier provider is used.
  - MODULE_NOT_FOUND errors become clearer and provider-specific.
*/

const PROVIDER_CONFIG = Object.freeze({
  manual: {
    modulePath: "./manualService",
    aliases: [
      "manual",
      "custom",
      "self",
      "self_delivery",
      "self-delivery",
    ],
  },

  steadfast: {
    modulePath: "./steadfastService",
    aliases: [
      "steadfast",
      "stead-fast",
      "stead_fast",
    ],
  },

  pathao: {
    modulePath: "./pathaoService",
    aliases: [
      "pathao",
      "pathao-courier",
      "pathao_courier",
    ],
  },

  redx: {
    modulePath: "./redxService",
    aliases: [
      "redx",
      "red-x",
      "red_x",
    ],
  },

  paperfly: {
    modulePath: "./paperflyService",
    aliases: [
      "paperfly",
      "paper-fly",
      "paper_fly",
    ],
  },
});

/* =========================================================
   REQUIRED SERVICE METHODS
========================================================= */

const REQUIRED_SERVICE_METHODS = Object.freeze([
  "validateShipment",
  "createShipment",
  "trackShipment",
  "cancelShipment",
  "syncShipment",
  "calculateCharge",
]);

/* =========================================================
   INTERNAL CACHE
========================================================= */

/*
  Once a service is loaded successfully, it is cached here.

  Example:
  {
    steadfast: steadfastService
  }
*/

const serviceCache = new Map();

/* =========================================================
   INTERNAL HELPERS
========================================================= */

/**
 * Normalize courier/provider code.
 *
 * @param {*} courierCode
 * @returns {string|null}
 */
const normalizeCourierCode = (courierCode) => {
  if (
    courierCode === null ||
    courierCode === undefined
  ) {
    return null;
  }

  const normalizedCode = String(courierCode)
    .trim()
    .toLowerCase();

  return normalizedCode || null;
};

/**
 * Resolve an alias to the canonical provider code.
 *
 * Examples:
 * red-x     -> redx
 * paper_fly -> paperfly
 *
 * @param {*} courierCode
 * @returns {string|null}
 */
const resolveProviderCode = (courierCode) => {
  const normalizedCode =
    normalizeCourierCode(courierCode);

  if (!normalizedCode) {
    return null;
  }

  if (PROVIDER_CONFIG[normalizedCode]) {
    return normalizedCode;
  }

  for (const [
    providerCode,
    providerConfig,
  ] of Object.entries(PROVIDER_CONFIG)) {
    if (
      providerConfig.aliases.includes(
        normalizedCode
      )
    ) {
      return providerCode;
    }
  }

  return null;
};

/**
 * Normalize CommonJS/default exports.
 *
 * Supports:
 *
 * module.exports = service;
 *
 * and:
 *
 * exports.default = service;
 *
 * @param {*} importedModule
 * @returns {*}
 */
const normalizeServiceExport = (
  importedModule
) => {
  if (
    importedModule &&
    importedModule.default
  ) {
    return importedModule.default;
  }

  return importedModule;
};

/**
 * Convert a service class into an instance when necessary.
 *
 * Supports:
 *
 * module.exports = new SteadfastService();
 *
 * module.exports = SteadfastService;
 *
 * module.exports = {
 *   createShipment() {}
 * };
 *
 * @param {*} serviceExport
 * @returns {object}
 */
const resolveServiceInstance = (
  serviceExport
) => {
  const normalizedExport =
    normalizeServiceExport(serviceExport);

  if (!normalizedExport) {
    return null;
  }

  /*
    The service was exported as an object or instance.
  */

  if (
    typeof normalizedExport === "object"
  ) {
    return normalizedExport;
  }

  /*
    The service was exported as a class or constructor.
  */

  if (
    typeof normalizedExport === "function"
  ) {
    const prototype =
      normalizedExport.prototype;

    const prototypeMethodNames =
      prototype
        ? Object.getOwnPropertyNames(
            prototype
          )
        : [];

    const appearsToBeClass =
      /^class\s/.test(
        Function.prototype.toString.call(
          normalizedExport
        )
      ) ||
      REQUIRED_SERVICE_METHODS.some(
        (methodName) =>
          prototypeMethodNames.includes(
            methodName
          )
      );

    if (appearsToBeClass) {
      return new normalizedExport();
    }

    /*
      A factory function may return the service object.
    */

    const factoryResult =
      normalizedExport();

    return factoryResult || null;
  }

  return null;
};

/**
 * Validate that a service implements the required interface.
 *
 * @param {object} service
 * @param {string} providerCode
 * @throws {Error}
 */
const validateServiceInterface = (
  service,
  providerCode
) => {
  if (
    !service ||
    typeof service !== "object"
  ) {
    throw new TypeError(
      `Courier service "${providerCode}" must export an object, class instance, class, or factory function`
    );
  }

  const missingMethods =
    REQUIRED_SERVICE_METHODS.filter(
      (methodName) =>
        typeof service[methodName] !==
        "function"
    );

  if (missingMethods.length > 0) {
    throw new TypeError(
      `Courier service "${providerCode}" is missing required methods: ${missingMethods.join(
        ", "
      )}`
    );
  }

  return true;
};

/**
 * Lazily load a courier service.
 *
 * @param {string} providerCode
 * @returns {object}
 * @throws {Error}
 */
const loadService = (providerCode) => {
  if (serviceCache.has(providerCode)) {
    return serviceCache.get(providerCode);
  }

  const providerConfig =
    PROVIDER_CONFIG[providerCode];

  if (!providerConfig) {
    throw new Error(
      `Unsupported courier provider: ${providerCode}`
    );
  }

  let importedModule;

  try {
    importedModule = require(
      providerConfig.modulePath
    );
  } catch (error) {
    /*
      Add provider-specific context while preserving the
      original error information.
    */

    const enhancedError = new Error(
      `Unable to load courier service "${providerCode}" from "${providerConfig.modulePath}". ${error.message}`
    );

    enhancedError.name =
      "CourierServiceLoadError";

    enhancedError.code =
      error.code ||
      "COURIER_SERVICE_LOAD_FAILED";

    enhancedError.provider =
      providerCode;

    enhancedError.modulePath =
      providerConfig.modulePath;

    enhancedError.cause =
      error;

    throw enhancedError;
  }

  let service;

  try {
    service =
      resolveServiceInstance(
        importedModule
      );
  } catch (error) {
    const enhancedError = new Error(
      `Unable to initialize courier service "${providerCode}". ${error.message}`
    );

    enhancedError.name =
      "CourierServiceInitializationError";

    enhancedError.code =
      "COURIER_SERVICE_INITIALIZATION_FAILED";

    enhancedError.provider =
      providerCode;

    enhancedError.modulePath =
      providerConfig.modulePath;

    enhancedError.cause =
      error;

    throw enhancedError;
  }

  validateServiceInterface(
    service,
    providerCode
  );

  serviceCache.set(
    providerCode,
    service
  );

  return service;
};

/* =========================================================
   COURIER FACTORY
========================================================= */

class CourierFactory {
  /**
   * Return a courier service by provider code.
   *
   * Accepted examples:
   *
   * CourierFactory.get("steadfast");
   * CourierFactory.get("RED-X");
   * CourierFactory.get("paper_fly");
   *
   * @param {string} courierCode
   * @returns {object}
   */
  static get(courierCode) {
    const normalizedCode =
      normalizeCourierCode(
        courierCode
      );

    if (!normalizedCode) {
      throw new TypeError(
        "Courier code is required"
      );
    }

    const providerCode =
      resolveProviderCode(
        normalizedCode
      );

    if (!providerCode) {
      const supportedProviders =
        this.getSupportedProviders();

      throw new Error(
        `Unsupported courier provider: ${normalizedCode}. Supported providers: ${supportedProviders.join(
          ", "
        )}`
      );
    }

    return loadService(
      providerCode
    );
  }

  /**
   * Check whether the provider code is supported.
   *
   * This checks factory configuration only.
   * It does not require or initialize the service file.
   *
   * @param {string} courierCode
   * @returns {boolean}
   */
  static isSupported(courierCode) {
    return Boolean(
      resolveProviderCode(
        courierCode
      )
    );
  }

  /**
   * Check whether the service file can be loaded and
   * implements the required service interface.
   *
   * @param {string} courierCode
   * @returns {boolean}
   */
  static isAvailable(courierCode) {
    const providerCode =
      resolveProviderCode(
        courierCode
      );

    if (!providerCode) {
      return false;
    }

    try {
      loadService(providerCode);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get canonical provider code from an alias.
   *
   * @param {string} courierCode
   * @returns {string|null}
   */
  static resolveCode(courierCode) {
    return resolveProviderCode(
      courierCode
    );
  }

  /**
   * Return all supported canonical provider codes.
   *
   * @returns {string[]}
   */
  static getSupportedProviders() {
    return Object.keys(
      PROVIDER_CONFIG
    );
  }

  /**
   * Return the required service interface methods.
   *
   * @returns {string[]}
   */
  static getRequiredMethods() {
    return [
      ...REQUIRED_SERVICE_METHODS,
    ];
  }

  /**
   * Return availability details for all configured providers.
   *
   * Useful for an admin health-check endpoint.
   *
   * @returns {Array<object>}
   */
  static getProviderStatus() {
    return this
      .getSupportedProviders()
      .map((providerCode) => {
        try {
          loadService(
            providerCode
          );

          return {
            code: providerCode,
            supported: true,
            available: true,
            modulePath:
              PROVIDER_CONFIG[
                providerCode
              ].modulePath,
            error: null,
          };
        } catch (error) {
          return {
            code: providerCode,
            supported: true,
            available: false,
            modulePath:
              PROVIDER_CONFIG[
                providerCode
              ].modulePath,
            error:
              error.message ||
              "Unknown service loading error",
          };
        }
      });
  }

  /**
   * Validate a courier service without returning it.
   *
   * @param {string} courierCode
   * @returns {boolean}
   */
  static validate(courierCode) {
    const service =
      this.get(courierCode);

    const providerCode =
      this.resolveCode(
        courierCode
      );

    validateServiceInterface(
      service,
      providerCode
    );

    return true;
  }

  /**
   * Clear one cached service or the complete cache.
   *
   * Useful during tests or development.
   *
   * @param {string|null} courierCode
   * @returns {boolean}
   */
  static clearCache(
    courierCode = null
  ) {
    if (!courierCode) {
      serviceCache.clear();
      return true;
    }

    const providerCode =
      resolveProviderCode(
        courierCode
      );

    if (!providerCode) {
      return false;
    }

    return serviceCache.delete(
      providerCode
    );
  }
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = CourierFactory;