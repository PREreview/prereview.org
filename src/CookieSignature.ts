import cookieSignature from 'cookie-signature'
import { Context, Data, Effect, Either, Layer, Redacted } from 'effect'
import { SessionSecret } from './Context.ts'

export class CookieSignature extends Context.Tag('CookieSignature')<
  CookieSignature,
  {
    sign: (value: string) => string
    unsign: (value: string) => Either.Either<string, SignatureIsInvalid>
  }
>() {}

export const sign = (value: string) => Effect.andThen(CookieSignature, ({ sign }) => sign(value))

export const { unsign } = Effect.serviceFunctions(CookieSignature)

export class SignatureIsInvalid extends Data.TaggedError('SignatureIsInvalid')<{ cause?: unknown }> {}

export const make = Effect.gen(function* () {
  const secret = yield* SessionSecret

  return {
    sign: value => cookieSignature.sign(value, Redacted.value(secret)),
    unsign: value =>
      Either.gen(function* () {
        const unsigned = cookieSignature.unsign(value, Redacted.value(secret))

        if (unsigned === false) {
          return yield* Either.left(new SignatureIsInvalid({}))
        }

        return unsigned
      }),
  } satisfies typeof CookieSignature.Service
})

export const layer = Layer.effect(CookieSignature, make)
