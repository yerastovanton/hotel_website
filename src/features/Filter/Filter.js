import { dom, helpers } from '@shared/lib/utils';
import { PriceFilter } from '../PriceFilter';

export class Filter {
  #container;
  #priceFilter;
  #sortingSelect;

  constructor(container, config = {}) {
    this.#container = container;
    this.#init(config);
  };

  #init(config) {
    this.#container.className = 'filter';
    helpers.safeSetInnerHTML(this.#container, '');
    this.#initPriceFilter(config);
    this.#initSorting();
  };

  #initPriceFilter(config) {
    const priceContainer = dom.createElement('div', {
      classes: 'filter__section'
    });
    this.#priceFilter = new PriceFilter(priceContainer, config.price);
    this.#container.appendChild(priceContainer);
  };

  #initSorting() {
    const sortingContainer = dom.createElement('div', {
      classes: 'filter__section'
    });
    
    sortingContainer.appendChild(dom.createElement('h3', {
      text: 'Сортировка'
    }));
    
    this.#sortingSelect = dom.createElement('select', {
      classes: 'filter-sorting',
      attrs: { 'aria-label': 'Сортировка' },
      html: `
        <option value="relevant">По актуальности</option>
        <option value="price_asc">Дешевые сначала</option>
        <option value="price_desc">Дорогие сначала</option>
      `
    });

    sortingContainer.appendChild(this.#sortingSelect);
    this.#container.appendChild(sortingContainer);
  };

  destroy() {
    this.#priceFilter?.destroy();
    helpers.safeSetInnerHTML(this.#container, '');
  };
};