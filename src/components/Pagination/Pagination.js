import data from '@data/pagination.json';

class PaginationState {
    #currentPage;
    #totalPages;

    constructor(totalPages, currentPage) {
        this.#validate(totalPages, currentPage);
        this.#totalPages = totalPages;
        this.#currentPage = currentPage;
    };

    toNextPage() {
        this.currentPage = this.#currentPage + 1;
    };

    toPreviousPage() {
        this.currentPage = this.#currentPage - 1;
    };

    setPage(page) {
        this.currentPage = page;
    }

    #validate(totalPages, currentPage) {
        if (typeof totalPages !== 'number' || totalPages < 1) {
            throw new Error('Некорректное количество страниц');
        };
        if (typeof currentPage !== 'number' || currentPage < 1 || currentPage > totalPages) {
            throw new Error('Некорректный номер текущей страницы');
        };
    };

    get currentPage() {
        return (this.#currentPage);
    };

    get totalPages() {
        return (this.#totalPages);
    };

    set currentPage(value) {
        if (value < 1 || value > this.#totalPages) {
            throw (new Error('Некорректный номер текущей страницы'));
        };
        this.#currentPage = value;
    };
};

class Pagination {
    #state;
    #config;
    #handleResize;
    #cardsPerPage;
    #labelText;

    static DEFAULT_CONFIG = {
        visiblePagesRange: 2,
        buttonMinWidth: 40,
        cssClasses: {
            container: 'pagination__fieldset',
            button: 'pagination__button',
            current: 'pagination__button_current',
            dots: 'pagination__button_dots',
            label: 'pagination__label',
            buttonText: 'text_button_pagination',
            buttonCurrentText: 'text_button_pagination_current',
            labelText: 'text_body'
        }
    };

    constructor(
        totalPages,
        currentPage,
        cardsPerPage,
        labelText,
        config = {}
    ) {
        this.#state = new PaginationState(totalPages, currentPage);
        this.#config = { ...Pagination.DEFAULT_CONFIG, ...config };
        this.#handleResize = this.#debounce(this.#adjustButtonWidths.bind(this), 100);
        this.#cardsPerPage = Number(cardsPerPage);
        this.#labelText = String(labelText);
    };

    init() {
        this.#render();
        window.addEventListener('resize', this.#handleResize);
        return (this);
    };

    getNameContainer() {
        return (this.#config.cssClasses.container);
    };

    handleEvent(event) {
        const target = event.target.closest('[data-action], [data-page]');
        if (!target || !this.#getContainer().contains(target)) return;

        const action = target.dataset.action;
        const page = target.dataset.page;

        if (action === 'previous') this.#toPreviousPage();
        else if (action === 'next') this.#toNextPage();
        else if (page) this.#setPage(Number(page));
    };

    #render() {
        const container = this.#getContainer();
        container.replaceChildren(
            this.#createNavigationButton('previous'),
            ...this.#createPageElements(),
            this.#createNavigationButton('next'),
            this.#createStatusLabel()
        );
        this.#updateCurrentButtonAriaLabels();
        this.#adjustButtonWidths();
    };

    #getContainer() {
        const container = document.querySelector(`.${this.#config.cssClasses.container}`);
        container.setAttribute('role', 'navigation');
        return (container);
    };

    #createNavigationButton(type) {
        const button = document.createElement('button');
        button.classList.add(`${this.#config.cssClasses.button}`);
        button.classList.add(`${this.#config.cssClasses.button}_${type}`);
        button.dataset.action = type;
        button.disabled = type === 'previous'
            ? (this.#state.currentPage === 1)
            : (this.#state.currentPage === this.#state.totalPages);

        return (button);
    };

    #createPageElements() {
        return (this.#getVisiblePages().map(page =>
            page === '...'
            ? this.#createDots()
            : this.#createPageButton(page)
        ));
    };

    #getVisiblePages() {
        const current = this.#state.currentPage;
        const total = this.#state.totalPages;
        const range = this.#config.visiblePagesRange;
        const pages = [];
        let start = Math.max(1, current - range);
        let end = Math.min(total, current + range);

        if (current - range > 1) pages.push(1, '...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (current + range < total) pages.push('...', total);

        return (pages);
    };

    #createDots() {
        const dots = document.createElement('button');
        dots.classList.add(`${this.#config.cssClasses.buttonText}`);
        dots.classList.add(this.#config.cssClasses.button);
        dots.classList.add(this.#config.cssClasses.dots);
        dots.textContent = `\u002E\u002E\u002E`;
        dots.setAttribute('aria-hidden', 'true');
        dots.setAttribute('role', 'presentation');
        return (dots);
    };

    #createPageButton(page) {
        const button = document.createElement('button');
        button.classList.add(`${this.#config.cssClasses.buttonText}`);
        button.classList.add(this.#config.cssClasses.button);
        button.textContent = page;
        button.dataset.page = page;

        if (page === this.#state.currentPage) {
            button.classList.add(`${this.#config.cssClasses.buttonCurrentText}`);
            button.classList.add(this.#config.cssClasses.current);
            button.setAttribute('aria-current', 'page');
        };

        return (button);
    };

    #createStatusLabel() {
        const label = document.createElement('label');
        label.classList.add(`${this.#config.cssClasses.labelText}`);
        label.classList.add(this.#config.cssClasses.label);
        label.textContent = this.#getLabelText();
        return (label);
    };

    #getLabelText() {
        const [firstWord, ...rest] = this.#labelText.split(' ');
        const remainingString = rest.join(' ');
        const from = `
            ${(this.#state.currentPage - 1) * this.#cardsPerPage}
            -
            ${this.#state.currentPage * this.#cardsPerPage}
        `;
        const to = `${this.#state.totalPages * this.#cardsPerPage}+`;
        return (`${from} ${firstWord} ${to} ${remainingString}`);
    };

    #updateCurrentButtonAriaLabels() {
        const currentBtn = this.#getContainer().querySelector(
            `.${this.#config.cssClasses.current}`
        );
        if (currentBtn) {
            currentBtn.setAttribute('aria-label', `Page ${this.#state.currentPage}`);
        };
    };

    #debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    #adjustButtonWidths() {
        const buttons = this.#getContainer().querySelectorAll('button');
        buttons.forEach(btn => {
            if (!btn.textContent) return;
            btn.style.width = '';
            btn.style.width = (btn.scrollWidth > this.#config.buttonMinWidth)
                ? `${btn.scrollWidth + 15}px`
                : `${this.#config.buttonMinWidth}px`
        });
    };

    #toPreviousPage() {
        this.#state.toPreviousPage();
        this.#render();
    };

    #toNextPage() {
        this.#state.toNextPage();
        this.#render();
    };

    #setPage(page) {
        this.#state.setPage(page);
        this.#render();
    };
};

export const pagination = new Pagination(
    data.pagination.totalNumberOfPages, 
    data.pagination.currentPage,
    data.pagination.numberOfCardsPerPage,
    data.pagination.textLabel
);
