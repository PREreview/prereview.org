import { Effect } from 'effect'
import { Locale } from '../../Context.ts'
import { Comments } from '../../Domain/Comments/index.ts'
import * as PreprintReviews from '../../Domain/PreprintReviews/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import { createFailureMessage } from './FailureMessage.ts'
import { createPreprintReviewPage } from './PreprintReviewPage.ts'
import { createRemovedMessage } from './RemovedMessage.ts'

export const PreprintReviewPage = Effect.fn('PreprintReviewPage')(
  function* ({ id }: { id: number }) {
    const locale = yield* Locale

    const review = yield* PreprintReviews.getPreprintReview(id)
    const comments = yield* Comments.getPublishedCommentsForAPrereview(review.id)

    return createPreprintReviewPage({ id, locale, review, comments })
  },
  Effect.catchTags({
    CommentsAreUnavailable: () => Locale.useSync(createFailureMessage),
    PrereviewIsNotFound: () => PageNotFound,
    PrereviewIsUnavailable: () => Locale.useSync(createFailureMessage),
    PrereviewWasRemoved: () => Locale.useSync(createRemovedMessage),
  }),
)
