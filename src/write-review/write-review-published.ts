import { format } from 'fp-ts-routing'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import { endSession, getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { toUrl } from '../public-url'
import { preprintMatch, reviewMatch, writeReviewMatch } from '../routes'
import { getUserFromSession } from '../user'
import { Preprint, getPreprint } from './preprint'
import { PublishedReview, getPublishedReviewFromSession } from './published-review'

export const writeReviewPublished = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('session', getSession()),
      RM.bindW(
        'user',
        RM.fromReaderTaskEitherK(
          RTE.fromOptionK(() => 'no-session' as const)(({ session }) => getUserFromSession(session)),
        ),
      ),
      RM.bindW(
        'review',
        RM.fromReaderTaskEitherK(
          RTE.fromOptionK(() => 'no-published-review' as const)(({ session }) =>
            getPublishedReviewFromSession(session),
          ),
        ),
      ),
      RM.ichainW(showSuccessMessage),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-session',
            'no-published-review',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
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
  fromReaderK(successMessage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirstW(() => pipe(endSession())),
  RM.ichainMiddlewareKW(sendHtml),
)
function successMessage({ review: { doi, form, id }, preprint }: { review: PublishedReview; preprint: Preprint }) {
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

            <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="button">Back to preprint</a>
          </main>
        `,
        skipLinks: [[html`Skip to main content`, '#main-content']],
      }),
    ),
  )
}

// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => R.Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
