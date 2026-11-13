import { Effect } from 'effect'
import { AuthorInvites } from '../../../Domain/AuthorInvites/index.ts'
import { Locale } from '../../../Context.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { renderPublishedPage } from './PublishedPage.ts'

export const PublishedPage: (input: {
  reviewId: Uuid
}) => Effect.Effect<Response, never, Locale | LoggedInUser | AuthorInvites> = Effect.fn(
  'AuthorInviteFlow.PublishedPage',
)(
  function* ({ reviewId }) {
    const authorInvites = yield* AuthorInvites
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const hasConfirmedChoices = yield* authorInvites.hasAPrereviewerConfirmedTheirAuthorChoices({
      reviewId,
      orcidId: user.orcid,
    })

    if (!hasConfirmedChoices) {
      return RedirectResponse({ location: Routes.AuthorInviteConfirmAuthorChoices.href({ reviewId }) })
    }

    return renderPublishedPage({ reviewId, locale })
  },
  Effect.catchTags({
    PrereviewerIsNotListedOnTheReview: () => PageNotFound,
    UnableToQuery: () => HavingProblemsPage,
  }),
)
