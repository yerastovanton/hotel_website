import { RangeSliderView } from '@shared/ui/RangeSlider';
import { DomOptimizer, dom, helpers } from '@shared/lib/utils';

export class PriceFilter {
  #container;
  #sliderContainer;
  #rangeSlider;
  #labelsContainer;
  #disconnectObserver;
  #raf;
  #errorHandler;
  #isValid;

  constructor(container, config = {}, errorHandler) {
    this.#container = container;
    this.#raf = DomOptimizer.get();
    this.#errorHandler = errorHandler || this.#defaultErrorHandler;
    this.#init(config);
  };

  #init(config) {
    helpers.safeSetInnerHTML(this.#container, '');
    this.#createSliderContainer();
    this.#initRangeSlider(config);
    this.#createLabels();
    this.#setupObservers();
  };

  #createSliderContainer() {
    this.#sliderContainer = dom.createElement('div', {
      classes: 'price-filter__slider'
    });
    this.#container.appendChild(this.#sliderContainer);
  };

  #initRangeSlider(config) {
    this.#rangeSlider = new RangeSliderView(
      this.#sliderContainer,
      config,
      (error) => console.error('PriceFilter error:', error)
    );
  };

  #createLabels() {
    this.#labelsContainer = dom.createElement('div', {
      classes: 'price-filter__labels'
    });
    this.#container.appendChild(this.#labelsContainer);
    this.#updateLabels();
  };

  #setupObservers() {
    this.#disconnectObserver = dom.observeMutations(
      this.#sliderContainer,
      () => this.#raf.schedule('labels-update', () => this.#updateLabels()),
      { attributeFilter: ['data-slider-values'] }
    );
  };

  #updateLabels() {
    const values = this.#sliderContainer.dataset.sliderValues?.split(',');
    if (!values) return;

    const [low, high] = values.map(Number);
    const unit = this.#rangeSlider.config.unit || '₽';

    helpers.safeSetInnerHTML(this.#labelsContainer, `
      <span class="price-label">От ${low.toLocaleString()}${unit}</span>
      <span class="price-label">До ${high.toLocaleString()}${unit}</span>
    `);
  };

  destroy() {
    this.#rangeSlider?.destroy();
    this.#disconnectObserver?.();
    this.#raf.cancel('labels-update');
    helpers.safeSetInnerHTML(this.#container, '');
  };
};
