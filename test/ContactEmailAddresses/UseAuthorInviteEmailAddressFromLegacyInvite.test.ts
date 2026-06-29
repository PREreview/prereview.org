import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import { ContactEmailAddressHasAlreadyBeenVerified } from '../../src/ContactEmailAddresses/Errors.ts'
import * as _ from '../../src/ContactEmailAddresses/UseAuthorInviteEmailAddressFromLegacyInvite.ts'
import * as Events from '../../src/Events.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const inviteId = Uuid('47c7ab91-0935-4b5c-9c50-b260047315b0')
const emailAddress = EmailAddress('josiah@example.com')
const chosenAt = Temporal.Now.instant()

const acceptedInvitationEmailAddress = EmailAddress('accepted@example.com')

const orcidId = OrcidId('0000-0002-1825-0097')

const verifiedImported = new Events.ContactAddressImported({
  orcidId,
  contactAddressId: Uuid('4cd3642a-74d4-418d-a41d-d2edcd3dbcad'),
  emailAddress: Option.some(EmailAddress('josiah@example.com')),
  verificationStatus: 'verified',
})

const unverifiedImported = new Events.ContactAddressImported({
  orcidId,
  contactAddressId: Uuid('1a2c8e69-39c4-40b7-b3db-b941a74ba3e8'),
  emailAddress: Option.some(EmailAddress('josiah@example.com')),
  verificationStatus: 'unverified',
})

const verifiedAt = Temporal.Now.instant()

const verifiedPreviouslyUnverified = new Events.ContactAddressVerified({
  orcidId: unverifiedImported.orcidId,
  contactAddressId: unverifiedImported.contactAddressId,
  verifiedAt,
})

const addressRecorded = new Events.ContactAddressRecorded({
  orcidId,
  contactAddressId: Uuid('2487f220-bd30-4986-a362-429e1f6bdd60'),
  emailAddress: Option.some(EmailAddress('josiah@example.com')),
})

const addressVerified = new Events.ContactAddressVerified({
  orcidId: addressRecorded.orcidId,
  contactAddressId: addressRecorded.contactAddressId,
  verifiedAt,
})

const newerAddressRecorded = new Events.ContactAddressRecorded({
  orcidId: addressRecorded.orcidId,
  contactAddressId: Uuid('c70ba65f-96f2-4489-a1b5-43cbb41c6eff'),
  emailAddress: Option.some(EmailAddress('jc@example.com')),
})

const authorInviteAddressChosen = new Events.AuthorInviteEmailAddressChosenAsContactAddress({
  inviteId: Uuid('c6aed52a-0f7b-4d67-8fc9-64adaa4f9e38'),
  orcidId: addressRecorded.orcidId,
  emailAddress: Option.some(EmailAddress('jc@example.com')),
  chosenAt,
})

const inviteAdded = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  invitationId: inviteId,
  datasetReviewId: Uuid('fb93ef21-1539-4cc7-b8a9-beba28de40f8'),
  contactDetails: Option.some({
    name: Name('Josiah Carberry'),
    emailAddress: acceptedInvitationEmailAddress,
  }),
})

const inviteAccepted = new Events.AuthorInviteAccepted({
  invitationId: inviteAdded.invitationId,
  reviewId: Uuid('aa5a9513-d55d-4c5a-82ff-8990e63b9bad'),
  orcidId,
  acceptedAt: Temporal.Now.instant(),
})

test.fails.each<[string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.Error>]>([
  [
    'no contact address',
    [],
    { orcidId, inviteId, emailAddress, chosenAt },
    Either.right(
      Option.some(
        new Events.AuthorInviteEmailAddressChosenAsContactAddress({
          inviteId: inviteAccepted.invitationId,
          orcidId,
          emailAddress: Option.some(Option.getOrThrow(inviteAdded.contactDetails).emailAddress),
          chosenAt,
        }),
      ),
    ),
  ],
  [
    'verified imported',
    [verifiedImported],
    { orcidId, inviteId, emailAddress, chosenAt },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'unverified imported',
    [unverifiedImported],
    { orcidId, inviteId, emailAddress, chosenAt },
    Either.right(
      Option.some(
        new Events.AuthorInviteEmailAddressChosenAsContactAddress({
          inviteId,
          orcidId,
          emailAddress: Option.some(emailAddress),
          chosenAt,
        }),
      ),
    ),
  ],
  [
    'verified after imported unverified',
    [unverifiedImported, verifiedPreviouslyUnverified],
    { orcidId, inviteId, emailAddress, chosenAt },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'verified recorded',
    [addressRecorded, addressVerified],
    { orcidId, inviteId, emailAddress, chosenAt },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'unverified recorded',
    [addressRecorded],
    { orcidId, inviteId, emailAddress, chosenAt },
    Either.right(
      Option.some(
        new Events.AuthorInviteEmailAddressChosenAsContactAddress({
          inviteId,
          orcidId,
          emailAddress: Option.some(emailAddress),
          chosenAt,
        }),
      ),
    ),
  ],
  [
    'used another invite email address',
    [authorInviteAddressChosen],
    { orcidId, inviteId, emailAddress, chosenAt },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
  ],
  [
    'newer address recorded',
    [inviteAdded, inviteAccepted, authorInviteAddressChosen, newerAddressRecorded],
    { orcidId, inviteId, emailAddress, chosenAt },
    Either.right(
      Option.some(
        new Events.AuthorInviteEmailAddressChosenAsContactAddress({
          inviteId,
          orcidId,
          emailAddress: Option.some(emailAddress),
          chosenAt,
        }),
      ),
    ),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.UseAuthorInviteEmailAddressFromLegacyInvite

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
