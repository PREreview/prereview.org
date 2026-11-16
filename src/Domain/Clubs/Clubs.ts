import { Array, Context, Effect, flow, Layer, Record, Tuple } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../../html.ts'
import type { EmailAddress } from '../../types/EmailAddress.ts'
import type { Temporal } from '../../types/index.ts'
import type { Name } from '../../types/Name.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Slug } from '../../types/Slug.ts'
import type { Uuid } from '../../types/Uuid.ts'
import { ClubNotFound } from './Errors.ts'
import { GetClubByName } from './GetClubByName.ts'
import { GetClubBySlug } from './GetClubBySlug.ts'
import { GetClubsThatAPrereviewerLeads } from './GetClubsThatAPrereviewerLeads.ts'
import { IsPrereviewerAClubLead } from './IsPrereviewerAClubLead.ts'

export interface ClubDetails {
  readonly id: Uuid
  readonly status: 'active' | 'inactive'
  readonly name: {
    readonly language: LanguageCode
    readonly text: Name
  }
  readonly formerNames?: Array.NonEmptyReadonlyArray<Name>
  readonly slug: Slug
  readonly formerSlugs?: Array.NonEmptyReadonlyArray<Slug>
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

export class Clubs extends Context.Service<
  Clubs,
  {
    listClubs: Effect.Effect<Array.NonEmptyReadonlyArray<ClubName & { readonly status: 'active' | 'inactive' }>>
    getClubDetails: (clubId: Uuid) => Effect.Effect<ClubDetails, ClubNotFound>
    getClubName: (clubId: Uuid) => Effect.Effect<ClubName, ClubNotFound>
    getClubByName: (name: Name) => Effect.Effect<ClubName, ClubNotFound>
    getClubBySlug: (slug: Slug) => Effect.Effect<ClubDetails, ClubNotFound>
    getClubsThatAPrereviewerLeads: (orcidId: OrcidId) => Effect.Effect<ReadonlyArray<ClubName>>
    isPrereviewerAClubLead: (orcidId: OrcidId) => Effect.Effect<boolean>
  }
>()('Clubs') {
  static readonly listClubs = Clubs.use(service => service.listClubs)

  static readonly getClubDetails = (...args: Parameters<(typeof Clubs.Service)['getClubDetails']>) =>
    Clubs.use(service => service.getClubDetails(...args))

  static readonly getClubName = (...args: Parameters<(typeof Clubs.Service)['getClubName']>) =>
    Clubs.use(service => service.getClubName(...args))

  static readonly getClubByName = (...args: Parameters<(typeof Clubs.Service)['getClubByName']>) =>
    Clubs.use(service => service.getClubByName(...args))

  static readonly getClubBySlug = (...args: Parameters<(typeof Clubs.Service)['getClubBySlug']>) =>
    Clubs.use(service => service.getClubBySlug(...args))

  static readonly getClubsThatAPrereviewerLeads = (
    ...args: Parameters<(typeof Clubs.Service)['getClubsThatAPrereviewerLeads']>
  ) => Clubs.use(service => service.getClubsThatAPrereviewerLeads(...args))

  static readonly isPrereviewerAClubLead = (...args: Parameters<(typeof Clubs.Service)['isPrereviewerAClubLead']>) =>
    Clubs.use(service => service.isPrereviewerAClubLead(...args))
}

export class ClubsData extends Context.Service<ClubsData, Array.NonEmptyReadonlyArray<ClubDetails>>()('ClubsData') {}

export const layer = Layer.effect(
  Clubs,
  Effect.gen(function* () {
    const clubs = yield* ClubsData
    const clubsById = Record.fromEntries(clubs.map(club => Tuple.make(club.id, club)))

    return {
      listClubs: Effect.succeed(
        Array.map(clubs, club => ({
          id: club.id,
          status: club.status,
          language: club.name.language,
          name: club.name.text,
          slug: club.slug,
        })),
      ),
      getClubDetails: (clubId: Uuid) => Effect.fromOption(Record.get(clubsById, clubId), () => new ClubNotFound()),
      getClubName: (clubId: Uuid) =>
        Effect.map(
          Effect.fromOption(Record.get(clubsById, clubId), () => new ClubNotFound()),
          club => ({ id: club.id, language: club.name.language, name: club.name.text, slug: club.slug }),
        ),
      getClubByName: flow(GetClubByName(clubs), Effect.fromResult),
      getClubBySlug: flow(GetClubBySlug(clubs), Effect.fromResult),
      getClubsThatAPrereviewerLeads: flow(GetClubsThatAPrereviewerLeads(clubs), Effect.succeed),
      isPrereviewerAClubLead: flow(IsPrereviewerAClubLead(clubs), Effect.succeed),
    }
  }),
)
