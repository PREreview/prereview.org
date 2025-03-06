import { HttpClient, type UrlParams } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { URL } from 'url'
import { RecordsC } from 'zenodo-ts'
import * as FptsToEffect from '../FptsToEffect.js'

export const getCommunityRecords = Effect.fn(function* (urlParams: UrlParams.UrlParams) {
  const httpClient = yield* HttpClient.HttpClient
  const zenodoCommunityRecordsApiUrl = new URL('https://sandbox.zenodo.org/api/communities/prereview-reviews/records')
  return yield* pipe(
    httpClient.get(zenodoCommunityRecordsApiUrl, { urlParams }),
    Effect.andThen(response => response.text),
    Effect.scoped,
    Effect.andThen(FptsToEffect.eitherK(RecordsC.decode)),
  )
})
