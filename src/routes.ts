import { hasRegistrant, isDoi } from 'doi-ts'
import * as R from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { compose } from 'fp-ts/Refinement'
import { pipe, tuple } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'

const DoiD = D.fromRefinement(pipe(isDoi, compose(hasRegistrant('1101'))), 'DOI')

const IntegerFromStringC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const n = +s
      return isNaN(n) || !Number.isInteger(n) || n.toString() !== s ? D.failure(s, 'integer') : D.success(n)
    }),
  ),
  {
    encode: String,
  },
)

const PreprintDoiC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = s.match(/^doi-(.+)$/) ?? []

      if (match) {
        return DoiD.decode(match.replace(/-/g, '/').replace(/\+/g, '-'))
      }

      return D.failure(s, 'DOI')
    }),
  ),
  {
    encode: doi => `doi-${doi.replace(/-/g, '+').replace(/\//g, '-')}`,
  },
)

export const homeMatch = R.end

export const logInMatch = pipe(R.lit('log-in'), R.then(R.end))

export const lookupDoiMatch = R.lit('lookup-doi').then(R.end)

export const orcidCodeMatch = pipe(
  R.lit('orcid'),
  R.then(query(C.struct({ code: C.string, state: C.string }))),
  R.then(R.end),
)

export const preprintMatch = pipe(R.lit('preprints'), R.then(type('doi', PreprintDoiC)), R.then(R.end))

export const reviewMatch = pipe(R.lit('reviews'), R.then(type('id', IntegerFromStringC)), R.then(R.end))

const writeReviewBaseMatch = pipe(
  R.lit('preprints'),
  R.then(type('doi', PreprintDoiC)),
  R.then(R.lit('write-a-prereview')),
)

export const writeReviewMatch = pipe(writeReviewBaseMatch, R.then(R.end))

export const writeReviewReviewMatch = pipe(writeReviewBaseMatch, R.then(R.lit('write-your-prereview')), R.then(R.end))

export const writeReviewPersonaMatch = pipe(writeReviewBaseMatch, R.then(R.lit('choose-name')), R.then(R.end))

export const writeReviewAuthorsMatch = pipe(writeReviewBaseMatch, R.then(R.lit('more-authors')), R.then(R.end))

export const writeReviewAddAuthorsMatch = pipe(writeReviewBaseMatch, R.then(R.lit('add-more-authors')), R.then(R.end))

export const writeReviewCompetingInterestsMatch = pipe(
  writeReviewBaseMatch,
  R.then(R.lit('competing-interests')),
  R.then(R.end),
)

export const writeReviewConductMatch = pipe(writeReviewBaseMatch, R.then(R.lit('code-of-conduct')), R.then(R.end))

export const writeReviewPostMatch = pipe(writeReviewBaseMatch, R.then(R.lit('check-your-prereview')), R.then(R.end))

// https://github.com/gcanti/fp-ts-routing/pull/64
function query<A>(codec: C.Codec<unknown, Record<string, R.QueryValues>, A>): R.Match<A> {
  return new R.Match(
    new R.Parser(r =>
      O.Functor.map(O.fromEither(codec.decode(r.query)), query => tuple(query, new R.Route(r.parts, {}))),
    ),
    new R.Formatter((r, query) => new R.Route(r.parts, codec.encode(query))),
  )
}

function type<K extends string, A>(k: K, type: C.Codec<string, string, A>): R.Match<{ [_ in K]: A }> {
  return new R.Match(
    new R.Parser(r => {
      if (r.parts.length === 0) {
        return O.none
      } else {
        const head = r.parts[0]
        const tail = r.parts.slice(1)
        return O.Functor.map(O.fromEither(type.decode(head)), a => tuple(singleton(k, a), new R.Route(tail, r.query)))
      }
    }),
    new R.Formatter((r, o) => new R.Route(r.parts.concat(type.encode(o[k])), r.query)),
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
const singleton = <K extends string, V>(k: K, v: V): { [_ in K]: V } => ({ [k as any]: v } as any)
