import { Context, Effect, Layer } from 'effect'
import { Commands } from '../Events/index.ts'
import {
  GetCommentIdForADoi,
  type GetCommentIdForADoi as GetCommentIdForADoiMethod,
} from './GetCommentIdForADoi/index.ts'
import {
  GetPublishedCommentsForAPrereview,
  type GetPublishedCommentsForAPrereview as GetPublishedCommentsForAPrereviewMethod,
} from './GetPublishedCommentsForAPrereview/index.ts'
import { WithdrawComment } from './WithdrawComment.ts'

export class Comments extends Context.Service<
  Comments,
  {
    getCommentIdForADoi: GetCommentIdForADoiMethod
    getPublishedCommentsForAPrereview: GetPublishedCommentsForAPrereviewMethod
    withdrawComment: Commands.FromCommand<typeof WithdrawComment>
  }
>()('Comments') {
  static readonly getCommentIdForADoi = (...args: Parameters<(typeof Comments.Service)['getCommentIdForADoi']>) =>
    Comments.use(service => service.getCommentIdForADoi(...args))

  static readonly getPublishedCommentsForAPrereview = (
    ...args: Parameters<(typeof Comments.Service)['getPublishedCommentsForAPrereview']>
  ) => Comments.use(service => service.getPublishedCommentsForAPrereview(...args))

  static readonly withdrawComment = (...args: Parameters<(typeof Comments.Service)['withdrawComment']>) =>
    Comments.use(service => service.withdrawComment(...args))
}

export const layer = Layer.effect(
  Comments,
  Effect.gen(function* () {
    return {
      getCommentIdForADoi: yield* GetCommentIdForADoi,
      getPublishedCommentsForAPrereview: yield* GetPublishedCommentsForAPrereview,
      withdrawComment: yield* Commands.makeCommand(WithdrawComment),
    }
  }),
)
