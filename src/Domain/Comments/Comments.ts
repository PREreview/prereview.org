import { Context, Effect, Layer } from 'effect'
import {
  GetPublishedCommentsForAPrereview,
  type GetPublishedCommentsForAPrereview as GetPublishedCommentsForAPrereviewMethod,
} from './GetPublishedCommentsForAPrereview/index.ts'

export class Comments extends Context.Service<
  Comments,
  {
    getPublishedCommentsForAPrereview: GetPublishedCommentsForAPrereviewMethod
  }
>()('Comments') {
  static readonly getPublishedCommentsForAPrereview = (
    ...args: Parameters<(typeof Comments.Service)['getPublishedCommentsForAPrereview']>
  ) => Comments.use(service => service.getPublishedCommentsForAPrereview(...args))
}

export const layer = Layer.effect(
  Comments,
  Effect.gen(function* () {
    return {
      getPublishedCommentsForAPrereview: yield* GetPublishedCommentsForAPrereview,
    }
  }),
)
