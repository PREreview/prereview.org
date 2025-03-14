import { HttpClient, type HttpClientError, HttpClientResponse } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { sanitizeHtml } from '../html.js'
import type * as ReviewPage from '../review-page/index.js'
import type { CommentWithoutText } from './TransformRecordToCommentWithoutText.js'

export const addCommentText = (
  commentWithoutText: CommentWithoutText,
): Effect.Effect<ReviewPage.Comment, HttpClientError.HttpClientError, HttpClient.HttpClient> =>
  pipe(
    HttpClient.get(commentWithoutText.textUrl),
    Effect.andThen(HttpClientResponse.filterStatusOk),
    Effect.andThen(response => response.text),
    Effect.andThen(sanitizeHtml),
    Effect.scoped,
    Effect.andThen(text => ({
      ...commentWithoutText,
      text,
    })),
  )
