import type { HttpClient, HttpClientError } from '@effect/platform'
import type { Effect, ParseResult } from 'effect'
import type { OrcidId } from '../../../types/index.js'
import type { OrcidApi } from '../OrcidApi.js'
import type { PersonalDetails } from '../PersonalDetails.js'

export declare const GetPersonalDetails: (
  orcidId: OrcidId.OrcidId,
) => Effect.Effect<
  PersonalDetails,
  ParseResult.ParseError | HttpClientError.HttpClientError,
  HttpClient.HttpClient | OrcidApi
>
