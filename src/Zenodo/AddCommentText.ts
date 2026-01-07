import { HttpClient, type HttpClientError, HttpClientResponse } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { sanitizeHtml } from '../html.ts'
import type * as ReviewPage from '../WebApp/review-page/index.ts' // eslint-disable-line import/no-internal-modules
import type { CommentWithoutText } from './TransformRecordToCommentWithoutText.ts'

export const addCommentText = (
  commentWithoutText: CommentWithoutText,
): Effect.Effect<ReviewPage.Comment, HttpClientError.HttpClientError, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(commentWithoutText.textUrl),
    Effect.andThen(HttpClientResponse.filterStatusOk),
    Effect.andThen(response => response.text),
    Effect.andThen(sanitizeHtml),
    Effect.andThen(text => ({
      ...commentWithoutText,
      text,
    })),
  )
