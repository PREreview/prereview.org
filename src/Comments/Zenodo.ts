import { Context, Effect, flow, Layer, Match, Option, pipe, Redacted, Scope } from 'effect'
import { MakeDeprecatedLoggerEnv } from '../DeprecatedServices.ts'
import { Zenodo } from '../ExternalApis/index.ts'
import { ZenodoRecords } from '../ExternalInteractions/index.ts'
import * as FetchHttpClient from '../FetchHttpClient.ts'
import { html } from '../html.ts'
import { DefaultLocale, translate } from '../locales/index.ts'
import * as Prereviewers from '../Prereviewers/index.ts'
import * as Prereviews from '../Prereviews/index.ts'
import { PublicUrl } from '../public-url.ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import {
  CreateRecordOnZenodoForComment,
  PublishCommentOnZenodo,
  UnableToAssignADoi,
  UnableToPublishComment,
} from './Context.ts'

const createRecordOnZenodoForComment = Layer.effect(
  CreateRecordOnZenodoForComment,
  Effect.gen(function* () {
    const context = yield* Effect.map(
      Effect.context<Prereviewers.Prereviewers | Prereviews.Prereviews>(),
      Context.omit(Scope.Scope),
    )
    const fetch = yield* FetchHttpClient.Fetch
    const publicUrl = yield* PublicUrl
    const zenodoApi = yield* Zenodo.ZenodoApi

    const env = {
      fetch,
      publicUrl,
      zenodoApiKey: Redacted.value(zenodoApi.key),
      zenodoUrl: zenodoApi.origin,
    }

    return comment =>
      Effect.gen(function* () {
        const prereview = yield* pipe(
          Prereviews.getPrereview(comment.prereviewId),
          Effect.mapError(
            Match.valueTags({
              PrereviewIsNotFound: error => new UnableToAssignADoi({ cause: error }),
              PrereviewIsUnavailable: error => new UnableToAssignADoi({ cause: error }),
              PrereviewWasRemoved: error => new UnableToAssignADoi({ cause: error }),
            }),
          ),
        )

        const author = yield* Effect.catchTag(
          Prereviewers.getPersona({ orcidId: comment.authorId, persona: comment.persona }),
          'UnableToGetPersona',
          error => new UnableToAssignADoi({ cause: error }),
        )

        const text = html`${comment.comment}

          <h2>${translate(DefaultLocale, 'write-comment-flow', 'competingInterestsHeading')()}</h2>

          <p>
            ${Option.getOrElse(comment.competingInterests, () =>
              translate(DefaultLocale, 'write-comment-flow', 'noCompetingInterests')(),
            )}
          </p>`

        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* pipe(
          FptsToEffect.readerTaskEither(
            ZenodoRecords.createCommentOnZenodo({
              ...comment,
              comment: text,
              author,
              prereview,
            }),
            { ...env, ...loggerEnv },
          ),
          Effect.mapError(
            flow(
              Match.value,
              Match.when('unavailable', () => new UnableToAssignADoi({})),
              Match.exhaustive,
            ),
          ),
        )
      }).pipe(Effect.provide(context))
  }),
)

const publishCommentOnZenodo = Layer.effect(
  PublishCommentOnZenodo,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const zenodoApi = yield* Zenodo.ZenodoApi

    return Effect.fn(
      function* (comment) {
        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* FptsToEffect.readerTaskEither(ZenodoRecords.publishDepositionOnZenodo(comment), {
          fetch,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
          ...loggerEnv,
        })
      },
      Effect.mapError(
        flow(
          Match.value,
          Match.when('unavailable', () => new UnableToPublishComment({})),
          Match.exhaustive,
        ),
      ),
    )
  }),
)

export const layerZenodo = Layer.mergeAll(createRecordOnZenodoForComment, publishCommentOnZenodo)
