import { Effect } from 'effect'
import { Locale } from '../Context.ts'
import type { PageResponse } from '../response.ts'
import { createPageNotFound } from './PageNotFound.ts'

export const PageNotFound: Effect.Effect<PageResponse, never, Locale> = Effect.andThen(Locale, createPageNotFound)
