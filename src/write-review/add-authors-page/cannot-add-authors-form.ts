import { format } from 'fp-ts-routing'
import { html, plainText } from '../../html'
import type { PreprintTitle } from '../../preprint'
import { StreamlinePageResponse } from '../../response'
import { writeReviewAddAuthorsMatch, writeReviewAuthorsMatch } from '../../routes'

export function cannotAddAuthorsForm({ preprint }: { preprint: PreprintTitle }) {
  return StreamlinePageResponse({
    title: plainText`Add more authors – PREreview of “${preprint.title}”`,
    nav: html`<a href="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
        <h1>Add more authors</h1>

        <p>Unfortunately, we’re unable to add more authors now.</p>

        <p>
          Please email us at <a href="mailto:help@prereview.org">help@prereview.org</a> to let us know their details,
          and we’ll add them on your behalf.
        </p>

        <p>We’ll remind you to do this once you have published your PREreview.</p>

        <button>Continue</button>
      </form>
    `,
    canonical: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
  })
}
