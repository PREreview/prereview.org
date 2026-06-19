import { expect, it } from '@effect/vitest'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Effect, Either } from 'effect'
import * as _ from '../../src/ContactEmailAddresses/VerifyContactEmailAddress.ts'
import { Keyv } from '../../src/keyv.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/Uuid.ts'

const orcidWithVerified = OrcidId('0000-0002-1825-0097')
const orcidWithUnverified = OrcidId('0000-0002-6109-0367')
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const orcidWithNoEmailAddress = OrcidId('0000-0003-4921-6155')

const validVerificationToken = Uuid('27e501e5-bc25-4975-995a-b0e789ac0865')
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const invalidVerificationToken = Uuid('784f7806-14a2-47dd-9801-00364bdf1829')

it.effect.each<[string, _.Input, Either.Either<void, _.Error>, 'verified' | 'unverified' | 'does-not-exist']>([
  // [
  //   'currently unverified, valid token',
  //   { orcid: orcidWithUnverified, verificationToken: validVerificationToken },
  //   Either.void,
  //   'verified',
  // ],
  // [
  //   'currently unverified, invalid token',
  //   { orcid: orcidWithUnverified, verificationToken: invalidVerificationToken },
  //   Either.left(new _.VerificationTokenInvalid()),
  //   'unverified',
  // ],
  // [
  //   'no email address',
  //   { orcid: orcidWithNoEmailAddress, verificationToken: validVerificationToken },
  //   Either.left(new ContactEmailAddressIsNotFound()),
  //   'does-not-exist',
  // ],
  // [
  //   'already verified',
  //   { orcid: orcidWithVerified, verificationToken: validVerificationToken },
  //   Either.left(new _.ContactEmailAddressHasAlreadyBeenVerified()),
  //   'verified',
  // ],
])('%s', ([, input, expectedReturn, expectedState]) =>
  Effect.gen(function* () {
    const store = new Keyv()

    yield* Effect.promise(() =>
      store.set(orcidWithUnverified, { type: 'unverified', verificationToken: validVerificationToken }),
    )
    yield* Effect.promise(() => store.set(orcidWithVerified, { type: 'verified' }))

    const actualReturn = yield* Effect.either(_.VerifyContactEmailAddress(store)(input))
    const actualState = yield* Effect.promise(() => store.get(input.orcid))

    expect(actualReturn).toStrictEqual(expectedReturn)
    expect(actualState).toStrictEqual(
      expectedState === 'does-not-exist' ? undefined : expect.objectContaining({ type: expectedState }),
    )
  }),
)
