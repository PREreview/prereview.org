import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import { mustDeclareUseOfAi, type MustDeclareUseOfAiEnv } from '../../feature-flags.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { getPreprintTitle, type GetPreprintTitleEnv } from '../../preprint.js'
import { type PageResponse, RedirectResponse } from '../../response.js'
import { writeReviewMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'

export const writeReviewUseOfAi = ({
  id,
  user,
}: {
  id: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<GetPreprintTitleEnv & MustDeclareUseOfAiEnv, PageResponse | RedirectResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound)
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.apSW(
            'mustDeclareUseOfAi',
            pipe(
              RTE.fromReader(mustDeclareUseOfAi),
              RTE.filterOrElse(
                mustDeclareUseOfAi => mustDeclareUseOfAi,
                () => 'not-found' as const,
              ),
            ),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with('no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('not-found', () => pageNotFound)
                .exhaustive(),
            () => havingProblemsPage,
          ),
        ),
    ),
  )
