import { format } from 'fp-ts-routing'
import * as R from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { toUrl } from '../public-url'
import { preprintReviewsMatch, reviewMatch, writeReviewMatch } from '../routes'
import { type User, getUser } from '../user'
import { type PublishedReview, getPublishedReview, removePublishedReview } from './published-review'

export const writeReviewPublished = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', getUser),
      RM.apSW('review', getPublishedReview),
      RM.ichainW(showSuccessMessage),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-session',
            'no-published-review',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with(P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showSuccessMessage = flow(
  RM.fromReaderK(successMessage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirstW(() => removePublishedReview),
  RM.ichainMiddlewareKW(sendHtml),
)

function successMessage({
  review: { doi, form, id },
  preprint,
  user,
}: {
  review: PublishedReview
  preprint: PreprintTitle
  user: User
}) {
  return pipe(
    toUrl(reviewMatch.formatter, { id }),
    R.chainW(url =>
      page({
        title: plainText`PREreview published`,
        content: html`
          <main id="main-content">
            <div class="panel">
              <h1>PREreview published</h1>

              <div>
                Your DOI <br />
                <strong class="doi" translate="no">${doi}</strong>
              </div>
            </div>

            <h2>What happens next</h2>

            <p>You’ll be able to see your PREreview shortly.</p>

            ${form.moreAuthors === 'yes'
              ? html`
                  <div class="inset">
                    <p>
                      Please let us know the other authors’ details (names and ORCID&nbsp;iDs), and we’ll add them to
                      the PREreview. Our email address is
                      <a href="mailto:help@prereview.org" target="_blank" rel="noopener noreferrer"
                        >help@prereview.org<span class="visually-hidden"> (opens in a new tab)</span></a
                      >.
                    </p>
                  </div>
                `
              : ''}

            <h2>Share your review</h2>

            <p>Let the community know that you published your review.</p>

            <div class="button-group" role="group">
              <a
                href="https://twitter.com/intent/tweet/?${new URLSearchParams({
                  text: plainText`I’ve just published a review of “${preprint.title}”`.toString(),
                  hashtags: 'PreprintReview',
                  via: 'PREreview_',
                  url: url.href,
                }).toString()}"
                target="_blank"
                rel="noopener noreferrer"
                class="twitter"
                >Write a Tweet<span class="visually-hidden"> (opens in a new tab)</span></a
              >
              <a
                href="https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({
                  url: url.href,
                }).toString()}"
                target="_blank"
                rel="noopener noreferrer"
                class="linked-in"
                >Share it on LinkedIn<span class="visually-hidden"> (opens in a new tab)</span></a
              >
            </div>

            <h2>Let us know how it went</h2>

            <p>
              <a
                href="https://calendar.google.com/calendar/u/0/selfsched?sstoken=UUw4R0F6MVo1ZWhyfGRlZmF1bHR8ZGM2YTU1OTNhYzNhY2RiN2YzNTBlYTdmZTBmMzNmNDA"
                target="_blank"
                rel="noopener noreferrer"
                >Schedule an interview<span class="visually-hidden"> (opens in a new tab)</span></a
              >
              with our product team to discuss your experience on PREreview. We gladly compensate interviewees in
              appreciation for their help!
            </p>

            <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="button">Back to preprint</a>
          </main>
        `,
        skipLinks: [[html`Skip to main content`, '#main-content']],
        type: 'streamline',
        user,
      }),
    ),
  )
}
