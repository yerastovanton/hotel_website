/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// ВАЖНО: эти импорты должны быть только типовыми
import type {Directive, DirectiveResult, PartInfo} from './directive.js';
import type {TrustedHTML, TrustedTypesWindow} from 'trusted-types/lib/index.js';

const DEV_MODE = true;
const ENABLE_EXTRA_SECURITY_HOOKS = true;
const ENABLE_SHADYDOM_NOPATCH = true;
const NODE_MODE = false;

// Позволяет минификаторам переименовывать ссылки на globalThis
const global = globalThis;

/**
 * Содержит типы, которые являются частью нестабильного отладочного API.
 *
 * Все в этом API нестабильно и может измениться или быть удалено в будущем,
 * даже в патч-релизах.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace LitUnstable {
  /**
   * Когда Lit работает в dev-режиме и `window.emitLitDebugLogEvents` равен true,
   * мы будем отправлять события 'lit-debug' в window, с живыми деталями о жизненном цикле
   * обновления и рендеринга. Это может быть полезно для создания отладочных инструментов
   * и визуализаций.
   *
   * Учтите, что работа с window.emitLitDebugLogEvents имеет накладные расходы производительности,
   * делая определенные операции, которые обычно очень дешевы (например, no-op рендер),
   * гораздо медленнее, потому что мы должны копировать данные и отправлять события.
   */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace DebugLog {
    export type Entry =
      | TemplatePrep
      | TemplateInstantiated
      | TemplateInstantiatedAndUpdated
      | TemplateUpdating
      | BeginRender
      | EndRender
      | CommitPartEntry
      | SetPartValue;
    export interface TemplatePrep {
      kind: 'template prep';
      template: Template;
      strings: TemplateStringsArray;
      clonableTemplate: HTMLTemplateElement;
      parts: TemplatePart[];
    }
    export interface BeginRender {
      kind: 'begin render';
      id: number;
      value: unknown;
      container: HTMLElement | DocumentFragment;
      options: RenderOptions | undefined;
      part: ChildPart | undefined;
    }
    export interface EndRender {
      kind: 'end render';
      id: number;
      value: unknown;
      container: HTMLElement | DocumentFragment;
      options: RenderOptions | undefined;
      part: ChildPart;
    }
    export interface TemplateInstantiated {
      kind: 'template instantiated';
      template: Template | CompiledTemplate;
      instance: TemplateInstance;
      options: RenderOptions | undefined;
      fragment: Node;
      parts: Array<Part | undefined>;
      values: unknown[];
    }
    export interface TemplateInstantiatedAndUpdated {
      kind: 'template instantiated and updated';
      template: Template | CompiledTemplate;
      instance: TemplateInstance;
      options: RenderOptions | undefined;
      fragment: Node;
      parts: Array<Part | undefined>;
      values: unknown[];
    }
    export interface TemplateUpdating {
      kind: 'template updating';
      template: Template | CompiledTemplate;
      instance: TemplateInstance;
      options: RenderOptions | undefined;
      parts: Array<Part | undefined>;
      values: unknown[];
    }
    export interface SetPartValue {
      kind: 'set part';
      part: Part;
      value: unknown;
      valueIndex: number;
      values: unknown[];
      templateInstance: TemplateInstance;
    }

    export type CommitPartEntry =
      | CommitNothingToChildEntry
      | CommitText
      | CommitNode
      | CommitAttribute
      | CommitProperty
      | CommitBooleanAttribute
      | CommitEventListener
      | CommitToElementBinding;

    export interface CommitNothingToChildEntry {
      kind: 'commit nothing to child';
      start: ChildNode;
      end: ChildNode | null;
      parent: Disconnectable | undefined;
      options: RenderOptions | undefined;
    }

    export interface CommitText {
      kind: 'commit text';
      node: Text;
      value: unknown;
      options: RenderOptions | undefined;
    }

    export interface CommitNode {
      kind: 'commit node';
      start: Node;
      parent: Disconnectable | undefined;
      value: Node;
      options: RenderOptions | undefined;
    }

    export interface CommitAttribute {
      kind: 'commit attribute';
      element: Element;
      name: string;
      value: unknown;
      options: RenderOptions | undefined;
    }

    export interface CommitProperty {
      kind: 'commit property';
      element: Element;
      name: string;
      value: unknown;
      options: RenderOptions | undefined;
    }

    export interface CommitBooleanAttribute {
      kind: 'commit boolean attribute';
      element: Element;
      name: string;
      value: boolean;
      options: RenderOptions | undefined;
    }

    export interface CommitEventListener {
      kind: 'commit event listener';
      element: Element;
      name: string;
      value: unknown;
      oldListener: unknown;
      options: RenderOptions | undefined;
      // True, если мы удаляем старый обработчик событий (например, потому что настройки изменились или значение отсутствует)
      removeListener: boolean;
      // True, если мы добавляем новый обработчик событий (например, при первом рендере или изменении настроек)
      addListener: boolean;
    }

    export interface CommitToElementBinding {
      kind: 'commit to element binding';
      element: Element;
      value: unknown;
      options: RenderOptions | undefined;
    }
  }
}

interface DebugLoggingWindow {
  // Даже в dev-режиме мы обычно не хотим отправлять эти события, так как это
  // еще один уровень затрат, поэтому отправляем их только когда DEV_MODE равен true _и_
  // когда window.emitLitDebugEvents равен true.
  emitLitDebugLogEvents?: boolean;
}

/**
 * Полезно для визуализации и логирования информации о том, что делает система шаблонов Lit.
 *
 * Удаляется в prod-сборках.
 */
const debugLogEvent = DEV_MODE
  ? (event: LitUnstable.DebugLog.Entry) => {
      const shouldEmit = (global as unknown as DebugLoggingWindow)
        .emitLitDebugLogEvents;
      if (!shouldEmit) {
        return;
      }
      global.dispatchEvent(
        new CustomEvent<LitUnstable.DebugLog.Entry>('lit-debug', {
          detail: event,
        })
      );
    }
  : undefined;
// Используется для связи событий beginRender и endRender при вложенных
// рендерах, когда возникают ошибки, препятствующие вызову события endRender.
let debugLogRenderId = 0;

let issueWarning: (code: string, warning: string) => void;

if (DEV_MODE) {
  global.litIssuedWarnings ??= new Set();

  /**
   * Выдать предупреждение, если мы еще этого не делали, на основе либо `code`, либо `warning`.
   * Предупреждения автоматически отключаются только по `warning`; отключение по `code`
   * может быть выполнено пользователями.
   */
  issueWarning = (code: string, warning: string) => {
    warning += code
      ? ` См. https://lit.dev/msg/${code} для дополнительной информации.`
      : '';
    if (
      !global.litIssuedWarnings!.has(warning) &&
      !global.litIssuedWarnings!.has(code)
    ) {
      console.warn(warning);
      global.litIssuedWarnings!.add(warning);
    }
  };

  queueMicrotask(() => {
    issueWarning(
      'dev-mode',
      `Lit работает в dev-режиме. Не рекомендуется для production!`
    );
  });
}

const wrap =
  ENABLE_SHADYDOM_NOPATCH &&
  global.ShadyDOM?.inUse &&
  global.ShadyDOM?.noPatch === true
    ? (global.ShadyDOM!.wrap as <T extends Node>(node: T) => T)
    : <T extends Node>(node: T) => node;

const trustedTypes = (global as unknown as TrustedTypesWindow).trustedTypes;

/**
 * Наша политика TrustedTypePolicy для HTML, который объявляется с помощью функции тега шаблона html.
 *
 * Этот HTML является константой, созданной разработчиком, и анализируется с помощью innerHTML
 * до того, как в него будут добавлены ненадежные выражения. Поэтому он считается
 * безопасным по построению.
 */
const policy = trustedTypes
  ? trustedTypes.createPolicy('lit-html', {
      createHTML: (s) => s,
    })
  : undefined;

/**
 * Используется для санитизации любого значения перед записью в DOM. Это может быть
 * использовано для реализации политики безопасности разрешенных и запрещенных значений
 * с целью предотвращения XSS-атак.
 *
 * Один из способов использования этого callback - проверка атрибутов и свойств
 * по списку высокорисковых полей и требование, чтобы значения, записываемые в такие
 * поля, были экземплярами класса, который безопасен по построению. Safe HTML Types от Closure
 * является одной из реализаций этой техники (
 * https://github.com/google/safe-html-types/blob/master/doc/safehtml-types.md).
 * Полифилл TrustedTypes в режиме только API также может быть использован как основа
 * для этой техники (https://github.com/WICG/trusted-types).
 *
 * @param node HTML-узел (обычно либо #text node, либо Element), в который
 *     производится запись. Обратите внимание, что это просто пример узла, запись
 *     может производиться в другой экземпляр того же класса узла.
 * @param name Имя атрибута или свойства (например, 'href').
 * @param type Указывает, будет ли запись производиться в свойство или атрибут.
 * @return Функция, которая будет санитизировать этот класс записей.
 */
export type SanitizerFactory = (
  node: Node,
  name: string,
  type: 'property' | 'attribute'
) => ValueSanitizer;

/**
 * Функция, которая может санитизировать значения, которые будут записаны в определенный вид
 * DOM-приемника.
 *
 * См. SanitizerFactory.
 *
 * @param value Значение для санитизации. Будет фактическим значением, переданным в
 *     литерал шаблона lit-html, поэтому может быть любого типа.
 * @return Значение для записи в DOM. Обычно такое же, как входное значение,
 *     если не требуется санитизация.
 */
export type ValueSanitizer = (value: unknown) => unknown;

const identityFunction: ValueSanitizer = (value: unknown) => value;
const noopSanitizer: SanitizerFactory = (
  _node: Node,
  _name: string,
  _type: 'property' | 'attribute'
) => identityFunction;

