import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow } from 'fp-ts/function'
import { ServiceUnavailable } from 'http-errors'
import { exchangeAuthorizationCode, requestAuthorizationCode } from 'hyper-ts-oauth'
import { storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { handleError } from './http-error'
import { writeReviewMatch } from './routes'
import { UserC, getPseudonym } from './user'

export const logIn = requestAuthorizationCode('/authenticate')()

const OrcidUserD = D.struct({
  name: D.string,
  orcid: D.string,
})

const getUser = flow(
  exchangeAuthorizationCode(OrcidUserD),
  RTE.bindW(
    'pseudonym',
    RTE.fromTaskK(({ orcid }) => getPseudonym(orcid)),
  ),
)

export const authenticate = flow(
  RM.fromReaderTaskEitherK(getUser),
  RM.ichainFirst(() => RM.redirect(format(writeReviewMatch.formatter, {}))),
  RM.ichainW(flow(UserC.encode, storeSession)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainFirst(() => RM.end()),
  RM.orElseMiddlewareKW(() => handleError(new ServiceUnavailable())),
)
