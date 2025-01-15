import data from '@data/pagination.json';

class Pagination {

    constructor(totalNumberOfPages, currentPage) {
        this._firstNumberOfPages = 1;
        this._totalNumberOfPages = +totalNumberOfPages;
        this._currentPage = +currentPage;
    };

    init() {
        this.render(this.firstNumberOfPages, this.totalNumberOfPages, this.currentPage);
    };

    render(firstNumberOfPages, totalNumberOfPages, currentPage) {

        const renderSetting = {  
            previousPageButton: currentPage > firstNumberOfPages,
            firstPageButton: currentPage > firstNumberOfPages ? firstNumberOfPages : false,
            firstDash: (currentPage - 3) > firstNumberOfPages,
            arrayOfClosestPages: [
                (currentPage - 2) > firstNumberOfPages ? currentPage - 2 : false,
                (currentPage - 1) > firstNumberOfPages ? currentPage - 1 : false,
                currentPage, 
                (currentPage + 1) < totalNumberOfPages ? currentPage + 1 : false,
                (currentPage + 2) < totalNumberOfPages ? currentPage + 2 : false,
            ],
            secondDash: (currentPage + 3) < totalNumberOfPages,
            lastPageButton: currentPage < totalNumberOfPages ? totalNumberOfPages : false,
            nextPageButton: currentPage < totalNumberOfPages
        };

        const createFragmentArrayOfElements = (setting) => {
            const fragment = document.createDocumentFragment();

            const createElement = (elementType, elementContent) => {
                if (elementContent !== false) {
                    const newElement = document.createElement('button');
                    const className = 'pagination__button';
                    newElement.classList.add(`${className}`);
                    if (elementType === 'previousPageButton') newElement.classList.add(`${className}_previousPage`);
                    if (elementType === 'nextPageButton') newElement.classList.add(`${className}_nextPage`);
                    if (elementType === 'firstDash' || elementType === 'secondDash') newElement.classList.add(`${className}_dash`);
                    if (elementType === 'arrayOfClosestPages' & elementContent === currentPage) newElement.classList.add(`${className}_currentPage`);
                    let textContent = '';
                    if (typeof(elementContent) === 'number') textContent = elementContent;
                    if (elementType === 'firstDash' || elementType === 'secondDash') textContent = '\u002E\u002E\u002E';
                    newElement.textContent = `${textContent}`;

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
            const element = document.querySelectorAll(
                '.pagination__button:not([class*=" "]), .pagination__button_currentPage'
            );
            element.forEach((item) => {
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
        if (classes.contains('pagination__button')) {
            if (classes.contains('pagination__button_previousPage')) return this.render(this.firstNumberOfPages, this.totalNumberOfPages, --this.currentPage);
            if (classes.contains('pagination__button_nextPage')) return this.render(this.firstNumberOfPages, this.totalNumberOfPages, ++this.currentPage);
            if (classes.length === 1) {
                this.currentPage = +event.target.textContent;
                return this.render(this.firstNumberOfPages, this.totalNumberOfPages, this.currentPage);
            };
        };
    };

    get firstNumberOfPages() {
        return this._firstNumberOfPages;
    };

    get totalNumberOfPages() {
        return this._totalNumberOfPages;
    };

    get currentPage() {
        return this._currentPage;
    };

    set currentPage(currentPage) {
        return this._currentPage = currentPage;
    };
};

export const pagination = new Pagination(data.pagination.totalNumberOfPages, data.pagination.currentPage);