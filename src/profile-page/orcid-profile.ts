import { flow, identity, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { maybeGetAvatar } from '../avatar.ts'
import { maybeGetCareerStage } from '../career-stage.ts'
import { isLeadFor } from '../club-details.ts'
import { maybeIsOpenForRequests } from '../is-open-for-requests.ts'
import { maybeGetLanguages } from '../languages.ts'
import { maybeGetLocation } from '../location.ts'
import { maybeGetResearchInterests } from '../research-interests.ts'
import { type SlackUser, maybeGetSlackUser } from '../slack-user.ts'
import type { ClubId } from '../types/club-id.ts'
import type { NonEmptyString } from '../types/NonEmptyString.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { OrcidProfileId } from '../types/profile-id.ts'
import { getName } from './name.ts'
import { type Prereviews, getPrereviews } from './prereviews.ts'

export interface OrcidProfile {
  type: 'orcid'
  name?: NonEmptyString
  orcid: OrcidId
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
    RTE.apSW('name', getName(profileId.orcid)),
    RTE.apSW('careerStage', maybeGetPublicCareerStage(profileId.orcid)),
    RTE.apSW('researchInterests', maybeGetPublicResearchInterests(profileId.orcid)),
    RTE.apSW('location', maybeGetPublicLocation(profileId.orcid)),
    RTE.apSW('languages', maybeGetPublicLanguages(profileId.orcid)),
    RTE.apSW('avatar', maybeGetAvatar(profileId.orcid)),
    RTE.let('orcid', () => profileId.orcid),
    RTE.let('clubs', () => isLeadFor(profileId.orcid)),
    RTE.apSW('slackUser', maybeGetSlackUser(profileId.orcid)),
    RTE.apSW('isOpenForRequests', maybeIsPublicallyOpenForRequests(profileId.orcid)),
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
