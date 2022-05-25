import * as R from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { pipe, tuple } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'

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

export const homeMatch = R.end

export const logInMatch = pipe(R.lit('log-in'), R.then(R.end))

export const lookupDoiMatch = R.lit('lookup-doi').then(R.end)

export const preprintMatch = pipe(R.lit('preprints'), R.then(R.lit('doi-10.1101-2022.01.13.476201')), R.then(R.end))

export const reviewMatch = pipe(R.lit('reviews'), R.then(type('id', IntegerFromStringC)), R.then(R.end))

export const writeReviewMatch = pipe(
  R.lit('preprints'),
  R.then(R.lit('doi-10.1101-2022.01.13.476201')),
  R.then(R.lit('review')),
  R.then(R.end),
)

// https://github.com/gcanti/fp-ts-routing/pull/64
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
