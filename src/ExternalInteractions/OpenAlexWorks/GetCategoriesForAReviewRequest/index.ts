import { Array, Data, Effect, Match, Option, pipe, Schema } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import { detectLanguage } from '../../../detect-language.ts'
import { OpenAlex } from '../../../ExternalApis/index.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import { KeywordIdFromOpenAlexUrlSchema, type KeywordId } from '../../../types/Keyword.ts'
import { TopicIdFromOpenAlexUrlSchema, type TopicId } from '../../../types/Topic.ts'

export interface CategoriesForAReviewRequest {
  readonly language: Option.Option<LanguageCode>
  readonly topics: ReadonlyArray<TopicId>
  readonly keywords: ReadonlyArray<KeywordId>
}

export class CategoriesAreNotAvailable extends Data.TaggedError('CategoriesAreNotAvailable')<{
  cause?: unknown
}> {}

export const GetCategoriesForAReviewRequest = (preprintId: Preprints.IndeterminatePreprintId) =>
  pipe(
    Match.value(preprintId),
    Match.tag('PhilsciPreprintId', () => Effect.fail('no DOI available')),
    Match.orElse(preprintId => OpenAlex.getWork(preprintId.value)),
    Effect.andThen(
      work =>
        ({
          language: Option.orElse(Option.fromNullable(work.language), () => detectLanguage(work.title)),
          topics: Array.filterMap(work.topics, ({ id }) => Schema.decodeOption(TopicIdFromOpenAlexUrlSchema)(id)),
          keywords: Array.filterMap(work.keywords, ({ id }) => Schema.decodeOption(KeywordIdFromOpenAlexUrlSchema)(id)),
        }) satisfies CategoriesForAReviewRequest,
    ),
    Effect.catchAll(error => new CategoriesAreNotAvailable({ cause: error })),
  )
