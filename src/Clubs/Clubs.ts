import { Array, Context, Effect, Either, flow, Layer, Record, Tuple } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { Temporal } from '../types/index.ts'
import type { Name } from '../types/Name.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Slug } from '../types/Slug.ts'
import type { Uuid } from '../types/Uuid.ts'
import { ClubNotFound } from './Errors.ts'
import { GetClubByName } from './GetClubByName.ts'
import { GetClubBySlug } from './GetClubBySlug.ts'
import { GetClubsThatAPrereviewerLeads } from './GetClubsThatAPrereviewerLeads.ts'
import { IsPrereviewerAClubLead } from './IsPrereviewerAClubLead.ts'

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
  readonly slug: Slug
}

export class Clubs extends Context.Tag('Clubs')<
  Clubs,
  {
    listClubs: Effect.Effect<ReadonlyArray<ClubName>>
    getClubDetails: (clubId: Uuid) => Effect.Effect<ClubDetails, ClubNotFound>
    getClubByName: (name: Name) => Effect.Effect<ClubName, ClubNotFound>
    getClubBySlug: (slug: Slug) => Effect.Effect<ClubDetails, ClubNotFound>
    getClubsThatAPrereviewerLeads: (orcidId: OrcidId) => Effect.Effect<ReadonlyArray<ClubName>>
    isPrereviewerAClubLead: (orcidId: OrcidId) => Effect.Effect<boolean>
  }
>() {}

export const layer = (clubs: Array.NonEmptyReadonlyArray<ClubDetails>) =>
  Layer.sync(Clubs, () => {
    const clubsById = Record.fromEntries(clubs.map(club => Tuple.make(club.id, club)))

    return {
      listClubs: Effect.succeed(
        Array.map(clubs, club => ({
          id: club.id,
          language: club.name.language,
          name: club.name.text,
          slug: club.slug,
        })),
      ),
      getClubDetails: (clubId: Uuid) => Either.fromOption(Record.get(clubsById, clubId), () => new ClubNotFound()),
      getClubByName: GetClubByName(clubs),
      getClubBySlug: GetClubBySlug(clubs),
      getClubsThatAPrereviewerLeads: flow(GetClubsThatAPrereviewerLeads(clubs), Effect.succeed),
      isPrereviewerAClubLead: flow(IsPrereviewerAClubLead(clubs), Effect.succeed),
    }
  })