/** Устанавливает глобальную фабрику санитизаторов. */
const setSanitizer = (newSanitizer: SanitizerFactory) => {
  if (!ENABLE_EXTRA_SECURITY_HOOKS) {
    return;
  }
  if (sanitizerFactoryInternal !== noopSanitizer) {
    throw new Error(
      `Попытка перезаписать существующую политику безопасности lit-html.` +
        ` setSanitizeDOMValueFactory должна вызываться не более одного раза.`
    );
  }
  sanitizerFactoryInternal = newSanitizer;
};

/**
 * Используется только во внутренних тестах, не является частью публичного API.
 */
const _testOnlyClearSanitizerFactoryDoNotCallOrElse = () => {
  sanitizerFactoryInternal = noopSanitizer;
};

const createSanitizer: SanitizerFactory = (node, name, type) => {
  return sanitizerFactoryInternal(node, name, type);
};

// Добавляется к имени атрибута, чтобы пометить атрибут как связанный, чтобы мы могли легко
// найти его.
const boundAttributeSuffix = '$lit$';

// Этот маркер используется во многих синтаксических позициях в HTML, поэтому он должен быть
// допустимым именем элемента и именем атрибута. Мы не поддерживаем динамические имена (пока),
// но это хотя бы гарантирует, что дерево разбора ближе к намерению шаблона.
const marker = `lit$${Math.random().toFixed(9).slice(2)}$`;

// Строка, используемая для определения, является ли комментарий маркерным комментарием
const markerMatch = '?' + marker;

// Текст, используемый для вставки узла маркера комментария. Мы используем синтаксис
// инструкции обработки, потому что он немного меньше, но разбирается как узел комментария.
const nodeMarker = `<${markerMatch}>`;

const d =
  NODE_MODE && global.document === undefined
    ? ({
        createTreeWalker() {
          return {};
        },
      } as unknown as Document)
    : document;

// Создает динамический маркер. Нам никогда не нужно искать их в DOM.
const createMarker = () => d.createComment('');

// https://tc39.github.io/ecma262/#sec-typeof-operator
type Primitive = null | undefined | boolean | number | string | symbol | bigint;
const isPrimitive = (value: unknown): value is Primitive =>
  value === null || (typeof value != 'object' && typeof value != 'function');
const isArray = Array.isArray;
const isIterable = (value: unknown): value is Iterable<unknown> =>
  isArray(value) ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof (value as any)?.[Symbol.iterator] === 'function';

const SPACE_CHAR = `[ \t\n\f\r]`;
const ATTR_VALUE_CHAR = `[^ \t\n\f\r"'\`<>=]`;
const NAME_CHAR = `[^\\s"'>=/]`;

// Эти регулярные выражения представляют пять состояний парсинга, которые нас интересуют
// в сканере HTML шаблона. Они соответствуют *концу* состояния, в честь которого названы.
// В зависимости от совпадения мы переходим в новое состояние. Если совпадения нет,
// мы остаемся в том же состоянии.
// Обратите внимание, что регулярные выражения сохраняют состояние. Мы используем lastIndex и синхронизируем его
// между несколькими используемыми регулярными выражениями. В дополнение к пяти регулярным выражениям ниже
// мы также динамически создаем регулярное выражение для поиска соответствующих закрывающих тегов для элементов
// с необработанным текстом.

/**
 * Конец текста: `<`, за которым следует:
 *   (начало комментария) или (тег) или (динамическая привязка тега)
 */
const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
const COMMENT_START = 1;
const TAG_NAME = 2;
const DYNAMIC_TAG_NAME = 3;

const commentEndRegex = /-->/g;
/**
 * Комментарии, не начинающиеся с <!--, такие как </{, могут быть завершены одним символом `>`
 */
const comment2EndRegex = />/g;

/**
 * Регулярное выражение tagEnd соответствует концу позиции синтаксиса "внутри открывающего" тега.
 * Оно соответствует либо `>`, либо последовательности, похожей на атрибут, либо концу строки
 * после пробела (завершение позиции имени атрибута).
 *
 * См. атрибуты в спецификации HTML:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \t\n\f\r" являются символами пробела в HTML:
 * https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * Таким образом, атрибут это:
 *  * Имя: любой символ, кроме пробела, ("), ('), ">", "=" или "/". 
 *    Примечание: это отличается от спецификации HTML, которая также исключает управляющие символы.
 *  * За которым следует ноль или более пробельных символов
 *  * За которым следует "="
 *  * За которым следует ноль или более пробельных символов
 *  * За которым следует:
 *    * Любой символ кроме пробела, ('), ("), "<", ">", "=", (`), или
 *    * (") затем любой символ кроме ("), или
 *    * (') затем любой символ кроме (')
 */
const tagEndRegex = new RegExp(
  `>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|')|))|$)`,
  'g'
);
const ENTIRE_MATCH = 0;
const ATTRIBUTE_NAME = 1;
const SPACES_AND_EQUALS = 2;
const QUOTE_CHAR = 3;

const singleQuoteAttrEndRegex = /'/g;
const doubleQuoteAttrEndRegex = /"/g;
/**
 * Соответствует элементам с необработанным текстом.
 *
 * Комментарии не анализируются внутри элементов с необработанным текстом, поэтому нам нужно
 * искать в их текстовом содержимом строки-маркеры.
 */
const rawTextElement = /^(?:script|style|textarea|title)$/i;

/** Типы TemplateResult */
const HTML_RESULT = 1;
const SVG_RESULT = 2;
const MATHML_RESULT = 3;

type ResultType = typeof HTML_RESULT | typeof SVG_RESULT | typeof MATHML_RESULT;

// Типы TemplatePart
// ВАЖНО: эти значения должны соответствовать значениям в PartType
const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;

/**
 * Тип возвращаемого значения функций тегов шаблонов, {@linkcode html} и
 * {@linkcode svg}, когда они не были скомпилированы с помощью @lit-labs/compiler.
 *
 * Объект `TemplateResult` содержит всю информацию о выражении шаблона,
 * необходимую для его рендеринга: строки шаблона, значения выражений
 * и тип шаблона (html или svg).
 *
 * Объекты `TemplateResult` не создают DOM самостоятельно. Для создания или
 * обновления DOM вам нужно отрендерить `TemplateResult`. См.
 * [Rendering](https://lit.dev/docs/components/rendering) для дополнительной информации.
 *
 */
export type UncompiledTemplateResult<T extends ResultType = ResultType> = {
  // Это свойство не должно быть минифицировано.
  ['_$litType$']: T;
  strings: TemplateStringsArray;
  values: unknown[];
};

/**
 * Это результат шаблона, который может быть как скомпилированным, так и нескомпилированным.
 *
 * В будущем TemplateResult будет этим типом. Если вы хотите явно указать,
 * что результат шаблона потенциально скомпилирован, вы можете ссылаться на этот тип,
 * и он продолжит вести себя так же в следующей основной версии Lit.
 * Это может быть полезно для кода, который хочет подготовиться к следующей основной версии Lit.
 */
export type MaybeCompiledTemplateResult<T extends ResultType = ResultType> =
  | UncompiledTemplateResult<T>
  | CompiledTemplateResult;

/**
 * Тип возвращаемого значения функций тегов шаблонов, {@linkcode html} и
 * {@linkcode svg}.
 *
 * Объект `TemplateResult` содержит всю информацию о выражении шаблона,
 * необходимую для его рендеринга: строки шаблона, значения выражений
 * и тип шаблона (html или svg).
 *
 * Объекты `TemplateResult` не создают DOM самостоятельно. Для создания или
 * обновления DOM вам нужно отрендерить `TemplateResult`. См.
 * [Rendering](https://lit.dev/docs/components/rendering) для дополнительной информации.
 *
 * В Lit 4 этот тип будет псевдонимом MaybeCompiledTemplateResult,
 * поэтому код получит ошибки типов, если предположит, что шаблоны Lit не скомпилированы.
 * При явной работе только с одним типом используйте либо {@linkcode CompiledTemplateResult},
 * либо {@linkcode UncompiledTemplateResult}.
 */
export type TemplateResult<T extends ResultType = ResultType> =
  UncompiledTemplateResult<T>;

export type HTMLTemplateResult = TemplateResult<typeof HTML_RESULT>;

export type SVGTemplateResult = TemplateResult<typeof SVG_RESULT>;

export type MathMLTemplateResult = TemplateResult<typeof MATHML_RESULT>;

/**
 * TemplateResult, который был скомпилирован с помощью @lit-labs/compiler, пропуская шаг подготовки.
 */
export interface CompiledTemplateResult {
  // Это фабрика, чтобы сделать инициализацию шаблона ленивой
  // и позволить передавать область видимости ShadyRenderOptions.
  // Это свойство не должно быть минифицировано.
  ['_$litType$']: CompiledTemplate;
  values: unknown[];
}

export interface CompiledTemplate extends Omit<Template, 'el'> {
  // el переопределен, чтобы быть опциональным. Мы инициализируем его при первом рендеринге
  el?: HTMLTemplateElement;

  // Подготовленная HTML-строка для создания элемента шаблона.
  // Тип TemplateStringsArray гарантирует, что значение пришло из
  // исходного кода, предотвращая атаку внедрения JSON.
  h: TemplateStringsArray;
}

/**
 * Генерирует функцию тега шаблона, которая возвращает TemplateResult с указанным типом результата.
 */
