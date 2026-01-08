/* eslint-disable import/no-internal-modules */
import { Terminal } from '@effect/platform'
import { NodeHttpClient, NodeRuntime, NodeTerminal } from '@effect/platform-node'
import { Array, Config, Effect, Layer, pipe } from 'effect'
import * as DatasetReviews from '../src/DatasetReviews/index.ts'
import * as Datasets from '../src/Datasets/index.ts'
import * as EventStore from '../src/EventStore.ts'
import { Crossref, Datacite, JapanLinkCenter, Orcid, Philsci, Zenodo } from '../src/ExternalApis/index.ts'
import * as FetchHttpClient from '../src/FetchHttpClient.ts'
import { LegacyPrereviewApi } from '../src/legacy-prereview.ts'
import * as Personas from '../src/Personas/index.ts'
import * as Preprints from '../src/Preprints/index.ts'
import * as Prereviews from '../src/Prereviews/index.ts'
import { PublicUrl } from '../src/public-url.ts'
import { OrcidId, ProfileId } from '../src/types/index.ts'

const orcidId = OrcidId.OrcidId('0000-0001-6478-3815')

const setUpFetch = Layer.effect(FetchHttpClient.Fetch, FetchHttpClient.makeFetch)

const program = Effect.gen(function* () {
  const prereviews = yield* Prereviews.getForProfile(ProfileId.forOrcid(orcidId))

  const terminal = yield* Terminal.Terminal

  yield* terminal.display(JSON.stringify(prereviews))
})

pipe(
  program,
  Effect.provide(
    pipe(
      Layer.mergeAll(NodeTerminal.layer, Prereviews.layer),
      Layer.provide(Layer.mergeAll(DatasetReviews.queriesLayer, Datasets.layer, Preprints.layer, Personas.layer)),
      Layer.provide(
        Layer.mergeAll(
          Layer.effect(
            Zenodo.ZenodoApi,
            Config.all({ key: Config.redacted('ZENODO_API_KEY'), origin: Config.url('ZENODO_URL') }),
          ),
          Layer.succeed(EventStore.EventStore, {
            all: new EventStore.FailedToGetEvents({}),
            query: () => new EventStore.FailedToGetEvents({}),
            append: () => new EventStore.FailedToCommitEvent({}),
          }),
          Orcid.layer,
          Crossref.layer,
          Datacite.layer,
          JapanLinkCenter.layer,
          Philsci.layer,
          Layer.effect(
            LegacyPrereviewApi,
            Config.all({
              app: Config.string('LEGACY_PREREVIEW_API_APP'),
              key: Config.redacted('LEGACY_PREREVIEW_API_KEY'),
              origin: Config.url('LEGACY_PREREVIEW_URL'),
              update: Config.withDefault(Config.boolean('LEGACY_PREREVIEW_UPDATE'), false),
            }),
          ),
          Layer.effect(
            Prereviews.WasPrereviewRemoved,
            pipe(
              Config.withDefault(Config.array(Config.integer(), 'REMOVED_PREREVIEWS'), []),
              Config.map(removedPrereviews =>
                Prereviews.WasPrereviewRemoved.of(id => Array.contains(removedPrereviews, id)),
              ),
            ),
          ),
        ),
      ),
      Layer.provide(
        Layer.effect(
          Orcid.OrcidApi,
          Config.all({
            origin: Config.withDefault(Config.url('ORCID_API_URL'), new URL('https://pub.orcid.org/')),
            token: Config.option(Config.redacted('ORCID_API_READ_PUBLIC_TOKEN')),
          }),
        ),
      ),
      Layer.provide(setUpFetch),
      Layer.provide(NodeHttpClient.layer),
      Layer.provide(Layer.succeed(PublicUrl, new URL('https://prereview.org/'))),
    ),
  ),
  NodeRuntime.runMain(),
)
