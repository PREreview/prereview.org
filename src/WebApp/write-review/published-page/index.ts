import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as R from 'fp-ts/lib/Reader.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { SupportedLocale } from '../../../locales/index.ts'
import {
  getPreprintTitle,
  type IndeterminatePreprintId,
  type Preprints,
  type PreprintTitle,
} from '../../../Preprints/index.ts'
import { toUrl, type PublicUrlEnv } from '../../../public-url.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import { reviewMatch, writeReviewMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import type { PopFromSessionEnv } from '../../session.ts'
import { popPublishedReview, type PublishedReview } from '../published-review.ts'
import { publishedPage } from './published-page.ts'

export const writeReviewPublished = ({
  id,
  locale,
  user,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<EffectToFpts.EffectEnv<Preprints> & PopFromSessionEnv & PublicUrlEnv, Response> =>
  pipe(
    EffectToFpts.toReaderTaskEither(getPreprintTitle(id)),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('preprint', () => preprint),
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.let('locale', () => locale),
          RTE.bindW('review', () => popPublishedReview),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-published-review', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .exhaustive(),
              ),
            RT.fromReaderK(showSuccessMessage),
          ),
        ),
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
    R.of({ review, preprint, user, locale }),
    R.apS('url', toUrl(reviewMatch.formatter, { id: review.id })),
    R.map(publishedPage),
  )
