import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RE from 'fp-ts/ReaderEither'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { constant, flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import { ServiceUnavailable } from 'http-errors'
import { exchangeAuthorizationCode, requestAuthorizationCode } from 'hyper-ts-oauth'
import { storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { Orcid, isOrcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { handleError } from './http-error'
import { homeMatch } from './routes'
import { UserC } from './user'

export interface PublicUrlEnv {
  publicUrl: URL
}

export interface GetPseudonymEnv {
  getPseudonym: (orcid: Orcid) => TE.TaskEither<unknown, string>
}

export const logIn = pipe(
  RM.decodeHeader(
    'Referer',
    flow(
      O.fromPredicate(isString),
      O.match(() => E.right(''), E.right),
    ),
  ),
  RM.ichainW(requestAuthorizationCode('/authenticate')),
)

const OrcidD = D.fromRefinement(isOrcid, 'ORCID')

const OrcidUserD = D.struct({
  name: D.string,
  orcid: OrcidD,
})

const getPseudonym = (orcid: Orcid): RTE.ReaderTaskEither<GetPseudonymEnv, unknown, string> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPseudonym }: GetPseudonymEnv) => getPseudonym(orcid)))

export const authenticate = flow(
  (code: string, state: string) => RM.of({ code, state }),
  RM.bind('referer', RM.fromReaderTaskK(flow(get('state'), RT.fromReaderK(getReferer)))),
  RM.bindW('user', RM.fromReaderTaskEitherK(flow(get('code'), exchangeAuthorizationCode(OrcidUserD)))),
  RM.bindW('pseudonym', RM.fromReaderTaskEitherK(flow(get('user.orcid'), getPseudonym))),
  RM.ichainFirstW(flow(get('referer'), RM.redirect)),
  RM.ichainW(flow(({ user, pseudonym }) => ({ ...user, pseudonym }), UserC.encode, storeSession)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainFirst(() => RM.end()),
  RM.orElseW(() => handleError(new ServiceUnavailable())),
)

function getReferer(state: string) {
  return pipe(
    RE.fromEither(E.tryCatch(() => new URL(state), constant('not-a-url'))),
    RE.chain(ifHasSameOrigin),
    RE.match(
      () => format(homeMatch.formatter, {}),
      referer => referer.href,
    ),
  )
}

function ifHasSameOrigin(url: URL) {
  return RE.asksReaderEither(({ publicUrl }: PublicUrlEnv) =>
    pipe(
      url,
      RE.fromPredicate(url => url.origin === publicUrl.origin, constant('different-origin')),
    ),
  )
}
