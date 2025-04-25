export const ERROR_DEFINITIONS = Object.freeze({
  INVALID_PRECISION_TYPE: {
    code: 10000001,
    message: (value) =>
      `Precision ${value} value type must be integer`
  },
  INVALID_PRECISION_RANGE: {
    code: 10000002,
    message: (value, limits) =>
      `Precision ${value} out of range [${limits.min}-${limits.max}]`
  },
  INVALID_MIN_TYPE: {
    code: 10000003,
    message: (value) =>
      `Min ${value} value type must be a number`
  },
  INVALID_MIN_RANGE: {
    code: 10000004,
    message: (value, limits, context) =>
      `Min ${value} out of range [${limits.min}-${context.currentMax}]`
  },
  INVALID_MAX_TYPE: {
    code: 10000005,
    message: (value) =>
      `Max ${value} value type must be a number`
  },
  INVALID_MAX_RANGE: {
    code: 10000006,
    message: (value, limits, context) =>
      `Max ${value} out of range [${context.currentMin}-${limits.max}]`
  },
  INVALID_STEP_TYPE: {
    code: 10000007,
    message: (value) =>
      `Step ${value} value type must be a number`
  },
  INVALID_STEP_RANGE: {
    code: 10000008,
    message: (value, limits, context) =>
      `Step ${value} must be > ${limits.min} and < ${context.currentMax - context.currentMin}`
  }
});