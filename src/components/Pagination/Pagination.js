import data from '@data/pagination.json';

class Pagination {

    constructor(totalNumberOfPages, currentPage) {
        this.totalNumberOfPages = +totalNumberOfPages;
        this.currentPage = +currentPage;
    }

    init() {
        this.render(this.totalNumberOfPages, this.currentPage);
    }

    render(totalNumberOfPages, currentPage) {
        const renderSetting = {
            parentContainer: document.querySelector('fieldset.pagination__fieldset'),
            firstNumberOfPages: 1,
            totalNumberOfPages: totalNumberOfPages,
            currentPage: currentPage,
            arrayOfElements: {
                previousPageButton: currentPage > this.firstNumberOfPages,
                firstPageButton: currentPage > this.firstNumberOfPages ? this.firstNumberOfPages : false,
                firstDash: (currentPage - 3) > this.firstNumberOfPages,
                arrayOfClosestPages: [
                    (currentPage - 2) > this.firstNumberOfPages ? currentPage - 2 : false,
                    (currentPage - 1) > this.firstNumberOfPages ? currentPage - 1 : false,
                    currentPage, 
                    (currentPage + 1) < this.totalNumberOfPages ? currentPage + 1 : false,
                    (currentPage + 2) < this.totalNumberOfPages ? currentPage + 2 : false,
                ],
                secondDash: (currentPage + 3) < totalNumberOfPages,
                lastPageButton: currentPage < this.totalNumberOfPages ? this.totalNumberOfPages : false,
                nextPageButton: currentPage < this.totalNumberOfPages 
            }
        };

        const createFragmentArrayOfElements = (setting) => {
            const fragment = document.createDocumentFragment();

            const createElement = (elementType, elementSetting) => {
                let className = 'pagination__button';
                if (elementType === 'previousPageButton') className = `${className}_previousPage`;
                if (elementType === 'nextPageButton') className = `${className}_nextPage`;
                if (elementType === 'firstDash' || elementType === 'secondDash') className = `${className}_dash`;
                
                if (elementSetting !== false) {
                    const newElement = document.createElement('button');
                    const textContent = typeof(elementSetting) === 'number' ? elementSetting : elementType;
                    newElement.classList.add(`${className}`);
                    newElement.textContent = `${textContent}`;

                    return fragment.appendChild(newElement);
                };
            };

            for (const key in setting.arrayOfElements) {
                if ((Array.isArray(setting.arrayOfElements[key]) === false) &
                    (setting.arrayOfElements.hasOwnProperty(key))) {
                    createElement(key, setting.arrayOfElements[key]);
                };
                if (Array.isArray(setting.arrayOfElements[key])) {
                    setting.arrayOfElements[key].forEach((item) => createElement(key, item));
                };
            };

            return fragment;
        };

        renderSetting.parentContainer.textContent = '';
        const fragment = createFragmentArrayOfElements(renderSetting);
        renderSetting.parentContainer.appendChild(fragment);
    };

    click() {

    }
};

export let pagination = new Pagination(data.pagination.totalNumberOfPages, data.pagination.currentPage);