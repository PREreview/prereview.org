import { Effect } from 'effect'
import { Locale } from '../../Context.ts'
import type { PageResponse } from '../Response/index.ts'
import { createPageNotFound } from './PageNotFound.ts'

export const PageNotFound: Effect.Effect<PageResponse, never, Locale> = Effect.andThen(Locale, createPageNotFound)
