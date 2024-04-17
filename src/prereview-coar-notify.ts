import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import { timeoutRequest } from './fetch'

export const publishToPrereviewCoarNotifyInbox = (): RTE.ReaderTaskEither<F.FetchEnv, 'unavailable', void> =>
  pipe(
    'http://www.example.com/',
    F.Request('POST'),
    F.setBody(JSON.stringify({}), 'application/json'),
    F.send,
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(Status.Created), identity),
    RTE.bimap(
      () => 'unavailable' as const,
      () => undefined,
    ),
  )
