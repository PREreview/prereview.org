import { Context, Effect, pipe, Scope } from 'effect'
import type { StatefulQueries } from '../../../EventSourcing/index.ts'
import type { LanguageDetection } from '../../../ExternalInteractions/index.ts'
import { Queries } from '../../Events/index.ts'
import type { Prereviewers } from '../../Prereviewers/index.ts'
import { Enrich } from './Enrich.ts'
import { ListPublishedComments } from './ListPublishedComments.ts'
import { CommentsAreUnavailable, type PublishedCommentWithAuthor } from './Types.ts'

export type GetPublishedCommentsForAPrereview = (
  prereviewId: number,
) => Effect.Effect<ReadonlyArray<PublishedCommentWithAuthor>, CommentsAreUnavailable>

export const GetPublishedCommentsForAPrereview: Effect.Effect<
  GetPublishedCommentsForAPrereview,
  never,
  StatefulQueries.StatefulQueries | LanguageDetection.LanguageDetection | Prereviewers
> = Effect.gen(function* () {
  const context = yield* Effect.map(
    Effect.context<LanguageDetection.LanguageDetection | Prereviewers>(),
    Context.omit(Scope.Scope),
  )

  const listPublishedComments = yield* Queries.makeStatefulQuery(ListPublishedComments)

  return (prereviewId: number) =>
    pipe(
      listPublishedComments(prereviewId),
      Effect.andThen(Effect.forEach(Enrich, { concurrency: 'unbounded' })),
      Effect.catchTag(
        ['UnexpectedSequenceOfEvents', 'UnableToGetPersona', 'UnableToDetectLanguage', 'UnableToQuery'],
        error => new CommentsAreUnavailable({ cause: error }),
      ),
      Effect.provideContext(context),
      Effect.withSpan('Comments.getPublishedCommentsForAPrereview', { attributes: { prereviewId } }),
    )
})
