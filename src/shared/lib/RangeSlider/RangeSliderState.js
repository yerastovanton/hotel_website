import { ERROR_DEFINITIONS } from "./RangeSliderErrors";
import { RangeSliderValidator } from "./RangeSliderValidator";

const DEFAULT_LIMITS = Object.freeze({
  precision: { absoluteMin: 0, absoluteMax: 10 },
  min: { absoluteMin: 0 },
  max: { absoluteMax: 10000 },
  step: { absoluteMin: 1 }
});

const DEFAULT_CONFIG = Object.freeze({
  precision: 0,
  min: 0,
  max: 1000,
  step: 100,
  unit: `\u20bd`
});

export class RangeSliderState {
  #config;
  #parent;
  #limits;
  #errorHandler;
  #factorRoundToPrecision;
  #lowValue;
  #highValue;

  constructor(config = {}, options = {}) {
    this.#config = { ...DEFAULT_CONFIG, ...config };
    this.#parent = options.parent || null;
    this.#limits = Object.create(
      this.#parent ? this.#parent.#limits : DEFAULT_LIMITS
    );
    this.#errorHandler = options.errorHandler || this.#handleError.bind(this);

    this.precision = this.config.precision;
    this.min = this.config.min;
    this.max = this.config.max;
    this.step = this.config.step;

    Object.seal(this);
  };

  createChild(config) {
    return (new RangeSliderState(config, {
      parent: this,
      errorHandler: (e) => this.#errorHandler(e)
    }));
  };

  snapValue(v) {
    return (this.#normalize(this.#roundToPrecision(v)));
  };

  update({ rawLowValue, rawHighValue }) {
    const lowValue = Number(rawLowValue);
    const highValue = Number(rawHighValue);

    if (isNaN(lowValue) || isNaN(highValue)) {
      this.#errorHandler(new Error('Invalid input values'));
      return;
    }

    const newLowValue = this.#normalize(this.#roundToPrecision(lowValue));
    const newHighValue = this.#normalize(this.#roundToPrecision(highValue));

    this.#lowValue = Math.min(newLowValue, newHighValue);
    this.#highValue = Math.max(newLowValue, newHighValue);
  };

  #normalize(v) {
    const clampV = Math.max(this.min, Math.min(v, this.max));
    const steps = Math.round((clampV - this.min) / this.step);
    return (Math.min(this.min + steps * this.step, this.max));
  };

  #roundToPrecision(v) {
    return (
      Math.round(v * this.#factorRoundToPrecision) / this.#factorRoundToPrecision
  )};

  #handleError(rawError) {
    const processedError = this.#processError(rawError);
    if (this.#parent) {
      this.#parent.#errorHandler(processedError);
    } else {
      this.#handleRootError(processedError);
    };
  };

  #processError(error) {
    const errorDef = Object.values(ERROR_DEFINITIONS)
      .find(e => e.code === error.code);
      
    if (!errorDef) return (error);
    return ({
      ...error,
      message: errorDef.message(
        error.value,
        error.limits,
        error.context?.currentMax
      )
    });
  };

  #handleRootError(error) {
    console.error('Root error:', {
      code: error.code,
      message: error.message,
      value: error.value,
      limits: error.limits,
      hierarchy: error.hierarchyLevel,
      parentConfig: error.parentConfig
    });
  };

  #createErrorPayload(error, type) {
    return ({
      ...error,
      type,
      value: error.value,
      limits: error.limits,
      context: error.context,
      hierarchyLevel: this.#getHierarchyLevel(),
      parentConfig: this.#parent?.config || null
    });
  };

  #getHierarchyLevel() {
    return (
      this.#parent
        ? this.#parent.#getHierarchyLevel() + 1
        : 0
    );
  };

  set precision(rawV) {
    const v = Number(rawV);
    const error = RangeSliderValidator.validatePrecision({
      value: v, 
      limits: {
        min: this.#limits.precision.absoluteMin,
        max: this.#limits.precision.absoluteMax
      }
    });
    if (error) {
      this.#errorHandler(this.#createErrorPayload(error, 'INVALID_PRECISION'));
      return;
    };
    this.#config.precision = v;
    this.#factorRoundToPrecision = 10 ** v;
  };

  set min(rawV) {
    const v = Number(rawV);
    const error = RangeSliderValidator.validateMin({
      value: v, 
      limits: {
        min: this.#limits.min.absoluteMin
      },
      currentMax: this.max
    });
    if (error) {
      this.#errorHandler(this.#createErrorPayload(error, 'INVALID_MIN'));
      return;
    };
    this.#config.min = v;
    this.#lowValue = v;
  };

  set max(rawV) {
    const v = Number(rawV);
    const error = RangeSliderValidator.validateMax({
      value: v, 
      limits: {
        max: this.#limits.max.absoluteMax
      },
      currentMin: this.min
    });
    if (error) {
      this.#errorHandler(this.#createErrorPayload(error, 'INVALID_MAX'));
      return;
    };
    this.#config.max = v;
    this.#highValue = v;
  };

  set step(rawV) {
    const v = Number(rawV);
    const error = RangeSliderValidator.validateStep({
      value: v, 
      limits: {
        min: this.#limits.step.absoluteMin
      },
      currentMin: this.min,
      currentMax: this.max
    });
    if (error) {
      this.#errorHandler(this.#createErrorPayload(error, 'INVALID_STEP'));
      return;
    };
    this.#config.step = v;
  };

  get config() { return (Object.freeze({ ...this.#config })) };
  get precision() { return (this.config.precision) };
  get min() { return (this.config.min) };
  get max() { return (this.config.max) };
  get step() { return (this.config.step) };
  get values() { return ({ low: this.#lowValue, high: this.#highValue }) };
};