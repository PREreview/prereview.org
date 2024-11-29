import { Effect } from 'effect'
import type { PageResponse } from '../response.js'
import { createNoPermissionPage } from './NoPermissionPage.js'

export const NoPermissionPage: Effect.Effect<PageResponse> = Effect.sync(createNoPermissionPage)
