import { Effect } from 'effect'
import type { PageResponse } from '../response.js'
import { createPageNotFound } from './PageNotFound.js'

export const PageNotFound: Effect.Effect<PageResponse> = Effect.sync(createPageNotFound)
