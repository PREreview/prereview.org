import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { reviewAPreprintMatch } from '../routes.js'
import type { PhilsciPreprintId } from '../types/preprint-id.js'

export const createUnknownPhilsciPreprintPage = (preprint: PhilsciPreprintId, locale: SupportedLocale) =>
  PageResponse({
    status: Status.BadRequest,
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
        >${translate(locale, 'review-a-preprint', 'back')()}</a
      >
    `,
  })

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
