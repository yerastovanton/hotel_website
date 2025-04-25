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

  isNotValidHTML(html) {
    return (new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector('parsererror'))
  },

  createElement({ tag, classes, attrs, text, html } = {}) {
    if (!tag) throw new Error(`Invalid HTML5 tag: ${tag}`);  
    if (tag) {
      const normalizedTag = tag.toLowerCase();
      if (!this.html5Tags.has(normalizedTag)) {
        throw new Error(`Invalid HTML5 tag: ${normalizedTag}`);
      };
    };
    const el = document.createElement(normalizedTag);

    if (classes) {
      if (typeof classes !== 'object') {
        throw new Error(`Invalid classes: ${classes} - type in not object`);
      };
      for (const className in classes) {
        if (typeof className !== 'string') {
          throw new Error(
            `Invalid classes: ${className} - type in not string`);
        };
        el.classList.add(className.trim());
      };
    };

    if (attrs) {
      if (typeof attrs !== 'object') {
        throw new Error(`Invalid attributes: ${attrs} - type in not object`);
      };
      for (const key in attrs) {
        const value = attrs[key];
        if (typeof key !== 'string' || typeof value !== 'string') {
          throw new Error(
            `Invalid attributes: ${key}:${value}} - type in not string`);
        };
        el.setAttribute(key, value);
      };
    };
    
    if (text) {
      if (typeof text !== 'string') {
        throw new Error(`Invalid text: ${text} - type in not string`);
      };
      el.textContent = text;
    };

    if (html) {
      if (this.isNotValidHTML(html)) {
        throw new Error(`Invalid html: ${html} - type in not HTML`);
      };
      el.innerHTML = html;
    };

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

export const helpers = {
  safeSetInnerHTML(element, html) {
    element.replaceChildren();
    element.insertAdjacentHTML('afterbegin', html);
  }
};