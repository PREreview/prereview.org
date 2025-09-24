import { HttpServerResponse } from '@effect/platform'
import { Effect, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import { clubsData } from '../../clubs-data/index.ts'
import * as FptsToEffect from '../../FptsToEffect.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Env } from './index.ts'

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
        () => HttpServerResponse.empty({ status: StatusCodes.Forbidden }),
      ),
    ),
  ),
) as P.Parser<(env: Env) => Effect.Effect<HttpServerResponse.HttpServerResponse>>
