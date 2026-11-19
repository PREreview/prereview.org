import { Array, Effect, pipe } from 'effect'
import { OpenAlex } from '../../../ExternalApis/index.ts'
import type { Doi } from '../../../types/index.ts'
import type { TopicId } from '../../../types/Topic.ts'
import { TopicsFromWork } from './TopicsFromWork.ts'

export const GetTopics = (
  doi: Doi.Doi,
): Effect.Effect<ReadonlyArray<TopicId>, OpenAlex.WorkIsNotFound | OpenAlex.WorkIsUnavailable, OpenAlex.OpenAlex> =>
  pipe(
    OpenAlex.getWork(doi),
    Effect.timeout('2 seconds'),
    Effect.map(TopicsFromWork),
    Effect.andThen(
      Effect.fnUntraced(function* (maybeTopics) {
        const topics = Array.getSomes(maybeTopics)

        if (maybeTopics.length > topics.length) {
          yield* Effect.logError('Unable to decode some topics for a DOI').pipe(Effect.annotateLogs({ doi }))
        }

        return topics
      }),
    ),
    Effect.catchTag('TimeoutError', error => new OpenAlex.WorkIsUnavailable({ cause: error })),
    Effect.withSpan('OpenAlexWorks.getTopics', { attributes: { doi } }),
  )
