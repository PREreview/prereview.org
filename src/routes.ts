import { isDoi } from 'doi-ts'
import * as P from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { pipe, tuple } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { match, P as p } from 'ts-pattern'
import { isUuid } from 'uuid-ts'
import { type PhilsciPreprintId, PreprintDoiD, fromPreprintDoi } from './preprint-id'

const UuidD = D.fromRefinement(isUuid, 'UUID')

const UuidC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      if (s.toLowerCase() === s) {
        return UuidD.decode(s)
      }

      return D.failure(s, 'UUID')
    }),
  ),
  { encode: uuid => uuid.toLowerCase() },
)

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

      if (match && match.toLowerCase() === match) {
        return pipe(PreprintDoiD, D.map(fromPreprintDoi)).decode(match.replaceAll('-', '/').replaceAll('+', '-'))
      }

      return D.failure(s, 'DOI')
    }),
  ),
  {
    encode: id => `doi-${id.value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-')}`,
  },
)

const PreprintPhilsciC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = s.match(/^philsci-([1-9][0-9]*)$/) ?? []

      if (match) {
        return D.success({ type: 'philsci', value: parseInt(match, 10) } satisfies PhilsciPreprintId)
      }

      return D.failure(s, 'ID')
    }),
  ),
  {
    encode: id => `philsci-${id.value}`,
  },
)

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
const PreprintIdC = C.make(D.union(PreprintDoiC, PreprintPhilsciC), {
  encode: id =>
    match(id)
      .with({ type: 'philsci' }, PreprintPhilsciC.encode)
      .with({ value: p.when(isDoi) }, PreprintDoiC.encode)
      .exhaustive(),
})

export const homeMatch = P.end

export const aboutUsMatch = pipe(P.lit('about'), P.then(P.end))

export const codeOfConductMatch = pipe(P.lit('code-of-conduct'), P.then(P.end))

export const privacyPolicyMatch = pipe(P.lit('privacy-policy'), P.then(P.end))

export const findAPreprintMatch = pipe(P.lit('find-a-preprint'), P.then(P.end))

export const logInMatch = pipe(P.lit('log-in'), P.then(P.end))

export const logOutMatch = pipe(P.lit('log-out'), P.then(P.end))

export const orcidCodeMatch = pipe(
  P.lit('orcid'),
  P.then(query(C.struct({ code: C.string, state: C.string }))),
  P.then(P.end),
)

export const orcidErrorMatch = pipe(
  P.lit('orcid'),
  P.then(query(C.struct({ error: C.string, state: C.string }))),
  P.then(P.end),
)

export const preprintReviewsUuidMatch = pipe(P.lit('preprints'), P.then(type('uuid', UuidC)), P.then(P.end))

export const preprintReviewsMatch = pipe(P.lit('preprints'), P.then(type('id', PreprintIdC)), P.then(P.end))

export const reviewMatch = pipe(P.lit('reviews'), P.then(type('id', IntegerFromStringC)), P.then(P.end))

const writeReviewBaseMatch = pipe(
  P.lit('preprints'),
  P.then(type('id', PreprintIdC)),
  P.then(P.lit('write-a-prereview')),
)

export const reviewAPreprintMatch = pipe(P.lit('review-a-preprint'), P.then(P.end))

export const writeReviewMatch = pipe(writeReviewBaseMatch, P.then(P.end))

export const writeReviewStartMatch = pipe(writeReviewBaseMatch, P.then(P.lit('start-now')), P.then(P.end))

export const writeReviewAlreadyWrittenMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('already-written')),
  P.then(P.end),
)

export const writeReviewReviewMatch = pipe(writeReviewBaseMatch, P.then(P.lit('write-your-prereview')), P.then(P.end))

export const writeReviewPersonaMatch = pipe(writeReviewBaseMatch, P.then(P.lit('choose-name')), P.then(P.end))

export const writeReviewAuthorsMatch = pipe(writeReviewBaseMatch, P.then(P.lit('more-authors')), P.then(P.end))

export const writeReviewAddAuthorsMatch = pipe(writeReviewBaseMatch, P.then(P.lit('add-more-authors')), P.then(P.end))

export const writeReviewCompetingInterestsMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('competing-interests')),
  P.then(P.end),
)

export const writeReviewConductMatch = pipe(writeReviewBaseMatch, P.then(P.lit('code-of-conduct')), P.then(P.end))

export const writeReviewPublishMatch = pipe(writeReviewBaseMatch, P.then(P.lit('check-your-prereview')), P.then(P.end))

export const writeReviewPublishedMatch = pipe(writeReviewBaseMatch, P.then(P.lit('prereview-published')), P.then(P.end))

// https://github.com/gcanti/fp-ts-routing/pull/64
function query<A>(codec: C.Codec<unknown, Record<string, P.QueryValues>, A>): P.Match<A> {
  return new P.Match(
    new P.Parser(r =>
      O.Functor.map(O.fromEither(codec.decode(r.query)), query => tuple(query, new P.Route(r.parts, {}))),
    ),
    new P.Formatter((r, query) => new P.Route(r.parts, codec.encode(query))),
  )
}

function type<K extends string, A>(k: K, type: C.Codec<string, string, A>): P.Match<{ [_ in K]: A }> {
  return new P.Match(
    new P.Parser(r => {
      if (r.parts.length === 0) {
        return O.none
      } else {
        const head = r.parts[0]
        const tail = r.parts.slice(1)
        return O.Functor.map(O.fromEither(type.decode(head)), a => tuple(singleton(k, a), new P.Route(tail, r.query)))
      }
    }),
    new P.Formatter((r, o) => new P.Route(r.parts.concat(type.encode(o[k])), r.query)),
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
const singleton = <K extends string, V>(k: K, v: V): { [_ in K]: V } => ({ [k as any]: v } as any)