const tag =
  <T extends ResultType>(type: T) =>
  (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult<T> => {
    // Предупреждаем о восьмеричных escape-последовательностях в шаблонах
    // Мы делаем это здесь, а не в render, чтобы предупреждение было ближе к
    // определению шаблона.
    if (DEV_MODE && strings.some((s) => s === undefined)) {
      console.warn(
        'Некоторые строки шаблона не определены.\n' +
          'Это, вероятно, вызвано недопустимыми восьмеричными escape-последовательностями.'
      );
    }
    if (DEV_MODE) {
      // Импорт static-html.js приводит к циклической зависимости, которую g3 не обрабатывает.
      // Вместо этого мы знаем, что статические значения должны иметь поле `_$litStatic$`.
      if (
        values.some((val) => (val as {_$litStatic$: unknown})?.['_$litStatic$'])
      ) {
        issueWarning(
          '',
          `Статические значения 'literal' или 'unsafeStatic' не могут использоваться как значения для нестатических шаблонов.\n` +
            `Пожалуйста, используйте статическую функцию тега 'html'. См. https://lit.dev/docs/templates/expressions/#static-expressions`
        );
      }
    }
    return {
      // Это свойство не должно быть минифицировано.
      ['_$litType$']: type,
      strings,
      values,
    };
  };

/**
 * Интерпретирует литерал шаблона как HTML-шаблон, который может эффективно
 * рендерить и обновлять контейнер.
 *
 * ```ts
 * const header = (title: string) => html`<h1>${title}</h1>`;
 * ```
 *
 * Тег `html` возвращает описание DOM для рендеринга в виде значения. Он является
 * ленивым, что означает, что никакая работа не выполняется до рендеринга шаблона.
 * При рендеринге, если шаблон получен из того же выражения, что и предыдущий
 * результат рендеринга, он эффективно обновляется вместо замены.
 */
export const html = tag(HTML_RESULT);

/**
 * Интерпретирует литерал шаблона как фрагмент SVG, который может эффективно
 * рендерить и обновлять контейнер.
 *
 * ```ts
 * const rect = svg`<rect width="10" height="10"></rect>`;
 *
 * const myImage = html`
 *   <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
 *     ${rect}
 *   </svg>`;
 * ```
 *
 * Функция тега `svg` должна использоваться только для фрагментов SVG или элементов,
 * которые будут содержаться **внутри** HTML-элемента `<svg>`. Распространенная ошибка -
 * размещение элемента `<svg>` в шаблоне с тегом `svg`. Элемент `<svg>` является
 * HTML-элементом и должен использоваться в шаблоне с тегом {@linkcode html}.
 *
 * При использовании в LitElement возврат фрагмента SVG из метода `render()`
 * является некорректным, так как фрагмент SVG будет содержаться внутри теневого
 * корня элемента и, следовательно, не будет правильно содержаться в HTML-элементе `<svg>`.
 */
export const svg = tag(SVG_RESULT);

/**
 * Интерпретирует литерал шаблона как фрагмент MathML, который может эффективно
 * рендерить и обновлять контейнер.
 *
 * ```ts
 * const num = mathml`<mn>1</mn>`;
 *
 * const eq = html`
 *   <math>
 *     ${num}
 *   </math>`;
 * ```
 *
 * Функция тега `mathml` должна использоваться только для фрагментов MathML или
 * элементов, которые будут содержаться **внутри** HTML-элемента `<math>`.
 * Распространенная ошибка - размещение элемента `<math>` в шаблоне с тегом `mathml`.
 * Элемент `<math>` является HTML-элементом и должен использоваться в шаблоне
 * с тегом {@linkcode html}.
 *
 * При использовании в LitElement возврат фрагмента MathML из метода `render()`
 * является некорректным, так как фрагмент MathML будет содержаться внутри
 * теневого корня элемента и, следовательно, не будет правильно содержаться
 * в HTML-элементе `<math>`.
 */
export const mathml = tag(MATHML_RESULT);

/**
 * Сентинельное значение, которое сигнализирует, что значение было обработано директивой
 * и не должно записываться в DOM.
 */
export const noChange = Symbol.for('lit-noChange');

/**
 * Сентинельное значение, которое сигнализирует ChildPart о полной очистке его содержимого.
 *
 * ```ts
 * const button = html`${
 *  user.isAdmin
 *    ? html`<button>DELETE</button>`
 *    : nothing
 * }`;
 * ```
 *
 * Предпочтительно использовать `nothing` вместо других ложных значений, так как это обеспечивает
 * согласованное поведение в различных контекстах привязки выражений.
 *
 * В дочерних выражениях `undefined`, `null`, `''` и `nothing` ведут себя одинаково
 * и не рендерят узлы. В выражениях атрибутов `nothing` _удаляет_ атрибут, тогда как
 * `undefined` и `null` рендерят пустую строку. В выражениях свойств `nothing`
 * становится `undefined`.
 */
export const nothing = Symbol.for('lit-nothing');

/**
 * Кеш подготовленных шаблонов, индексированный по tagged TemplateStringsArray
 * и _не_ учитывающий конкретный используемый тег шаблона. Это означает, что
 * теги шаблонов не могут быть динамическими - они должны статически быть html, svg
 * или attr. Это ограничение упрощает поиск в кеше, который находится на горячем
 * пути рендеринга.
 */
const templateCache = new WeakMap<TemplateStringsArray, Template>();

/**
 * Объект, определяющий параметры для управления рендерингом lit-html. Обратите внимание,
 * что `render` может вызываться несколько раз для одного и того же `container` (и
 * ссылочного узла `renderBefore`) для эффективного обновления отрендеренного содержимого,
 * но только параметры, переданные при первом рендеринге, учитываются в течение
 * времени жизни рендеров для этой уникальной комбинации `container` + `renderBefore`.
 */
export interface RenderOptions {
  /**
   * Объект, используемый как значение `this` для обработчиков событий. Часто
   * полезно установить это в хост-компонент, рендерящий шаблон.
   */
  host?: object;
  /**
   * DOM-узел, перед которым следует рендерить содержимое в контейнере.
   */
  renderBefore?: ChildNode | null;
  /**
   * Узел, используемый для клонирования шаблона (будет вызван `importNode` для этого
   * узла). Это контролирует `ownerDocument` отрендеренного DOM, а также
   * любой унаследованный контекст. По умолчанию используется глобальный `document`.
   */
  creationScope?: {importNode(node: Node, deep?: boolean): Node};
  /**
   * Начальное состояние подключения для рендерящейся части верхнего уровня. Если
   * параметр `isConnected` не установлен, `AsyncDirective`s будут подключены
   * по умолчанию. Установите `false`, если начальный рендеринг происходит в
   * отключенном дереве и `AsyncDirective`s должны видеть `isConnected === false`
   * при начальном рендеринге. Метод `part.setConnected()` должен использоваться
   * после начального рендеринга для изменения состояния подключения части.
   */
  isConnected?: boolean;
}

const walker = d.createTreeWalker(
  d,
  129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */
);

let sanitizerFactoryInternal: SanitizerFactory = noopSanitizer;

//
// Ниже только классы, выше только объявления константных переменных...
//
// Совместное хранение объявлений переменных и классов улучшает минификацию.
// Интерфейсы и псевдонимы типов могут свободно перемежаться.
//

// Тип для классов, которые имеют поле `_directive` или `_directives[]`, используется
// функцией `resolveDirective`
export interface DirectiveParent {
  _$parent?: DirectiveParent;
  _$isConnected: boolean;
  __directive?: Directive;
  __directives?: Array<Directive | undefined>;
}

function trustFromTemplateString(
  tsa: TemplateStringsArray,
  stringFromTSA: string
): TrustedHTML {
  // Проверка безопасности для предотвращения подмены результатов шаблонов Lit.
  // В будущем мы сможем заменить это на Array.isTemplateObject,
  // хотя нам, возможно, придется выполнять эту проверку внутри функций html и svg,
  // потому что прекомпилированные шаблоны не приходят как объекты TemplateStringArray.
  if (!isArray(tsa) || !tsa.hasOwnProperty('raw')) {
    let message = 'invalid template strings array';
    if (DEV_MODE) {
      message = `
          Внутренняя ошибка: ожидалось, что строки шаблона будут массивом
          с полем 'raw'. Подделка массива строк шаблона путем
          вызова html или svg как обычной функции фактически
          эквивалентна вызову unsafeHtml и может привести к серьезным проблемам
          безопасности, например, открыть ваш код для XSS-атак.
          Если вы используете функции тегов html или svg обычным образом
          и все равно видите эту ошибку, пожалуйста, сообщите об ошибке на
          https://github.com/lit/lit/issues/new?template=bug_report.md
          и включите информацию о ваших инструментах сборки, если они есть.
        `
        .trim()
        .replace(/\n */g, '\n');
    }
    throw new Error(message);
  }
  return policy !== undefined
    ? policy.createHTML(stringFromTSA)
    : (stringFromTSA as unknown as TrustedHTML);
}

/**
 * Возвращает HTML-строку для заданного TemplateStringsArray и типа результата
 * (HTML или SVG), вместе с именами привязанных атрибутов с учетом регистра
 * в порядке шаблона. HTML содержит маркеры комментариев, обозначающие `ChildPart`s,
 * и суффиксы на привязанных атрибутах, обозначающие `AttributeParts`.
 *
 * @param strings массив строк шаблона
 * @param тип HTML или SVG
 * @return Массив, содержащий `[html, attrNames]` (массив возвращается для краткости,
 *     чтобы избежать полей объекта, так как этот код используется как в минифицированной,
 *     так и в неминифицированной SSR-версии)
 */
const getTemplateHtml = (
  strings: TemplateStringsArray,
  type: ResultType
): [TrustedHTML, Array<string>] => {
  // Вставляем маркеры в HTML шаблона для представления позиций
  // привязок. Следующий код сканирует строки шаблона, чтобы определить
  // синтаксическую позицию привязок. Они могут быть в текстовой позиции,
  // где мы вставляем HTML-комментарий, в позиции значения атрибута,
  // где мы вставляем строку-сентинель и перезаписываем имя атрибута,
  // или внутри тега, где мы вставляем строку-сентинель.
  const l = strings.length - 1;
  // Хранит имена привязанных атрибутов с учетом регистра в порядке их частей.
  // ElementParts также отражаются в этом массиве как undefined,
  // чтобы отличать их от привязок атрибутов.
  const attrNames: Array<string> = [];
  let html =
    type === SVG_RESULT ? '<svg>' : type === MATHML_RESULT ? '<math>' : '';

  // Когда мы внутри тега с необработанным текстом (не его текстовым содержимым),
  // regex останется tagRegex, чтобы мы могли находить атрибуты, но переключится
  // на этот regex, когда тег закончится.
  let rawTextEndRegex: RegExp | undefined;

  // Текущее состояние парсинга, представленное ссылкой на один из regex
  let regex = textEndRegex;

  for (let i = 0; i < l; i++) {
    const s = strings[i];
    // Индекс конца последнего имени атрибута. Когда это положительное число
    // в конце строки, это означает, что мы в позиции значения атрибута
    // и нужно перезаписать имя атрибута.
    // Мы также используем специальное значение -2, чтобы указать, что мы
    // встретили конец строки в позиции имени атрибута.
    let attrNameEndIndex = -1;
    let attrName: string | undefined;
    let lastIndex = 0;
    let match!: RegExpExecArray | null;

    // Условия в этом цикле обрабатывают текущее состояние парсинга,
    // а присваивания переменной `regex` являются переходами между состояниями.
    while (lastIndex < s.length) {
      // Убеждаемся, что поиск начинается с места, где мы остановились
      regex.lastIndex = lastIndex;
      match = regex.exec(s);
      if (match === null) {
        break;
      }
      lastIndex = regex.lastIndex;
      if (regex === textEndRegex) {
        if (match[COMMENT_START] === '!--') {
          regex = commentEndRegex;
        } else if (match[COMMENT_START] !== undefined) {
          // Начался странный комментарий, например </{
          regex = comment2EndRegex;
        } else if (match[TAG_NAME] !== undefined) {
          if (rawTextElement.test(match[TAG_NAME])) {
            // Запоминаем, если встретили элемент с необработанным текстом.
            // Переключимся на этот regex в конце тега.
            rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, 'g');
          }
          regex = tagEndRegex;
        } else if (match[DYNAMIC_TAG_NAME] !== undefined) {
          if (DEV_MODE) {
            throw new Error(
              'Привязки в именах тегов не поддерживаются. Пожалуйста, используйте статические шаблоны. ' +
                'См. https://lit.dev/docs/templates/expressions/#static-expressions'
            );
          }
          regex = tagEndRegex;
        }
      } else if (regex === tagEndRegex) {
        if (match[ENTIRE_MATCH] === '>') {
          // Конец тега. Если мы начали элемент с необработанным текстом,
          // используем соответствующий regex
          regex = rawTextEndRegex ?? textEndRegex;
          // Может быть конец значения атрибута без кавычек,
          // поэтому очищаем pending attrNameEndIndex
          attrNameEndIndex = -1;
        } else if (match[ATTRIBUTE_NAME] === undefined) {
          // Позиция имени атрибута
          attrNameEndIndex = -2;
        } else {
          attrNameEndIndex = regex.lastIndex - match[SPACES_AND_EQUALS].length;
          attrName = match[ATTRIBUTE_NAME];
          regex =
            match[QUOTE_CHAR] === undefined
              ? tagEndRegex
              : match[QUOTE_CHAR] === '"'
                ? doubleQuoteAttrEndRegex
                : singleQuoteAttrEndRegex;
        }
      } else if (
        regex === doubleQuoteAttrEndRegex ||
        regex === singleQuoteAttrEndRegex
      ) {
        regex = tagEndRegex;
      } else if (regex === commentEndRegex || regex === comment2EndRegex) {
        regex = textEndRegex;
      } else {
        // Не один из пяти основных regex, значит это динамически созданный
        // regex для необработанного текста, и мы в конце этого элемента.
        regex = tagEndRegex;
        rawTextEndRegex = undefined;
      }
    }

    if (DEV_MODE) {
      // Если есть attrNameEndIndex, что указывает на необходимость
      // перезаписи имени атрибута, проверяем, что мы в допустимой
      // позиции атрибута - либо в теге, либо в значении атрибута в кавычках.
      console.assert(
        attrNameEndIndex === -1 ||
          regex === tagEndRegex ||
          regex === singleQuoteAttrEndRegex ||
          regex === doubleQuoteAttrEndRegex,
        'неожиданное состояние парсинга B'
      );
    }

    // У нас четыре случая:
    //  1. Мы в текстовой позиции и не в элементе с необработанным текстом
    //     (regex === textEndRegex): вставляем маркер комментария.
    //  2. У нас неотрицательный attrNameEndIndex, что означает необходимость
    //     перезаписи имени атрибута для добавления суффикса привязанного атрибута.
    //  3. Мы при втором или последующем привязывании в многопривязочном атрибуте,
    //     используем простой маркер.
    //  4. Мы где-то еще внутри тега. Если мы в позиции имени атрибута
    //     (attrNameEndIndex === -2), добавляем последовательный суффикс для
    //     генерации уникального имени атрибута.

    // Обнаруживаем привязку рядом с концом самозакрывающегося тега и вставляем пробел,
    // чтобы отделить маркер от конца тега:
    const end =
      regex === tagEndRegex && strings[i + 1].startsWith('/>') ? ' ' : '';
    html +=
      regex === textEndRegex
        ? s + nodeMarker
        : attrNameEndIndex >= 0
          ? (attrNames.push(attrName!),
            s.slice(0, attrNameEndIndex) +
              boundAttributeSuffix +
              s.slice(attrNameEndIndex)) +
            marker +
            end
          : s + marker + (attrNameEndIndex === -2 ? i : end);
  }

  const htmlResult: string | TrustedHTML =
    html +
    (strings[l] || '<?>') +
    (type === SVG_RESULT ? '</svg>' : type === MATHML_RESULT ? '</math>' : '');

  // Возвращаем как массив для краткости
  return [trustFromTemplateString(strings, htmlResult), attrNames];
};

