import { isDoi } from 'doi-ts'
import * as R from 'fp-ts-routing'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import { pipe, tuple } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { lookupDoi } from './lookup-doi'
import { publishReview } from './publish-review'

const DoiC = C.fromDecoder(D.fromRefinement(isDoi, 'DOI'))

export const lookupDoiMatch = R.lit('lookup-doi')
  .then(query(C.struct({ doi: DoiC })))
  .then(R.end)

export const publishReviewMatch = pipe(R.lit('publish-review'), R.then(R.end))

export const router = pipe(
  [
    pipe(
      lookupDoiMatch.parser,
      R.map(({ doi }) => lookupDoi(doi)),
    ),
    pipe(
      publishReviewMatch.parser,
      R.map(() => publishReview),
    ),
  ],
  M.concatAll(R.getParserMonoid()),
)

// https://github.com/gcanti/fp-ts-routing/pull/64
function query<A>(codec: C.Codec<unknown, Record<string, R.QueryValues>, A>): R.Match<A> {
  return new R.Match(
    new R.Parser(r =>
      O.Functor.map(O.fromEither(codec.decode(r.query)), query => tuple(query, new R.Route(r.parts, {}))),
    ),
    new R.Formatter((r, query) => new R.Route(r.parts, codec.encode(query))),
  )
}
