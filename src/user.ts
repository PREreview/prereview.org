import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/function'
import { StatusOpen } from 'hyper-ts'
import { getSession, storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { isOrcid } from 'orcid-id-ts'

export type User = C.TypeOf<typeof UserC>

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

export const UserC = C.struct({
  name: C.string,
  orcid: OrcidC,
  pseudonym: C.string,
})

export const storeUserInSession = flow(UserC.encode, storeSession)

export function getUserFromSession<I = StatusOpen>() {
  return pipe(
    getSession<I>(),
    RM.chainEitherK(
      flow(
        UserC.decode,
        E.mapLeft(() => 'no-session' as const),
      ),
    ),
  )
}
