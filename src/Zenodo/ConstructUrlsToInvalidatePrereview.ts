import { Url, UrlParams } from '@effect/platform'
import { Effect } from 'effect'
import type { PreprintId } from '../types/preprint-id.js'
import type { User } from '../user.js'
import { toExternalIdentifier } from '../zenodo.js'
import { ZenodoOrigin } from './CommunityRecords.js'

export const constructUrlsToInvalidatePrereview = ({
  prereviewId,
  user,
  preprintId,
}: {
  prereviewId: number
  preprintId: PreprintId | undefined
  user: User
}): Effect.Effect<ReadonlyArray<URL>, never, ZenodoOrigin> =>
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

const constructUrlToRecord = (prereviewId: number): Effect.Effect<URL, never, ZenodoOrigin> =>
  Effect.gen(function* () {
    const zenodoOrigin = yield* ZenodoOrigin

    return new URL(`/api/records/${prereviewId}`, zenodoOrigin)
  })

const constructUrlToListOfPrereviewsByUser = (user: User): Effect.Effect<URL, never, ZenodoOrigin> =>
  Effect.gen(function* () {
    const zenodoOrigin = yield* ZenodoOrigin
    const zenodoCommunityRecordsApiUrl = new URL('/api/communities/prereview-reviews/records', zenodoOrigin)
    const params = UrlParams.fromInput({
      q: `metadata.creators.person_or_org.identifiers.identifier:${user.orcid} metadata.creators.person_or_org.name:"${user.pseudonym}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    })
    return Url.setUrlParams(zenodoCommunityRecordsApiUrl, params)
  })

const constructUrlToListOfPrereviewsForPreprint = (preprintId: PreprintId): Effect.Effect<URL, never, ZenodoOrigin> =>
  Effect.gen(function* () {
    const zenodoOrigin = yield* ZenodoOrigin
    const zenodoCommunityRecordsApiUrl = new URL('/api/communities/prereview-reviews/records', zenodoOrigin)
    const params = UrlParams.fromInput({
      q: `related.identifier:"${toExternalIdentifier(preprintId).identifier}"`,
      size: '100',
      sort: 'publication-desc',
      resource_type: 'publication::publication-peerreview',
      access_status: 'open',
    })
    return Url.setUrlParams(zenodoCommunityRecordsApiUrl, params)
  })
