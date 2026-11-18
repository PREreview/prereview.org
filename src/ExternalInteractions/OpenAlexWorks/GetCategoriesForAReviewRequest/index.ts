import { Array, Data, Effect, Filter, Match, pipe, Schema } from 'effect'
import type * as Preprints from '../../../Domain/Preprints/index.ts'
import { OpenAlex } from '../../../ExternalApis/index.ts'
import { TopicIdFromOpenAlexUrlSchema, type TopicId } from '../../../types/Topic.ts'

export interface CategoriesForAReviewRequest {
  readonly topics: ReadonlyArray<TopicId>
}

export class CategoriesAreNotAvailable extends Data.TaggedError('CategoriesAreNotAvailable')<{
  cause?: unknown
}> {}

export const GetCategoriesForAReviewRequest = (preprintId: Preprints.IndeterminatePreprintId) =>
  pipe(
    Match.value(preprintId),
    Match.tag('PhilsciPreprintId', () => Effect.fail('no DOI available')),
    Match.orElse(preprintId => OpenAlex.getWork(preprintId.value)),
    Effect.map(
      work =>
        ({
          topics: Array.filterMap(
            work.topics,
            Filter.fromPredicateOption(({ id }) => Schema.decodeOption(TopicIdFromOpenAlexUrlSchema)(id)),
          ),
        }) satisfies CategoriesForAReviewRequest,
    ),
    Effect.catch(error => new CategoriesAreNotAvailable({ cause: error })),
    Effect.withSpan('OpenAlexWorks.getCategoriesForAReviewRequest', { attributes: { preprintId } }),
  )
