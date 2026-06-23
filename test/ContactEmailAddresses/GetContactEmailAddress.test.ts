import { expect, it } from '@effect/vitest'
import { Effect, Either } from 'effect'
import * as _ from '../../src/ContactEmailAddresses/GetContactEmailAddress.ts'
import {
  ContactEmailAddressIsNotFound,
  UnverifiedContactEmailAddress,
  VerifiedContactEmailAddress,
} from '../../src/ContactEmailAddresses/index.ts'
import { Keyv } from '../../src/keyv.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const orcidIdWithNoEmailAddress = OrcidId('0000-0002-1825-0097')
const orcidIdWithUnverified = OrcidId('0000-0002-6109-0367')
const orcidIdWithVerified = OrcidId('0000-0003-4921-6155')

const existingUnverifiedEmailAddress = new UnverifiedContactEmailAddress({
  value: EmailAddress('unverified@example.com'),
  verificationToken: Uuid('982c8de0-5000-45cd-9f96-70fc12fe0bcb'),
})
const existingVerifiedEmailAddress = new VerifiedContactEmailAddress({
  value: EmailAddress('verified@example.com'),
})

it.effect.each<[string, _.Input, _.Result]>([
  ['no email address', orcidIdWithNoEmailAddress, Either.left(new ContactEmailAddressIsNotFound())],
  ['unverified email address', orcidIdWithUnverified, Either.right(existingUnverifiedEmailAddress)],
  ['verified email address', orcidIdWithVerified, Either.right(existingVerifiedEmailAddress)],
])('%s', ([, input, expectedReturn]) =>
  Effect.gen(function* () {
    const store = new Keyv()

    yield* Effect.promise(() =>
      store.set(orcidIdWithUnverified, {
        type: 'unverified',
        verificationToken: existingUnverifiedEmailAddress.verificationToken,
        value: existingUnverifiedEmailAddress.value,
      }),
    )
    yield* Effect.promise(() =>
      store.set(orcidIdWithVerified, { type: 'verified', value: existingVerifiedEmailAddress.value }),
    )

    const actualReturn = yield* Effect.either(_.GetContactEmailAddress(store)(input))

    expect(actualReturn).toStrictEqual(expectedReturn)
  }),
)
