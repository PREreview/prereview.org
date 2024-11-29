import { Effect } from 'effect'
import { Locale } from '../Context.js'
import type { PageResponse } from '../response.js'
import { createHavingProblemsPage } from './HavingProblemsPage.js'

export const HavingProblemsPage: Effect.Effect<PageResponse, never, Locale> = Effect.andThen(
  Locale,
  createHavingProblemsPage,
)
