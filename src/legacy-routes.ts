import { type Doi, isDoi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { constant, flow, pipe, tuple } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { match, P as p } from 'ts-pattern'
import { type Uuid, isUuid } from 'uuid-ts'
import { html, plainText, sendHtml } from './html'
import { movedPermanently, notFound, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import {
  type ArxivPreprintId,
  type IndeterminatePreprintId,
  type PhilsciPreprintId,
  PreprintDoiD,
  fromPreprintDoi,
} from './preprint-id'
import type { ProfileId } from './profile-id'
import {
  aboutUsMatch,
  clubsMatch,
  codeOfConductMatch,
  homeMatch,
  liveReviewsMatch,
  logInMatch,
  logOutMatch,
  preprintReviewsMatch,
  profileMatch,
  reviewAPreprintMatch,
  reviewsMatch,
  writeReviewReviewTypeMatch,
} from './routes'
import { type GetUserEnv, type User, maybeGetUser } from './user'

type LegacyEnv = FathomEnv & GetPreprintIdFromUuidEnv & GetProfileIdFromUuidEnv & GetUserEnv & PhaseEnv

export interface GetPreprintIdFromUuidEnv {
  getPreprintIdFromUuid: (uuid: Uuid) => TE.TaskEither<'not-found' | 'unavailable', IndeterminatePreprintId>
}

export interface GetProfileIdFromUuidEnv {
  getProfileIdFromUuid: (uuid: Uuid) => TE.TaskEither<'not-found' | 'unavailable', ProfileId>
}

const getPreprintIdFromUuid = (uuid: Uuid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getPreprintIdFromUuid }: GetPreprintIdFromUuidEnv) => getPreprintIdFromUuid(uuid)),
  )

const getProfileIdFromUuid = (uuid: Uuid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getProfileIdFromUuid }: GetProfileIdFromUuidEnv) => getProfileIdFromUuid(uuid)),
  )

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

const ArxivPreprintIdC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = s.match(/^arxiv-([A-z0-9.+-]+?)(?:v[0-9]+)?$/i) ?? []

      if (typeof match === 'string') {
        return D.success({ type: 'arxiv', value: `10.48550/arxiv.${match}` as Doi<'48550'> } satisfies ArxivPreprintId)
      }

      return D.failure(s, 'ID')
    }),
  ),
  {
    encode: id => `philsci-${id.value}`,
  },
)

