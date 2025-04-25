import { ERROR_DEFINITIONS } from "./RangeSliderErrors";

export const createValidationError = (
  type, 
  value, 
  limits, 
  context
) => ({
    ...ERROR_DEFINITIONS[type], 
    value, 
    limits, 
    context 
  });

export const RangeSliderValidator = {
  validatePrecision({ value, limits }) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return (createValidationError('INVALID_PRECISION_TYPE', value));
    };
    if (value < limits.min || 
        value > limits.max) {
      return (createValidationError('INVALID_PRECISION_RANGE', value, limits));
    };
    return (null);
  },

  validateMin({ value, limits, currentMax }) {
    if (typeof value !== 'number') {
      return (createValidationError('INVALID_MIN_TYPE', value));
    };
    if (value < limits.min || 
        value >= currentMax) {
      return (createValidationError(
        'INVALID_MIN_RANGE', 
        value, 
        limits,
        { currentMax }
      ));
    };
    return (null);
  },

  validateMax({ value, limits, currentMin }) {
    if (typeof value !== 'number') {
      return (createValidationError('INVALID_MAX_TYPE', value));
    };
    if (value > limits.max || 
        value <= currentMin) {
      return (createValidationError(
        'INVALID_MAX_RANGE', 
        value, 
        limits,
        { currentMin }
      ));
    };
    return (null);
  },

  validateStep({ value, limits, currentMin, currentMax }) {
    if (typeof value !== 'number') {
      return (createValidationError('INVALID_STEP_TYPE', value));
    };
    if (value < limits.min || 
        value >= currentMax - currentMin) {
      return (createValidationError(
        'INVALID_STEP_RANGE', 
        value, 
        limits,
        { currentMin, currentMax }
      ));
    };
    return (null);
  }
};