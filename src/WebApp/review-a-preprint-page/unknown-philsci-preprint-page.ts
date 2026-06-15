import { format } from 'fp-ts-routing'
import { html, plainText, type Html } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { PhilsciPreprintId } from '../../Preprints/index.ts'
import { reviewAPreprintMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export const createUnknownPhilsciPreprintPage = (preprint: PhilsciPreprintId, locale: SupportedLocale) =>
  PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(translate(locale, 'review-a-preprint', 'doNotKnowPreprint')()),
    main: html`
      <h1>${translate(locale, 'review-a-preprint', 'doNotKnowPreprint')()}</h1>

      <p>
        ${translate(
          locale,
          'review-a-preprint',
          'urlCouldBePhilsci',
        )({
          url: html`<q class="select-all" dir="auto" translate="no"
            >https://philsci-archive.pitt.edu/${preprint.value}/</q
          >`,
        })}
      </p>

      <p>${translate(locale, 'review-a-preprint', 'checkCorrectUrl')()}</p>

      <p>${translate(locale, 'review-a-preprint', 'checkPastedUrl')()}</p>

      <p>${translate(locale, 'review-a-preprint', 'urlIsCorrect')({ contact: mailToHelp })}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })

const mailToHelp = (text: Html) => html`<a href="mailto:help@prereview.org">${text}</a>`
