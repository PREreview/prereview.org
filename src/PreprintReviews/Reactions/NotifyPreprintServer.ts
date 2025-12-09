import { Effect, Match, pipe } from 'effect'
import { CoarNotify } from '../../ExternalApis/index.ts'
import * as FeatureFlags from '../../FeatureFlags.ts'
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

    if (sendCoarNotifyMessages === true) {
      return yield* Effect.fail('not implemented')
    }

    const target: CoarNotify.AnnounceReview['target'] = {
      id: new URL('https://coar-notify-inbox.fly.dev'),
      inbox: new URL('https://coar-notify-inbox.fly.dev/inbox'),
      type: 'Service',
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
      target,
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
