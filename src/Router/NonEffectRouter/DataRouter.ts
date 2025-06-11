import { HttpServerResponse } from '@effect/platform'
import { Effect, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import { StatusCodes } from 'http-status-codes'
import { clubsData } from '../../clubs-data/index.js'
import * as FptsToEffect from '../../FptsToEffect.js'
import * as Routes from '../../routes.js'
import type { Env } from './index.js'

export const DataRouter = pipe(
  [
    pipe(
      Routes.clubsDataMatch.parser,
      P.map(() => clubsData),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(handler =>
    Effect.fn(
      function* (env: Env) {
        const json = yield* FptsToEffect.readerTaskEither(handler(env.authorizationHeader ?? ''), {
          scietyListToken: Redacted.value(env.scietyListToken),
        })

        return yield* HttpServerResponse.raw(json, { status: StatusCodes.OK, contentType: 'application/json' })
      },
      Effect.catchIf(
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (error): error is 'forbidden' => error === 'forbidden',
        () => HttpServerResponse.empty({ status: StatusCodes.FORBIDDEN }),
      ),
    ),
  ),
) as P.Parser<(env: Env) => Effect.Effect<HttpServerResponse.HttpServerResponse>>
