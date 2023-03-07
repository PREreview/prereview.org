import { format } from 'fp-ts-routing'
import { Reader } from 'fp-ts/Reader'
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
import { preprintMatch, writeReviewMatch } from '../routes'
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
  RM.ichainFirstW(() =>
    pipe(
      endSession(),
      RM.orElseW(() => RM.right(undefined)),
    ),
  ),
  RM.ichainMiddlewareKW(sendHtml),
)

function successMessage({ review: { doi, form }, preprint }: { review: PublishedReview; preprint: Preprint }) {
  return page({
    title: plainText`PREreview published`,
    content: html`
      <main id="main-content">
        <div class="panel">
          <h1>PREreview published</h1>

          <p>
            Your DOI <br />
            <strong class="doi" translate="no">${doi}</strong>
          </p>
        </div>

        <h2>What happens next</h2>

        <p>You’ll be able to see your PREreview shortly.</p>

        ${form.moreAuthors === 'yes'
          ? html`
              <div class="inset">
                <p>
                  Please let us know the other authors’ details (names and ORCID&nbsp;iDs), and we’ll add them to the
                  PREreview. Our email address is <a href="mailto:help@prereview.org">help@prereview.org</a>.
                </p>
              </div>
            `
          : ''}

        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="button">Back to preprint</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
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
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
