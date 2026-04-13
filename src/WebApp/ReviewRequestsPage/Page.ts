import { Array, flow, Number, Order, pipe, String, Tuple } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import { type Html, html, plainText, rawHtml } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import type * as ReviewRequests from '../../ReviewRequests/index.ts'
import * as Routes from '../../routes.ts'
import { fieldIds, getFieldName } from '../../types/field.ts'

export const title = ({
  currentPage,
  field,
  language,
  locale,
}: Pick<ReviewRequests.PageOfReviewRequests, 'currentPage' | 'field' | 'language'> & { locale: SupportedLocale }) => {
  const t = translate(locale, 'review-requests-page')

  const details = Array.append(
    [
      field ? getFieldName(field, locale) : undefined,
      language ? new Intl.DisplayNames(locale, { type: 'language' }).of(language) : undefined,
    ].filter(String.isString),
    t('pageNumber')({ page: currentPage }),
  )

  return plainText(t('titleWithDetails')({ details: formatList(locale, { style: 'narrow' })(details).toString() }))
}

export const form = ({
  field,
  language,
  locale,
}: Pick<ReviewRequests.PageOfReviewRequests, 'field' | 'language'> & { locale: SupportedLocale }) => {
  const t = translate(locale, 'review-requests-page')

  return html`
    <form method="get" action="${Routes.ReviewRequests.path}" novalidate role="search" aria-labelledby="filter-label">
      <h2 class="visually-hidden" id="filter-label">${t('filterTitle')()}</h2>
      <input type="hidden" name="page" value="1" />
      <div>
        <label for="language">${t('filterLanguageLabel')()}</label>
        <div class="select">
          <select name="language" id="language">
            <option value="" ${language === undefined ? html`selected` : ''}>${t('filterLanguageAny')()}</option>
            ${pipe(
              ['en', 'pt', 'es'] satisfies ReadonlyArray<LanguageCode>,
              Array.map(
                language =>
                  [language, new Intl.DisplayNames(locale, { type: 'language' }).of(language) ?? language] as const,
              ),
              Array.sort<readonly [string, string]>(Order.mapInput(StringOrder(locale), Tuple.getSecond)),
              Array.map(
                ([code, name]) =>
                  html` <option value="${code}" ${code === language ? html`selected` : ''}>${name}</option>`,
              ),
            )}
          </select>
        </div>
      </div>
      <div>
        <label for="field">${t('filterFieldLabel')()}</label>
        <div class="select">
          <select name="field" id="field">
            <option value="" ${field === undefined ? html`selected` : ''}>${t('filterFieldAny')()}</option>
            ${pipe(
              fieldIds,
              Array.map(field => Tuple.make(field, getFieldName(field, locale))),
              Array.sort<readonly [string, string]>(Order.mapInput(StringOrder(locale), Tuple.getSecond)),
              Array.map(
                ([id, name]) => html` <option value="${id}" ${id === field ? html`selected` : ''}>${name}</option>`,
              ),
            )}
          </select>
        </div>
      </div>
      <button>${t('filterButton')()}</button>
    </form>
  `
}

function StringOrder(...args: ConstructorParameters<typeof Intl.Collator>): Order.Order<string> {
  const collator = new Intl.Collator(...args)

  return flow((a, b) => collator.compare(a, b), Number.sign)
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(list => formatter.format(list), rawHtml)
}
