import { Url, UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import { Zenodo } from '../../ExternalApis/index.ts'
import type { PreprintId } from '../../Preprints/index.ts'
import type { User } from '../../user.ts'
import { toExternalIdentifier } from '../../zenodo.ts'

export const constructUrlsToInvalidatePrereview = ({
  prereviewId,
  user,
  preprintId,
}: {
  prereviewId: number
  preprintId: PreprintId | undefined
  user: User
}): Effect.Effect<ReadonlyArray<URL>, never, Zenodo.ZenodoApi> =>
  Effect.all(
    [
      constructUrlToRecord(prereviewId),
      constructUrlToListOfPrereviewsByUser(user),
      ...(preprintId ? [constructUrlToListOfPrereviewsForPreprint(preprintId)] : []),
    ],
    {
      concurrency: 'unbounded',
    },
  )

const constructUrlToRecord = (prereviewId: number): Effect.Effect<URL, never, Zenodo.ZenodoApi> =>
  Effect.gen(function* () {
    const zenodoApi = yield* Zenodo.ZenodoApi

    return new URL(`/api/records/${prereviewId}`, zenodoApi.origin)
  })

const constructUrlToListOfPrereviewsByUser = (user: User): Effect.Effect<URL, never, Zenodo.ZenodoApi> =>
  Effect.gen(function* () {
    const zenodoApi = yield* Zenodo.ZenodoApi
    const zenodoCommunityRecordsApiUrl = new URL('/api/communities/prereview-reviews/records', zenodoApi.origin)
    const params = UrlParams.fromInput({
      q: `metadata.creators.person_or_org.identifiers.identifier:${user.orcid} metadata.creators.person_or_org.name:"${user.pseudonym}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    })
    return Url.setUrlParams(zenodoCommunityRecordsApiUrl, params)
  })

const constructUrlToListOfPrereviewsForPreprint = (
  preprintId: PreprintId,
): Effect.Effect<URL, never, Zenodo.ZenodoApi> =>
  Effect.gen(function* () {
    const zenodoApi = yield* Zenodo.ZenodoApi
    const zenodoCommunityRecordsApiUrl = new URL('/api/communities/prereview-reviews/records', zenodoApi.origin)
    const params = UrlParams.fromInput({
      q: `related.identifier:"${toExternalIdentifier(preprintId).identifier}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    })
    return Url.setUrlParams(zenodoCommunityRecordsApiUrl, params)
  })
