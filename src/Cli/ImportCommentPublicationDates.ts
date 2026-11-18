import { Command } from 'effect/cli'
import { Array, Console, Effect, pipe, Result, Schema, Stdio, Stream } from 'effect'
import * as Comments from '../Domain/Comments/index.ts'
import { Doi, Temporal } from '../types/index.ts'

const CommentToImportSchema = Schema.Struct({ doi: Doi.DoiSchema, publishedAt: Temporal.InstantSchema })

const program = Effect.fnUntraced(function* () {
  const getCommentIdForDoi = yield* Comments.GetCommentIdForDoi
  const importPublicationDateForComment = yield* Comments.ImportPublicationDateForComment

  const stdio = yield* Stdio.Stdio

  const input = yield* Stream.mkString(Stream.decodeText(stdio.stdin))

  const items = yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Array(CommentToImportSchema)))(input)

  yield* Console.log(`importing publication dates for ${Array.length(items)} comments`)

  const results = yield* Effect.forEach(items, item =>
    pipe(
      getCommentIdForDoi(item.doi),
      Effect.flatMap(commentId => importPublicationDateForComment({ commentId, publishedAt: item.publishedAt })),
      Effect.result,
      Effect.map(Result.mapError(error => ({ doi: item.doi, error }))),
    ),
  )

  const [successes, failures] = Array.separate(results)

  yield* Console.log(`successfully processed ${Array.length(successes)} comments`)

  if (Array.isArrayNonEmpty(failures)) {
    yield* Console.error(`failed to import ${Array.length(failures)} comments:`)
    yield* Effect.forEach(failures, ({ doi, error }) => Console.error(`  ${doi}: ${error._tag}`))
  }
})

export const ImportCommentPublicationDates = Command.make('import-comment-publication-dates', {}, program)
