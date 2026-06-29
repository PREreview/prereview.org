import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as _ from '../../src/ContactEmailAddresses/ImportContactAddress.ts'
import * as Events from '../../src/Events.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const inputVerified = {
  contactAddressId: Uuid('e08d00fa-42ea-487a-a536-dc0642e2ab85'),
  orcidId: OrcidId('0000-0002-1825-0097'),
  emailAddress: EmailAddress('josiah@example.com'),
  verificationStatus: 'verified',
} satisfies _.Input

const inputUnverified = {
  ...inputVerified,
  verificationStatus: 'unverified',
} satisfies _.Input

const verifiedImported = new Events.ContactAddressImported({
  ...inputVerified,
  emailAddress: Option.some(inputVerified.emailAddress),
})

const unverifiedImported = new Events.ContactAddressImported({
  ...inputUnverified,
  emailAddress: Option.some(inputUnverified.emailAddress),
})

const verifiedPreviouslyUnverified = new Events.ContactAddressVerified({
  orcidId: unverifiedImported.orcidId,
  contactAddressId: unverifiedImported.contactAddressId,
  verifiedAt: Temporal.Now.instant(),
})

const addressRecorded = new Events.ContactAddressRecorded({
  orcidId: inputUnverified.orcidId,
  contactAddressId: inputUnverified.contactAddressId,
  emailAddress: Option.some(inputUnverified.emailAddress),
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
  orcidId: inputVerified.orcidId,
  emailAddress: Option.some(inputVerified.emailAddress),
  chosenAt: Temporal.Now.instant(),
})

test.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  ['no events, input is verified', [], inputVerified, Either.right(Option.some(verifiedImported))],
  ['no events, input is unverified', [], inputUnverified, Either.right(Option.some(unverifiedImported))],
  ['already imported, input is verified', [verifiedImported], inputVerified, Either.right(Option.none())],
  ['already imported, input is unverified', [unverifiedImported], inputUnverified, Either.right(Option.none())],
  [
    'already recorded and verified, input is verified',
    [addressRecorded, addressVerified],
    inputVerified,
    Either.right(Option.none()),
  ],
  ['already recorded, input is unverified', [addressRecorded], inputUnverified, Either.right(Option.none())],
  ['invite address chosen, input is verified', [authorInviteAddressChosen], inputVerified, Either.right(Option.none())],
  [
    'imported unverified, has been verified, input is verified',
    [unverifiedImported, verifiedPreviouslyUnverified],
    inputVerified,
    Either.right(Option.none()),
  ],
  [
    'already imported, input does not match orcid',
    [verifiedImported],
    { ...inputVerified, orcidId: OrcidId('0000-0002-6109-0367') },
    Either.left(new _.DetailsDoNotMatchExistingImport()),
  ],
  [
    'already imported, input does not match emailAddress',
    [verifiedImported],
    { ...inputVerified, emailAddress: EmailAddress('jc@example.com') },
    Either.left(new _.DetailsDoNotMatchExistingImport()),
  ],
  [
    'already imported, input does not match verification status',
    [verifiedImported],
    inputUnverified,
    Either.left(new _.DetailsDoNotMatchExistingImport()),
  ],
  [
    'already verified without prior import',
    [verifiedPreviouslyUnverified],
    inputVerified,
    Either.left(new _.ContactAddressIdHasAlreadyBeenUsed()),
  ],
  [
    'new address recorded in the meantime',
    [addressRecorded, newerAddressRecorded],
    inputUnverified,
    Either.left(new _.DetailsDoNotMatchExistingImport()),
  ],
  [
    'already recorded and verified, input is unverified',
    [addressRecorded, addressVerified],
    inputUnverified,
    Either.left(new _.DetailsDoNotMatchExistingImport()),
  ],
  [
    'already recorded, input is verified',
    [addressRecorded],
    inputVerified,
    Either.left(new _.DetailsDoNotMatchExistingImport()),
  ],
  [
    'invite address chosen, input is unverified',
    [authorInviteAddressChosen],
    inputUnverified,
    Either.left(new _.DetailsDoNotMatchExistingImport()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ImportContactAddress

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
