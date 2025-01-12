import data from '@data/pagination.json';

class Pagination {

    constructor(totalNumberOfPages, currentPage) {
        this.firstNumberOfPages = 1;
        this.totalNumberOfPages = +totalNumberOfPages;
        this.currentPage = +currentPage;
    }

    init() {
        this.render(this.firstNumberOfPages, this.totalNumberOfPages, this.currentPage);
    }

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
                    let textContent = '';
                    if (typeof(elementContent) === 'number') textContent = elementContent;
                    if (elementType === 'firstDash' || elementType === 'secondDash') textContent = '...';
                    newElement.textContent = `${textContent}`;

                    return fragment.appendChild(newElement);
                };
            };

            for (const key in setting) {
                if ((Array.isArray(setting[key]) === false) &
                    (setting.hasOwnProperty(key))) {
                    createElement(key, setting[key]);
                };
                if (Array.isArray(setting[key])) {
                    setting[key].forEach((value) => createElement(key, value));
                };
            };

            return fragment;
        };

        const parentContainer = document.querySelector('fieldset.pagination__fieldset');
        parentContainer.textContent = '';
        const fragment = createFragmentArrayOfElements(renderSetting);
        parentContainer.appendChild(fragment);
    };

    resizeWidthButton() {}

    click() {

    }
};

export let pagination = new Pagination(data.pagination.totalNumberOfPages, data.pagination.currentPage);