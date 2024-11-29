import { Headers, HttpRouter, HttpServerResponse } from '@effect/platform'
import type { Doi } from 'doi-ts'
import { Effect, pipe, Schema } from 'effect'
import { format } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import * as Routes from './routes.js'

export const LegacyRouter = HttpRouter.empty
  .pipe(
    HttpRouter.all(
      '/10.1101/:suffix',
      pipe(
        HttpRouter.schemaParams(Schema.Struct({ suffix: Schema.String })),
        Effect.andThen(({ suffix }) =>
          movedPermanently(
            format(Routes.preprintReviewsMatch.formatter, {
              id: {
                type: 'biorxiv-medrxiv',
                value: `10.1101/${suffix}` as Doi<'1101'>,
              },
            }),
          ),
        ),
      ),
    ),
    HttpRouter.all(
      '/10.5281/:suffix',
      pipe(
        HttpRouter.schemaParams(Schema.Struct({ suffix: Schema.String })),
        Effect.andThen(({ suffix }) =>
          movedPermanently(
            format(Routes.preprintReviewsMatch.formatter, {
              id: {
                type: 'zenodo-africarxiv',
                value: `10.5281/${suffix}` as Doi<'5281'>,
              },
            }),
          ),
        ),
      ),
    ),
    HttpRouter.all('/blog', movedPermanently('https://content.prereview.org/')),
    HttpRouter.all('/coc', movedPermanently(format(Routes.codeOfConductMatch.formatter, {}))),
    HttpRouter.all('/communities', movedPermanently(format(Routes.clubsMatch.formatter, {}))),
    HttpRouter.all('/docs/about', movedPermanently(format(Routes.aboutUsMatch.formatter, {}))),
    HttpRouter.all('/docs/codeofconduct', movedPermanently(format(Routes.codeOfConductMatch.formatter, {}))),
    HttpRouter.all('/docs/code_of_conduct', movedPermanently(format(Routes.codeOfConductMatch.formatter, {}))),
    HttpRouter.all('/docs/resources', movedPermanently(format(Routes.resourcesMatch.formatter, {}))),
    HttpRouter.all('/edi-statement', movedPermanently(format(Routes.ediaStatementMatch.formatter, {}))),
    HttpRouter.all('/edia', movedPermanently(format(Routes.ediaStatementMatch.formatter, {}))),
    HttpRouter.all('/find-a-preprint', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
    HttpRouter.all(
      '/inst/:instId',
      pipe(
        HttpRouter.schemaParams(Schema.Struct({ instId: Schema.String })),
        Effect.andThen(({ instId }) => movedPermanently(`https://www.authorea.com/inst/${instId}`)),
      ),
    ),
    HttpRouter.all('/login', movedPermanently(format(Routes.logInMatch.formatter, {}))),
    HttpRouter.all('/logout', movedPermanently(format(Routes.logOutMatch.formatter, {}))),
    HttpRouter.all('/preprint-journal-clubs', movedPermanently(format(Routes.liveReviewsMatch.formatter, {}))),
    HttpRouter.all('/prereview.org', movedPermanently(format(Routes.homeMatch.formatter, {}))),
    HttpRouter.all('/reviews/new', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
    HttpRouter.all('/signup', movedPermanently(format(Routes.logInMatch.formatter, {}))),
    HttpRouter.all(
      '/users/:userId/articles/:articleId',
      pipe(
        HttpRouter.schemaParams(Schema.Struct({ articleId: Schema.String, userId: Schema.String })),
        Effect.andThen(({ articleId, userId }) =>
          movedPermanently(encodeURI(`https://www.authorea.com/users/${userId}/articles/${articleId}`)),
        ),
      ),
    ),
  )
  .pipe(
    HttpRouter.all(
      '/users/:userId',
      pipe(
        HttpRouter.schemaParams(Schema.Struct({ userId: Schema.String })),
        Effect.andThen(({ userId }) => movedPermanently(`https://www.authorea.com/users/${userId}`)),
      ),
    ),
    HttpRouter.all(
      '/users/:userId/articles/:articleId/_show_article',
      pipe(
        HttpRouter.schemaParams(Schema.Struct({ articleId: Schema.String, userId: Schema.String })),
        Effect.andThen(({ articleId, userId }) =>
          movedPermanently(encodeURI(`https://www.authorea.com/users/${userId}/articles/${articleId}`)),
        ),
      ),
    ),
    HttpRouter.all('/)', movedPermanently(format(Routes.homeMatch.formatter, {}))),
    HttpRouter.all('/),', movedPermanently(format(Routes.homeMatch.formatter, {}))),
  )

function movedPermanently(location: string) {
  return HttpServerResponse.empty({
    status: StatusCodes.MOVED_PERMANENTLY,
    headers: Headers.fromInput({ location }),
  })
}
