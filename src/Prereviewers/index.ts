import { Context, Effect, Layer, Match, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import { UnableToHandleCommand } from '../Commands.ts'
import { GetContactEmailAddress } from '../contact-email-address.ts'
import { OrcidRecords } from '../ExternalInteractions/index.ts'
import * as Queries from '../Queries.ts'
import { Temporal, type EmailAddress, type NonEmptyString, type OrcidId } from '../types/index.ts'
import { possiblePseudonyms } from '../types/Pseudonym.ts'
import { CountAvailablePseudonyms } from './CountAvailablePseudonyms.ts'
import { GetAvailablePseudonym } from './GetAvailablePseudonym.ts'
import { GetPseudonym } from './GetPseudonym.ts'
import { IsRegistered } from './IsRegistered.ts'
import { ListAllPrereviewersForStats } from './ListAllPrereviewersForStats.ts'
import { RegisterPrereviewer } from './RegisterPrereviewer.ts'
import { ReplaceLegacyPseudonym } from './ReplaceLegacyPseudonym.ts'

export class Prereviewers extends Context.Tag('Prereviewers')<
  Prereviewers,
  {
    register: (orcidId: OrcidId.OrcidId) => Effect.Effect<void, UnableToHandleCommand>
    replaceLegacyPseudonym: (
      orcid: OrcidId.OrcidId,
    ) => ReturnType<Commands.FromCommand<ReturnType<typeof ReplaceLegacyPseudonym>>>
    isRegistered: Queries.FromOnDemandQuery<typeof IsRegistered>
    getPseudonym: Queries.FromOnDemandQuery<typeof GetPseudonym>
    countAvailablePseudonyms: Queries.FromOnDemandQuery<ReturnType<typeof CountAvailablePseudonyms>>
    listAllPrereviewersForStats: Queries.FromStatefulQuery<typeof ListAllPrereviewersForStats>
    getContactDetails: (
      orcid: OrcidId.OrcidId,
    ) => Effect.Effect<{ name: NonEmptyString.NonEmptyString; email: EmailAddress.EmailAddress }, Queries.UnableToQuery>
  }
>() {}

export const { countAvailablePseudonyms, listAllPrereviewersForStats, getContactDetails } =
  Effect.serviceFunctions(Prereviewers)

export const layer = Layer.effect(
  Prereviewers,
  Effect.gen(function* () {
    const orcidRecords = yield* OrcidRecords.OrcidRecords
    const getContactEmailAddress = yield* GetContactEmailAddress

    const registerPrereviewer = yield* Commands.makeCommand(RegisterPrereviewer)

    const replaceLegacyPseudonym = yield* pipe(
      possiblePseudonyms,
      Effect.andThen(ReplaceLegacyPseudonym),
      Effect.andThen(Commands.makeCommand),
    )

    const getAvailablePseudonym = yield* pipe(
      possiblePseudonyms,
      Effect.andThen(GetAvailablePseudonym),
      Effect.andThen(Queries.makeStatefulQuery),
    )

    const countAvailablePseudonyms = yield* pipe(
      possiblePseudonyms,
      Effect.andThen(CountAvailablePseudonyms),
      Effect.andThen(Queries.makeOnDemandQuery),
    )

    return {
      register: Effect.fn('Prereviewers.register')(
        function* (orcidId) {
          const prereviewer = {
            orcidId,
            registeredAt: yield* Temporal.currentInstant,
            pseudonym: yield* getAvailablePseudonym(),
          }

          yield* registerPrereviewer(prereviewer)
        },
        Effect.catchTag(
          'MismatchWithExistingDataForOrcid',
          'NoPseudonymAvailable',
          'PseudonymAlreadyInUse',
          error => new UnableToHandleCommand({ cause: error }),
        ),
      ),
      replaceLegacyPseudonym: Effect.fnUntraced(
        function* (orcidId) {
          const input = {
            orcidId,
            replacedAt: yield* Temporal.currentInstant,
            pseudonym: yield* getAvailablePseudonym(),
          }

          yield* replaceLegacyPseudonym(input)
        },
        Effect.catchTag('NoPseudonymAvailable', error => new UnableToHandleCommand({ cause: error })),
      ),
      isRegistered: yield* Queries.makeOnDemandQuery(IsRegistered),
      getPseudonym: yield* Queries.makeOnDemandQuery(GetPseudonym),
      countAvailablePseudonyms,
      listAllPrereviewersForStats: yield* Queries.makeStatefulQuery(ListAllPrereviewersForStats),
      getContactDetails: Effect.fn('Prereviewers.getContactDetails')(
        function* (orcidId) {
          const { contactEmailAddress, name } = yield* Effect.all({
            contactEmailAddress: getContactEmailAddress(orcidId),
            name: orcidRecords.getName(orcidId),
          })

          return yield* Match.valueTags(contactEmailAddress, {
            UnverifiedContactEmailAddress: () =>
              Effect.fail(new Queries.UnableToQuery({ cause: 'Contact email address is unverified' })),
            VerifiedContactEmailAddress: contactEmailAddress =>
              Effect.succeed({
                name,
                email: contactEmailAddress.value,
              }),
          })
        },
        Effect.catchTag(
          'ContactEmailAddressIsNotFound',
          'ContactEmailAddressIsUnavailable',
          'NameIsNotAvailable',
          error => new Queries.UnableToQuery({ cause: error }),
        ),
      ),
    }
  }),
)