/** @internal */
export type {Template};
class Template {
  /** @internal */
  el!: HTMLTemplateElement;

  parts: Array<TemplatePart> = [];

  constructor(
    // Это свойство не должно быть минифицировано
    {strings, ['_$litType$']: type}: UncompiledTemplateResult,
    options?: RenderOptions
  ) {
    let node: Node | null;
    let nodeIndex = 0;
    let attrNameIndex = 0;
    const partCount = strings.length - 1;
    const parts = this.parts;

    // Создаем элемент шаблона
    const [html, attrNames] = getTemplateHtml(strings, type);
    this.el = Template.createElement(html, options);
    walker.currentNode = this.el.content;

    // Перемещаем SVG или MathML узлы в корень шаблона
    if (type === SVG_RESULT || type === MATHML_RESULT) {
      const wrapper = this.el.content.firstChild!;
      wrapper.replaceWith(...wrapper.childNodes);
    }

    // Обходим шаблон для поиска маркеров привязок и создания TemplateParts
    while ((node = walker.nextNode()) !== null && parts.length < partCount) {
      if (node.nodeType === 1) {
        if (DEV_MODE) {
          const tag = (node as Element).localName;
          // Предупреждаем, если `textarea` содержит выражение, и выбрасываем ошибку,
          // если `template` содержит, так как это не поддерживается. Проверяем innerHTML
          // на наличие маркеров.
          if (
            /^(?:textarea|template)$/i!.test(tag) &&
            (node as Element).innerHTML.includes(marker)
          ) {
            const m =
              `Выражения не поддерживаются внутри элементов \`${tag}\`. ` +
              `См. https://lit.dev/msg/expression-in-${tag} для получения ` +
              `дополнительной информации.`;
            if (tag === 'template') {
              throw new Error(m);
            } else issueWarning('', m);
          }
        }
        // TODO (justinfagnani): для динамических имен тегов мы не увеличиваем
        // bindingIndex, и он будет отличаться на 1 в элементе и на 2 после него
        if ((node as Element).hasAttributes()) {
          for (const name of (node as Element).getAttributeNames()) {
            if (name.endsWith(boundAttributeSuffix)) {
              const realName = attrNames[attrNameIndex++];
              const value = (node as Element).getAttribute(name)!;
              const statics = value.split(marker);
              const m = /([.?@])?(.*)/.exec(realName)!;
              parts.push({
                type: ATTRIBUTE_PART,
                index: nodeIndex,
                name: m[2],
                strings: statics,
                ctor:
                  m[1] === '.'
                    ? PropertyPart
                    : m[1] === '?'
                      ? BooleanAttributePart
                      : m[1] === '@'
                        ? EventPart
                        : AttributePart,
              });
              (node as Element).removeAttribute(name);
            } else if (name.startsWith(marker)) {
              parts.push({
                type: ELEMENT_PART,
                index: nodeIndex,
              });
              (node as Element).removeAttribute(name);
            }
          }
        }
        // TODO (justinfagnani): сравнить производительность regex с проверкой
        // каждого из 3 имен элементов с необработанным текстом
        if (rawTextElement.test((node as Element).tagName)) {
          // Для элементов с необработанным текстом нужно разделить текстовое содержимое
          // по маркерам, создать текстовый узел для каждого сегмента и TemplatePart
          // для каждого маркера
          const strings = (node as Element).textContent!.split(marker);
          const lastIndex = strings.length - 1;
          if (lastIndex > 0) {
            (node as Element).textContent = trustedTypes
              ? (trustedTypes.emptyScript as unknown as '')
              : '';
            // Создаем новый текстовый узел для каждого литерального сегмента
            // Эти узлы также используются как маркеры для дочерних частей
            for (let i = 0; i < lastIndex; i++) {
              (node as Element).append(strings[i], createMarker());
              // Пропускаем только что добавленный маркерный узел
              walker.nextNode();
              parts.push({type: CHILD_PART, index: ++nodeIndex});
            }
            // Этот маркер добавляется после текущего узла walker'а,
            // поэтому он будет обработан во внешнем цикле (и проигнорирован),
            // так что не нужно корректировать nodeIndex здесь
            (node as Element).append(strings[lastIndex], createMarker());
          }
        }
      } else if (node.nodeType === 8) {
        const data = (node as Comment).data;
        if (data === markerMatch) {
          parts.push({type: CHILD_PART, index: nodeIndex});
        } else {
          let i = -1;
          while ((i = (node as Comment).data.indexOf(marker, i + 1)) !== -1) {
            // Узел комментария содержит маркер привязки, создаем неактивную часть
            // Привязка не будет работать, но последующие привязки будут
            parts.push({type: COMMENT_PART, index: nodeIndex});
            // Переходим в конец совпадения
            i += marker.length - 1;
          }
        }
      }
      nodeIndex++;
    }

    if (DEV_MODE) {
      // Если в теге был дублирующийся атрибут, то при парсинге тега в элемент
      // атрибут дедуплицируется. Мы можем обнаружить это несоответствие, если
      // не использовали каждое имя атрибута при подготовке шаблона.
      if (attrNames.length !== attrNameIndex) {
        throw new Error(
          `Обнаружены дублирующиеся привязки атрибутов. Это происходит, если ваш шаблон ` +
            `содержит дублирующиеся атрибуты на элементе. Например, ` +
            `"<input ?disabled=\${true} ?disabled=\${false}>" содержит ` +
            `дублирующийся атрибут "disabled". Ошибка обнаружена в ` +
            `следующем шаблоне: \n` +
            '`' +
            strings.join('${...}') +
            '`'
        );
      }
    }

    // Мы могли бы установить walker.currentNode в другой узел здесь, чтобы избежать
    // утечки памяти, но каждый раз при подготовке шаблона мы сразу его рендерим
    // и повторно используем walker в новом TemplateInstance._clone()
    debugLogEvent &&
      debugLogEvent({
        kind: 'template prep',
        template: this,
        clonableTemplate: this.el,
        parts: this.parts,
        strings,
      });
  }

