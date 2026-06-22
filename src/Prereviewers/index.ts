import { Context, Effect, Layer, Match, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import { UnableToHandleCommand } from '../Commands.ts'
import { ContactEmailAddresses } from '../ContactEmailAddresses/index.ts'
import { OrcidRecords } from '../ExternalInteractions/index.ts'
import * as Queries from '../Queries.ts'
import { Temporal, type EmailAddress, type Name, type OrcidId } from '../types/index.ts'
import { possiblePseudonyms } from '../types/Pseudonym.ts'
import { CountAvailablePseudonyms } from './CountAvailablePseudonyms.ts'
import { GetAvailablePseudonym } from './GetAvailablePseudonym.ts'
import { GetPseudonym } from './GetPseudonym.ts'
import { HasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests } from './HasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests.ts'
import { IsPseudonymInUse } from './IsPseudonymInUse.ts'
import { IsRegistered } from './IsRegistered.ts'
import { ListAllPrereviewersForStats } from './ListAllPrereviewersForStats.ts'
import { OptInToNotificationsForReviewsPublishedInResponseToRequests } from './OptInToNotificationsForReviewsPublishedInResponseToRequests.ts'
import { OptOutOfNotificationsForReviewsPublishedInResponseToRequests } from './OptOutOfNotificationsForReviewsPublishedInResponseToRequests.ts'
import { RegisterPrereviewer } from './RegisterPrereviewer.ts'

export class Prereviewers extends Context.Tag('Prereviewers')<
  Prereviewers,
  {
    register: (orcidId: OrcidId.OrcidId) => Effect.Effect<void, UnableToHandleCommand>
    isRegistered: Queries.FromOnDemandQuery<typeof IsRegistered>
    getPseudonym: Queries.FromOnDemandQuery<typeof GetPseudonym>
    isPseudonymInUse: Queries.FromStatefulQuery<typeof IsPseudonymInUse>
    countAvailablePseudonyms: Queries.FromOnDemandQuery<ReturnType<typeof CountAvailablePseudonyms>>
    listAllPrereviewersForStats: Queries.FromStatefulQuery<typeof ListAllPrereviewersForStats>
    getContactDetails: (
      orcid: OrcidId.OrcidId,
    ) => Effect.Effect<{ name: Name.Name; email: EmailAddress.EmailAddress }, Queries.UnableToQuery>
    hasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests: Queries.FromOnDemandQuery<
      typeof HasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests
    >
    optInToNotificationsForReviewsPublishedInResponseToRequests: (
      orcid: OrcidId.OrcidId,
    ) => ReturnType<Commands.FromCommand<typeof OptInToNotificationsForReviewsPublishedInResponseToRequests>>
    optOutOfNotificationsForReviewsPublishedInResponseToRequests: (
      orcid: OrcidId.OrcidId,
    ) => ReturnType<Commands.FromCommand<typeof OptOutOfNotificationsForReviewsPublishedInResponseToRequests>>
  }
>() {}

export const {
  countAvailablePseudonyms,
  listAllPrereviewersForStats,
  getContactDetails,
  isRegistered,
  isPseudonymInUse,
} = Effect.serviceFunctions(Prereviewers)

export const layer = Layer.effect(
  Prereviewers,
  Effect.gen(function* () {
    const orcidRecords = yield* OrcidRecords.OrcidRecords
    const contactEmailAddresses = yield* ContactEmailAddresses

    const registerPrereviewer = yield* Commands.makeCommand(RegisterPrereviewer)

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

    const hasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests =
      yield* Queries.makeOnDemandQuery(HasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests)

    const optInToNotificationsForReviewsPublishedInResponseToRequests = yield* Commands.makeCommand(
      OptInToNotificationsForReviewsPublishedInResponseToRequests,
    )

    const optOutOfNotificationsForReviewsPublishedInResponseToRequests = yield* Commands.makeCommand(
      OptOutOfNotificationsForReviewsPublishedInResponseToRequests,
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
      isRegistered: yield* Queries.makeOnDemandQuery(IsRegistered),
      getPseudonym: yield* Queries.makeOnDemandQuery(GetPseudonym),
      isPseudonymInUse: yield* Queries.makeStatefulQuery(IsPseudonymInUse),
      countAvailablePseudonyms,
      listAllPrereviewersForStats: yield* Queries.makeStatefulQuery(ListAllPrereviewersForStats),
      getContactDetails: Effect.fn('Prereviewers.getContactDetails')(
        function* (orcidId) {
          const { contactEmailAddress, name } = yield* Effect.all({
            contactEmailAddress: contactEmailAddresses.getContactEmailAddress(orcidId),
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
      hasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests,
      optInToNotificationsForReviewsPublishedInResponseToRequests: Effect.fnUntraced(function* (orcidId) {
        const input = {
          orcidId,
          optedInAt: yield* Temporal.currentInstant,
        }

        yield* optInToNotificationsForReviewsPublishedInResponseToRequests(input)
      }),
      optOutOfNotificationsForReviewsPublishedInResponseToRequests: Effect.fnUntraced(function* (orcidId) {
        const input = {
          orcidId,
          optedOutAt: yield* Temporal.currentInstant,
        }

        yield* optOutOfNotificationsForReviewsPublishedInResponseToRequests(input)
      }),
    }
  }),
)
