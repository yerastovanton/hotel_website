export const debounce = (fn, delay) => {
  const DEFAULT_CONFIG = Object.freeze({
    delay: 100
  });

  if (typeof fn !== 'function') {
    throw (new TypeError('Debounce callback must be a function'));
  };
  if (typeof delay !== 'number') {
    throw (new TypeError('Debounce delay must be a number'));
  };

  const validDelay = (delay < 0)
    ? DEFAULT_CONFIG.delay
    : Math.round(delay);

  let timeout = null;
  let lastArgs = null;
  let lastThis = null;

  const wrapper = function(...args) {
    lastArgs = args;
    lastThis = this;
    if (timeout !== null) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      fn.apply(lastThis, lastArgs);
      timeout = null;
      lastArgs = null;
      lastThis = null;
    }, validDelay);
  };

  wrapper.cancel = () => {
    clearTimeout(timeout);
    lastArgs = null;
    lastThis = null;
  };

  return (wrapper);
};

export class DomOptimizer {
  static #instance;
  
  #scheduled = new Map();
  #idCounter = 0;

  schedule(callback) {
    const id = ++this.#idCounter;

    const handler = requestAnimationFrame(() => {
      callback();
      this.#scheduled.delete(id);
    });
    this.#scheduled.set(id, handler);

    return (id);
  };

  cancel(id) {
    const handler = this.#scheduled.get(id);
    if (handler !== undefined) {
      cancelAnimationFrame(handler);
      this.#scheduled.delete(id);
    };
  };

  static get() {
    if (!this.#instance) this.#instance = new DomOptimizer()
    return (this.#instance);
  };
};

export const dom = {
  html5Tags: new Set([
    'div', 'span', 'a', 'p', 'input', 'button', 'img', 'form', 'table', 'tr',
    'td', 'th', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section',
    'nav', 'article', 'aside', 'header', 'footer', 'main', 'video', 'audio', 
    'canvas', 'svg', 'select', 'textarea', 'label', 'fieldset', 'legend', 'datalist',
    'output', 'progress', 'meter', 'details', 'summary', 'template'  
  ]),

  typeSchema: {
    tag: { type: 'html5Tag' },
    classes: {
      type: 'arrayOfStrings',
      valueType: 'string'
    },
    attrs: {
      type: 'arrayOfObjects',
      keyType: 'string',
      valueType: 'stringAndBoolean'
    },
    text: { type: 'string' },
    html: { type: 'html' }
  },

  validateType(type, value) {
    const validationRules = {
      html5Tag: (value) => (this.html5Tags.has(value)),
      arrayOfStrings: (value) => (
        Array.isArray(value) &&
        value.every((element) => typeof element  === 'string')
      ),
      arrayOfObjects: (value) => (
        Array.isArray(value) &&
        value.every((element) =>
          typeof element === 'object' &&
          typeof element !== null &&
          Object.prototype.toString.call(element) === '[object Object]')
      ),
      string: (value) => (typeof value === 'string'),
      stringAndBoolean: (value) => (
        typeof value === 'string' ||
        typeof value === 'boolean'
      ),
      html: (value) => {
        return (new DOMParser()
          .parseFromString(value, 'text/html')
          .querySelector('parsererror')
          ? false : true);
      }
    };

    if (!validationRules[type]) return (new Error(`Unknown type: ${type}`));

    return (validationRules[type](value)
      ? false
      : (new Error(`Invalid ${value} - type is not ${type}`)));
  },

  validateElement(props) {
    const errors = [];
    const schema = this.typeSchema[key];

    for (const key in props) {
      if (props[key].type === 'arrayOfStrings') {
        props[key].reduce(value => {
          const error = this.validateType(schema.valueType, value);
          if (error) errors.push(error);
        });
      };

      if (props[key].type === 'arrayOfObjects') {
        props[key].reduce(value => {
          let error = this.validateType(schema.keyType, Object.keys(value));
          if (error) errors.push(error);
          error = this.validateType(schema.valueType, Object.values(value));
          if (error) errors.push(error);
        });
      };

      if (props[key].type === 'html5Tag' ||
        props[key].type === 'html' ||
        props[key].type === 'string') {
        const error = this.validateType(schema.type, props[key]);
        if (error) errors.push(error);
      }; 
    };

    if (errors.length > 0) return (errors);
    return (false);
  },

  createElement({ tag = 'div', classes, attrs, text, html } = {}) {
    const normalizedTag = tag.toLowerCase();

    const error = this.validateElement({ tag: normalizedTag, classes, attrs, text, html });
    if (error) return (new AggregateError(error));

    const el = document.createElement(normalizedTag);
    if (classes) classes.forEach(className => el.classList.add(className.trim()));
    if (attrs) attrs.forEach(({ key, value }) => el.setAttribute(key, value));
    if (text) el.textContent = text;
    if (html) this.helpers.safeSetInnerHTML(el, html);

    return (el);
  },

  observeMutations(target, callback, options = {}) {
    const observer = new MutationObserver(callback);
    observer.observe(target, { 
      attributes: true,
      childList: false,
      subtree: false,
      ...options 
    });
    return (() => observer.disconnect());
  }
};

export const helpers = Object.freeze({
  safeSetInnerHTML(element, html) {
    element.replaceChildren();
    element.insertAdjacentHTML('afterbegin', html);
  }
});