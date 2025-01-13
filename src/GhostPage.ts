import { Context, Data, type Effect } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
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
