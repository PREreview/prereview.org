import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText } from '../html.js'
import type { SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { reviewAPreprintMatch } from '../routes.js'
import type { PhilsciPreprintId } from '../types/preprint-id.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createUnknownPhilsciPreprintPage = (preprint: PhilsciPreprintId, locale: SupportedLocale) =>
  PageResponse({
    status: Status.BadRequest,
    title: plainText`Sorry, we don’t know this preprint`,
    main: html`
      <h1>Sorry, we don’t know this preprint</h1>

      <p>
        We think the URL
        <q class="select-all" translate="no">https://philsci-archive.pitt.edu/${preprint.value}/</q> could be a
        PhilSci-Archive preprint, but we can’t find any details.
      </p>

      <p>If you typed the URL, check it is correct.</p>

      <p>If you pasted the URL, check you copied the entire address.</p>

      <p>If the URL is correct, please <a href="mailto:help@prereview.org">get in touch</a>.</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Back</a>
    `,
  })
