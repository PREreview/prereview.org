import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option } from 'effect'
import * as Events from '../../../src/Events.ts'
import { BiorxivOrMedrxivPreprintId, BiorxivPreprintId } from '../../../src/Preprints/PreprintId.ts'
import { ReviewRequestHasBeenPublished, UnknownReviewRequest } from '../../../src/ReviewRequests/Errors.ts'
import * as _ from '../../../src/ReviewRequests/Queries/DoesAReviewRequestNeedAContactAddressToBeVerified.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { EmailAddress } from '../../../src/types/EmailAddress.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'

const preprintDoi = Doi('10.1101/2023.01.01.123456')

const input = {
  requesterId: OrcidId('0000-0002-1825-0097'),
  preprintId: new BiorxivPreprintId({ value: preprintDoi }),
} satisfies _.Input

const requestImported = new Events.ReviewRequestByAPrereviewerWasImported({
  reviewRequestId: Uuid('9cc25c8d-18eb-475d-8e66-9f0e8b94955e'),
  requester: { orcidId: input.requesterId, persona: 'public' },
  preprintId: input.preprintId,
  publishedAt: Temporal.Now.instant(),
})

const requestStarted = new Events.ReviewRequestForAPreprintWasStarted({
  reviewRequestId: Uuid('ea5920a6-46af-491e-bf18-aaa6770a2d09'),
  requesterId: input.requesterId,
  preprintId: input.preprintId,
  startedAt: Temporal.Now.instant(),
})

const requestStartedWithIndeterminatePreprintId = new Events.ReviewRequestForAPreprintWasStarted({
  reviewRequestId: Uuid('8f019fe1-ad1b-4982-970a-5978deafe2bc'),
  requesterId: input.requesterId,
  preprintId: new BiorxivOrMedrxivPreprintId({ value: preprintDoi }),
  startedAt: Temporal.Now.instant(),
})

const requestPublished = new Events.ReviewRequestForAPreprintWasPublished({
  reviewRequestId: requestStarted.reviewRequestId,
  publishedAt: Temporal.Now.instant(),
})

const verifiedImported = new Events.ContactAddressImported({
  contactAddressId: Uuid('92260594-7707-4ab2-a6a9-19ed84d57f2f'),
  emailAddress: Option.some(EmailAddress('verified@example.com')),
  orcidId: input.requesterId,
  verificationStatus: 'verified',
})

const unverifiedImported = new Events.ContactAddressImported({
  contactAddressId: Uuid('bb1f1b12-435f-4379-b6a9-257266cc64ad'),
  emailAddress: Option.some(EmailAddress('unverified@example.com')),
  orcidId: input.requesterId,
  verificationStatus: 'unverified',
})

const verifiedPreviouslyUnverified = new Events.ContactAddressVerified({
  contactAddressId: unverifiedImported.contactAddressId,
  orcidId: input.requesterId,
  verifiedAt: Temporal.Now.instant(),
})

const authorInviteAddressChosen = new Events.AuthorInviteEmailAddressChosenAsContactAddress({
  inviteId: Uuid('eb73b830-d0cc-4398-a0d6-86d6a9cec4bc'),
  emailAddress: Option.some(EmailAddress('author-invite@example.com')),
  orcidId: input.requesterId,
  chosenAt: Temporal.Now.instant(),
})

const recorded = new Events.ContactAddressRecorded({
  contactAddressId: Uuid('8040b2f5-a169-47e3-9eeb-839a8da9e582'),
  emailAddress: Option.some(EmailAddress('recorded@example.com')),
  orcidId: input.requesterId,
})

const recordedRemoved = new Events.ContactAddressRecorded({
  contactAddressId: Uuid('2857d0cb-8d9a-42a3-bee5-a52e01833ea3'),
  emailAddress: Option.none(),
  orcidId: input.requesterId,
})

const verified = new Events.ContactAddressVerified({
  contactAddressId: recorded.contactAddressId,
  orcidId: input.requesterId,
  verifiedAt: Temporal.Now.instant(),
})

const newerRecorded = new Events.ContactAddressRecorded({
  contactAddressId: Uuid('dc2cca0a-b5da-422c-8426-b086fc166da2'),
  emailAddress: Option.some(EmailAddress('newer-recorded@example.com')),
  orcidId: input.requesterId,
})

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], Either.left(new UnknownReviewRequest({}))],
  ['request imported', [requestImported], Either.left(new ReviewRequestHasBeenPublished({}))],
  ['request published', [requestStarted, requestPublished], Either.left(new ReviewRequestHasBeenPublished({}))],
  [
    'request started, no contact address',
    [requestStarted],
    Either.right({ contactAddress: new _.NoContactAddress(), reviewRequestId: requestStarted.reviewRequestId }),
  ],
  [
    'request started with indeterminate preprint ID, no contact address',
    [requestStartedWithIndeterminatePreprintId],
    Either.right({ contactAddress: new _.NoContactAddress(), reviewRequestId: requestStarted.reviewRequestId }),
  ],
  [
    'request started, imported verified contact address',
    [requestStarted, verifiedImported],
    Either.right({
      contactAddress: new _.VerifiedContactAddress({ value: Option.getOrThrow(verifiedImported.emailAddress) }),
      reviewRequestId: requestStarted.reviewRequestId,
    }),
  ],
  [
    'request started, imported unverified contact address',
    [requestStarted, unverifiedImported],
    Either.right({
      contactAddress: new _.UnverifiedContactAddress({ value: Option.getOrThrow(unverifiedImported.emailAddress) }),
      reviewRequestId: requestStarted.reviewRequestId,
    }),
  ],
  [
    'request started, imported unverified contact address then verified',
    [requestStarted, unverifiedImported, verifiedPreviouslyUnverified],
    Either.right({
      contactAddress: new _.VerifiedContactAddress({
        value: Option.getOrThrow(unverifiedImported.emailAddress),
      }),
      reviewRequestId: requestStarted.reviewRequestId,
    }),
  ],
  [
    'request started, author invite address chosen',
    [requestStarted, authorInviteAddressChosen],
    Either.right({
      contactAddress: new _.VerifiedContactAddress({
        value: Option.getOrThrow(authorInviteAddressChosen.emailAddress),
      }),
      reviewRequestId: requestStarted.reviewRequestId,
    }),
  ],
  [
    'request started, recorded contact address',
    [requestStarted, recorded],
    Either.right({
      contactAddress: new _.UnverifiedContactAddress({ value: Option.getOrThrow(recorded.emailAddress) }),
      reviewRequestId: requestStarted.reviewRequestId,
    }),
  ],
  [
    'request started, recorded contact address but removed',
    [requestStarted, recordedRemoved],
    Either.right({ contactAddress: new _.NoContactAddress(), reviewRequestId: requestStarted.reviewRequestId }),
  ],
  [
    'request started, recorded contact address then verified',
    [requestStarted, recorded, verified],
    Either.right({
      contactAddress: new _.VerifiedContactAddress({ value: Option.getOrThrow(recorded.emailAddress) }),
      reviewRequestId: requestStarted.reviewRequestId,
    }),
  ],
  [
    'request started, newer contact address recorded',
    [requestStarted, recorded, verified, newerRecorded],
    Either.right({
      contactAddress: new _.UnverifiedContactAddress({ value: Option.getOrThrow(newerRecorded.emailAddress) }),
      reviewRequestId: requestStarted.reviewRequestId,
    }),
  ],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.DoesAReviewRequestNeedAContactAddressToBeVerified

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(expected)
})
