import { toUrl } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as RIO from 'fp-ts/ReaderIO'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import type { ReviewRequestPreprintId } from '../review-request'
import { profileMatch } from '../routes'
import type { ProfileId } from '../types/profile-id'
import { type GenerateUuidEnv, generateUuid } from '../types/uuid'
import type { User } from '../user'
import type { CoarReviewActionOfferPayload } from './coar-review-action-offer-payload'

export const constructCoarPayload = ({
  coarNotifyUrl,
  persona,
  preprint,
  user,
}: {
  coarNotifyUrl: URL
  persona: 'public' | 'pseudonym'
  preprint: ReviewRequestPreprintId
  user: User
}): RIO.ReaderIO<GenerateUuidEnv, CoarReviewActionOfferPayload> =>
  pipe(
    generateUuid,
    RIO.map(uuid => ({
      id: uuid,
      '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify'],
      type: ['Offer', 'coar-notify:ReviewAction'],
      origin: {
        id: coarNotifyUrl.href,
        inbox: new URL('/inbox', coarNotifyUrl).href,
        type: 'Service',
      },
      target: {
        id: coarNotifyUrl.href,
        inbox: new URL('/inbox', coarNotifyUrl).href,
        type: 'Service',
      },
      object: {
        id: preprint.value,
        'ietf:cite-as': toUrl(preprint.value).href,
      },
      actor: {
        id: `https://prereview.org${format(profileMatch.formatter, {
          profile: match(persona)
            .returnType<ProfileId>()
            .with('public', () => ({ type: 'orcid', value: user.orcid }))
            .with('pseudonym', () => ({ type: 'pseudonym', value: user.pseudonym }))
            .exhaustive(),
        })}`,
        type: 'Person',
        name: match(persona)
          .with('public', () => user.name)
          .with('pseudonym', () => user.pseudonym)
          .exhaustive(),
      },
    })),
  )
