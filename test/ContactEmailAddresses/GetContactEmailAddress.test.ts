import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import { expect } from 'vitest'
import {
  UnverifiedContactEmailAddress,
  VerifiedContactEmailAddress,
} from '../../src/ContactEmailAddresses/ContactEmailAddress.ts'
import { ContactEmailAddressIsNotFound } from '../../src/ContactEmailAddresses/Errors.ts'
import * as _ from '../../src/ContactEmailAddresses/GetContactEmailAddress.ts'
import * as Events from '../../src/Events.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const input = OrcidId('0000-0002-1825-0097')

const verifiedImported = new Events.ContactAddressImported({
  contactAddressId: Uuid('92260594-7707-4ab2-a6a9-19ed84d57f2f'),
  emailAddress: Option.some(EmailAddress('verified@example.com')),
  orcidId: input,
  verificationStatus: 'verified',
})

const unverifiedImported = new Events.ContactAddressImported({
  contactAddressId: Uuid('bb1f1b12-435f-4379-b6a9-257266cc64ad'),
  emailAddress: Option.some(EmailAddress('unverified@example.com')),
  orcidId: input,
  verificationStatus: 'unverified',
})

const verifiedPreviouslyUnverified = new Events.ContactAddressVerified({
  contactAddressId: unverifiedImported.contactAddressId,
  orcidId: input,
  verifiedAt: Temporal.Now.instant(),
})

const authorInviteAddressChosen = new Events.AuthorInviteEmailAddressChosenAsContactAddress({
  inviteId: Uuid('eb73b830-d0cc-4398-a0d6-86d6a9cec4bc'),
  emailAddress: Option.some(EmailAddress('author-invite@example.com')),
  orcidId: input,
  chosenAt: Temporal.Now.instant(),
})

const recorded = new Events.ContactAddressRecorded({
  contactAddressId: Uuid('8040b2f5-a169-47e3-9eeb-839a8da9e582'),
  emailAddress: Option.some(EmailAddress('recorded@example.com')),
  orcidId: input,
})

const verified = new Events.ContactAddressVerified({
  contactAddressId: recorded.contactAddressId,
  orcidId: input,
  verifiedAt: Temporal.Now.instant(),
})

const newerRecorded = new Events.ContactAddressRecorded({
  contactAddressId: Uuid('dc2cca0a-b5da-422c-8426-b086fc166da2'),
  emailAddress: Option.some(EmailAddress('newer-recorded@example.com')),
  orcidId: input,
})

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', input, [], Either.left(new ContactEmailAddressIsNotFound())],
  [
    'imported verified',
    input,
    [verifiedImported],
    Either.right(
      new VerifiedContactEmailAddress({
        value: Option.getOrThrow(verifiedImported.emailAddress),
        contactAddressId: verifiedImported.contactAddressId,
      }),
    ),
  ],
  [
    'imported unverified',
    input,
    [unverifiedImported],
    Either.right(
      new UnverifiedContactEmailAddress({
        value: Option.getOrThrow(unverifiedImported.emailAddress),
        verificationToken: unverifiedImported.contactAddressId,
      }),
    ),
  ],
  [
    'imported unverified then verified',
    input,
    [unverifiedImported, verifiedPreviouslyUnverified],
    Either.right(
      new VerifiedContactEmailAddress({
        value: Option.getOrThrow(unverifiedImported.emailAddress),
        contactAddressId: unverifiedImported.contactAddressId,
      }),
    ),
  ],
  [
    'author invite address chosen',
    input,
    [authorInviteAddressChosen],
    Either.right(new VerifiedContactEmailAddress({ value: Option.getOrThrow(authorInviteAddressChosen.emailAddress) })),
  ],
  [
    'recorded',
    input,
    [recorded],
    Either.right(
      new UnverifiedContactEmailAddress({
        value: Option.getOrThrow(recorded.emailAddress),
        verificationToken: recorded.contactAddressId,
      }),
    ),
  ],
  [
    'recorded and verified',
    input,
    [recorded, verified],
    Either.right(
      new VerifiedContactEmailAddress({
        value: Option.getOrThrow(recorded.emailAddress),
        contactAddressId: recorded.contactAddressId,
      }),
    ),
  ],
  [
    'newer address recorded',
    input,
    [recorded, verified, newerRecorded],
    Either.right(
      new UnverifiedContactEmailAddress({
        value: Option.getOrThrow(newerRecorded.emailAddress),
        verificationToken: newerRecorded.contactAddressId,
      }),
    ),
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetContactEmailAddress

  const actual = query(events, input)

  expect(actual).toStrictEqual(expected)
})
