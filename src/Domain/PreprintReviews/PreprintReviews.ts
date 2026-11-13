import { FetchHttpClient } from 'effect/http'
import { Array, Context, Effect, flow, type Result, Layer, Option, pipe, Redacted, Scope, Struct } from 'effect'
import { Clubs } from '../Clubs/index.ts'
import * as Commands from '../../Commands.ts'
import { MakeDeprecatedLoggerEnv } from '../../DeprecatedServices.ts'
import { Zenodo } from '../../ExternalApis/index.ts'
import { ZenodoRecords } from '../../ExternalInteractions/index.ts'
import { FeatureFlags } from '../../FeatureFlags.ts'
import type { IndeterminatePreprintId, Preprints } from '../Preprints/index.ts'
import * as Prereviewers from '../Prereviewers/index.ts'
import * as Prereviews from '../Prereviews/index.ts'
import * as Queries from '../../Queries.ts'
import { EffectToFpts, FptsToEffect } from '../../RefactoringUtilities/index.ts'
import { AddReviewToAClub } from './AddReviewToAClub.ts'
import * as Errors from './Errors.ts'
import { EnrichPublishedPreprintReview } from './EnrichPublishedPreprintReview.ts'
import { GetPublishedPreprintReview } from './GetPublishedPreprintReview.ts'
import * as FormStore from './FormStore.ts'
import * as CheckIfUserCanAddToAClub from './CheckIfUserCanAddToAClub.ts'
import { DeclareUseOfAi } from './DeclareUseOfAi.ts'
import * as GetNextExpectedCommand from './GetNextExpectedCommand.ts'
import { GetRapidPrereviewsForAPreprint, type RapidPrereviewForAPreprint } from './GetRapidPrereviewsForAPreprint.ts'
import * as GetUseOfAiDetails from './GetUseOfAiDetails.ts'
import { HasAPrereviewerBeenNotifiedOfAReview } from './HasAPrereviewerBeenNotifiedOfAReview.ts'
import { MarkReviewAsNotInAClub } from './MarkReviewAsNotInAClub.ts'
import { RecordEmailSentToNotifyPrereviewerOfAPrereview } from './RecordEmailSentToNotifyPrereviewerOfAPrereview.ts'
import { ImportPreprintReview } from './ImportPreprintReview.ts'
import type { Prereview } from './Prereview.ts'

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
    getPreprintReview: (
      id: number,
    ) => Effect.Effect<
      Prereview,
      Errors.PrereviewIsNotFound | Errors.PrereviewIsUnavailable | Errors.PrereviewWasRemoved
    >
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
    markReviewAsNotInAClub: ReturnType<typeof MarkReviewAsNotInAClub>
    declareUseOfAi: ReturnType<typeof DeclareUseOfAi>
    importPreprintReview: Commands.FromCommand<typeof ImportPreprintReview>
  }
>()('PreprintReviews') {}

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

    const context = yield* Effect.map(
      Effect.context<Clubs | Prereviewers.Prereviewers | Preprints>(),
      Context.omit(Scope.Scope),
    )
    const featureFlags = yield* FeatureFlags
    const wasPrereviewRemoved = yield* Prereviews.WasPrereviewRemoved
    const fetch = yield* FetchHttpClient.Fetch
    const zenodoApi = yield* Zenodo.ZenodoApi

    const getClubByName = yield* EffectToFpts.makeTaskK(
      flow(
        clubs.getClubByName,
        Effect.map(Option.some),
        Effect.catchTag('ClubNotFound', () => Effect.succeedNone),
      ),
    )

    const getPublishedPreprintReview = yield* Queries.makeOnDemandQuery(GetPublishedPreprintReview([]))

    const getPreprintReview = (reviewId: number) =>
      pipe(
        reviewId,
        getPublishedPreprintReview,
        Effect.andThen(EnrichPublishedPreprintReview),
        Effect.catchTag(
          ['ClubNotFound', 'UnableToQuery', 'UnableToGetPersona', 'PreprintIsNotFound', 'PreprintIsUnavailable'],
          error => new Errors.PrereviewIsUnavailable({ cause: error }),
        ),
        Effect.provideContext(context),
      )

    const getPreprintReviewFromZenodo = Effect.fn('PreprintReviews.getPreprintReviewFromZenodo')(function* (
      id: number,
    ) {
      yield* Effect.annotateCurrentSpan({ id })

      const loggerEnv = yield* MakeDeprecatedLoggerEnv

      const runtime = yield* Effect.context<Preprints>()

      return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewFromZenodo(id), {
        fetch,
        getClubByName,
        runtime,
        wasPrereviewRemoved,
        zenodoApiKey: Redacted.value(zenodoApi.key),
        zenodoUrl: zenodoApi.origin,
        ...loggerEnv,
      })
    }, Effect.provide(context))

    return {
      getPreprintReview: featureFlags.useEventsForPreprintReviews ? getPreprintReview : getPreprintReviewFromZenodo,
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
      markReviewAsNotInAClub: MarkReviewAsNotInAClub(formStore),
      declareUseOfAi: DeclareUseOfAi(formStore),
      importPreprintReview: yield* Commands.makeCommand(ImportPreprintReview),
    }
  }),
)
