import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { maybeGetAvatar } from '../avatar'
import { maybeGetCareerStage } from '../career-stage'
import { isLeadFor } from '../club-details'
import { maybeIsOpenForRequests } from '../is-open-for-requests'
import { maybeGetLanguages } from '../languages'
import { maybeGetLocation } from '../location'
import { maybeGetResearchInterests } from '../research-interests'
import { type SlackUser, maybeGetSlackUser } from '../slack-user'
import type { ClubId } from '../types/club-id'
import type { OrcidProfileId } from '../types/profile-id'
import type { NonEmptyString } from '../types/string'
import { getName } from './name'
import { type Prereviews, getPrereviews } from './prereviews'

export interface OrcidProfile {
  type: 'orcid'
  name?: NonEmptyString
  orcid: Orcid
  slackUser: SlackUser | undefined
  careerStage: 'early' | 'mid' | 'late' | undefined
  researchInterests: NonEmptyString | undefined
  location: NonEmptyString | undefined
  languages: NonEmptyString | undefined
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
    RTE.apSW('location', maybeGetPublicLocation(profileId.value)),
    RTE.apSW('languages', maybeGetPublicLanguages(profileId.value)),
    RTE.apSW('avatar', maybeGetAvatar(profileId.value)),
    RTE.let('orcid', () => profileId.value),
    RTE.let('clubs', () => isLeadFor(profileId.value)),
    RTE.apSW('slackUser', maybeGetSlackUser(profileId.value)),
    RTE.apSW('isOpenForRequests', maybeIsPublicallyOpenForRequests(profileId.value)),
  ) satisfies RTE.ReaderTaskEither<any, any, OrcidProfile> // eslint-disable-line @typescript-eslint/no-explicit-any
}

const maybeGetPublicCareerStage = flow(
  maybeGetCareerStage,
  RTE.map(careerStage =>
    match(careerStage)
      .with({ visibility: 'public', value: P.select() }, identity)
      .with({ visibility: 'restricted' }, undefined, () => undefined)
      .exhaustive(),
  ),
)

const maybeGetPublicLanguages = flow(
  maybeGetLanguages,
  RTE.map(languages =>
    match(languages)
      .with({ visibility: 'public', value: P.select() }, identity)
      .with({ visibility: 'restricted' }, undefined, () => undefined)
      .exhaustive(),
  ),
)

const maybeGetPublicLocation = flow(
  maybeGetLocation,
  RTE.map(location =>
    match(location)
      .with({ visibility: 'public', value: P.select() }, identity)
      .with({ visibility: 'restricted' }, undefined, () => undefined)
      .exhaustive(),
  ),
)

const maybeGetPublicResearchInterests = flow(
  maybeGetResearchInterests,
  RTE.map(researchInterests =>
    match(researchInterests)
      .with({ visibility: 'public', value: P.select() }, identity)
      .with({ visibility: 'restricted' }, undefined, () => undefined)
      .exhaustive(),
  ),
)

const maybeIsPublicallyOpenForRequests = flow(
  maybeIsOpenForRequests,
  RTE.map(openForRequests =>
    match(openForRequests)
      .with({ visibility: 'public', value: true }, () => true)
      .with({ visibility: 'restricted' }, { value: false }, undefined, () => false)
      .exhaustive(),
  ),
)
