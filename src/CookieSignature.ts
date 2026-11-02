import cookieSignature from 'cookie-signature'
import { Context, Data, Effect, Result, Layer, Redacted } from 'effect'
import { SessionSecret } from './Context.ts'

export class CookieSignature extends Context.Service<
  CookieSignature,
  {
    sign: (value: string) => string
    unsign: (value: string) => Result.Result<string, SignatureIsInvalid>
  }
>()('CookieSignature') {}

export const sign = (value: string) => CookieSignature.useSync(({ sign }) => sign(value))

export const unsign = (...args: Parameters<(typeof CookieSignature.Service)['unsign']>) =>
  CookieSignature.use(service => Effect.fromResult(service.unsign(...args)))

export class SignatureIsInvalid extends Data.TaggedError('SignatureIsInvalid')<{ cause?: unknown }> {}

export const make = Effect.gen(function* () {
  const secret = yield* SessionSecret

  return {
    sign: value => cookieSignature.sign(value, Redacted.value(secret)),
    unsign: value =>
      Result.gen(function* () {
        const unsigned = cookieSignature.unsign(value, Redacted.value(secret))

        if (unsigned === false) {
          return yield* Result.fail(new SignatureIsInvalid({}))
        }

        return unsigned
      }),
  } satisfies typeof CookieSignature.Service
})

export const layer = Layer.effect(CookieSignature, make)
