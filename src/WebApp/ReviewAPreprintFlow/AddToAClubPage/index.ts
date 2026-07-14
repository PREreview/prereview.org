import type { UrlParams } from '@effect/platform'
import { Array, Effect, Match } from 'effect'
import { format } from 'fp-ts-routing'
import { Clubs, isClubId } from '../../../Clubs/index.ts'
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
}) => Effect.Effect<Response, never, Clubs | FeatureFlags | Locale | LoggedInUser | Preprints | PreprintReviews> =
  Effect.fn('ReviewAPreprintFlow.AddToAClubPage')(
    function* ({ preprintId }) {
      const clubs = yield* Clubs
      const featureFlags = yield* FeatureFlags
      const locale = yield* Locale
      const user = yield* LoggedInUser
      const preprints = yield* Preprints
      const preprintReviews = yield* PreprintReviews

      if (!featureFlags.canClubLeadsAddReviewsToClubs) {
        return yield* PageNotFound
      }

      const ledClubs = yield* clubs.getClubsThatAPrereviewerLeads(user.orcid)

      if (!Array.isNonEmptyReadonlyArray(ledClubs)) {
        return yield* PageNotFound
      }

      const preprint = yield* preprints.getPreprintTitle(preprintId)
      const choice = yield* preprintReviews.checkIfUserCanAddToAClub({ preprintId: preprint.id, orcidId: user.orcid })

      const form = AddToAClubForm.fromChoice(choice)

      return renderAddToAClubPage({ clubs: ledClubs, form, locale, preprint })
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

export const AddToAClubSubmission: ({
  body,
  preprintId,
}: {
  body: UrlParams.UrlParams
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Clubs | FeatureFlags | Locale | LoggedInUser | Preprints | PreprintReviews> =
  Effect.fn('ReviewAPreprintFlow.AddToAClubSubmission')(
    function* ({ body, preprintId }) {
      const clubs = yield* Clubs
      const featureFlags = yield* FeatureFlags
      const locale = yield* Locale
      const user = yield* LoggedInUser
      const preprints = yield* Preprints
      const preprintReviews = yield* PreprintReviews

      if (!featureFlags.canClubLeadsAddReviewsToClubs) {
        return yield* PageNotFound
      }

      const ledClubs = yield* clubs.getClubsThatAPrereviewerLeads(user.orcid)

      if (!Array.isNonEmptyReadonlyArray(ledClubs)) {
        return yield* PageNotFound
      }

      const preprint = yield* preprints.getPreprintTitle(preprintId)

      const form = AddToAClubForm.fromBody(body)

      return yield* Match.valueTags(form, {
        CompletedForm: Effect.fnUntraced(function* (form: AddToAClubForm.CompletedForm) {
          if (form.addToClub === 'not-a-club-review') {
            yield* preprintReviews.markReviewAsNotInAClub({ preprintId: preprint.id, orcidId: user.orcid })
          } else {
            if (!isClubId(form.addToClub)) {
              return yield* HavingProblemsPage
            }

            yield* preprintReviews.addReviewToAClub({
              preprintId: preprint.id,
              orcidId: user.orcid,
              clubId: form.addToClub,
            })
          }

          return RedirectResponse({ location: format(Routes.writeReviewPublishMatch.formatter, { id: preprint.id }) })
        }),
        InvalidForm: Effect.fnUntraced(function* (form: AddToAClubForm.InvalidForm) {
          return yield* Effect.succeed(renderAddToAClubPage({ clubs: ledClubs, form, locale, preprint }))
        }),
      })
    },
    (result, { preprintId }) =>
      Effect.catchTags(result, {
        PreprintIsNotFound: () => PageNotFound,
        PreprintIsUnavailable: () => HavingProblemsPage,
        PreprintReviewNotFound: () =>
          Effect.succeed(RedirectResponse({ location: format(Routes.writeReviewMatch.formatter, { id: preprintId }) })),
        UnableToHandleCommand: () => HavingProblemsPage,
      }),
  )
