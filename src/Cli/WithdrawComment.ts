import { Console, Effect, Option, pipe, Schema } from 'effect'
import { Command, Prompt } from 'effect/cli'
import { Comments, GetComment, type CommentPublished } from '../Domain/Comments/index.ts'
import { plainText } from '../html.ts'
import * as Doi from '../types/Doi.ts'
import { Temporal, Uuid } from '../types/index.ts'

const describeComment = (comment: CommentPublished): string =>
  [
    `PREreview: ${comment.prereviewId}`,
    `Author:    ${comment.authorId} (${comment.persona})`,
    `DOI:       ${comment.doi}`,
    `Comment:   ${plainText(comment.comment).toString()}`,
  ].join('\n')

const CommentIdOrDoiSchema = Schema.Trim.pipe(
  Schema.decodeTo(Schema.Union([Uuid.UuidSchema, Doi.DoiSchema, Doi.DoiFromUrlSchema])),
)

const findCommentId = (input: string) => {
  const idOrDoi = Schema.decodeOption(CommentIdOrDoiSchema)(input)

  if (Option.isNone(idOrDoi)) {
    return Effect.as(Console.log('Not an ID or DOI'), Option.none())
  }

  if (!Doi.isDoi(idOrDoi.value)) {
    return Effect.succeedSome(idOrDoi.value)
  }

  return pipe(
    Comments.getCommentIdForADoi(idOrDoi.value),
    Effect.map(Option.some),
    Effect.catchTags({
      CommentIsNotFound: () => Effect.as(Console.log('Not found'), Option.none()),
      UnableToQuery: () => Effect.as(Console.log('Unable to look it up'), Option.none()),
    }),
  )
}

const program = Effect.fnUntraced(function* () {
  const getComment = yield* GetComment

  const input = yield* Prompt.String({ message: 'Which comment (ID or DOI)?' })

  const commentId = yield* findCommentId(input)

  if (Option.isNone(commentId)) {
    return
  }

  const comment = yield* getComment(commentId.value)

  if (comment._tag !== 'CommentPublished') {
    return yield* Console.log('Not published')
  }

  yield* Console.log(`\n${describeComment(comment)}\n`)

  const reason = yield* Prompt.Select({ message: 'Why?', choices: [{ title: 'Spam', value: 'spam' }] })

  const confirmed = yield* Prompt.Confirm({ message: 'Withdraw this comment?' })

  if (!confirmed) {
    return
  }

  const withdrawnAt = yield* Temporal.currentInstant

  yield* Comments.withdrawComment({ commentId: commentId.value, withdrawnAt, reason })
})

export const WithdrawComment = Command.make('withdraw-comment', {}, program)
