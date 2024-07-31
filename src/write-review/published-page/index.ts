import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { P, match } from 'ts-pattern'
import { sendHtml } from '../../html.js'
import { notFound, seeOther, serviceUnavailable } from '../../middleware.js'
import { type PreprintTitle, getPreprintTitle } from '../../preprint.js'
import { toUrl } from '../../public-url.js'
import { reviewMatch, writeReviewMatch } from '../../routes.js'
import { type User, getUser } from '../../user.js'
import { type PublishedReview, getPublishedReview, removePublishedReview } from '../published-review.js'
import { publishedPage } from './published-page.js'

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

const showSuccessMessage = ({
  review,
  preprint,
  user,
}: {
  review: PublishedReview
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.of({ review, preprint, user }),
    RM.apS('url', RM.rightReader(toUrl(reviewMatch.formatter, { id: review.id }))),
    RM.chainReaderKW(publishedPage),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirstW(() => removePublishedReview),
    RM.ichainMiddlewareKW(sendHtml),
  )
