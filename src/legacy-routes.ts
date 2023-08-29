import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { constant, flow, pipe, tuple } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { type Uuid, isUuid } from 'uuid-ts'
import { html, plainText, sendHtml } from './html'
import { movedPermanently, notFound, serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { ArxivPreprintId, IndeterminatePreprintId } from './preprint-id'
import type { ProfileId } from './profile-id'
import {
  aboutUsMatch,
  codeOfConductMatch,
  homeMatch,
  logInMatch,
  logOutMatch,
  preprintReviewsMatch,
  profileMatch,
  reviewAPreprintMatch,
  reviewsMatch,
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

const legacyRouter: P.Parser<RM.ReaderMiddleware<LegacyEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      pipe(P.lit('10.1101'), P.then(P.str('suffix')), P.then(P.end)).parser,
      P.map(
        fromMiddlewareK(({ suffix }) =>
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
        fromMiddlewareK(({ suffix }) =>
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
      P.map(fromMiddlewareK(() => movedPermanently('https://content.prereview.org/'))),
    ),

    pipe(
      pipe(P.lit('coc'), P.then(P.end)).parser,
      P.map(fromMiddlewareK(() => movedPermanently(format(codeOfConductMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('communities'), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
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
      P.map(fromMiddlewareK(() => movedPermanently(format(aboutUsMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('docs'), P.then(P.lit('codeofconduct')), P.then(P.end)).parser,
      P.map(fromMiddlewareK(() => movedPermanently(format(codeOfConductMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('docs'), P.then(P.lit('code_of_conduct')), P.then(P.end)).parser,
      P.map(fromMiddlewareK(() => movedPermanently(format(codeOfConductMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('docs'), P.then(P.lit('resources')), P.then(P.end)).parser,
      P.map(fromMiddlewareK(() => movedPermanently('https://content.prereview.org/resources/'))),
    ),
    pipe(
      pipe(P.lit('events'), P.then(type('eventUuid', UuidC)), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('inst'), P.then(P.str('instId')), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(fromMiddlewareK(({ instId }) => movedPermanently(`https://www.authorea.com/inst/${instId}`))),
    ),
    pipe(
      pipe(P.lit('login'), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(fromMiddlewareK(() => movedPermanently(format(logInMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('logout'), P.then(P.end)).parser,
      P.map(fromMiddlewareK(() => movedPermanently(format(logOutMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('preprints'), P.then(type('preprintId', ArxivPreprintIdC)), P.then(P.end)).parser,
      P.map(
        fromMiddlewareK(({ preprintId }) =>
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
      P.map(fromMiddlewareK(() => movedPermanently(format(homeMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('PREreview.org'), P.then(P.end)).parser,
      P.map(fromMiddlewareK(() => movedPermanently(format(homeMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('prereviewers'), P.then(query(C.record(C.string))), P.then(P.end)).parser,
      P.map(() => showRemovedForNowMessage),
    ),
    pipe(
      pipe(P.lit('reviews'), P.then(P.lit('new')), P.then(P.end)).parser,
      P.map(fromMiddlewareK(() => movedPermanently(format(reviewAPreprintMatch.formatter, {})))),
    ),
    pipe(
      pipe(P.lit('reviews'), P.then(P.end)).parser,
      P.map(fromMiddlewareK(() => movedPermanently(format(reviewsMatch.formatter, { page: 1 })))),
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
        fromMiddlewareK(({ userId, articleId }) =>
          movedPermanently(encodeURI(`https://www.authorea.com/users/${userId}/articles/${articleId}`)),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('users'), P.then(P.str('userId')), P.then(query(C.partial({}))), P.then(P.end)).parser,
      P.map(fromMiddlewareK(({ userId }) => movedPermanently(`https://www.authorea.com/users/${userId}`))),
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
        fromMiddlewareK(({ userId, articleId }) =>
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
  chainReaderKW(removedPermanentlyMessage),
  RM.ichainFirst(() => RM.status(Status.Gone)),
  RM.ichainMiddlewareK(sendHtml),
)

const showRemovedForNowMessage = pipe(
  maybeGetUser,
  chainReaderKW(removedForNowMessage),
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

// https://github.com/DenisFrezzato/hyper-ts/pull/83
function fromMiddlewareK<R, A extends ReadonlyArray<unknown>, B, I, O, E>(
  f: (...a: A) => M.Middleware<I, O, E, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, O, E, B> {
  return (...a) => RM.fromMiddleware(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
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
