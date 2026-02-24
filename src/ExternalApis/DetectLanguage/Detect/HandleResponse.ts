import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { DetectLanguageIsUnavailable } from '../DetectLanguageApi.ts'
import { LanguageCandidates } from './LanguageCandidates.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(LanguageCandidates)),
  Effect.catchTag('ResponseError', 'ParseError', error => new DetectLanguageIsUnavailable({ cause: error })),
)
