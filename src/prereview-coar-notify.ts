import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import { timeoutRequest } from './fetch'

const hardcodedCoarNotifyUrl = 'https://coar-notify-sandbox.prereview.org'

const constructCoarPayload = ({ coarNotifyUrl }: { coarNotifyUrl: string }) => ({
  id: '78965d36-830d-47c3-b0b7-01ed47cbec28',
  '@context': ['https://www.w3.org/ns/activitystreams', 'https://purl.org/coar/notify'],
  type: ['Offer', 'coar-notify:ReviewAction'],
  origin: {
    id: coarNotifyUrl,
    inbox: `${coarNotifyUrl}/inbox`,
    type: 'Service',
  },
  target: {
    id: coarNotifyUrl,
    inbox: `${coarNotifyUrl}/inbox`,
    type: 'Service',
  },
  object: {
    id: '10.1101/2024.02.07.578830',
    'ietf:cite-as': 'https://doi.org/10.1101/2024.02.07.578830',
  },
  actor: {
    id: 'https://prereview.org',
    type: 'Person',
    name: 'A PREreviewer',
  },
})

export const publishToPrereviewCoarNotifyInbox = (): RTE.ReaderTaskEither<F.FetchEnv, 'unavailable', void> =>
  pipe(
    `${hardcodedCoarNotifyUrl}/inbox`,
    F.Request('POST'),
    F.setBody(JSON.stringify(constructCoarPayload({ coarNotifyUrl: hardcodedCoarNotifyUrl })), 'application/json'),
    F.send,
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(Status.Created), identity),
    RTE.bimap(
      () => 'unavailable' as const,
      () => undefined,
    ),
  )
