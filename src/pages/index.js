import '@styles/styles.module.scss';
import '@components/index.module.scss';

import { pagination } from '@components/index.js';

const init = () => {
    pagination.init();
};

document.body.addEventListener('click', (event) => {
    if (event.target.closest('.pagination__button')) pagination.click(event);
});

init();
