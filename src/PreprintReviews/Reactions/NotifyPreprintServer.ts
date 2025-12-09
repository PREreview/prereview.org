import { Effect, Match, Option, pipe } from 'effect'
import { CoarNotify } from '../../ExternalApis/index.ts'
import * as FeatureFlags from '../../FeatureFlags.ts'
import * as PreprintServers from '../../PreprintServers/index.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import * as PublicUrl from '../../public-url.ts'
import * as Routes from '../../routes.ts'
import { Doi, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export const NotifyPreprintServer = Effect.fn(
  function* (reviewId: number) {
    const sendCoarNotifyMessages = yield* FeatureFlags.sendCoarNotifyMessages

    if (sendCoarNotifyMessages === false) {
      return
    }

    const prereview = yield* Prereviews.getPrereview(reviewId)

    const target = pipe(
      Match.value(sendCoarNotifyMessages),
      Match.withReturnType<Option.Option<CoarNotify.AnnounceReview['target']>>(),
      Match.when('sandbox', () =>
        Option.some({
          id: new URL('https://coar-notify-inbox.fly.dev'),
          inbox: new URL('https://coar-notify-inbox.fly.dev/inbox'),
          type: 'Service',
        }),
      ),
      Match.when(true, () => PreprintServers.getCoarNotifyTarget(prereview.preprint.id)),
      Match.exhaustive,
    )

    if (Option.isNone(target)) {
      return
    }

    const context: CoarNotify.AnnounceReview['context'] = pipe(
      Match.value(prereview.preprint.id),
      Match.tag('PhilsciPreprintId', id => ({
        id: new URL(`https://philsci-archive.pitt.edu/${id.value}/`),
        'ietf:cite-as': new URL(`https://philsci-archive.pitt.edu/${id.value}/`),
      })),
      Match.orElse(id => ({
        id: Doi.toUrl(id.value),
        'ietf:cite-as': id.value,
      })),
    )

    yield* CoarNotify.sendMessage({
      id: new URL(`urn:uuid:${yield* Uuid.generateUuid}`),
      '@context': ['https://www.w3.org/ns/activitystreams', 'https://coar-notify.net'],
      type: ['Announce', 'coar-notify:ReviewAction'],
      origin: {
        id: yield* PublicUrl.forRoute(Routes.HomePage, {}),
        inbox: yield* PublicUrl.forRoute(Routes.Inbox, {}),
        type: 'Service',
      },
      target: target.value,
      context,
      object: {
        id: yield* PublicUrl.forRoute(Routes.reviewMatch.formatter, { id: prereview.id }),
        'ietf:cite-as': prereview.doi,
        type: ['Page', 'sorg:Review'],
      },
    })
  },
  Effect.catchAll(error => new Errors.FailedToNotifyPreprintServer({ cause: error })),
)
