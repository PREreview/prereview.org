import { Url, UrlParams } from 'effect/http'
import { Effect } from 'effect'
import { Zenodo } from '../../ExternalApis/index.ts'
import type { Doi } from '../../types/index.ts'

export const constructCommentListUrl = Effect.fnUntraced(function* (
  prereviewDoi: Doi.Doi,
): Effect.fn.Return<URL, never, Zenodo.ZenodoApi> {
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
