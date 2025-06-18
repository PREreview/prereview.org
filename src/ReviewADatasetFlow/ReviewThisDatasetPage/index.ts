import { Effect } from 'effect'
import type * as Response from '../../response.js'
import { ReviewThisDatasetPage as MakeResponse } from './ReviewThisDatasetPage.js'

export const ReviewThisDatasetPage: Effect.Effect<Response.Response> = Effect.sync(MakeResponse)
