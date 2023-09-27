import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { getCareerStage } from '../career-stage'
import { isLeadFor } from '../club-details'
import type { ClubId } from '../club-id'
import { isOpenForRequests } from '../is-open-for-requests'
import type { OrcidProfileId } from '../profile-id'
import { getResearchInterests } from '../research-interests'
import { type SlackUser, maybeGetSlackUser } from '../slack-user'
import type { NonEmptyString } from '../string'
import { maybeGetAvatar } from './avatar'
import { getName } from './name'
import { type Prereviews, getPrereviews } from './prereviews'

export interface OrcidProfile {
  type: 'orcid'
  name: NonEmptyString
  orcid: Orcid
  slackUser: SlackUser | undefined
  careerStage: 'early' | 'mid' | 'late' | undefined
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
    RTE.apSW('careerStage', maybeGetPublicCareerStage(profileId.value)),
    RTE.apSW('researchInterests', maybeGetPublicResearchInterests(profileId.value)),
    RTE.apSW('avatar', maybeGetAvatar(profileId.value)),
    RTE.let('orcid', () => profileId.value),
    RTE.let('clubs', () => isLeadFor(profileId.value)),
    RTE.apSW('slackUser', maybeGetSlackUser(profileId.value)),
    RTE.apSW('isOpenForRequests', maybeIsOpenForRequests(profileId.value)),
  ) satisfies RTE.ReaderTaskEither<any, any, OrcidProfile> // eslint-disable-line @typescript-eslint/no-explicit-any
}

const maybeGetPublicCareerStage = flow(
  getCareerStage,
  RTE.map(careerStage =>
    match(careerStage)
      .with({ visibility: 'public', value: P.select() }, identity)
      .with({ visibility: 'restricted' }, () => undefined)
      .exhaustive(),
  ),
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.of(undefined))
      .otherwise(RTE.left),
  ),
)

const maybeGetPublicResearchInterests = flow(
  getResearchInterests,
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
)

const maybeIsOpenForRequests = flow(
  isOpenForRequests,
  RTE.map(openForRequests =>
    match(openForRequests)
      .with({ visibility: 'public', value: true }, () => true)
      .with({ visibility: 'restricted' }, { value: false }, () => false)
      .exhaustive(),
  ),
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.of(false))
      .otherwise(RTE.left),
  ),
)
