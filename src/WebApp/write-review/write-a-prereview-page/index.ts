import { Match, pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintEnv, getPreprint } from '../../../preprint.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { writeReviewMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import type { PageResponse } from '../../Response/index.ts'
import { ownPreprintPage } from '../own-preprint-page.ts'
import { ensureUserIsNotAnAuthor } from '../user-is-author.ts'
import { startPage } from './write-a-prereview-page.ts'

export const writeReview = ({
  id,
  locale,
  user,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<GetPreprintEnv, PageResponse> =>
  pipe(
    getPreprint(id),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.fromNullable('no-session' as const)(user),
          RTE.chainEitherKW(ensureUserIsNotAnAuthor(preprint)),
          RTE.matchW(
            error =>
              match(error)
                .with({ type: 'is-author' }, () => ownPreprintPage(preprint.id, writeReviewMatch.formatter, locale))
                .with('no-session', () => startPage(preprint, locale, false))
                .exhaustive(),
            () => startPage(preprint, locale, true),
          ),
        ),
    ),
  )