  // Переопределяется через `litHtmlPolyfillSupport` для поддержки платформы
  /** @nocollapse */
  static createElement(html: TrustedHTML, _options?: RenderOptions) {
    const el = d.createElement('template');
    el.innerHTML = html as unknown as string;
    return el;
  }
}

export interface Disconnectable {
  _$parent?: Disconnectable;
  _$disconnectableChildren?: Set<Disconnectable>;
  // Вместо хранения состояния подключения в экземплярах, Disconnectable рекурсивно
  // получают состояние подключения из RootPart, к которому они подключены,
  // через геттеры вверх по дереву Disconnectable через ссылки _$parent.
  // Это переносит стоимость отслеживания состояния isConnected на `AsyncDirectives`
  // и избегает необходимости передавать всем Disconnectable (частям, экземплярам шаблонов
  // и директивам) их состояние подключения при каждом изменении, что было бы дорого
  // для деревьев без AsyncDirectives.
  _$isConnected: boolean;
}

function resolveDirective(
  part: ChildPart | AttributePart | ElementPart,
  value: unknown,
  parent: DirectiveParent = part,
  attributeIndex?: number
): unknown {
  // Выходим раньше, если значение явно noChange
  if (value === noChange) {
    return value;
  }
  let currentDirective =
    attributeIndex !== undefined
      ? (parent as AttributePart).__directives?.[attributeIndex]
      : (parent as ChildPart | ElementPart | Directive).__directive;
  const nextDirectiveConstructor = isPrimitive(value)
    ? undefined
    : // Это свойство не должно быть минифицировано
      (value as DirectiveResult)['_$litDirective$'];
  if (currentDirective?.constructor !== nextDirectiveConstructor) {
    // Это свойство не должно быть минифицировано
    currentDirective?.['_$notifyDirectiveConnectionChanged']?.(false);
    if (nextDirectiveConstructor === undefined) {
      currentDirective = undefined;
    } else {
      currentDirective = new nextDirectiveConstructor(part as PartInfo);
      currentDirective._$initialize(part, parent, attributeIndex);
    }
    if (attributeIndex !== undefined) {
      ((parent as AttributePart).__directives ??= [])[attributeIndex] =
        currentDirective;
    } else {
      (parent as ChildPart | Directive).__directive = currentDirective;
    }
  }
  if (currentDirective !== undefined) {
    value = resolveDirective(
      part,
      currentDirective._$resolve(part, (value as DirectiveResult).values),
      currentDirective,
      attributeIndex
    );
  }
  return value;
}

export type {TemplateInstance};
/**
 * Обновляемый экземпляр Template. Содержит ссылки на Parts, используемые
 * для обновления экземпляра шаблона.
 */
class TemplateInstance implements Disconnectable {
  _$template: Template;
  _$parts: Array<Part | undefined> = [];

  /** @internal */
  _$parent: ChildPart;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  constructor(template: Template, parent: ChildPart) {
    this._$template = template;
    this._$parent = parent;
  }

  // Вызывается геттером parentNode ChildPart
  get parentNode() {
    return this._$parent.parentNode;
  }

  // См. комментарий в интерфейсе Disconnectable о том, почему это геттер
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  // Этот метод отделен от конструктора, потому что нам нужно вернуть
  // DocumentFragment и мы не хотим хранить его в поле экземпляра.
  _clone(options: RenderOptions | undefined) {
    const {
      el: {content},
      parts: parts,
    } = this._$template;
    const fragment = (options?.creationScope ?? d).importNode(content, true);
    walker.currentNode = fragment;

    let node = walker.nextNode()!;
    let nodeIndex = 0;
    let partIndex = 0;
    let templatePart = parts[0];

    while (templatePart !== undefined) {
      if (nodeIndex === templatePart.index) {
        let part: Part | undefined;
        if (templatePart.type === CHILD_PART) {
          part = new ChildPart(
            node as HTMLElement,
            node.nextSibling,
            this,
            options
          );
        } else if (templatePart.type === ATTRIBUTE_PART) {
          part = new templatePart.ctor(
            node as HTMLElement,
            templatePart.name,
            templatePart.strings,
            this,
            options
          );
        } else if (templatePart.type === ELEMENT_PART) {
          part = new ElementPart(node as HTMLElement, this, options);
        }
        this._$parts.push(part);
        templatePart = parts[++partIndex];
      }
      if (nodeIndex !== templatePart?.index) {
        node = walker.nextNode()!;
        nodeIndex++;
      }
    }
    // Нам нужно установить currentNode в другое значение, чтобы не удерживать
    // ссылку на клонированное дерево, даже если оно отключено и должно быть освобождено.
    walker.currentNode = d;
    return fragment;
  }

  _update(values: Array<unknown>) {
    let i = 0;
    for (const part of this._$parts) {
      if (part !== undefined) {
        debugLogEvent &&
          debugLogEvent({
            kind: 'set part',
            part,
            value: values[i],
            valueIndex: i,
            values,
            templateInstance: this,
          });
        if ((part as AttributePart).strings !== undefined) {
          (part as AttributePart)._$setValue(values, part as AttributePart, i);
          // Количество значений, которые потребляет часть, равно part.strings.length - 1,
          // так как значения находятся между фрагментами шаблона. Мы увеличиваем i на 1
          // позже в цикле, поэтому увеличиваем его на part.strings.length - 2 здесь
          i += (part as AttributePart).strings!.length - 2;
        } else {
          part._$setValue(values[i]);
        }
      }
      i++;
    }
  }
}

/*
 * Части (Parts)
 */
type AttributeTemplatePart = {
  readonly type: typeof ATTRIBUTE_PART;
  readonly index: number;
  readonly name: string;
  readonly ctor: typeof AttributePart;
  readonly strings: ReadonlyArray<string>;
};
type ChildTemplatePart = {
  readonly type: typeof CHILD_PART;
  readonly index: number;
};
type ElementTemplatePart = {
  readonly type: typeof ELEMENT_PART;
  readonly index: number;
};
type CommentTemplatePart = {
  readonly type: typeof COMMENT_PART;
  readonly index: number;
};

/**
 * TemplatePart представляет динамическую часть в шаблоне до его инстанцирования.
 * При инстанцировании шаблона из TemplateParts создаются Parts.
 */
type TemplatePart =
  | ChildTemplatePart
  | AttributeTemplatePart
  | ElementTemplatePart
  | CommentTemplatePart;

export type Part =
  | ChildPart
  | AttributePart
  | PropertyPart
  | BooleanAttributePart
  | ElementPart
  | EventPart;

export type {ChildPart};
class ChildPart implements Disconnectable {
  readonly type = CHILD_PART;
  readonly options: RenderOptions | undefined;
  _$committedValue: unknown = nothing;
  /** @internal */
  __directive?: Directive;
  /** @internal */
  _$startNode: ChildNode;
  /** @internal */
  _$endNode: ChildNode | null;
  private _textSanitizer: ValueSanitizer | undefined;
  /** @internal */
  _$parent: Disconnectable | undefined;
  /**
   * Состояние подключения только для RootParts (т.е. ChildPart без _$parent,
   * возвращаемый из render верхнего уровня). Это поле не используется в других случаях.
   * Логичнее было бы сделать RootPart подклассом ChildPart с этим полем (и другим
   * геттером _$isConnected), но подкласс вызвал снижение производительности,
   * возможно из-за полиморфизма точек вызова.
   * @internal
   */
  __isConnected: boolean;

  // См. комментарий в интерфейсе Disconnectable о том, почему это геттер
  get _$isConnected() {
    // ChildParts, не являющиеся корневыми, всегда создаются с родителем;
    // только RootChildNode не имеют родителя, поэтому возвращают локальное состояние isConnected
    return this._$parent?._$isConnected ?? this.__isConnected;
  }

