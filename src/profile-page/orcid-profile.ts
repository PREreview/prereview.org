import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { isLeadFor } from '../club-details'
import type { ClubId } from '../club-id'
import type { OrcidProfileId } from '../profile-id'
import { getResearchInterests } from '../research-interests'
import { type SlackUser, getSlackUser } from '../slack-user'
import type { NonEmptyString } from '../string'
import { getAvatar } from './avatar'
import { getName } from './name'
import { type Prereviews, getPrereviews } from './prereviews'

export interface OrcidProfile {
  type: 'orcid'
  name: NonEmptyString
  orcid: Orcid
  slackUser: SlackUser | undefined
  researchInterests: NonEmptyString | undefined
  clubs: ReadonlyArray<ClubId>
  avatar: URL | undefined
  isOpenForRequests: boolean
  prereviews: Prereviews
}

export function getOrcidProfile(profileId: OrcidProfileId) {
  return pipe(
    RTE.Do,
    RTE.let('type', () => 'orcid' as const),
    RTE.apS('prereviews', getPrereviews(profileId)),
    RTE.apSW('name', getName(profileId.value)),
    RTE.apSW(
      'researchInterests',
      pipe(
        getResearchInterests(profileId.value),
        RTE.map(researchInterests =>
          match(researchInterests)
            .with({ visibility: 'public', value: P.select() }, identity)
            .with({ visibility: 'restricted' }, () => undefined)
            .exhaustive(),
        ),
        RTE.orElseW(error =>
          match(error)
            .with('not-found', () => RTE.of(undefined))
            .otherwise(RTE.left),
        ),
      ),
    ),
    RTE.apSW(
      'avatar',
      pipe(
        getAvatar(profileId.value),
        RTE.orElseW(error =>
          match(error)
            .with('not-found', () => RTE.right(undefined))
            .with('unavailable', RTE.left)
            .exhaustive(),
        ),
      ),
    ),
    RTE.let('orcid', () => profileId.value),
    RTE.let('clubs', () => isLeadFor(profileId.value)),
    RTE.apSW(
      'slackUser',
      pipe(
        getSlackUser(profileId.value),
        RTE.orElseW(error =>
          match(error)
            .with('not-found', () => RTE.right(undefined))
            .with('unavailable', RTE.left)
            .exhaustive(),
        ),
      ),
    ),
    RTE.let('isOpenForRequests', () => profileId.value === '0000-0003-4921-6155'),
  ) satisfies RTE.ReaderTaskEither<any, any, OrcidProfile> // eslint-disable-line @typescript-eslint/no-explicit-any
}
