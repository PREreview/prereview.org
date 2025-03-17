import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { P, match } from 'ts-pattern'
import { sendHtml } from '../../html.js'
import type { SupportedLocale } from '../../locales/index.js'
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
      RM.apSW(
        'locale',
        RM.asks((env: { locale: SupportedLocale }) => env.locale),
      ),
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
      .with({ _tag: 'PreprintIsNotFound' }, () => notFound)
      .with({ _tag: 'PreprintIsUnavailable' }, () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showSuccessMessage = ({
  review,
  preprint,
  user,
  locale,
}: {
  review: PublishedReview
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RM.of({ review, preprint, user, locale }),
    RM.apS('url', RM.rightReader(toUrl(reviewMatch.formatter, { id: review.id }))),
    RM.chainReaderKW(publishedPage),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirstW(() => removePublishedReview),
    RM.ichainMiddlewareKW(sendHtml),
  )
