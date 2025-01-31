import '@styles/styles.module.scss';
import '@components/index.module.scss';

import { pagination } from '@components/index.js';
// import { rangeSlider } from '@components/index.js';

window.addEventListener('load', ()=> {
    pagination.init();
    // rangeSlider.init();
});

const handleGlobalEvent = (event) => {
    if (event.target.closest(
        `.${pagination.getNameContainer()}`
    )) {
        pagination.handleEvent(event);
    };
};

document.body.addEventListener('click', handleGlobalEvent);
document.body.addEventListener('keydown', handleGlobalEvent);

// document.body.addEventListener('change', (event) => {
//     if (event.target.closest('.rangeSlider__fieldset')) rangeSlider.change(event);
// });

