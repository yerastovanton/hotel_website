// import data from '@data/rangeSlider.json';

// class RangeSlider {
//     #min;
//     #max;
//     #valueFirstInput;
//     #valueSecondInput;

//     constructor(
//         min,
//         max
//     ) {
//         this.#min = Number(min);
//         this.#max = Number(max);
//         this.#valueFirstInput = Number(min);
//         this.#valueSecondInput = Number(max);
//     };

//     init() {
//         return (this.render());
//     };

//     render(
//         {
//             min = this.min,
//             max = this.max,
//             valueFirstInput = this.valueFirstInput,
//             valueSecondInput = this.valueSecondInput
//         } = {}
//     ) {
//         const createFragmentRangeSlider = (min, max, valueFirstInput, valueSecondInput) => {
//             const createInput = ({id, value} = {}) => {
//                 const newElement = document.createElement('input');
//                 newElement.classList.add('rangeSlider__input');
//                 newElement.id = String(id);
//                 newElement.type = 'range';
//                 newElement.min = min;
//                 newElement.max = max;
//                 newElement.value = value;
//                 newElement.step = ((max - min) / 100);

//                 return (newElement);
//             };

//             const createDiv = () => {
//                 const div = document.createElement('div');
//                 div.classList.add('rangeSlider__container');
//                 div.role = 'group';
//                 div.setAttribute('aria-labelledby', 'slider-label');
                
//                 return (div);
//             };

//             const fragmentRangeSlider = document.createDocumentFragment();
//             const divRangeSlider = createDiv();
//             fragmentRangeSlider.appendChild(divRangeSlider);
//             divRangeSlider.appendChild(createInput({
//                 id: 'first', 
//                 value: valueFirstInput
//             }));
//             divRangeSlider.appendChild(createInput({
//                 id: 'second', 
//                 value: valueSecondInput
//             }));

//             return (fragmentRangeSlider);
//         };

//         const editOutput = (valueFirstInput, valueSecondInput) => {
//             const output = document.querySelector('fieldset.rangeSlider__fieldset.output');
//             if (output !== null) {
//                 output.textContent = `${valueFirstInput}\u20bd\u2002\u2010\u2002${valueSecondInput}`;
    
//                 return (output);
//             };
//         };

//         const parentContainer = document.querySelector('fieldset.rangeSlider__fieldset');
//         parentContainer.textContent = '';
//         parentContainer.appendChild(createFragmentRangeSlider(min, max, valueFirstInput, valueSecondInput));
//         editOutput(valueFirstInput, valueSecondInput);

//         return (parentContainer);
//     };
    
//     change(event) {
//         if (event.target.classList.contains('rangeSlider__input')) {
//             if (event.target.id === 'first') {
//                 this.valueFirstInput = Number(event.target.value);
    
//                 return (this.render());
//             };
//             if (event.target.id === 'second') {
//                 this.valueSecondInput = Number(event.target.value);
    
//                 return (this.render());
//             };
//         };
//     };

//     get min() {
//         return (this.#min);
//     };

//     get max() {
//         return (this.#max);
//     };

//     get valueFirstInput() {
//         return (this.#valueFirstInput);
//     };

//     get valueSecondInput() {
//         return (this.#valueSecondInput);
//     };

//     set valueFirstInput(valueFirstInput) {
//         return (this.#valueFirstInput = valueFirstInput);
//     };

//     set valueSecondInput(valueSecondInput) {
//         return (this.#valueSecondInput = valueSecondInput);
//     };
// };


// export const rangeSlider = new RangeSlider(
//     data.rangeSlider.min,
//     data.rangeSlider.max
// );