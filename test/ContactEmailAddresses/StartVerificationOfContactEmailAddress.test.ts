import { expect, it, vi } from '@effect/vitest'
import { Effect, Either, Layer } from 'effect'
import * as _ from '../../src/ContactEmailAddresses/StartVerificationOfContactEmailAddress.ts'
import { ContactEmailAddressHasAlreadyBeenVerified } from '../../src/ContactEmailAddresses/VerifyContactEmailAddress.ts'
import { Locale } from '../../src/Context.ts'
import { Email, OrcidRecords } from '../../src/ExternalInteractions/index.ts'
import { Keyv } from '../../src/keyv.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/index.ts'

const orcidIdWithNoEmailAddress = OrcidId('0000-0002-1825-0097')
const orcidIdWithUnverified = OrcidId('0000-0002-6109-0367')
const orcidIdWithVerified = OrcidId('0000-0003-4921-6155')

const newEmailAddress = EmailAddress('new@example.com')
const existingUnverifiedEmailAddress = EmailAddress('unverified@example.com')
const existingVerifiedEmailAddress = EmailAddress('verified@example.com')

const name = Name('Josiah Carberry')

it.effect.each<[string, _.Input, Either.Either<void, _.Error>, ['verified' | 'unverified', EmailAddress], boolean]>([
  [
    'no email address',
    { orcidId: orcidIdWithNoEmailAddress, emailAddress: newEmailAddress, resumeAt: '/resume' },
    Either.void,
    ['unverified', newEmailAddress],
    true,
  ],
  [
    'same as unverified email address',
    { orcidId: orcidIdWithUnverified, emailAddress: existingUnverifiedEmailAddress, resumeAt: '/resume' },
    Either.void,
    ['unverified', existingUnverifiedEmailAddress],
    true,
  ],
  [
    'different to unverified email address',
    { orcidId: orcidIdWithUnverified, emailAddress: newEmailAddress, resumeAt: '/resume' },
    Either.void,
    ['unverified', newEmailAddress],
    true,
  ],
  [
    'same as verified email address',
    { orcidId: orcidIdWithVerified, emailAddress: existingVerifiedEmailAddress, resumeAt: '/resume' },
    Either.left(new ContactEmailAddressHasAlreadyBeenVerified()),
    ['verified', existingVerifiedEmailAddress],
    false,
  ],
  [
    'different to verified email address',
    { orcidId: orcidIdWithVerified, emailAddress: newEmailAddress, resumeAt: '/resume' },
    Either.void,
    ['unverified', newEmailAddress],
    true,
  ],
])('%s', ([, input, expectedReturn, expectedState, expectedEmail]) =>
  Effect.gen(function* () {
    const store = new Keyv()

    yield* Effect.promise(() =>
      store.set(orcidIdWithUnverified, {
        type: 'unverified',
        verificationToken: '982c8de0-5000-45cd-9f96-70fc12fe0bcb',
        value: 'foo@example.com',
      }),
    )
    yield* Effect.promise(() => store.set(orcidIdWithVerified, { type: 'verified', value: 'foo@example.com' }))

    const verifyContactEmailAddress = vi.fn<(typeof Email.Email.Service)['verifyContactEmailAddress']>(_ => Effect.void)

    const actualReturn = yield* Effect.either(
      Effect.provide(
        _.StartVerificationOfContactEmailAddress(store)(input),
        Layer.mock(Email.Email, { verifyContactEmailAddress }),
      ),
    )
    const actualState = yield* Effect.promise(() => store.get(input.orcidId))

    expect(actualReturn).toStrictEqual(expectedReturn)
    expect(actualState).toStrictEqual(expect.objectContaining({ type: expectedState[0], value: expectedState[1] }))
    if (expectedEmail) {
      expect(verifyContactEmailAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          name,
          emailAddress: input.emailAddress,
          redirectTo: input.resumeAt,
        }),
      )
    } else {
      expect(verifyContactEmailAddress).not.toHaveBeenCalled()
    }
  }).pipe(
    Effect.provide([
      Layer.succeed(Locale, DefaultLocale),
      Layer.mock(OrcidRecords.OrcidRecords, { getName: () => Effect.succeed(name) }),
      Uuid.layer,
    ]),
  ),
)
