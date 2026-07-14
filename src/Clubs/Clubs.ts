import { Array, Context, Effect, Layer } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { Temporal } from '../types/index.ts'
import type { Name } from '../types/Name.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Slug } from '../types/Slug.ts'
import { Uuid } from '../types/Uuid.ts'
import { getClubByName, getClubBySlug, getClubDetails, isAClubLead, isLeadFor } from './ClubDetails.ts'
import { ClubIdSchema, isClubId } from './ClubId.ts'
import { ClubNotFound } from './Errors.ts'

export interface ClubDetails {
  readonly id: Uuid
  readonly name: {
    readonly language: LanguageCode
    readonly text: Name
  }
  readonly formerNames?: Array.NonEmptyReadonlyArray<Name>
  readonly slug: Slug
  readonly description: {
    readonly language: LanguageCode
    readonly text: Html
  }
  readonly added: Temporal.PlainDate
  readonly leads: Array.NonEmptyReadonlyArray<OrcidId>
  readonly contact?: EmailAddress
  readonly joinLink?: URL
}

export interface ClubName {
  readonly id: Uuid
  readonly language: LanguageCode
  readonly name: Name
}

export class Clubs extends Context.Tag('Clubs')<
  Clubs,
  {
    listClubs: Effect.Effect<ReadonlyArray<ClubName>>
    getClubDetails: (clubId: Uuid) => Effect.Effect<ClubDetails, ClubNotFound>
    getClubByName: (name: Name) => Effect.Effect<ClubName, ClubNotFound>
    getClubBySlug: (slug: Slug) => Effect.Effect<ClubName, ClubNotFound>
    prereviewerIsLeadFor: (orcidId: OrcidId) => Effect.Effect<ReadonlyArray<ClubName>>
    isPrereviewerAClubLead: (orcidId: OrcidId) => Effect.Effect<boolean>
  }
>() {}

export const layer = Layer.succeed(Clubs, {
  listClubs: Effect.succeed(
    Array.map(ClubIdSchema.literals, id => ({
      id: Uuid(id),
      language: getClubDetails(id).name.language,
      name: getClubDetails(id).name.text,
    })),
  ),
  getClubDetails: (clubId: Uuid) =>
    isClubId(clubId) ? Effect.succeed({ id: Uuid(clubId), ...getClubDetails(clubId) }) : new ClubNotFound(),
  getClubByName: (name: Name) =>
    Effect.mapBoth(getClubByName(name), {
      onSuccess: id => ({
        id: Uuid(id),
        language: getClubDetails(id).name.language,
        name: getClubDetails(id).name.text,
      }),
      onFailure: () => new ClubNotFound(),
    }),
  getClubBySlug: (slug: Slug) =>
    Effect.mapBoth(getClubBySlug(slug), {
      onSuccess: id => ({
        id: Uuid(id),
        language: getClubDetails(id).name.language,
        name: getClubDetails(id).name.text,
      }),
      onFailure: () => new ClubNotFound(),
    }),
  prereviewerIsLeadFor: (orcidId: OrcidId) =>
    Effect.succeed(
      Array.map(isLeadFor(orcidId), id => ({
        id: Uuid(id),
        language: getClubDetails(id).name.language,
        name: getClubDetails(id).name.text,
      })),
    ),
  isPrereviewerAClubLead: (orcidId: OrcidId) => Effect.succeed(isAClubLead(orcidId)),
})
