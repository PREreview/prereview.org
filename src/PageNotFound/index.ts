import { Effect } from 'effect'
import { Locale } from '../Context.js'
import type { PageResponse } from '../response.js'
import { createPageNotFound } from './PageNotFound.js'

export const PageNotFound: Effect.Effect<PageResponse, never, Locale> = Effect.andThen(Locale, createPageNotFound)
