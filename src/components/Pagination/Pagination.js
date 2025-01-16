import data from '@data/pagination.json';

class Pagination {
    #firstNumberOfPages;
    #totalNumberOfPages;
    #currentPage;
    #numberOfCardsPerPage;
    #textLabel;

    constructor(
        totalNumberOfPages, 
        currentPage, 
        numberOfCardsPerPage, 
        textLabel
    ) {
        this.#firstNumberOfPages = 1;
        this.#totalNumberOfPages = +totalNumberOfPages;
        this.#currentPage = +currentPage;
        this.#numberOfCardsPerPage = +numberOfCardsPerPage;
        this.#textLabel = textLabel;
    };

    init() {
        this.render(
            this.firstNumberOfPages,
            this.totalNumberOfPages,
            this.currentPage,
            this.numberOfCardsPerPage,
            this.textLabel
        );
    };

    render(
        firstNumberOfPages, 
        totalNumberOfPages, 
        currentPage,
        numberOfCardsPerPage,
        textLabel
    ) {

        const renderSetting = {  
            previousPage: currentPage > firstNumberOfPages,
            firstPage: currentPage > firstNumberOfPages ? firstNumberOfPages : false,
            firstDash: (currentPage - 3) > firstNumberOfPages,
            arrayOfClosestPages: [
                (currentPage - 2) > firstNumberOfPages ? currentPage - 2 : false,
                (currentPage - 1) > firstNumberOfPages ? currentPage - 1 : false,
                currentPage, 
                (currentPage + 1) < totalNumberOfPages ? currentPage + 1 : false,
                (currentPage + 2) < totalNumberOfPages ? currentPage + 2 : false,
            ],
            secondDash: (currentPage + 3) < totalNumberOfPages,
            lastPage: currentPage < totalNumberOfPages ? totalNumberOfPages : false,
            nextPage: currentPage < totalNumberOfPages
        };

        const createFragmentArrayOfElements = (setting) => {
            const fragment = document.createDocumentFragment();

            const createElement = (elementType, elementContent) => {
                if (elementContent !== false) {

                    const addClass = (elementType, elementContent) => {
                        let className = `pagination__button`;
                        if (elementType === 'previousPage') {
                            className += ` ${className}_previousPage`;
                        };
                        if (elementType === 'nextPage') {
                            className += ` ${className}_nextPage`;
                        };
                        if (elementType === 'firstDash' || elementType === 'secondDash') {
                            className += ` ${className}_dash`;
                        };
                        if (elementType === 'arrayOfClosestPages' && elementContent === currentPage) {
                            className += ` ${className}_currentPage`;
                        };
                        if (elementContent !== '') {
                            className += ` text_button_pagination`;
                        };
                        if (elementContent === currentPage) {
                            className += ` text_button_pagination_currentPage`;
                        };

                        return (className);
                    };

                    const addTextContent = (elementType, elementContent) => {
                        let textContent = '';
                        if (typeof(elementContent) === 'number') textContent = elementContent;
                        if (elementType === 'firstDash' || elementType === 'secondDash') textContent = '\u002E\u002E\u002E';

                        return (textContent);
                    };

                    const newElement = document.createElement('button');
                    newElement.classList.add(...addClass(elementType, elementContent).split(' '));                  
                    newElement.textContent = (addTextContent(elementType, elementContent));

                    return fragment.appendChild(newElement);
                };
            };

            for (const key in setting) {
                if (setting.hasOwnProperty(key)) {
                    if (Array.isArray(setting[key]) === false) {
                        createElement(key, setting[key]);
                    };
                    if (Array.isArray(setting[key])) {
                        setting[key].forEach((value) => createElement(key, value));
                    };
                };
            };

            return fragment;
        };

        const renderResizeWidthElements = () => {
            const element = document.querySelectorAll('.pagination__button');
            element.forEach((item) => {
                if (item.textContent.trim() !== '') {
                    const getWidthTextFromCanvas = (element) => {
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
                        const text = element.textContent;
                        const textWidth = context.measureText(text).width;
        
                        return textWidth;
                    };
        
                    const computedStyle = getComputedStyle(item);
                    const height = computedStyle.height.replace('px', '');
                    const margin = 0.8 * height;
                    const textWidth = getWidthTextFromCanvas(item);
                    
                    item.style.width = `${textWidth + margin}px`;
                };
            });
        };

        const parentContainer = document.querySelector('fieldset.pagination__fieldset');
        parentContainer.textContent = '';
        const fragment = createFragmentArrayOfElements(renderSetting);
        parentContainer.appendChild(fragment);

        return renderResizeWidthElements();
    };

    click(event) {
        const classes = event.target.classList;
        const textContent = event.target.textContent;
        if (classes.contains('pagination__button')) {
            if (classes.contains('pagination__button_previousPage')) {
                return this.render(
                    this.firstNumberOfPages, 
                    this.totalNumberOfPages, 
                    --this.currentPage
                );
            };
            if (classes.contains('pagination__button_nextPage')) {
                return this.render(
                    this.firstNumberOfPages, 
                    this.totalNumberOfPages, 
                    ++this.currentPage
                );
            };
            if (textContent.trim() !== '' && textContent != '\u002E\u002E\u002E') {
                this.currentPage = +textContent;
                return this.render(
                    this.firstNumberOfPages, 
                    this.totalNumberOfPages, 
                    this.currentPage
                );
            };
        };
    };

    get firstNumberOfPages() {
        return this.#firstNumberOfPages;
    };

    get totalNumberOfPages() {
        return this.#totalNumberOfPages;
    };

    get currentPage() {
        return this.#currentPage;
    };

    get numberOfCardsPerPage() {
        return this.#numberOfCardsPerPage;
    };
    
    get textLabel() {
        return this.#textLabel;
    };

    set currentPage(currentPage) {
        return this.#currentPage = currentPage;
    };

    set numberOfCardsPerPage(numberOfCardsPerPage) {
        return this.#numberOfCardsPerPage = numberOfCardsPerPage;
    };
};

export const pagination = new Pagination(
    data.pagination.totalNumberOfPages, 
    data.pagination.currentPage,
    data.pagination.numberOfCardsPerPage,
    data.pagination.textLabel
);