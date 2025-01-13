import { Context, type Effect } from 'effect'
import type { Html } from './html.js'

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: string) => Effect.Effect<Html, 'unavailable' | 'not-found'>
>() {}
