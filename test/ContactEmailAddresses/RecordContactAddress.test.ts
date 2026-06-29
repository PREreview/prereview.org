import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import { ContactEmailAddressHasAlreadyBeenVerified } from '../../src/ContactEmailAddresses/index.ts'
import * as _ from '../../src/ContactEmailAddresses/RecordContactAddress.ts'
import * as Events from '../../src/Events.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = {
  contactAddressId: Uuid('e08d00fa-42ea-487a-a536-dc0642e2ab85'),
  orcidId: OrcidId('0000-0002-1825-0097'),
  emailAddress: EmailAddress('josiah@example.com'),
} satisfies _.Input

const inputDifferentEmail = {
  ...input,
  emailAddress: EmailAddress('jc@example.com'),
} satisfies _.Input

const verifiedImported = new Events.ContactAddressImported({
  ...input,
  emailAddress: Option.some(input.emailAddress),
  verificationStatus: 'verified',
})

const unverifiedImported = new Events.ContactAddressImported({
  ...input,
  emailAddress: Option.some(input.emailAddress),
  verificationStatus: 'unverified',
})

const verifiedPreviouslyUnverified = new Events.ContactAddressVerified({
  orcidId: unverifiedImported.orcidId,
  contactAddressId: unverifiedImported.contactAddressId,
  verifiedAt: Temporal.Now.instant(),
})

const addressRecorded = new Events.ContactAddressRecorded({
  orcidId: input.orcidId,
  contactAddressId: input.contactAddressId,
  emailAddress: Option.some(input.emailAddress),
})

const addressVerified = new Events.ContactAddressVerified({
  orcidId: addressRecorded.orcidId,
  contactAddressId: addressRecorded.contactAddressId,
  verifiedAt: Temporal.Now.instant(),
})

const newerAddressRecorded = new Events.ContactAddressRecorded({
  orcidId: addressRecorded.orcidId,
  contactAddressId: Uuid('c70ba65f-96f2-4489-a1b5-43cbb41c6eff'),
  emailAddress: Option.some(EmailAddress('jc@example.com')),
})

const authorInviteAddressChosen = new Events.AuthorInviteEmailAddressChosenAsContactAddress({
  inviteId: Uuid('c6aed52a-0f7b-4d67-8fc9-64adaa4f9e38'),
  orcidId: input.orcidId,
  emailAddress: Option.some(input.emailAddress),
  chosenAt: Temporal.Now.instant(),
})

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  [
    'no events',
    [],
    input,
    Either.right(
      Option.some(
        new Events.ContactAddressRecorded({
          ...input,
          emailAddress: Option.some(input.emailAddress),
        }),
      ),
    ),
  ],
  ['same as recorded', [addressRecorded], input, Either.right(Option.none())],
  [
    'same as recorded then verified',
    [addressRecorded, addressVerified],
    input,
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'same as invite used',
    [authorInviteAddressChosen],
    input,
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'same as imported verified',
    [verifiedImported],
    input,
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  ['same as imported unverified', [unverifiedImported], input, Either.right(Option.none())],
  [
    'same as imported then verified',
    [unverifiedImported, verifiedPreviouslyUnverified],
    input,
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'different from recorded',
    [addressRecorded],
    inputDifferentEmail,
    Either.right(
      Option.some(
        new Events.ContactAddressRecorded({
          ...inputDifferentEmail,
          emailAddress: Option.some(inputDifferentEmail.emailAddress),
        }),
      ),
    ),
  ],
  [
    'different from recorded then verified',
    [addressRecorded, addressVerified],
    inputDifferentEmail,
    Either.right(Option.none()),
  ],
  [
    'different from invite used',
    [authorInviteAddressChosen],
    inputDifferentEmail,
    Either.right(
      Option.some(
        new Events.ContactAddressRecorded({
          ...inputDifferentEmail,
          emailAddress: Option.some(inputDifferentEmail.emailAddress),
        }),
      ),
    ),
  ],
  [
    'different from imported verified',
    [verifiedImported],
    inputDifferentEmail,
    Either.right(
      Option.some(
        new Events.ContactAddressRecorded({
          ...inputDifferentEmail,
          emailAddress: Option.some(inputDifferentEmail.emailAddress),
        }),
      ),
    ),
  ],
  [
    'different from imported unverified',
    [unverifiedImported],
    inputDifferentEmail,
    Either.right(
      Option.some(
        new Events.ContactAddressRecorded({
          ...inputDifferentEmail,
          emailAddress: Option.some(inputDifferentEmail.emailAddress),
        }),
      ),
    ),
  ],
  [
    'different from imported then verified',
    [unverifiedImported, verifiedPreviouslyUnverified],
    inputDifferentEmail,
    Either.right(
      Option.some(
        new Events.ContactAddressRecorded({
          ...inputDifferentEmail,
          emailAddress: Option.some(inputDifferentEmail.emailAddress),
        }),
      ),
    ),
  ],
  [
    'newer address recorded',
    [verifiedImported, newerAddressRecorded],
    input,
    Either.right(
      Option.some(
        new Events.ContactAddressRecorded({
          ...input,
          emailAddress: Option.some(input.emailAddress),
        }),
      ),
    ),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.RecordContactAddress

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
