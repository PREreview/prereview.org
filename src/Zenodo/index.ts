import { type HttpClient, UrlParams } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Effect, pipe } from 'effect'
import type * as ReviewPage from '../review-page/index.js'
import { addCommentText } from './AddCommentText.js'
import { getCommunityRecords } from './CommunityRecords.js'
import { transformRecordToCommentWithoutText } from './TransformRecordToCommentWithoutText.js'

export const getCommentsForPrereviewFromZenodo = (
  id: Doi.Doi,
): Effect.Effect<ReadonlyArray<ReviewPage.Comment>, 'unavailable', HttpClient.HttpClient> =>
  pipe(
    UrlParams.fromInput({
      q: `related.identifier:"${id}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-other',
      access_status: 'open',
    }),
    getCommunityRecords,
    Effect.andThen(record => Effect.forEach(record.hits.hits, transformRecordToCommentWithoutText)),
    Effect.andThen(Effect.forEach(addCommentText)),
    Effect.catchTags({
      NoTextUrlAvailable: error =>
        Effect.logError('Zenodo record of a comment does not have a text url').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(Effect.fail('unavailable' as const)),
        ),
      ParseError: error =>
        Effect.logError('Failed to decode Zenodo response while retrieving a comment').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(Effect.fail('unavailable' as const)),
        ),
      RequestError: error =>
        Effect.logError('Unable to retrieve comment text from Zenodo').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(Effect.fail('unavailable' as const)),
        ),
      ResponseError: error =>
        Effect.logError('Unable to retrieve comment text from Zenodo').pipe(
          Effect.annotateLogs({ error }),
          Effect.andThen(Effect.fail('unavailable' as const)),
        ),
    }),
  )
