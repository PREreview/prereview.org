import type { UrlParams } from '@effect/platform'
import { Array, Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { isLeadFor } from '../../../Clubs/index.ts'
import { Locale } from '../../../Context.ts'
import { FeatureFlags } from '../../../FeatureFlags.ts'
import { PreprintReviews } from '../../../PreprintReviews/index.ts'
import { Preprints, type IndeterminatePreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import * as AddToAClubForm from './AddToAClubForm.ts'
import { renderAddToAClubPage } from './AddToAClubPage.ts'

export const AddToAClubPage: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, FeatureFlags | Locale | LoggedInUser | Preprints | PreprintReviews> = Effect.fn(
  'ReviewAPreprintFlow.AddToAClubPage',
)(
  function* ({ preprintId }) {
    const featureFlags = yield* FeatureFlags
    const locale = yield* Locale
    const user = yield* LoggedInUser
    const preprints = yield* Preprints
    const preprintReviews = yield* PreprintReviews

    if (!featureFlags.canClubLeadsAddReviewsToClubs) {
      return yield* PageNotFound
    }

    const clubs = isLeadFor(user.orcid)

    if (!Array.isNonEmptyReadonlyArray(clubs)) {
      return yield* PageNotFound
    }

    const preprint = yield* preprints.getPreprintTitle(preprintId)
    const choice = yield* preprintReviews.checkIfUserCanAddToAClub({ preprintId: preprint.id, orcidId: user.orcid })

    const form = AddToAClubForm.fromChoice(choice)

    return renderAddToAClubPage({ clubs, form, locale, preprint })
  },
  (result, { preprintId }) =>
    Effect.catchTags(result, {
      PreprintIsNotFound: () => PageNotFound,
      PreprintIsUnavailable: () => HavingProblemsPage,
      PreprintReviewNotFound: () =>
        Effect.succeed(RedirectResponse({ location: format(Routes.writeReviewMatch.formatter, { id: preprintId }) })),
      UnableToQuery: () => HavingProblemsPage,
    }),
)

export const AddToAClubSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preprintId,
}: {
  body: UrlParams.UrlParams
  preprintId: IndeterminatePreprintId
}): Effect.Effect<Response, never, Locale | LoggedInUser | Preprints | PreprintReviews> => HavingProblemsPage
