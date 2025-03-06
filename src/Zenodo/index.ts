import { type HttpClient, UrlParams } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Effect, pipe } from 'effect'
import type * as ReviewPage from '../review-page/index.js'
import { getCommunityRecords } from './CommunityRecords.js'
import { transformRecordToCommentWithoutText } from './TransformRecordToComment.js'

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
    Effect.orElseFail(() => 'unavailable' as const),
    Effect.andThen(record => Effect.forEach(record.hits.hits, transformRecordToCommentWithoutText)),
    Effect.andThen(() => Effect.fail('unavailable' as const)),
  )
