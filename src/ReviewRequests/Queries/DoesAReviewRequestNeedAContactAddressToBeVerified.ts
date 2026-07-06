import { Array, Data, Either, HashMap, Match, Option, Schema } from 'effect'
import * as Events from '../../Events.ts'
import { IndeterminatePreprintIdFromStringSchema, type IndeterminatePreprintId } from '../../Preprints/index.ts'
import * as Queries from '../../Queries.ts'
import type { EmailAddress } from '../../types/EmailAddress.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Uuid } from '../../types/Uuid.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  requesterId: OrcidId
  preprintId: IndeterminatePreprintId
}

export type Result = Either.Either<
  { contactAddress: ContactAddress; reviewRequestId: Uuid },
  Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished
>

export type ContactAddress = VerifiedContactAddress | UnverifiedContactAddress | NoContactAddress

export class VerifiedContactAddress extends Data.TaggedClass('VerifiedContactAddress')<{ value: EmailAddress }> {}

export class UnverifiedContactAddress extends Data.TaggedClass('UnverifiedContactAddress')<{ value: EmailAddress }> {}

export class NoContactAddress extends Data.TaggedClass('NoContactAddress') {}

type PertinentContactAddressEvent = Events.EventsForFilter<typeof contactAddressFilter>

type PertinentReviewRequestEvent = Events.EventsForFilter<typeof reviewRequestFilter>

const contactAddressFilter = Events.EventFilter({
  types: [
    'ContactAddressImported',
    'ContactAddressRecorded',
    'ContactAddressVerified',
    'AuthorInviteEmailAddressChosenAsContactAddress',
  ],
})

const reviewRequestFilter = Events.EventFilter({
  types: [
    'ReviewRequestForAPreprintWasStarted',
    'ReviewRequestForAPreprintWasPublished',
    'ReviewRequestByAPrereviewerWasImported',
  ],
})

interface State {
  readonly contactAddressesById: HashMap.HashMap<
    Uuid,
    { emailAddress: Option.Option<EmailAddress>; verificationStatus: 'verified' | 'unverified' }
  >
  readonly contactAddressesByOrcidId: HashMap.HashMap<
    OrcidId,
    Uuid | { emailAddress: Option.Option<EmailAddress>; verificationStatus: 'verified' }
  >
  readonly reviewRequestsById: HashMap.HashMap<Uuid, { publicationStatus: 'published' | 'pending' }>
  readonly reviewRequestIdsByInput: HashMap.HashMap<string, Uuid>
}

const inputToHashKey = (input: Input): string =>
  `${input.requesterId}-${Schema.encodeSync(IndeterminatePreprintIdFromStringSchema)(input.preprintId)}`

const initialState: State = {
  contactAddressesById: HashMap.empty(),
  contactAddressesByOrcidId: HashMap.empty(),
  reviewRequestsById: HashMap.empty(),
  reviewRequestIdsByInput: HashMap.empty(),
}

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State => {
  const contactAddressesById = HashMap.mutate(state.contactAddressesById, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, contactAddressFilter)) {
        return currentState
      }

      return updateContactAddressesByIdStateWithPertinentEvent(currentState, event)
    }),
  )

  const contactAddressesByOrcidId = HashMap.mutate(state.contactAddressesByOrcidId, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, contactAddressFilter)) {
        return currentState
      }

      return updateContactAddressesByOrcidIdStateWithPertinentEvent(currentState, event)
    }),
  )

  const reviewRequestsById = HashMap.mutate(state.reviewRequestsById, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, reviewRequestFilter)) {
        return currentState
      }

      return updateReviewRequestsByIdStateWithPertinentEvent(currentState, event)
    }),
  )

  const reviewRequestIdsByInput = HashMap.mutate(state.reviewRequestIdsByInput, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, reviewRequestFilter)) {
        return currentState
      }

      return updateReviewRequestIdsByInputStateWithPertinentEvent(currentState, event)
    }),
  )

  return { contactAddressesById, contactAddressesByOrcidId, reviewRequestsById, reviewRequestIdsByInput }
}

const updateContactAddressesByIdStateWithPertinentEvent = (
  state: State['contactAddressesById'],
  event: PertinentContactAddressEvent,
): State['contactAddressesById'] =>
  Match.valueTags(event, {
    ContactAddressImported: event =>
      HashMap.set(state, event.contactAddressId, {
        emailAddress: event.emailAddress,
        verificationStatus: event.verificationStatus,
      }),
    ContactAddressRecorded: event =>
      HashMap.set(state, event.contactAddressId, {
        emailAddress: event.emailAddress,
        verificationStatus: 'unverified' as const,
      }),
    ContactAddressVerified: event =>
      HashMap.modify(state, event.contactAddressId, contactAddress => ({
        ...contactAddress,
        verificationStatus: 'verified' as const,
      })),
    AuthorInviteEmailAddressChosenAsContactAddress: () => state,
  })

