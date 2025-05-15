import { Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { P, match } from 'ts-pattern'
import type { SupportedLocale } from '../../locales/index.js'
import { notFound, seeOther, serviceUnavailable } from '../../middleware.js'
import { type PreprintTitle, getPreprintTitle } from '../../preprint.js'
import { toUrl } from '../../public-url.js'
import { handlePageResponse } from '../../response.js'
import { reviewMatch, writeReviewMatch } from '../../routes.js'
import { type User, getUser } from '../../user.js'
import { type PublishedReview, popPublishedReview } from '../published-review.js'
import { publishedPage } from './published-page.js'

export const writeReviewPublished = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', getUser),
      RM.bindW('review', () => RM.fromReaderTaskEither(popPublishedReview)),
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
  RM.orElseW(
    Match.valueTags({
      PreprintIsNotFound: () => notFound,
      PreprintIsUnavailable: () => serviceUnavailable,
    }),
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
    RM.bind('response', args => RM.of(publishedPage(args))),
    RM.ichainW(handlePageResponse),
  )
