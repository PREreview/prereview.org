import { Array, Context, Effect, flow, Layer, pipe, Struct, type Result } from 'effect'
import { Clubs } from '../Clubs/index.ts'
import { Commands, Queries } from '../Events/index.ts'
import type { IndeterminatePreprintId, PreprintId } from '../Preprints/index.ts'
import * as Prereviewers from '../Prereviewers/index.ts'
import { AddPublishedReviewToAClub } from './AddPublishedReviewToAClub.ts'
import { AddReviewToAClub } from './AddReviewToAClub.ts'
import * as CheckIfUserCanAddToAClub from './CheckIfUserCanAddToAClub.ts'
import { DeclareUseOfAi } from './DeclareUseOfAi.ts'
import type * as Errors from './Errors.ts'
import * as FormStore from './FormStore.ts'
import { fromPublishedPreprintReview, toPreprintPrereview } from './FromPublishedPreprintReview.ts'
import {
  GetAllPublishedPreprintReviewsForReviewsData,
  type PublishedPreprintReviewForReviewsData,
} from './GetAllPublishedPreprintReviewsForReviewsData/index.ts'
import {
  GetAllPublishedPreprintReviewsForSciety,
  type PublishedPreprintReviewForSciety,
} from './GetAllPublishedPreprintReviewsForSciety/index.ts'
import * as GetNextExpectedCommand from './GetNextExpectedCommand.ts'
import { GetPreprintReviewIdForADoi } from './GetPreprintReviewIdForADoi/index.ts'
import {
  GetPublishedPreprintReview,
  type PrereviewIsNotFound,
  type PrereviewIsUnavailable,
  type PrereviewWasRemoved,
} from './GetPublishedPreprintReview/index.ts'
import { GetPublishedPreprintReviewsForAPreprint } from './GetPublishedPreprintReviewsForAPreprint/index.ts'
import { GetRapidPrereviewsForAPreprint, type RapidPrereviewForAPreprint } from './GetRapidPrereviewsForAPreprint.ts'
import * as GetUseOfAiDetails from './GetUseOfAiDetails.ts'
import { HasAPrereviewerBeenNotifiedOfAReview } from './HasAPrereviewerBeenNotifiedOfAReview.ts'
import { ImportPreprintReview } from './ImportPreprintReview.ts'
import { MarkReviewAsNotInAClub } from './MarkReviewAsNotInAClub.ts'
import type { PreprintPrereview, Prereview } from './Prereview.ts'
import { RecordEmailSentToNotifyPrereviewerOfAPrereview } from './RecordEmailSentToNotifyPrereviewerOfAPrereview.ts'

export interface RapidPrereview {
  readonly author: Prereviewers.Persona
  readonly questions: Omit<
    RapidPrereviewForAPreprint['questions'],
    'dataLink' | 'technicalComments' | 'editorialComments'
  >
}

export class PreprintReviews extends Context.Service<
  PreprintReviews,
  {
    getAllPublishedPreprintReviewsForReviewsData: Effect.Effect<
      ReadonlyArray<PublishedPreprintReviewForReviewsData>,
      Errors.PrereviewsAreUnavailable
    >
    getAllPublishedPreprintReviewsForSciety: Effect.Effect<
      ReadonlyArray<PublishedPreprintReviewForSciety>,
      Errors.PrereviewsAreUnavailable
    >
    getForPreprint: (id: PreprintId) => Effect.Effect<ReadonlyArray<PreprintPrereview>, Errors.PrereviewsAreUnavailable>
    getPreprintReview: (
      id: number,
    ) => Effect.Effect<Prereview, PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved>
    getPreprintReviewIdForADoi: GetPreprintReviewIdForADoi
    getRapidPrereviewsForAPreprint: (
      preprintId: IndeterminatePreprintId,
    ) => Effect.Effect<ReadonlyArray<RapidPrereview>, Queries.UnableToQuery>
    recordEmailSentToNotifyPrereviewerOfAPrereview: Commands.FromStatelessCommand<
      typeof RecordEmailSentToNotifyPrereviewerOfAPrereview
    >
    hasAPrereviewerBeenNotifiedOfAReview: Queries.FromOnDemandQuery<typeof HasAPrereviewerBeenNotifiedOfAReview>
    checkIfUserCanAddToAClub: (
      input: CheckIfUserCanAddToAClub.Input,
    ) => Effect.Effect<
      Result.Result.Success<CheckIfUserCanAddToAClub.Result>,
      Result.Result.Failure<CheckIfUserCanAddToAClub.Result> | Queries.UnableToQuery
    >
    getNextExpectedCommand: (
      input: GetNextExpectedCommand.Input,
    ) => Effect.Effect<
      Result.Result.Success<GetNextExpectedCommand.Result>,
      Result.Result.Failure<GetNextExpectedCommand.Result> | Queries.UnableToQuery
    >
    getUseOfAiDetails: (
      input: GetUseOfAiDetails.Input,
    ) => Effect.Effect<
      Result.Result.Success<GetUseOfAiDetails.Result>,
      Result.Result.Failure<GetUseOfAiDetails.Result> | Queries.UnableToQuery
    >
    addReviewToAClub: ReturnType<typeof AddReviewToAClub>
    addPublishedReviewToAClub: Commands.FromCommand<ReturnType<typeof AddPublishedReviewToAClub>>
    markReviewAsNotInAClub: ReturnType<typeof MarkReviewAsNotInAClub>
    declareUseOfAi: ReturnType<typeof DeclareUseOfAi>
    importPreprintReview: Commands.FromCommand<typeof ImportPreprintReview>
  }
