import { Url, UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import { Zenodo } from '../../ExternalApis/index.ts'
import type { PreprintId } from '../../Preprints/index.ts'
import { PublicUrl } from '../../public-url.ts'
import type { OrcidId, Pseudonym } from '../../types/index.ts'
import { toExternalIdentifier } from './legacy-zenodo.ts'

export const constructUrlsToInvalidatePrereview = ({
  prereviewId,
  user,
  preprintId,
}: {
  prereviewId: number
  preprintId: PreprintId | undefined
  user: { orcidId: OrcidId.OrcidId; pseudonym: Pseudonym.Pseudonym }
}): Effect.Effect<ReadonlyArray<URL>, never, Zenodo.ZenodoApi | PublicUrl> =>
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

const constructUrlToListOfPrereviewsByUser = (user: {
  orcidId: OrcidId.OrcidId
  pseudonym: Pseudonym.Pseudonym
}): Effect.Effect<URL, never, Zenodo.ZenodoApi | PublicUrl> =>
  Effect.gen(function* () {
    const publicUrl = yield* PublicUrl
    const zenodoApi = yield* Zenodo.ZenodoApi
    const zenodoCommunityRecordsApiUrl = new URL('/api/communities/prereview-reviews/records', zenodoApi.origin)
    const params = UrlParams.fromInput({
      q: `(metadata.related_identifiers.resource_type.id:"publication-preprint" OR (metadata.related_identifiers.resource_type.id:"dataset" AND metadata.related_identifiers.identifier:${new RegExp(`${publicUrl.origin}/reviews/.+`)})) AND (metadata.creators.person_or_org.identifiers.identifier:${user.orcidId} metadata.creators.person_or_org.name:"${user.pseudonym}")`,
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
      q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND related.identifier:"${toExternalIdentifier(preprintId).identifier}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    })
    return Url.setUrlParams(zenodoCommunityRecordsApiUrl, params)
  })