const updateContactAddressesByOrcidIdStateWithPertinentEvent = (
  state: State['contactAddressesByOrcidId'],
  event: PertinentContactAddressEvent,
): State['contactAddressesByOrcidId'] =>
  Match.valueTags(event, {
    ContactAddressImported: event => HashMap.set(state, event.orcidId, event.contactAddressId),
    ContactAddressRecorded: event => HashMap.set(state, event.orcidId, event.contactAddressId),
    ContactAddressVerified: () => state,
    AuthorInviteEmailAddressChosenAsContactAddress: event =>
      HashMap.set(state, event.orcidId, { emailAddress: event.emailAddress, verificationStatus: 'verified' as const }),
  })

const updateReviewRequestsByIdStateWithPertinentEvent = (
  state: State['reviewRequestsById'],
  event: PertinentReviewRequestEvent,
): State['reviewRequestsById'] =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(state, event.reviewRequestId, { publicationStatus: 'pending' as const }),
    ReviewRequestForAPreprintWasPublished: event =>
      HashMap.modify(state, event.reviewRequestId, review => ({ ...review, publicationStatus: 'published' as const })),
    ReviewRequestByAPrereviewerWasImported: event =>
      HashMap.set(state, event.reviewRequestId, { publicationStatus: 'published' as const }),
  })

const updateReviewRequestIdsByInputStateWithPertinentEvent = (
  state: State['reviewRequestIdsByInput'],
  event: PertinentReviewRequestEvent,
): State['reviewRequestIdsByInput'] =>
  Match.valueTags(event, {
    ReviewRequestForAPreprintWasStarted: event =>
      HashMap.set(
        state,
        inputToHashKey({ requesterId: event.requesterId, preprintId: event.preprintId }),
        event.reviewRequestId,
      ),
    ReviewRequestForAPreprintWasPublished: () => state,
    ReviewRequestByAPrereviewerWasImported: event =>
      HashMap.set(
        state,
        inputToHashKey({ requesterId: event.requester.orcidId, preprintId: event.preprintId }),
        event.reviewRequestId,
      ),
  })

const query = (state: State, input: Input): Result =>
  Either.gen(function* () {
    const reviewRequestId = yield* Either.fromOption(
      HashMap.get(state.reviewRequestIdsByInput, inputToHashKey(input)),
      () => new Errors.UnknownReviewRequest({}),
    )

    const reviewRequest = yield* Either.fromOption(
      HashMap.get(state.reviewRequestsById, reviewRequestId),
      () => new Errors.UnknownReviewRequest({}),
    )

    if (reviewRequest.publicationStatus === 'published') {
      return yield* Either.left(new Errors.ReviewRequestHasBeenPublished({}))
    }

    const contactAddressId = HashMap.get(state.contactAddressesByOrcidId, input.requesterId)

    if (Option.isNone(contactAddressId)) {
      return { contactAddress: new NoContactAddress(), reviewRequestId }
    }

    if (typeof contactAddressId.value === 'object') {
      return Option.match(contactAddressId.value.emailAddress, {
        onSome: emailAddress => ({
          contactAddress: new VerifiedContactAddress({ value: emailAddress }),
          reviewRequestId,
        }),
        onNone: () => ({ contactAddress: new NoContactAddress(), reviewRequestId }),
      })
    }

    const contactAddress = yield* Either.fromOption(
      HashMap.get(state.contactAddressesById, contactAddressId.value),
      () => new Errors.UnknownReviewRequest({ cause: 'Unexpected query state' }),
    )

    if (Option.isNone(contactAddress.emailAddress)) {
      return { contactAddress: new NoContactAddress(), reviewRequestId }
    }

    if (contactAddress.verificationStatus === 'verified') {
      return {
        contactAddress: new VerifiedContactAddress({ value: contactAddress.emailAddress.value }),
        reviewRequestId,
      }
    }

    return {
      contactAddress: new UnverifiedContactAddress({ value: Option.getOrThrow(contactAddress.emailAddress) }),
      reviewRequestId,
    }
  })

export const DoesAReviewRequestNeedAContactAddressToBeVerified: Queries.StatefulQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>,
  State
> = Queries.StatefulQuery({
  name: 'ReviewRequestQueries.doesAReviewRequestNeedAContactAddressToBeVerified',
  initialState,
  updateStateWithEvents,
  query,
})