>()('PreprintReviews') {
  static readonly getAllPublishedPreprintReviewsForReviewsData = Effect.suspend(() =>
    PreprintReviews.use(service => service.getAllPublishedPreprintReviewsForReviewsData),
  )

  static readonly getAllPublishedPreprintReviewsForSciety = Effect.suspend(() =>
    PreprintReviews.use(service => service.getAllPublishedPreprintReviewsForSciety),
  )
}

export const getForPreprint = (...args: Parameters<(typeof PreprintReviews.Service)['getForPreprint']>) =>
  PreprintReviews.use(service => service.getForPreprint(...args))

export const getPreprintReview = (...args: Parameters<(typeof PreprintReviews.Service)['getPreprintReview']>) =>
  PreprintReviews.use(service => service.getPreprintReview(...args))

export const getRapidPrereviewsForAPreprint = (
  ...args: Parameters<(typeof PreprintReviews.Service)['getRapidPrereviewsForAPreprint']>
) => PreprintReviews.use(service => service.getRapidPrereviewsForAPreprint(...args))

export const recordEmailSentToNotifyPrereviewerOfAPrereview = (
  ...args: Parameters<(typeof PreprintReviews.Service)['recordEmailSentToNotifyPrereviewerOfAPrereview']>
) => PreprintReviews.use(service => service.recordEmailSentToNotifyPrereviewerOfAPrereview(...args))

export const hasAPrereviewerBeenNotifiedOfAReview = (
  ...args: Parameters<(typeof PreprintReviews.Service)['hasAPrereviewerBeenNotifiedOfAReview']>
) => PreprintReviews.use(service => service.hasAPrereviewerBeenNotifiedOfAReview(...args))

export const checkIfUserCanAddToAClub = (
  ...args: Parameters<(typeof PreprintReviews.Service)['checkIfUserCanAddToAClub']>
) => PreprintReviews.use(service => service.checkIfUserCanAddToAClub(...args))

export const getNextExpectedCommand = (
  ...args: Parameters<(typeof PreprintReviews.Service)['getNextExpectedCommand']>
) => PreprintReviews.use(service => service.getNextExpectedCommand(...args))

export const getUseOfAiDetails = (...args: Parameters<(typeof PreprintReviews.Service)['getUseOfAiDetails']>) =>
  PreprintReviews.use(service => service.getUseOfAiDetails(...args))

export const layer = Layer.effect(
  PreprintReviews,
  Effect.gen(function* () {
    const clubs = yield* Clubs
    const personas = yield* Prereviewers.Prereviewers

    const formStore = yield* FormStore.Store

    const getRapidPrereviewsForAPreprint = yield* Queries.makeOnDemandQuery(GetRapidPrereviewsForAPreprint)

    const clubIds = yield* Effect.map(clubs.listClubs, Array.map(Struct.get('id')))

    const getPublishedPreprintReview = yield* GetPublishedPreprintReview

    const getPreprintReview = flow(getPublishedPreprintReview, Effect.map(fromPublishedPreprintReview))

    const getForPreprint = flow(
      yield* GetPublishedPreprintReviewsForAPreprint(getPublishedPreprintReview),
      Effect.map(Array.map(toPreprintPrereview)),
    )

    const getAllPublishedPreprintReviewsForReviewsData = yield* GetAllPublishedPreprintReviewsForReviewsData

    const getAllPublishedPreprintReviewsForSciety = yield* GetAllPublishedPreprintReviewsForSciety

    return {
      getAllPublishedPreprintReviewsForReviewsData,
      getAllPublishedPreprintReviewsForSciety,
      getForPreprint,
      getPreprintReview,
      getPreprintReviewIdForADoi: yield* GetPreprintReviewIdForADoi,
      getRapidPrereviewsForAPreprint: id =>
        pipe(
          getRapidPrereviewsForAPreprint(id),
          Effect.map(
            Array.map(
              Effect.fnUntraced(
                function* (rapidPrereview) {
                  const persona = yield* Prereviewers.getPersona(rapidPrereview.author)

                  return { ...rapidPrereview, author: persona } satisfies RapidPrereview
                },
                Effect.provideService(Prereviewers.Prereviewers, personas),
              ),
            ),
          ),
          Effect.andThen(effects => Effect.all(effects, { concurrency: 'unbounded' })),
          Effect.catchTag('UnableToGetPersona', error => new Queries.UnableToQuery({ cause: error })),
          Effect.withSpan('PreprintReviews.getRapidPrereviewsForAPreprint', { attributes: { id } }),
        ),
      recordEmailSentToNotifyPrereviewerOfAPrereview: yield* Commands.makeStatelessCommand(
        RecordEmailSentToNotifyPrereviewerOfAPrereview,
      ),
      hasAPrereviewerBeenNotifiedOfAReview: yield* Queries.makeOnDemandQuery(HasAPrereviewerBeenNotifiedOfAReview),
      checkIfUserCanAddToAClub: CheckIfUserCanAddToAClub.CheckIfUserCanAddToAClub(formStore),
      getNextExpectedCommand: GetNextExpectedCommand.GetNextExpectedCommand(formStore),
      getUseOfAiDetails: GetUseOfAiDetails.GetUseOfAiDetails(formStore),
      addReviewToAClub: AddReviewToAClub(formStore, clubIds),
      addPublishedReviewToAClub: yield* Commands.makeCommand(AddPublishedReviewToAClub(clubIds)),
      markReviewAsNotInAClub: MarkReviewAsNotInAClub(formStore),
      declareUseOfAi: DeclareUseOfAi(formStore),
      importPreprintReview: yield* Commands.makeCommand(ImportPreprintReview),
    }
  }),
)
