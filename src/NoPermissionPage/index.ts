import { Effect } from 'effect'
import { Locale } from '../Context.js'
import type { PageResponse } from '../response.js'
import { createNoPermissionPage } from './NoPermissionPage.js'

export const NoPermissionPage: Effect.Effect<PageResponse, never, Locale> = Effect.andThen(
  Locale,
  createNoPermissionPage,
)
