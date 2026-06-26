import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Commands from '../../src/Commands.ts'
import {
  ContactEmailAddressHasAlreadyBeenVerified,
  ContactEmailAddressIsNotFound,
} from '../../src/ContactEmailAddresses/Errors.ts'
import * as _ from '../../src/ContactEmailAddresses/VerifyContactEmailAddressUsingEvents.ts'
import * as Events from '../../src/Events.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const orcidWithVerified = OrcidId('0000-0002-1825-0097')
const orcidWithUnverified = OrcidId('0000-0002-6109-0367')
const orcidWithNoEmailAddress = OrcidId('0000-0003-4921-6155')
const differentOrcid = OrcidId('0000-0003-4921-6155')

const verifiedImported = new Events.ContactAddressImported({
  orcidId: orcidWithVerified,
  contactAddressId: Uuid('4cd3642a-74d4-418d-a41d-d2edcd3dbcad'),
  emailAddress: Option.some(EmailAddress('josiah@example.com')),
  verificationStatus: 'verified',
})

const unverifiedImported = new Events.ContactAddressImported({
  orcidId: orcidWithUnverified,
  contactAddressId: Uuid('1a2c8e69-39c4-40b7-b3db-b941a74ba3e8'),
  emailAddress: Option.some(EmailAddress('josiah@example.com')),
  verificationStatus: 'unverified',
})

const verifiedAt = Temporal.Now.instant()

const verifiedPreviouslyUnverified = new Events.ContactAddressVerified({
  contactAddressId: unverifiedImported.contactAddressId,
  verifiedAt,
})

const addressRecorded = new Events.ContactAddressRecorded({
  orcidId: orcidWithUnverified,
  contactAddressId: Uuid('2487f220-bd30-4986-a362-429e1f6bdd60'),
  emailAddress: Option.some(EmailAddress('josiah@example.com')),
})

const addressVerified = new Events.ContactAddressVerified({
  contactAddressId: addressRecorded.contactAddressId,
  verifiedAt,
})

test.each<
  [
    string,
    ReadonlyArray<Events.Event>,
    _.Input,
    Either.Either<Option.Option<Events.Event>, _.Error | Commands.UnableToHandleCommand>,
  ]
>([
  [
    'currently unverified from import',
    [unverifiedImported],
    { orcid: orcidWithUnverified, contactAddressId: unverifiedImported.contactAddressId, verifiedAt },
    Either.right(Option.some(verifiedPreviouslyUnverified)),
  ],
  [
    'currently unverified',
    [addressRecorded],
    { orcid: addressRecorded.orcidId, contactAddressId: addressRecorded.contactAddressId, verifiedAt },
    Either.right(Option.some(addressVerified)),
  ],
  [
    'no events',
    [],
    { orcid: orcidWithNoEmailAddress, contactAddressId: unverifiedImported.contactAddressId, verifiedAt },
    Either.left(new ContactEmailAddressIsNotFound()),
  ],
  [
    'already verified imported',
    [verifiedImported],
    { orcid: orcidWithVerified, contactAddressId: verifiedImported.contactAddressId, verifiedAt },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'already verified',
    [addressRecorded, addressVerified],
    { orcid: addressRecorded.orcidId, contactAddressId: addressRecorded.contactAddressId, verifiedAt },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'already verified after imported unverified',
    [unverifiedImported, verifiedPreviouslyUnverified],
    { orcid: orcidWithUnverified, contactAddressId: verifiedPreviouslyUnverified.contactAddressId, verifiedAt },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'orcidId does not match from import (unexpected user issueing command)',
    [unverifiedImported],
    { orcid: differentOrcid, contactAddressId: unverifiedImported.contactAddressId, verifiedAt },
    Either.left(new Commands.UnableToHandleCommand({ cause: 'unauthorized' })),
  ],
  [
    'orcidId does not match (unexpected user issueing command)',
    [addressRecorded],
    { orcid: differentOrcid, contactAddressId: addressRecorded.contactAddressId, verifiedAt },
    Either.left(new Commands.UnableToHandleCommand({ cause: 'unauthorized' })),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, authorize, decide } = _.VerifyContactEmailAddressUsingEvents

  const state = foldState(events, input)

  const actual = authorize(state, input)
    ? decide(state, input)
    : Either.left(new Commands.UnableToHandleCommand({ cause: 'unauthorized' }))

  expect(actual).toStrictEqual(expected)
})
