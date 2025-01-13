import { Context, Data, type Effect } from 'effect'
import type { Html } from './html.js'

export class PageIsNotFound extends Data.TaggedError('PageIsNotFound') {}

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: string) => Effect.Effect<Html, PageIsUnavailable | PageIsNotFound>
>() {}
