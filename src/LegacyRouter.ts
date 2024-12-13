import { Headers, HttpRouter, HttpServerResponse } from '@effect/platform'
import type { Doi } from 'doi-ts'
import { Effect, pipe, Schema } from 'effect'
import { format } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import * as Routes from './routes.js'

export const LegacyRouter = HttpRouter.fromIterable([
  HttpRouter.makeRoute(
    '*',
    '/10.1101/:suffix',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ suffix: Schema.String })),
      Effect.andThen(({ suffix }) =>
        movedPermanently(
          format(Routes.preprintReviewsMatch.formatter, {
            id: { type: 'biorxiv-medrxiv', value: `10.1101/${suffix}` as Doi<'1101'> },
          }),
        ),
      ),
    ),
  ),
  HttpRouter.makeRoute(
    '*',
    '/10.5281/:suffix',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ suffix: Schema.String })),
      Effect.andThen(({ suffix }) =>
        movedPermanently(
          format(Routes.preprintReviewsMatch.formatter, {
            id: { type: 'zenodo-africarxiv', value: `10.5281/${suffix}` as Doi<'5281'> },
          }),
        ),
      ),
    ),
  ),
  HttpRouter.makeRoute('*', '/blog', movedPermanently('https://content.prereview.org/')),
  HttpRouter.makeRoute('*', '/coc', movedPermanently(format(Routes.codeOfConductMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/communities', movedPermanently(format(Routes.clubsMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/docs/about', movedPermanently(Routes.AboutUs)),
  HttpRouter.makeRoute('*', '/docs/codeofconduct', movedPermanently(format(Routes.codeOfConductMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/docs/code_of_conduct', movedPermanently(format(Routes.codeOfConductMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/docs/resources', movedPermanently(format(Routes.resourcesMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/edi-statement', movedPermanently(format(Routes.ediaStatementMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/edia', movedPermanently(format(Routes.ediaStatementMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/find-a-preprint', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
  HttpRouter.makeRoute(
    '*',
    '/inst/:instId',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ instId: Schema.String })),
      Effect.andThen(({ instId }) => movedPermanently(`https://www.authorea.com/inst/${instId}`)),
    ),
  ),
  HttpRouter.makeRoute('*', '/login', movedPermanently(format(Routes.logInMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/logout', movedPermanently(format(Routes.logOutMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/preprint-journal-clubs', movedPermanently(format(Routes.liveReviewsMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/prereview.org', movedPermanently(format(Routes.homeMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/reviews/new', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/signup', movedPermanently(format(Routes.logInMatch.formatter, {}))),
  HttpRouter.makeRoute(
    '*',
    '/users/:userId/articles/:articleId',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ articleId: Schema.String, userId: Schema.String })),
      Effect.andThen(({ articleId, userId }) =>
        movedPermanently(encodeURI(`https://www.authorea.com/users/${userId}/articles/${articleId}`)),
      ),
    ),
  ),
  HttpRouter.makeRoute(
    '*',
    '/users/:userId',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ userId: Schema.String })),
      Effect.andThen(({ userId }) => movedPermanently(`https://www.authorea.com/users/${userId}`)),
    ),
  ),
  HttpRouter.makeRoute(
    '*',
    '/users/:userId/articles/:articleId/_show_article',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ articleId: Schema.String, userId: Schema.String })),
      Effect.andThen(({ articleId, userId }) =>
        movedPermanently(encodeURI(`https://www.authorea.com/users/${userId}/articles/${articleId}`)),
      ),
    ),
  ),
  HttpRouter.makeRoute('*', '/)', movedPermanently(format(Routes.homeMatch.formatter, {}))),
  HttpRouter.makeRoute('*', '/),', movedPermanently(format(Routes.homeMatch.formatter, {}))),
])

function movedPermanently(location: string) {
  return HttpServerResponse.empty({
    status: StatusCodes.MOVED_PERMANENTLY,
    headers: Headers.fromInput({ location }),
  })
}
