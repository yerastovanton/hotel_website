import { RangeSliderState } from './RangeSliderState.js';
import { debounce, DomOptimizer } from './utils.js';

const KEY_HANDLERS = Object.freeze({
  ArrowDown: (state, rtlFactor, currentValue) => currentValue - state.step * rtlFactor,
  ArrowLeft: (state, rtlFactor, currentValue) => currentValue - state.step * rtlFactor,
  ArrowUp: (state, rtlFactor, currentValue) => currentValue + state.step * rtlFactor,
  ArrowRight: (state, rtlFactor, currentValue) => currentValue + state.step * rtlFactor,
  Home: (state) => state.min,
  End: (state) => state.max
});

export class RangeSliderView {
  #state;
  #raf = DomOptimizer.get();
  #rafId = Symbol('slider-raf');
  #elements = Object.seal({
    track: null,
    progress: null,
    lowThumb: null,
    highThumb: null
  });
  #listeners = new WeakMap();
  #rtlFactor;
  #resizeObserver = null;
  #errorHandler;
  #activeThumb = null;

  constructor(container, config, errorHandler) {
    Object.seal(this);
    this.#errorHandler = errorHandler || console.error;
    this.#init(container, config);
    this.#setupObservers();
    this.#setupEvents();
  };

  #init(container, config) {
    if (!container instanceof HTMLElement) {
      this.#errorHandler(new Error('Invalid container'));
      return;
    };
    this.#state = new RangeSliderState(config, { 
      errorHandler: (e) => this.#errorHandler(e)
    });

    this.#rtlFactor = getComputedStyle(container).direction === 'rtl' ? -1 : 1;
    this.#buildDOM(container);
    this.#updateUI();
  };

  #buildDOM(container) {
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Range slider');
    
    const track = document.createElement('div');
    track.className = 'slider-track';
    track.dataset.sliderTrack = true;
    
    const progress = document.createElement('div');
    progress.className = 'slider-progress';
    progress.dataset.sliderProgress = true;
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-valuemin', this.#state.min);
    progress.setAttribute('aria-valuemax', this.#state.max);

    this.#elements = {
      track,
      progress,
      lowThumb: this.#createThumb('low'),
      highThumb: this.#createThumb('high')
    };
    
    track.append(progress, this.#elements.lowThumb, this.#elements.highThumb);
    container.append(track);

    this.#updateDataAttributes();
  };

  #createThumb(type) {
    const thumb = document.createElement('div');
    thumb.className = `slider-thumb slider-${type}-thumb`;
    thumb.tabIndex = 0;
    thumb.setAttribute('role', 'slider');
    thumb.dataset.sliderThumb = type;
    thumb.setAttribute('aria-controls', this.#elements.progress.id);
    
    const touchArea = document.createElement('div');
    touchArea.className = 'slider-thumb-touch-area';
    touchArea.dataset.sliderTouchArea = true;
    thumb.append(touchArea);
    
    return (thumb);
  };

  #setupObservers() {
    this.#resizeObserver = new ResizeObserver(debounce(() => {
      this.#raf.schedule(this.#rafId, () => this.#updateUI());
    }, 100));
    this.#resizeObserver.observe(this.#elements.track);
  };

  #setupEvents() {
    this.#setupThumbEvents(this.#elements.lowThumb);
    this.#setupThumbEvents(this.#elements.highThumb);
  };

  #setupThumbEvents(thumb) {
    const handlers = {
      pointerdown: (e) => this.#handleDragStart(e),
      keydown: (e) => this.#handleKey(e)
    };

    thumb.addEventListener('pointerdown', handlers.pointerdown, { passive: true });    
    thumb.addEventListener('keydown', handlers.keydown);

    this.#listeners.set(thumb, handlers);
  };

  #handleDragStart(e) {
    this.#activeThumb = e.currentTarget;
    const type = this.#activeThumb.dataset.sliderThumb;
    const rect = this.#elements.track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const startX = e.clientX;
    const startValue = this.#state.values[type];

    const moveHandler = (e) => {
      this.#raf.schedule(this.#rafId, () => {
        const delta = (e.clientX - startX) / rect.width * (this.#state.max - this.#state.min);
        const newValue = startValue + delta;
        
        this.#state.update({
          ...this.#state.values,
          [type]: newValue
        });
        
        this.#updateUI();
      });
    };

    const upHandler = () => {
      document.removeEventListener('pointermove', moveHandler);
      document.removeEventListener('pointerup', upHandler);
      if (this.#activeThumb) {
        this.#activeThumb.releasePointerCapture(e.pointerId);
        this.#activeThumb = null;
      };
    };

    document.addEventListener('pointermove', moveHandler, { passive: true });
    document.addEventListener('pointerup', upHandler, { passive: true, once: true });
    
    this.#activeThumb.setPointerCapture(e.pointerId);
  };

  #handleKey(e) {
    const handler = KEY_HANDLERS[e.key];
    if (!handler) return;
    
    const type = e.currentTarget.dataset.sliderThumb;
    const currentValue = this.#state.values[type];
    const newValue = handler(this.#state, this.#rtlFactor, currentValue);
    
    this.#state.update({
      ...this.#state.values,
      [type]: newValue
    });
    
    this.#updateUI();
  };

  #updateUI() {
    const { low, high } = this.#state.values;
    const { min, max } = this.#state;
    const range = max - min;
    
    const lowPosition = ((low - min) / range) * 100;
    const highPosition = ((high - min) / range) * 100;

    this.#elements.progress.style.cssText = `
      transform: translateX(${lowPosition}%) scaleX(${(highPosition - lowPosition)/100});
    `;
    this.#elements.lowThumb.style.transform = `translateX(${lowPosition}%)`;
    this.#elements.highThumb.style.transform = `translateX(${highPosition}%)`;

    this.#updateAriaAttributes();
    this.#updateDataAttributes();
  };

  #updateAriaAttributes() {
    const { low, high } = this.#state.values;
    const { unit = '\u20bd' } = this.#state.config;
    const { progress, lowThumb, highThumb } = this.#elements;

    const elementsConfig = [
      {
        element: progress,
        attrs: {
          min: low,
          max: high,
          now: `${low}-${high}`,
          text: `${low}${unit} — ${high}${unit}`
        }
      },
      {
        element: lowThumb,
        attrs: {
          min: this.min,
          max: high,
          now: low,
          text: `${low}${unit}`
        }
      },
      {
        element: highThumb,
        attrs: {
          min: low,
          max: this.max,
          now: high,
          text: `${high}${unit}`
        }
      }
    ];

    elementsConfig.forEach(({ element, attrs }) => {
      element.setAttribute('aria-valuemin', attrs.min);
      element.setAttribute('aria-valuemax', attrs.max);
      element.setAttribute('aria-valuenow', attrs.now);
      element.setAttribute('aria-valuetext', attrs.text);
    });
  };

  #updateDataAttributes() {
    const container = this.#elements.track.parentElement;
    container.dataset.sliderMin = this.#state.min;
    container.dataset.sliderMax = this.#state.max;
    container.dataset.sliderStep = this.#state.step;
    container.dataset.sliderValues = `${this.#state.values.low},${this.#state.values.high}`;
  };

  destroy() {
    this.#resizeObserver?.disconnect();
    this.#raf.cancel(this.#rafId);
    
    const removeListeners = (thumb) => {
      const handlers = this.#listeners.get(thumb);
      if (handlers) {
        thumb.removeEventListener('pointerdown', handlers.pointerdown);
        thumb.removeEventListener('keydown', handlers.keydown);
      };
    };

    removeListeners(this.#elements.lowThumb);
    removeListeners(this.#elements.highThumb);
    this.#elements.track.remove();
  };
};