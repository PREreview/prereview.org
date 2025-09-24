import { Effect } from 'effect'
import { Locale } from '../Context.ts'
import type { PageResponse } from '../response.ts'
import { createNoPermissionPage } from './NoPermissionPage.ts'

export const NoPermissionPage: Effect.Effect<PageResponse, never, Locale> = Effect.andThen(
  Locale,
  createNoPermissionPage,
)
