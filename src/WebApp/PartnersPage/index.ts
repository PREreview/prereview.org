import { Effect } from 'effect'
import { Locale } from '../../Context.ts'
import type { PageResponse } from '../Response/index.ts'
import { createPage } from './PartnersPage.ts'

export const PartnersPage: Effect.Effect<PageResponse, never, Locale> = Locale.useSync(createPage).pipe(
  Effect.withSpan('PartnersPage'),
)
