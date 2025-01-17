import { FetchHttpClient } from '@effect/platform'
import { Context, Data, Effect, flow, Layer, Match, pipe } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as FptsToEffect from './FptsToEffect.js'
import { getPage, GhostApi } from './ghost.js'
import type { Html } from './html.js'

export class PageIsNotFound extends Data.TaggedError('PageIsNotFound') {}

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: string) => Effect.Effect<Html, PageIsUnavailable | PageIsNotFound>
>() {}

export interface GetPageFromGhostEnv {
  getPageFromGhost: (id: string) => TE.TaskEither<'unavailable' | 'not-found', Html>
}

export const getPageFromGhost = (id: string) =>
  R.asks(({ getPageFromGhost }: GetPageFromGhostEnv) => getPageFromGhost(id))

export const layer = Layer.effect(
  GetPageFromGhost,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const ghostApi = yield* GhostApi
    return id =>
      pipe(
        Effect.if(id === '6154aa157741400e8722bb14', {
          onTrue: () => Effect.log('Loading about-us page'),
          onFalse: () => Effect.void,
        }),
        Effect.andThen(
          FptsToEffect.readerTaskEither(getPage(id), {
            fetch,
            ghostApi,
          }),
        ),
        Effect.mapError(
          flow(
            Match.value,
            Match.when('not-found', () => new PageIsNotFound()),
            Match.when('unavailable', () => new PageIsUnavailable()),
            Match.exhaustive,
          ),
        ),
      )
  }),
)
