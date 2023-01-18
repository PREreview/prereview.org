import * as E from 'fp-ts/Either'
import { flow, identity, pipe } from 'fp-ts/function'
import { StatusOpen } from 'hyper-ts'
import { endSession as _endSession, getSession, storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { isOrcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'

export type User = C.TypeOf<typeof UserC>

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

export const UserC = C.struct({
  name: C.string,
  orcid: OrcidC,
  pseudonym: C.string,
})

export const storeUserInSession = flow(UserC.encode, storeSession)

export const endSession = pipe(
  _endSession(),
  RM.orElseW(() => RM.right(undefined as void)),
)

export function getUserFromSession<I = StatusOpen>() {
  return pipe(
    getSession<I>(),
    RM.mapLeft(error =>
      match(error)
        .with('no-session', identity)
        .otherwise(() => 'session-unavailable' as const),
    ),
    RM.chainEitherKW(
      flow(
        UserC.decode,
        E.mapLeft(() => 'no-session' as const),
      ),
    ),
  )
}
