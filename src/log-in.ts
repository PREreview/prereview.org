import { format } from 'fp-ts-routing'
import { flow } from 'fp-ts/function'
import { ServiceUnavailable } from 'http-errors'
import { exchangeAuthorizationCode, requestAuthorizationCode } from 'hyper-ts-oauth'
import { storeSession } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { isOrcid } from 'orcid-id-ts'
import { handleError } from './http-error'
import { writeReviewMatch } from './routes'
import { UserC } from './user'

export const logIn = requestAuthorizationCode('/authenticate')()

const OrcidD = D.fromRefinement(isOrcid, 'ORCID')

const OrcidUserD = D.struct({
  name: D.string,
  orcid: OrcidD,
})

export const authenticate = flow(
  RM.fromReaderTaskEitherK(exchangeAuthorizationCode(OrcidUserD)),
  RM.ichainFirst(() => RM.redirect(format(writeReviewMatch.formatter, {}))),
  RM.ichainW(flow(UserC.encode, storeSession)),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichainFirst(() => RM.end()),
  RM.orElseMiddlewareKW(() => handleError(new ServiceUnavailable())),
)
