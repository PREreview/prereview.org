import { Context, Effect, Layer } from 'effect'
import { Commands } from '../Events/index.ts'
import {
  GetPublishedCommentsForAPrereview,
  type GetPublishedCommentsForAPrereview as GetPublishedCommentsForAPrereviewMethod,
} from './GetPublishedCommentsForAPrereview/index.ts'
import { WithdrawComment } from './WithdrawComment.ts'

export class Comments extends Context.Service<
  Comments,
  {
    getPublishedCommentsForAPrereview: GetPublishedCommentsForAPrereviewMethod
    withdrawComment: Commands.FromCommand<typeof WithdrawComment>
  }
>()('Comments') {
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
      getPublishedCommentsForAPrereview: yield* GetPublishedCommentsForAPrereview,
      withdrawComment: yield* Commands.makeCommand(WithdrawComment),
    }
  }),
)
