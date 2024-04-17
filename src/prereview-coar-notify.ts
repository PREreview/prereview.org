import * as F from 'fetch-fp-ts'
import * as RIO from 'fp-ts/ReaderIO'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import { timeoutRequest } from './fetch'
import { type GenerateUuidEnv, generateUuid } from './types/uuid'

const hardcodedCoarNotifyUrl = 'https://coar-notify-sandbox.prereview.org'

const constructCoarPayload = ({ coarNotifyUrl }: { coarNotifyUrl: string }) =>
  pipe(
    generateUuid,
    RIO.map(uuid => ({
      id: uuid,
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
    })),
  )

export const publishToPrereviewCoarNotifyInbox = (): RTE.ReaderTaskEither<
  F.FetchEnv & GenerateUuidEnv,
  'unavailable',
  void
> =>
  pipe(
    RTE.rightReaderIO(constructCoarPayload({ coarNotifyUrl: hardcodedCoarNotifyUrl })),
    RTE.chainW(payload =>
      pipe(payload.target.inbox, F.Request('POST'), F.setBody(JSON.stringify(payload), 'application/json'), F.send),
    ),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(Status.Created), identity),
    RTE.bimap(
      () => 'unavailable' as const,
      () => undefined,
    ),
  )
