import { format } from 'fp-ts-routing'
import type { PhilsciPreprintId } from '../Preprints/index.js'
import * as StatusCodes from '../StatusCodes.js'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { reviewAPreprintMatch } from '../routes.js'

export const createUnknownPhilsciPreprintPage = (preprint: PhilsciPreprintId, locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'review-a-preprint', 'dontKnowPreprint')()),
    main: html`
      <h1>${translate(locale, 'review-a-preprint', 'dontKnowPreprint')()}</h1>

      <p>
        ${rawHtml(
          translate(
            locale,
            'review-a-preprint',
            'urlCouldBePhilsci',
          )({
            url: html`<q class="select-all" translate="no"
              >https://philsci-archive.pitt.edu/${preprint.value}/</q
            >`.toString(),
          }),
        )}
      </p>

      <p>${translate(locale, 'review-a-preprint', 'checkCorrectUrl')()}</p>

      <p>${translate(locale, 'review-a-preprint', 'checkPastedUrl')()}</p>

      <p>${rawHtml(translate(locale, 'review-a-preprint', 'urlIsCorrect')({ contact: mailToHelp }))}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
