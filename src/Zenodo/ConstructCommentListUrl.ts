import { Url, UrlParams } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Effect } from 'effect'
import { ZenodoOrigin } from './CommunityRecords.js'

export const constructCommentListUrl = (prereviewDoi: Doi.Doi): Effect.Effect<URL, never, ZenodoOrigin> =>
  Effect.gen(function* () {
    const zenodoOrigin = yield* ZenodoOrigin
    const zenodoCommunityRecordsApiUrl = new URL('/api/communities/prereview-reviews/records', zenodoOrigin)
    const params = UrlParams.fromInput({
      q: `related.identifier:"${prereviewDoi}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-other',
      access_status: 'open',
    })
    return Url.setUrlParams(zenodoCommunityRecordsApiUrl, params)
  })
