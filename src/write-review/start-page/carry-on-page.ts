import { format } from 'fp-ts-routing'
import { getLangDir } from 'rtl-detect'
import { html, plainText } from '../../html.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import { preprintReviewsMatch, writeReviewStartMatch } from '../../routes.js'
import { type Form, nextFormMatch } from '../form.js'

export const carryOnPage = (preprint: PreprintTitle, form: Form) =>
  StreamlinePageResponse({
    title: plainText`Write a PREreview`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
    `,
    main: html`
      <h1>Write a PREreview</h1>

      <p>
        As you’ve already started a PREreview of
        <cite lang="${preprint.language}" dir="${getLangDir(preprint.language)}">${preprint.title}</cite>, we’ll take
        you to the next step so you can carry&nbsp;on.
      </p>

      <a href="${format(nextFormMatch(form).formatter, { id: preprint.id })}" role="button" draggable="false"
        >Continue</a
      >
    `,
    canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
  })
