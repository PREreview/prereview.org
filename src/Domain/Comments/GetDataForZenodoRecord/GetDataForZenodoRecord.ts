import { Context, Effect, pipe, Scope } from 'effect'
import type { LanguageDetection } from '../../../ExternalInteractions/index.ts'
import type { PublicUrl } from '../../../public-url.ts'
import type { Uuid } from '../../../types/index.ts'
import { type EventStore, Queries } from '../../Events/index.ts'
import type { PreprintReviews } from '../../PreprintReviews/index.ts'
import type { Prereviewers } from '../../Prereviewers/index.ts'
import type * as Errors from '../Errors.ts'
import { Enrich } from './Enrich.ts'
import { Query } from './Query.ts'
import { type DataForZenodoRecord, DataForZenodoRecordIsUnavailable } from './Types.ts'

export type GetDataForZenodoRecord = (
  commentId: Uuid.Uuid,
) => Effect.Effect<
  DataForZenodoRecord,
  | Errors.CommentHasNotBeenStarted
  | Errors.CommentIsIncomplete
  | Errors.CommentWasAlreadyPublished
  | Errors.CommentHasBeenWithdrawn
  | DataForZenodoRecordIsUnavailable
>

export const GetDataForZenodoRecord: Effect.Effect<
  GetDataForZenodoRecord,
  never,
  EventStore.EventStore | LanguageDetection.LanguageDetection | PreprintReviews | Prereviewers | PublicUrl
> = Effect.gen(function* () {
  const context = yield* Effect.map(
    Effect.context<LanguageDetection.LanguageDetection | PreprintReviews | Prereviewers | PublicUrl>(),
    Context.omit(Scope.Scope),
  )

  const query = yield* Queries.makeOnDemandQuery(Query)

  return (commentId: Uuid.Uuid) =>
    pipe(
      query(commentId),
      Effect.andThen(Enrich),
      Effect.catchTag(
        ['UnableToQuery', 'UnableToGetPersona', 'PrereviewIsNotFound', 'PrereviewIsUnavailable', 'PrereviewWasRemoved'],
        error => new DataForZenodoRecordIsUnavailable({ cause: error }),
      ),
      Effect.provideContext(context),
      Effect.withSpan('Comments.getDataForZenodoRecord', { attributes: { commentId } }),
    )
})