  // Следующие поля будут добавлены к ChildParts при необходимости AsyncDirective
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;
  /** @internal */
  _$notifyConnectionChanged?(
    isConnected: boolean,
    removeFromParent?: boolean,
    from?: number
  ): void;
  /** @internal */
  _$reparentDisconnectables?(parent: Disconnectable): void;

  constructor(
    startNode: ChildNode,
    endNode: ChildNode | null,
    parent: TemplateInstance | ChildPart | undefined,
    options: RenderOptions | undefined
  ) {
    this._$startNode = startNode;
    this._$endNode = endNode;
    this._$parent = parent;
    this.options = options;
    // __isConnected используется только для RootParts (когда нет _$parent);
    // значение для не-корневой части не имеет значения, но проверка
    // наличия родителя потребовала бы больше кода
    this.__isConnected = options?.isConnected ?? true;
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      // Явная инициализация для согласованной структуры класса
      this._textSanitizer = undefined;
    }
  }

  /**
   * Родительский узел, в который часть рендерит свое содержимое.
   *
   * Содержимое ChildPart состоит из диапазона соседних дочерних узлов
   * `.parentNode`, возможно ограниченных 'маркерными узлами' (`.startNode` и `.endNode`).
   *
   * - Если и `.startNode`, и `.endNode` не null, то содержимое части состоит
   * из всех узлов между `.startNode` и `.endNode`, исключительно.
   *
   * - Если `.startNode` не null, а `.endNode` null, то содержимое части состоит
   * из всех узлов после `.startNode`, включая последний дочерний узел `.parentNode`.
   * Если `.endNode` не null, то `.startNode` всегда будет не null.
   *
   * - Если и `.endNode`, и `.startNode` равны null, то содержимое части состоит
   * из всех дочерних узлов `.parentNode`.
   */
  get parentNode(): Node {
    let parentNode: Node = wrap(this._$startNode).parentNode!;
    const parent = this._$parent;
    if (
      parent !== undefined &&
      parentNode?.nodeType === 11 /* Node.DOCUMENT_FRAGMENT */
    ) {
      // Если parentNode - DocumentFragment, возможно DOM все еще находится
      // в клонированном фрагменте во время начального рендеринга; в этом случае
      // получаем реальный parentNode, в который будет закоммичена часть,
      // запросив его у родителя
      parentNode = (parent as ChildPart | TemplateInstance).parentNode;
    }
    return parentNode;
  }

  /**
   * Начальный маркерный узел части, если есть. См. `.parentNode` для подробностей.
   */
  get startNode(): Node | null {
    return this._$startNode;
  }

  /**
   * Конечный маркерный узел части, если есть. См. `.parentNode` для подробностей.
   */
  get endNode(): Node | null {
    return this._$endNode;
  }

  _$setValue(value: unknown, directiveParent: DirectiveParent = this): void {
    if (DEV_MODE && this.parentNode === null) {
      throw new Error(
        `Этот \`ChildPart\` не имеет \`parentNode\` и поэтому не может принять значение. Скорее всего, содержащий часть элемент был изменен неподдерживаемым способом вне контроля Lit, что привело к удалению маркерных узлов части из DOM. Например, установка \`innerHTML\` или \`textContent\` элемента может вызвать это.`
      );
    }
    value = resolveDirective(this, value, directiveParent);
    if (isPrimitive(value)) {
      // Не-рендерящиеся дочерние значения. Важно, чтобы они не рендерили
      // пустые текстовые узлы, чтобы избежать проблем с предотвращением
      // стандартного содержимого <slot> по умолчанию.
      if (value === nothing || value == null || value === '') {
        if (this._$committedValue !== nothing) {
          debugLogEvent &&
            debugLogEvent({
              kind: 'commit nothing to child',
              start: this._$startNode,
              end: this._$endNode,
              parent: this._$parent,
              options: this.options,
            });
          this._$clear();
        }
        this._$committedValue = nothing;
      } else if (value !== this._$committedValue && value !== noChange) {
        this._commitText(value);
      }
      // Это свойство не должно быть минифицировано
    } else if ((value as TemplateResult)['_$litType$'] !== undefined) {
      this._commitTemplateResult(value as TemplateResult);
    } else if ((value as Node).nodeType !== undefined) {
      if (DEV_MODE && this.options?.host === value) {
        this._commitText(
          `[вероятная ошибка: рендер хоста шаблона в самом себе ` +
            `(часто вызывается записью \${this} в шаблоне]`
        );
        console.warn(
          `Попытка отрендерить хост шаблона`,
          value,
          `внутри самого себя. Это почти всегда ошибка, и в dev режиме `,
          `мы рендерим предупреждение. В production мы `,
          `попытаемся отрендерить его, что обычно приводит к ошибке `,
          `или исчезновению элемента из DOM.`
        );
        return;
      }
      this._commitNode(value as Node);
    } else if (isIterable(value)) {
      this._commitIterable(value);
    } else {
      // Запасной вариант, будет отрендерено строковое представление
      this._commitText(value);
    }
  }
  private _insert<T extends Node>(node: T) {
    return wrap(wrap(this._$startNode).parentNode!).insertBefore(
      node,
      this._$endNode
    );
  }

  private _commitNode(value: Node): void {
    if (this._$committedValue !== value) {
      this._$clear();
      if (
        ENABLE_EXTRA_SECURITY_HOOKS &&
        sanitizerFactoryInternal !== noopSanitizer
      ) {
        const parentNodeName = this._$startNode.parentNode?.nodeName;
        if (parentNodeName === 'STYLE' || parentNodeName === 'SCRIPT') {
          let message = 'Forbidden';
          if (DEV_MODE) {
            if (parentNodeName === 'STYLE') {
              message =
                `Lit не поддерживает привязки внутри узлов style. ` +
                `Это представляет угрозу безопасности, так как инъекции стилей ` +
                `могут привести к утечке данных и подмене интерфейсов. ` +
                `Рекомендуется использовать литералы css\`...\` ` +
                `для композиции стилей и динамического стилирования ` +
                `с помощью CSS-переменных, ::parts, <slot>-ов ` +
                `и изменения DOM вместо таблиц стилей.`;
            } else {
              message =
                `Lit не поддерживает привязки внутри узлов script. ` +
                `Это представляет угрозу безопасности, так как может позволить ` +
                `выполнение произвольного кода.`;
            }
          }
          throw new Error(message);
        }
      }
      debugLogEvent &&
        debugLogEvent({
          kind: 'commit node',
          start: this._$startNode,
          parent: this._$parent,
          value: value,
          options: this.options,
        });
      this._$committedValue = this._insert(value);
    }
  }

  private _commitText(value: unknown): void {
    // Если закоммиченное значение - примитив, значит мы вызывали _commitText
    // при предыдущем рендере, и мы знаем что this._$startNode.nextSibling - 
    // текстовый узел. Мы можем просто заменить текстовое содержимое (.data) узла.
    if (
      this._$committedValue !== nothing &&
      isPrimitive(this._$committedValue)
    ) {
      const node = wrap(this._$startNode).nextSibling as Text;
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        if (this._textSanitizer === undefined) {
          this._textSanitizer = createSanitizer(node, 'data', 'property');
        }
        value = this._textSanitizer(value);
      }
      debugLogEvent &&
        debugLogEvent({
          kind: 'commit text',
          node,
          value,
          options: this.options,
        });
      (node as Text).data = value as string;
    } else {
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        const textNode = d.createTextNode('');
        this._commitNode(textNode);
        // При установке текстового содержимого, с точки зрения безопасности
        // важно знать родительский элемент. Например, <style> и <script> требуют
        // особой обработки, в отличие от <span>. Сначала мы помещаем текстовый узел
        // в документ, затем можем санитизировать его содержимое.
        if (this._textSanitizer === undefined) {
          this._textSanitizer = createSanitizer(textNode, 'data', 'property');
        }
        value = this._textSanitizer(value);
        debugLogEvent &&
          debugLogEvent({
            kind: 'commit text',
            node: textNode,
            value,
            options: this.options,
          });
        textNode.data = value as string;
      } else {
        this._commitNode(d.createTextNode(value as string));
        debugLogEvent &&
          debugLogEvent({
            kind: 'commit text',
            node: wrap(this._$startNode).nextSibling as Text,
            value,
            options: this.options,
          });
      }
    }
    this._$committedValue = value;
  }

  private _commitTemplateResult(
    result: TemplateResult | CompiledTemplateResult
  ): void {
    // Это свойство не должно быть минифицировано
    const {values, ['_$litType$']: type} = result;
    // Если $litType$ - число, result это обычный TemplateResult и мы получаем
    // шаблон из кеша. Если нет, result это CompiledTemplateResult и _$litType$
    // это CompiledTemplate, и нам нужно создать элемент <template> при первом
    // его появлении.
    const template: Template | CompiledTemplate =
      typeof type === 'number'
        ? this._$getTemplate(result as UncompiledTemplateResult)
        : (type.el === undefined &&
            (type.el = Template.createElement(
              trustFromTemplateString(type.h, type.h[0]),
              this.options
            )),
          type);

    if ((this._$committedValue as TemplateInstance)?._$template === template) {
      debugLogEvent &&
        debugLogEvent({
          kind: 'template updating',
          template,
          instance: this._$committedValue as TemplateInstance,
          parts: (this._$committedValue as TemplateInstance)._$parts,
          options: this.options,
          values,
        });
      (this._$committedValue as TemplateInstance)._update(values);
    } else {
      const instance = new TemplateInstance(template as Template, this);
      const fragment = instance._clone(this.options);
      debugLogEvent &&
        debugLogEvent({
          kind: 'template instantiated',
          template,
          instance,
          parts: instance._$parts,
          options: this.options,
          fragment,
          values,
        });
      instance._update(values);
      debugLogEvent &&
        debugLogEvent({
          kind: 'template instantiated and updated',
          template,
          instance,
          parts: instance._$parts,
          options: this.options,
          fragment,
          values,
        });
      this._commitNode(fragment);
      this._$committedValue = instance;
    }
  }

  // Переопределяется через `litHtmlPolyfillSupport` для поддержки платформы
  /** @internal */
  _$getTemplate(result: UncompiledTemplateResult) {
    let template = templateCache.get(result.strings);
    if (template === undefined) {
      templateCache.set(result.strings, (template = new Template(result)));
    }
    return template;
  }

  private _commitIterable(value: Iterable<unknown>): void {
    // Для Iterable мы создаем новый InstancePart для каждого элемента,
    // затем устанавливаем его значение. Это небольшие накладные расходы для
    // каждого элемента в Iterable, но позволяет нам эффективно обновлять массивы
    // TemplateResults, которые часто возвращаются из выражений вида:
    // array.map((i) => html`${i}`), повторно используя существующие TemplateInstances.

    // Если value - массив, значит предыдущий рендер был iterable
    // и value содержит ChildParts из предыдущего рендера.
    // Если value не массив, очищаем эту часть и создаем новый массив для ChildParts.
    if (!isArray(this._$committedValue)) {
      this._$committedValue = [];
      this._$clear();
    }

    // Позволяет отслеживать сколько элементов мы обработали,
    // чтобы очистить оставшиеся элементы с предыдущего рендера
    const itemParts = this._$committedValue as ChildPart[];
    let partIndex = 0;
    let itemPart: ChildPart | undefined;

    for (const item of value) {
      if (partIndex === itemParts.length) {
        // Если нет существующей части, создаем новую
        itemParts.push(
          (itemPart = new ChildPart(
            this._insert(createMarker()),
            this._insert(createMarker()),
            this,
            this.options
          ))
        );
      } else {
        // Используем существующую часть
        itemPart = itemParts[partIndex];
      }
      itemPart._$setValue(item);
      partIndex++;
    }

    if (partIndex < itemParts.length) {
      // itemParts всегда имеют конечные узлы
      this._$clear(
        itemPart && wrap(itemPart._$endNode!).nextSibling,
        partIndex
      );
      // Усекаем массив parts чтобы _value отражал текущее состояние
      itemParts.length = partIndex;
    }
  }

  /**
   * Удаляет узлы, содержащиеся в этой Part, из DOM.
   *
   * @param start Начальный узел для очистки, для очистки подмножества DOM части
   *     (используется при усечении iterable)
   * @param from  Когда указан `start`, индекс в iterable, начиная с которого
   *     удаляются ChildParts, используется для отключения директив в этих Parts.
   *
   * @internal
   */
  _$clear(
    start: ChildNode | null = wrap(this._$startNode).nextSibling,
    from?: number
  ) {
    this._$notifyConnectionChanged?.(false, true, from);
    while (start && start !== this._$endNode) {
      const n = wrap(start!).nextSibling;
      (wrap(start!) as Element).remove();
      start = n;
    }
  }
  /**
   * Реализация `isConnected` для RootPart. Этот метод должен вызываться только
   * для `RootPart` (ChildPart возвращаемый из вызова `render()` верхнего уровня).
   * Не имеет эффекта для не-корневых ChildParts.
   * @param isConnected Устанавливаемое значение подключения
   * @internal
   */
  setConnected(isConnected: boolean) {
    if (this._$parent === undefined) {
      this.__isConnected = isConnected;
      this._$notifyConnectionChanged?.(isConnected);
    } else if (DEV_MODE) {
      throw new Error(
        'part.setConnected() может вызываться только для ' +
          'RootPart, возвращаемого из render().'
      );
    }
  }
}  