const PreprintDoiC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = s.match(/^doi-(.+)$/) ?? []

      if (typeof match === 'string' && match.toLowerCase() === match) {
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

      if (typeof match === 'string') {
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

const legacyRouter: P.Parser<RM.ReaderMiddleware<LegacyEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      pipe(P.lit('10.1101'), P.then(P.str('suffix')), P.then(P.end)).parser,
      P.map(
        RM.fromMiddlewareK(({ suffix }) =>
          movedPermanently(
            format(preprintReviewsMatch.formatter, {
              id: {
                type: 'biorxiv-medrxiv',
                value: `10.1101/${suffix}` as Doi<'1101'>,
              },
            }),
          ),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('10.5281'), P.then(P.str('suffix')), P.then(P.end)).parser,
      P.map(
        RM.fromMiddlewareK(({ suffix }) =>
          movedPermanently(
            format(preprintReviewsMatch.formatter, {
              id: {
                type: 'zenodo-africarxiv',
                value: `10.5281/${suffix}` as Doi<'5281'>,
              },
            }),
          ),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('about'), P.then(type('personaUuid', UuidC)), P.then(P.end)).parser,
      P.map(({ personaUuid }) => redirectToProfile(personaUuid)),
    ),
    pipe(
      pipe(P.lit('admin'), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('api'), P.then(P.lit('docs')), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('blog'), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently('https://content.prereview.org/'))),
    ),

    pipe(
      pipe(P.lit('coc'), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(codeOfConductMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('communities'), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(clubsMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('communities'), P.then(P.str('communityName')), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('communities'), P.then(P.str('communityName')), P.then(P.lit('new')), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('community-settings'), P.then(type('communityUuid', UuidC)), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('dashboard'), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(() => showRemovedPermanentlyMessage),
    ),
    pipe(
      pipe(P.lit('dashboard'), P.then(P.lit('new')), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(() => showRemovedPermanentlyMessage),
    ),
    pipe(
      pipe(P.lit('docs'), P.then(P.lit('about')), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(aboutUsMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('docs'), P.then(P.lit('codeofconduct')), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(codeOfConductMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('docs'), P.then(P.lit('code_of_conduct')), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(codeOfConductMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('docs'), P.then(P.lit('resources')), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently('https://content.prereview.org/resources/'))),
    ),
    pipe(
      pipe(P.lit('events'), P.then(type('eventUuid', UuidC)), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('inst'), P.then(P.str('instId')), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(({ instId }) => movedPermanently(`https://www.authorea.com/inst/${instId}`))),
    ),
    pipe(
      pipe(P.lit('login'), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(logInMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('logout'), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(logOutMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('preprint-journal-clubs'), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(liveReviewsMatch.formatter, {})))),
    ),
    pipe(
      pipe(
        P.lit('preprints'),
        P.then(type('preprintId', PreprintIdC)),
        P.then(P.lit('write-a-prereview')),
        P.then(P.lit('already-written')),
        P.then(P.end),
      ).parser,
      P.map(
        RM.fromMiddlewareK(({ preprintId }) =>
          movedPermanently(format(writeReviewReviewTypeMatch.formatter, { id: preprintId })),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('preprints'), P.then(type('preprintId', ArxivPreprintIdC)), P.then(P.end)).parser,
      P.map(
        RM.fromMiddlewareK(({ preprintId }) =>
          movedPermanently(format(preprintReviewsMatch.formatter, { id: preprintId })),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('preprints'), P.then(type('uuid', UuidC)), P.then(P.end)).parser,
      P.map(({ uuid }) => redirectToPreprintReviews(uuid)),
    ),
    pipe(
      pipe(
        P.lit('preprints'),
        P.then(type('preprintUuid', UuidC)),
        P.then(P.lit('full-reviews')),
        P.then(P.str('reviewUuid')),
        P.then(P.end),
      ).parser,
      P.map(({ preprintUuid }) => redirectToPreprintReviews(preprintUuid)),
    ),
    pipe(
      pipe(P.lit('prereview.org'), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(homeMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('PREreview.org'), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(homeMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('prereviewers'), P.then(query(C.record(C.string))), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('reviews'), P.then(P.lit('new')), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(reviewAPreprintMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('reviews'), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(() => movedPermanently(format(reviewsMatch.formatter, { page: 1 })))),
    ),
    pipe(
      pipe(P.lit('settings'), P.then(P.lit('api')), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('settings'), P.then(P.lit('drafts')), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(
        P.lit('users'),
        P.then(P.str('userId')),
        P.then(P.lit('articles')),
        P.then(P.str('articleId')),
        P.then(P.end),
      ).parser,
      P.map(
        RM.fromMiddlewareK(({ userId, articleId }) =>
          movedPermanently(encodeURI(`https://www.authorea.com/users/${userId}/articles/${articleId}`)),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('users'), P.then(P.str('userId')), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(RM.fromMiddlewareK(({ userId }) => movedPermanently(`https://www.authorea.com/users/${userId}`))),
    ),
    pipe(
      pipe(
        P.lit('users'),
        P.then(P.str('userId')),
        P.then(P.lit('articles')),
        P.then(P.str('articleId')),
        P.then(P.str('_show_article')),
        P.then(P.end),
      ).parser,
      P.map(
        RM.fromMiddlewareK(({ userId, articleId }) =>
          movedPermanently(encodeURI(`https://www.authorea.com/users/${userId}/articles/${articleId}`)),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('validate'), P.then(type('preprintUuid', UuidC)), P.then(P.end)).parser,
      P.map(({ preprintUuid }) => redirectToPreprintReviews(preprintUuid)),
    ),
  ],
  concatAll(P.getParserMonoid()),
)

export const legacyRoutes = pipe(route(legacyRouter, constant(new NotFound())), RM.fromMiddleware, RM.iflatten)

const showRemovedPermanentlyMessage = pipe(
  maybeGetUser,
  RM.chainReaderKW(removedPermanentlyMessage),
  RM.ichainFirst(() => RM.status(Status.Gone)),
  RM.ichainMiddlewareK(sendHtml),
)

const showRemovedForNowMessage = pipe(
  maybeGetUser,
  RM.chainReaderKW(removedForNowMessage),
  RM.ichainFirst(() => RM.status(Status.NotFound)),
  RM.ichainMiddlewareK(sendHtml),
)

const redirectToPreprintReviews = flow(
  RM.fromReaderTaskEitherK(getPreprintIdFromUuid),
  RM.ichainMiddlewareK(id => movedPermanently(format(preprintReviewsMatch.formatter, { id }))),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const redirectToProfile = flow(
  RM.fromReaderTaskEitherK(getProfileIdFromUuid),
  RM.ichainMiddlewareK(profile => movedPermanently(format(profileMatch.formatter, { profile }))),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

function removedPermanentlyMessage(user?: User) {
  return page({
    title: plainText`Sorry, we’ve taken this page down`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’ve taken this page down</h1>

        <p>We’re making changes to PREreview and have removed this page.</p>

        <p>
          If you have any questions or you selected a link or button, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function removedForNowMessage(user?: User) {
  return page({
    title: plainText`Sorry, we’ve removed this page for now`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’ve removed this page for now</h1>

        <p>We’re making changes to PREreview and have removed this page for now.</p>

        <p>We are working to return it by the end of 2023.</p>

        <p>
          If you have any questions or you selected a link or button, please
          <a href="mailto:help@prereview.org">get in touch</a>.
        </p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

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
      if (typeof r.parts[0] !== 'string') {
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
const singleton = <K extends string, V>(k: K, v: V): { [_ in K]: V } => ({ [k as any]: v }) as any
