import data from '@data/pagination.json';

class Pagination {
    #firstNumberOfPages;
    #totalNumberOfPages;
    #currentPage;
    #numberOfCardsPerPage;
    #textLabel;
    #buttonFontSize;
    #buttonFontFamily;
    #buttonHeight;
    #fieldsetWidth;

    constructor(
        totalNumberOfPages, 
        currentPage, 
        numberOfCardsPerPage, 
        textLabel
    ) {
        this.#firstNumberOfPages = 1;
        this.#totalNumberOfPages = Number(totalNumberOfPages);
        this.#currentPage = Number(currentPage);
        this.#numberOfCardsPerPage = Number(numberOfCardsPerPage);
        this.#textLabel = String(textLabel);
        this.#buttonFontSize = 0;
        this.#buttonFontFamily = '';
        this.#buttonHeight = 0;
        this.#fieldsetWidth = 0;
    };

    init() {
        return (this.render());
    };

    render(
        {
        firstNumberOfPages = this.firstNumberOfPages, 
        totalNumberOfPages = this.totalNumberOfPages, 
        currentPage = this.currentPage,
        numberOfCardsPerPage = this.numberOfCardsPerPage,
        textLabel = this.textLabel,
        buttonFontSize = this.buttonFontSize,
        buttonFontFamily = this.buttonFontFamily,
        buttonHeight = this.buttonHeight,
        fieldsetWidth = this.fieldsetWidth
        } = {}
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
            nextPage: currentPage < totalNumberOfPages,
            textLabel: textLabel
        };

        const createFragmentArrayOfPaginationButtons = (renderSetting) => {

            const createPaginationButton = (elementType, elementContent, buttonFontSize, buttonFontFamily) => {
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

                    const resizeWidth = (elementType, elementContent, buttonFontSize, buttonFontFamily) => {
                        if (elementType !== 'previousPage' && elementType !== 'nextPage') {
                            if (elementContent !== '') {
                                const getWidthTextFromCanvas = (elementContent, buttonFontSize, buttonFontFamily) => {
                                    const canvas = document.createElement('canvas');
                                    const context = canvas.getContext('2d');
                                    context.font = `${buttonFontSize} ${buttonFontFamily}`;
                                    const text = elementContent;
                                    const textWidth = context.measureText(text).width;
                    
                                    return (textWidth);
                                };
                
                                const textWidth = getWidthTextFromCanvas(elementContent, buttonFontSize, buttonFontFamily);
                                const margin = 1.5 * textWidth;
                                let fullButtonWidth = (textWidth + margin);
                                if (fullButtonWidth < buttonHeight) fullButtonWidth = buttonHeight;

                                fieldsetWidth += fullButtonWidth;
                                
                                return (`${fullButtonWidth}px`);
                            };
                        };
                    };

                    const newElement = document.createElement('button');
                    newElement.classList.add(...addClass(elementType, elementContent).split(' '));                  
                    newElement.textContent = addTextContent(elementType, elementContent);
                    newElement.style.width = resizeWidth(elementType, elementContent, buttonFontSize, buttonFontFamily);

                    return (fragmentArrayOfPaginationButtons.appendChild(newElement));
                };
            };

            const createPaginationLabel = (elementType, elementContent) => {
                if (elementContent !== false) {

                    const addClass = (elementType, elementContent) => {
                        let className = `pagination__label`;

                        return (className);
                    };

                    const addTextContent = (elementContent) => {
                        let textContent = elementContent;
                        console.log(textContent);

                        return (textContent);
                    };

                    const newElement = document.createElement('label');
                    newElement.classList.add(...addClass(elementType, elementContent).split(' '));                  
                    newElement.textContent = addTextContent(elementContent);

                    return (fragmentArrayOfPaginationButtons.appendChild(newElement));
                };
            };

            const fragmentArrayOfPaginationButtons = document.createDocumentFragment();

            for (const key in renderSetting) {
                if (renderSetting.hasOwnProperty(key)) {
                    if (Array.isArray(renderSetting[key]) === false) {
                        if (key !== 'textLabel') createPaginationButton(key, renderSetting[key], buttonFontSize, buttonFontFamily);
                        if (key === 'textLabel') createPaginationLabel(key, renderSetting[key]);
                    };
                    if (Array.isArray(renderSetting[key])) {
                        renderSetting[key].forEach((value) => createPaginationButton(key, value, buttonFontSize, buttonFontFamily));
                    };
                };
            };

            return (fragmentArrayOfPaginationButtons);
        };

        const parentContainer = document.querySelector('fieldset.pagination__fieldset');
        parentContainer.textContent = '';
        parentContainer.appendChild(createFragmentArrayOfPaginationButtons(renderSetting, buttonFontSize, buttonFontFamily));
        parentContainer.style.width = fieldsetWidth;

        return (parentContainer);
    };

    click(event) {
        const classes = event.target.classList;
        const textContent = event.target.textContent;

        if (classes.contains('pagination__button')) {
            if (classes.contains('pagination__button_previousPage')) {
                --this.currentPage;
                return (this.render());
            };
            if (classes.contains('pagination__button_nextPage')) {
                ++this.currentPage;
                return (this.render());
            };
            if (textContent.trim() !== '' && textContent != '\u002E\u002E\u002E') {
                this.currentPage = +textContent;
                return (this.render());
            };
        };
    };

    get firstNumberOfPages() {
        return (this.#firstNumberOfPages);
    };

    get totalNumberOfPages() {
        return (this.#totalNumberOfPages);
    };

    get currentPage() {
        return (this.#currentPage);
    };

    get numberOfCardsPerPage() {
        return (this.#numberOfCardsPerPage);
    };
    
    get textLabel() {
        return (this.#textLabel);
    };

    get buttonFontSize() {
        const button = document.createElement('button');
        button.classList.add('pagination__button');
        document.body.appendChild(button);
        const computedStyle = window.getComputedStyle(button);
        const buttonFontSize = Number(computedStyle.fontSize.replace('px', ''));
        document.body.removeChild(button);
    
        return (this.#buttonFontSize = buttonFontSize);
    };

    get buttonFontFamily() {
        const button = document.createElement('button');
        button.classList.add('pagination__button');
        document.body.appendChild(button);
        const computedStyle = window.getComputedStyle(button);
        const buttonFontFamily = computedStyle.fontFamily;
        document.body.removeChild(button);
    
        return (this.#buttonFontFamily = buttonFontFamily);
    };

    get buttonHeight() {
        const button = document.createElement('button');
        button.classList.add('pagination__button');
        document.body.appendChild(button);
        const computedStyle = window.getComputedStyle(button);
        const buttonHeight = Number(computedStyle.height.replace('px', ''));
        document.body.removeChild(button);
    
        return (this.#buttonHeight = buttonHeight);
    };

    get fieldsetWidth() {
        return (this.#fieldsetWidth);
    };
    
    set currentPage(currentPage) {
        return (this.#currentPage = currentPage);
    };
    
    set numberOfCardsPerPage(numberOfCardsPerPage) {
        return (this.#numberOfCardsPerPage = numberOfCardsPerPage);
    };

    set fieldsetWidth(fieldsetWidth) {
        return (this.#fieldsetWidth = fieldsetWidth);
    };
};

export const pagination = new Pagination(
    data.pagination.totalNumberOfPages, 
    data.pagination.currentPage,
    data.pagination.numberOfCardsPerPage,
    data.pagination.textLabel
);