/**
 * Корневой `ChildPart`, возвращаемый из `render`, который управляет состоянием подключения
 * `AsyncDirective`, созданных во всем дереве под ним.
 */
export interface RootPart extends ChildPart {
  /**
   * Устанавливает состояние подключения для `AsyncDirective` внутри этого корневого
   * ChildPart.
   *
   * lit-html автоматически не отслеживает подключенность отрендеренного DOM;
   * таким образом, ответственность за вызов `part.setConnected(false)` перед
   * потенциальным удалением объекта part лежит на вызывающей стороне `render`,
   * чтобы гарантировать, что `AsyncDirective` имеют возможность освободить
   * удерживаемые ресурсы. Если ранее отключенный `RootPart` снова подключается
   * (и его `AsyncDirective` должны переподключиться), следует вызвать `setConnected(true)`.
   *
   * @param isConnected Должны ли директивы в этом дереве быть подключены или нет
   */
  setConnected(isConnected: boolean): void;
}

export type {AttributePart};
class AttributePart implements Disconnectable {
  readonly type:
    | typeof ATTRIBUTE_PART
    | typeof PROPERTY_PART
    | typeof BOOLEAN_ATTRIBUTE_PART
    | typeof EVENT_PART = ATTRIBUTE_PART;
  readonly element: HTMLElement;
  readonly name: string;
  readonly options: RenderOptions | undefined;

  /**
   * Если эта часть атрибута представляет интерполяцию, содержит
   * статические строки интерполяции. Для однозначных полных привязок
   * это значение undefined.
   */
  readonly strings?: ReadonlyArray<string>;
  /** @internal */
  _$committedValue: unknown | Array<unknown> = nothing;
  /** @internal */
  __directives?: Array<Directive | undefined>;
  /** @internal */
  _$parent: Disconnectable;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  protected _sanitizer: ValueSanitizer | undefined;

  get tagName() {
    return this.element.tagName;
  }

  // См. комментарий в интерфейсе Disconnectable о том, почему это геттер
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  constructor(
    element: HTMLElement,
    name: string,
    strings: ReadonlyArray<string>,
    parent: Disconnectable,
    options: RenderOptions | undefined
  ) {
    this.element = element;
    this.name = name;
    this._$parent = parent;
    this.options = options;
    if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
      this._$committedValue = new Array(strings.length - 1).fill(new String());
      this.strings = strings;
    } else {
      this._$committedValue = nothing;
    }
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      this._sanitizer = undefined;
    }
  }

  /**
   * Устанавливает значение этой части, разрешая значение из возможно нескольких
   * значений и статических строк, и записывая его в DOM.
   * Если часть однозначная, `this._strings` будет undefined, и метод
   * будет вызван с одним аргументом-значением. Если часть многосоставная,
   * `this._strings` будет определен, и метод вызывается с массивом значений
   * из владеющего TemplateInstance и смещением в массиве значений, с которого
   * следует читать значения.
   * Этот метод перегружен таким образом, чтобы исключить кратковременные срезы
   * массива значений экземпляра шаблона и обеспечить быстрый путь для однозначных частей.
   *
   * @param value Значение части или массив значений для многосоставных частей
   * @param valueIndex индекс начала чтения значений. `undefined` для
   *   однозначных частей
   * @param noCommit предотвращает запись значения в DOM. Используется
   *   при гидрации для инициализации частей атрибутов их первым отрендеренным значением,
   *   но без установки атрибута, и в SSR для пропуска DOM-операции и
   *   захвата значения для сериализации.
   *
   * @internal
   */
  _$setValue(
    value: unknown | Array<unknown>,
    directiveParent: DirectiveParent = this,
    valueIndex?: number,
    noCommit?: boolean
  ) {
    const strings = this.strings;

    // Изменилось ли какое-либо из значений, для проверки изменений
    let change = false;

    if (strings === undefined) {
      // Случай однозначной привязки
      value = resolveDirective(this, value, directiveParent, 0);
      change =
        !isPrimitive(value) ||
        (value !== this._$committedValue && value !== noChange);
      if (change) {
        this._$committedValue = value;
      }
    } else {
      // Случай интерполяции
      const values = value as Array<unknown>;
      value = strings[0];

      let i, v;
      for (i = 0; i < strings.length - 1; i++) {
        v = resolveDirective(this, values[valueIndex! + i], directiveParent, i);

        if (v === noChange) {
          // Если пользовательское значение `noChange`, используем предыдущее значение
          v = (this._$committedValue as Array<unknown>)[i];
        }
        change ||=
          !isPrimitive(v) || v !== (this._$committedValue as Array<unknown>)[i];
        if (v === nothing) {
          value = nothing;
        } else if (value !== nothing) {
          value += (v ?? '') + strings[i + 1];
        }
        // Мы всегда записываем каждое значение, даже если оно `nothing`,
        // для будущего обнаружения изменений.
        (this._$committedValue as Array<unknown>)[i] = v;
      }
    }
    if (change && !noCommit) {
      this._commitValue(value);
    }
  }

  /** @internal */
  _commitValue(value: unknown) {
    if (value === nothing) {
      (wrap(this.element) as Element).removeAttribute(this.name);
    } else {
      if (ENABLE_EXTRA_SECURITY_HOOKS) {
        if (this._sanitizer === undefined) {
          this._sanitizer = sanitizerFactoryInternal(
            this.element,
            this.name,
            'attribute'
          );
        }
        value = this._sanitizer(value ?? '');
      }
      debugLogEvent &&
        debugLogEvent({
          kind: 'commit attribute',
          element: this.element,
          name: this.name,
          value,
          options: this.options,
        });
      (wrap(this.element) as Element).setAttribute(
        this.name,
        (value ?? '') as string
      );
    }
  }
}

export type {PropertyPart};
class PropertyPart extends AttributePart {
  override readonly type = PROPERTY_PART;

  /** @internal */
  override _commitValue(value: unknown) {
    if (ENABLE_EXTRA_SECURITY_HOOKS) {
      if (this._sanitizer === undefined) {
        this._sanitizer = sanitizerFactoryInternal(
          this.element,
          this.name,
          'property'
        );
      }
      value = this._sanitizer(value);
    }
    debugLogEvent &&
      debugLogEvent({
        kind: 'commit property',
        element: this.element,
        name: this.name,
        value,
        options: this.options,
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.element as any)[this.name] = value === nothing ? undefined : value;
  }
}

export type {BooleanAttributePart};
class BooleanAttributePart extends AttributePart {
  override readonly type = BOOLEAN_ATTRIBUTE_PART;

