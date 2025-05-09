import { type HttpMethod, HttpRouter } from '@effect/platform'
import type { Doi } from 'doi-ts'
import { Effect, pipe, Schema } from 'effect'
import { format } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import { RedirectResponse } from '../response.js'
import * as Routes from '../routes.js'
import * as Response from './Response.js'

const MakeRoute = <E, R>(
  method: HttpMethod.HttpMethod | '*',
  path: `/${string}`,
  handler: Effect.Effect<Response.Response, E, R>,
) => HttpRouter.makeRoute(method, path, Effect.andThen(handler, Response.toHttpServerResponse))

const MakeStaticRoute = (method: HttpMethod.HttpMethod | '*', path: `/${string}`, response: Response.Response) =>
  HttpRouter.makeRoute(method, path, Response.toHttpServerResponse(response))

export const LegacyRouter = HttpRouter.fromIterable([
  MakeRoute(
    '*',
    '/10.1101/:suffix',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ suffix: Schema.String })),
      Effect.andThen(({ suffix }) =>
        movedPermanently(
          format(Routes.preprintReviewsMatch.formatter, {
            id: { _tag: 'biorxiv-medrxiv', value: `10.1101/${suffix}` as Doi<'1101'> },
          }),
        ),
      ),
    ),
  ),
  MakeRoute(
    '*',
    '/10.5281/:suffix',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ suffix: Schema.String })),
      Effect.andThen(({ suffix }) =>
        movedPermanently(
          format(Routes.preprintReviewsMatch.formatter, {
            id: { _tag: 'zenodo-africarxiv', value: `10.5281/${suffix}` as Doi<'5281'> },
          }),
        ),
      ),
    ),
  ),
  MakeStaticRoute('*', '/blog', movedPermanently('https://content.prereview.org/')),
  MakeStaticRoute('*', '/coc', movedPermanently(Routes.CodeOfConduct)),
  MakeStaticRoute('*', '/communities', movedPermanently(Routes.Clubs)),
  MakeStaticRoute('*', '/docs/about', movedPermanently(Routes.AboutUs)),
  MakeStaticRoute('*', '/docs/codeofconduct', movedPermanently(Routes.CodeOfConduct)),
  MakeStaticRoute('*', '/docs/code_of_conduct', movedPermanently(Routes.CodeOfConduct)),
  MakeStaticRoute('*', '/docs/resources', movedPermanently(Routes.Resources)),
  MakeStaticRoute('*', '/edi-statement', movedPermanently(Routes.EdiaStatement)),
  MakeStaticRoute('*', '/edia', movedPermanently(Routes.EdiaStatement)),
  MakeStaticRoute('*', '/find-a-preprint', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
  MakeRoute(
    '*',
    '/inst/:instId',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ instId: Schema.String })),
      Effect.andThen(({ instId }) => movedPermanently(`https://www.authorea.com/inst/${instId}`)),
    ),
  ),
  MakeStaticRoute('*', '/login', movedPermanently(format(Routes.logInMatch.formatter, {}))),
  MakeStaticRoute('*', '/logout', movedPermanently(format(Routes.logOutMatch.formatter, {}))),
  MakeStaticRoute('*', '/preprint-journal-clubs', movedPermanently(Routes.LiveReviews)),
  MakeStaticRoute('*', '/prereview.org', movedPermanently(format(Routes.homeMatch.formatter, {}))),
  MakeStaticRoute('*', '/reviews/new', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
  MakeStaticRoute('*', '/signup', movedPermanently(format(Routes.logInMatch.formatter, {}))),
  MakeRoute(
    '*',
    '/users/:userId/articles/:articleId',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ articleId: Schema.String, userId: Schema.String })),
      Effect.andThen(({ articleId, userId }) =>
        movedPermanently(encodeURI(`https://www.authorea.com/users/${userId}/articles/${articleId}`)),
      ),
    ),
  ),
  MakeRoute(
    '*',
    '/users/:userId',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ userId: Schema.String })),
      Effect.andThen(({ userId }) => movedPermanently(`https://www.authorea.com/users/${userId}`)),
    ),
  ),
  MakeRoute(
    '*',
    '/users/:userId/articles/:articleId/_show_article',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ articleId: Schema.String, userId: Schema.String })),
      Effect.andThen(({ articleId, userId }) =>
        movedPermanently(encodeURI(`https://www.authorea.com/users/${userId}/articles/${articleId}`)),
      ),
    ),
  ),
  MakeStaticRoute('*', '/)', movedPermanently(format(Routes.homeMatch.formatter, {}))),
  MakeStaticRoute('*', '/),', movedPermanently(format(Routes.homeMatch.formatter, {}))),
])

function movedPermanently(location: string) {
  return RedirectResponse({ location, status: StatusCodes.MOVED_PERMANENTLY })
}
