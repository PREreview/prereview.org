import { hasRegistrant, parse } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as M from 'hyper-ts/lib/Middleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { seeOther } from './middleware'
import { homeMatch, preprintMatch } from './routes'

const DoiD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'DOI'))(parse(s))),
  D.refine(hasRegistrant('1101', '1590'), 'DOI'),
)

const LookupDoiD = pipe(
  D.struct({
    doi: DoiD,
  }),
  D.map(get('doi')),
)

export const lookupDoi = pipe(
  M.decodeBody(LookupDoiD.decode),
  M.ichain(doi => seeOther(format(preprintMatch.formatter, { doi }))),
  M.orElse(() => seeOther(format(homeMatch.formatter, {}))),
)