  /** @internal */
  override _commitValue(value: unknown) {
    debugLogEvent &&
      debugLogEvent({
        kind: 'commit boolean attribute',
        element: this.element,
        name: this.name,
        value: !!(value && value !== nothing),
        options: this.options,
      });
    (wrap(this.element) as Element).toggleAttribute(
      this.name,
      !!value && value !== nothing
    );
  }
}

type EventListenerWithOptions = EventListenerOrEventListenerObject &
  Partial<AddEventListenerOptions>;

/**
 * AttributePart, который управляет обработчиком событий через add/removeEventListener.
 *
 * Эта часть работает, добавляя себя как обработчик события на элемент, затем
 * делегируя переданное значение. Это уменьшает количество вызовов
 * add/removeEventListener при частом изменении обработчика, например при использовании
 * встроенной функции как обработчика.
 *
 * Поскольку параметры событий передаются при добавлении обработчиков, мы должны
 * аккуратно добавлять и удалять часть как обработчик при изменении параметров события.
 */
export type {EventPart};
class EventPart extends AttributePart {
  override readonly type = EVENT_PART;

  constructor(
    element: HTMLElement,
    name: string,
    strings: ReadonlyArray<string>,
    parent: Disconnectable,
    options: RenderOptions | undefined
  ) {
    super(element, name, strings, parent, options);

    if (DEV_MODE && this.strings !== undefined) {
      throw new Error(
        `Элемент \`<${element.localName}>\` имеет обработчик \`@${name}=...\` с ` +
        'недопустимым содержимым. Обработчики событий в шаблонах должны содержать ровно ' +
        'одно выражение без окружающего текста.'
      );
    }
  }

  // EventPart не использует базовую реализацию _$setValue/_resolveValue,
  // так как проверка изменений более сложная
  /** @internal */
  override _$setValue(
    newListener: unknown,
    directiveParent: DirectiveParent = this
  ) {
    newListener =
      resolveDirective(this, newListener, directiveParent, 0) ?? nothing;
    if (newListener === noChange) {
      return;
    }
    const oldListener = this._$committedValue;

    // Если новое значение nothing или изменились параметры, мы должны удалить
    // часть как обработчик
    const shouldRemoveListener =
      (newListener === nothing && oldListener !== nothing) ||
      (newListener as EventListenerWithOptions).capture !==
        (oldListener as EventListenerWithOptions).capture ||
      (newListener as EventListenerWithOptions).once !==
        (oldListener as EventListenerWithOptions).once ||
      (newListener as EventListenerWithOptions).passive !==
        (oldListener as EventListenerWithOptions).passive;

    // Если новое значение не nothing и мы удалили обработчик, мы должны
    // добавить часть как обработчик
    const shouldAddListener =
      newListener !== nothing &&
      (oldListener === nothing || shouldRemoveListener);

    debugLogEvent &&
      debugLogEvent({
        kind: 'commit event listener',
        element: this.element,
        name: this.name,
        value: newListener,
        options: this.options,
        removeListener: shouldRemoveListener,
        addListener: shouldAddListener,
        oldListener,
      });
    if (shouldRemoveListener) {
      this.element.removeEventListener(
        this.name,
        this,
        oldListener as EventListenerWithOptions
      );
    }
    if (shouldAddListener) {
      this.element.addEventListener(
        this.name,
        this,
        newListener as EventListenerWithOptions
      );
    }
    this._$committedValue = newListener;
  }

  handleEvent(event: Event) {
    if (typeof this._$committedValue === 'function') {
      this._$committedValue.call(this.options?.host ?? this.element, event);
    } else {
      (this._$committedValue as EventListenerObject).handleEvent(event);
    }
  }
}

export type {ElementPart};
class ElementPart implements Disconnectable {
  readonly type = ELEMENT_PART;

  /** @internal */
  __directive?: Directive;

  // Это гарантирует, что каждая Part имеет _$committedValue
  _$committedValue: undefined;

  /** @internal */
  _$parent!: Disconnectable;

  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  options: RenderOptions | undefined;

  constructor(
    public element: Element,
    parent: Disconnectable,
    options: RenderOptions | undefined
  ) {
    this._$parent = parent;
    this.options = options;
  }

  // См. комментарий в интерфейсе Disconnectable о том, почему это геттер
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  _$setValue(value: unknown): void {
    debugLogEvent &&
      debugLogEvent({
        kind: 'commit to element binding',
        element: this.element,
        value,
        options: this.options,
      });
    resolveDirective(this, value);
  }
}

/**
 * КОНЕЧНЫЕ ПОЛЬЗОВАТЕЛИ НЕ ДОЛЖНЫ ПОЛОГАТЬСЯ НА ЭТОТ ОБЪЕКТ.
 *
 * Приватные экспорты для использования другими пакетами Lit, не предназначены для
 * использования внешними пользователями.
 *
 * В настоящее время мы не создаем манглированную сборку кода lit-ssr. Чтобы
 * сохранить ряд (в противном случае приватных) экспортов верхнего уровня манглированными
 * в клиентском коде, мы экспортируем объект _$LH, содержащий эти члены (или
 * вспомогательные методы для доступа к приватным полям этих членов), а затем
 * реэкспортируем их для использования в lit-ssr. Это делает lit-ssr независимым от того,
 * используется ли клиентский код в режиме `dev` или `prod`.
 *
 * Это уникальное имя, чтобы отличать его от приватных экспортов в lit-element,
 * который реэкспортирует весь lit-html.
 *
 * @private
 */
export const _$LH = {
  // Используется в lit-ssr
  _boundAttributeSuffix: boundAttributeSuffix,
  _marker: marker,
  _markerMatch: markerMatch,
  _HTML_RESULT: HTML_RESULT,
  _getTemplateHtml: getTemplateHtml,
  // Используется в тестах и private-ssr-support
  _TemplateInstance: TemplateInstance,
  _isIterable: isIterable,
  _resolveDirective: resolveDirective,
  _ChildPart: ChildPart,
  _AttributePart: AttributePart,
  _BooleanAttributePart: BooleanAttributePart,
  _EventPart: EventPart,
  _PropertyPart: PropertyPart,
  _ElementPart: ElementPart,
};

// Применяем полифиллы, если они доступны
const polyfillSupport = DEV_MODE
  ? global.litHtmlPolyfillSupportDevMode
  : global.litHtmlPolyfillSupport;
polyfillSupport?.(Template, ChildPart);

// ВАЖНО: не изменяйте имя свойства или выражение присваивания.
// Эта строка используется в регулярных выражениях для поиска использования lit-html.
(global.litHtmlVersions ??= []).push('3.2.1');
if (DEV_MODE && global.litHtmlVersions.length > 1) {
  queueMicrotask(() => {
    issueWarning!(
      'multiple-versions',
      `Загружено несколько версий Lit. ` +
        `Загрузка нескольких версий не рекомендуется.`
    );
  });
}

/**
 * Рендерит значение, обычно lit-html TemplateResult, в контейнер.
 *
 * Этот пример рендерит текст "Hello, Zoe!" внутри тега параграфа, добавляя его
 * в контейнер `document.body`.
 *
 * ```js
 * import {html, render} from 'lit';
 *
 * const name = "Zoe";
 * render(html`<p>Hello, ${name}!</p>`, document.body);
 * ```
 *
 * @param value Любое [рендерящееся значение](https://lit.dev/docs/templates/expressions/#child-expressions),
 *   обычно {@linkcode TemplateResult}, созданный при вычислении тега шаблона
 *   вроде {@linkcode html} или {@linkcode svg}.
 * @param container DOM-контейнер для рендеринга. Первый рендер добавит
 *   отрендеренное значение в контейнер, а последующие рендеры будут
 *   эффективно обновлять отрендеренное значение, если ранее там был
 *   отрендерен результат того же типа.
 * @param options См. {@linkcode RenderOptions} для документации по параметрам.
 * @see
 * {@link https://lit.dev/docs/libraries/standalone-templates/#rendering-lit-html-templates| Рендеринг Lit HTML шаблонов}
 */
export const render = (
  value: unknown,
  container: HTMLElement | DocumentFragment,
  options?: RenderOptions
): RootPart => {
  if (DEV_MODE && container == null) {
    // Даем более понятное сообщение об ошибке, чем
    //     Uncaught TypeError: Cannot read properties of null (reading '_$litPart$')
    // которое выглядит как внутренняя ошибка Lit.
    throw new TypeError(`Контейнер для рендеринга не может быть ${container}`);
  }
  const renderId = DEV_MODE ? debugLogRenderId++ : 0;
  const partOwnerNode = options?.renderBefore ?? container;
  // Это свойство не должно быть минифицировано.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let part: ChildPart = (partOwnerNode as any)['_$litPart$'];
  debugLogEvent &&
    debugLogEvent({
      kind: 'begin render',
      id: renderId,
      value,
      container,
      options,
      part,
    });
  if (part === undefined) {
    const endNode = options?.renderBefore ?? null;
    // Это свойство не должно быть минифицировано.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (partOwnerNode as any)['_$litPart$'] = part = new ChildPart(
      container.insertBefore(createMarker(), endNode),
      endNode,
      undefined,
      options ?? {}
    );
  }
  part._$setValue(value);
  debugLogEvent &&
    debugLogEvent({
      kind: 'end render',
      id: renderId,
      value,
      container,
      options,
      part,
    });
  return part as RootPart;
};

if (ENABLE_EXTRA_SECURITY_HOOKS) {
  render.setSanitizer = setSanitizer;
  render.createSanitizer = createSanitizer;
  if (DEV_MODE) {
    render._testOnlyClearSanitizerFactoryDoNotCallOrElse =
      _testOnlyClearSanitizerFactoryDoNotCallOrElse;
  }
}