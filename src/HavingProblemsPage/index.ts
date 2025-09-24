import { Effect } from 'effect'
import { Locale } from '../Context.ts'
import type { PageResponse } from '../response.ts'
import { createHavingProblemsPage } from './HavingProblemsPage.ts'

export const HavingProblemsPage: Effect.Effect<PageResponse, never, Locale> = Effect.andThen(
  Locale,
  createHavingProblemsPage,
)
