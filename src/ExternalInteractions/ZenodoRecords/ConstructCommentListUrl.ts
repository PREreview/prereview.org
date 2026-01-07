import { Url, UrlParams } from '@effect/platform'
import type * as Doi from 'doi-ts'
import { Effect } from 'effect'
import { Zenodo } from '../../ExternalApis/index.ts'

export const constructCommentListUrl = (prereviewDoi: Doi.Doi): Effect.Effect<URL, never, Zenodo.ZenodoApi> =>
  Effect.gen(function* () {
    const zenodoApi = yield* Zenodo.ZenodoApi
    const zenodoCommunityRecordsApiUrl = new URL('/api/communities/prereview-reviews/records', zenodoApi.origin)
    const params = UrlParams.fromInput({
      q: `related.identifier:"${prereviewDoi}" AND related.relation:"references"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-other',
      access_status: 'open',
    })
    return Url.setUrlParams(zenodoCommunityRecordsApiUrl, params)
  })
