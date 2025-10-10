import { type HttpMethod, HttpRouter } from '@effect/platform'
import { Doi } from 'doi-ts'
import { Effect, pipe, Schema, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../Context.ts'
import * as Preprints from '../Preprints/index.ts'
import { ArxivPreprintId, BiorxivOrMedrxivPreprintId, ZenodoOrAfricarxivPreprintId } from '../Preprints/index.ts'
import * as Response from '../Response/index.ts'
import { RedirectResponse } from '../Response/index.ts'
import * as Routes from '../routes.ts'
import * as StatusCodes from '../StatusCodes.ts'
import { removedForNowPage } from './RemovedForNowPage.ts'
import { removedPermanentlyPage } from './RemovedPermanentlyPage.ts'

const MakeRoute = <E, R>(
  method: HttpMethod.HttpMethod | '*',
  path: `/${string}`,
  handler: Effect.Effect<Response.Response, E, R>,
) => HttpRouter.makeRoute(method, path, Effect.andThen(handler, Response.toHttpServerResponse))

const MakeStaticRoute = (method: HttpMethod.HttpMethod | '*', path: `/${string}`, response: Response.Response) =>
  HttpRouter.makeRoute(method, path, Response.toHttpServerResponse(response))

const showRemovedPermanentlyMessage = Effect.andThen(Locale, removedPermanentlyPage)

const showRemovedForNowMessage = Effect.andThen(Locale, removedForNowPage)

const PreprintIdWithDoiSchema = Schema.transform(
  Schema.compose(Schema.String, Schema.TemplateLiteralParser('doi-', pipe(Schema.NonEmptyString, Schema.lowercased()))),
  Preprints.IndeterminatePreprintIdFromDoiSchema,
  {
    strict: true,
    decode: ([, match]) => match.replaceAll('-', '/').replaceAll('+', '-'),
    encode: value => Tuple.make('doi-' as const, value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-')),
  },
)

const PhilsciPreprintIdSchema = Schema.transform(
  Schema.compose(Schema.String, Schema.TemplateLiteralParser('philsci-', Preprints.PhilsciPreprintId.fields.value)),
  Schema.typeSchema(Preprints.PhilsciPreprintId),
  {
    strict: true,
    decode: ([, id]) => new Preprints.PhilsciPreprintId({ value: id }),
    encode: id => Tuple.make('philsci-' as const, id.value),
  },
)

const PreprintIdSchema = Schema.Union(PreprintIdWithDoiSchema, PhilsciPreprintIdSchema)

export const LegacyRouter = HttpRouter.fromIterable([
  MakeRoute(
    '*',
    '/10.1101/:suffix',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ suffix: Schema.String })),
      Effect.andThen(({ suffix }) =>
        movedPermanently(
          format(Routes.preprintReviewsMatch.formatter, {
            id: new BiorxivOrMedrxivPreprintId({ value: Doi(`10.1101/${suffix}`) }),
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
            id: new ZenodoOrAfricarxivPreprintId({ value: Doi(`10.5281/${suffix}`) }),
          }),
        ),
      ),
    ),
  ),
  MakeRoute('*', '/admin', showRemovedForNowMessage),
  MakeRoute('*', '/api', showRemovedForNowMessage),
  MakeRoute('*', '/api/*', showRemovedForNowMessage),
  MakeStaticRoute('*', '/blog', movedPermanently('https://content.prereview.org/')),
  MakeStaticRoute('*', '/coc', movedPermanently(Routes.CodeOfConduct)),
  MakeStaticRoute('*', '/communities', movedPermanently(Routes.Clubs)),
  MakeRoute(
    '*',
    '/communities/:communityName',
    Effect.andThen(
      HttpRouter.schemaParams(Schema.Struct({ communityName: Schema.NonEmptyString })),
      showRemovedForNowMessage,
    ),
  ),
  MakeRoute(
    '*',
    '/communities/:communityName/new',
    Effect.andThen(
      HttpRouter.schemaParams(Schema.Struct({ communityName: Schema.NonEmptyString })),
      showRemovedForNowMessage,
    ),
  ),
  MakeRoute(
    '*',
    '/community-settings/:communityUuid',
    Effect.andThen(HttpRouter.schemaParams(Schema.Struct({ communityUuid: Schema.UUID })), showRemovedForNowMessage),
  ),
  MakeRoute('*', '/dashboard', showRemovedPermanentlyMessage),
  MakeRoute('*', '/dashboard/new', showRemovedPermanentlyMessage),
  MakeStaticRoute('*', '/docs/about', movedPermanently(Routes.AboutUs)),
  MakeStaticRoute('*', '/docs/codeofconduct', movedPermanently(Routes.CodeOfConduct)),
  MakeStaticRoute('*', '/docs/code_of_conduct', movedPermanently(Routes.CodeOfConduct)),
  MakeStaticRoute('*', '/docs/resources', movedPermanently(Routes.Resources)),
  MakeStaticRoute('*', '/edi-statement', movedPermanently(Routes.EdiaStatement)),
  MakeStaticRoute('*', '/edia', movedPermanently(Routes.EdiaStatement)),
  MakeRoute(
    '*',
    '/events/:eventUuid',
    Effect.andThen(HttpRouter.schemaParams(Schema.Struct({ eventUuid: Schema.UUID })), showRemovedForNowMessage),
  ),
  MakeRoute('*', '/extension', showRemovedPermanentlyMessage),
  MakeStaticRoute('*', '/find-a-preprint', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
  MakeStaticRoute('*', '/login', movedPermanently(Routes.LogIn)),
  MakeStaticRoute('*', '/logout', movedPermanently(Routes.LogOut)),
  MakeStaticRoute('*', '/preprint-journal-clubs', movedPermanently(Routes.LiveReviews)),
  MakeRoute(
    '*',
    '/preprints/arxiv-:id',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ id: Schema.NonEmptyString })),
      Effect.andThen(({ id }) =>
        movedPermanently(
          format(Routes.preprintReviewsMatch.formatter, {
            id: new ArxivPreprintId({ value: Doi(`10.48550/arxiv.${id}`) }),
          }),
        ),
      ),
    ),
  ),
  MakeRoute(
    '*',
    '/preprints/:id/write-a-prereview/already-written',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ id: PreprintIdSchema })),
      Effect.andThen(({ id }) => movedPermanently(format(Routes.writeReviewReviewTypeMatch.formatter, { id }))),
    ),
  ),
  MakeStaticRoute('*', '/prereview.org', movedPermanently(Routes.HomePage)),
  MakeRoute('*', '/prereviewers', showRemovedForNowMessage),
  MakeStaticRoute('*', '/reviews/new', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
  MakeRoute('*', '/settings/api', showRemovedForNowMessage),
  MakeRoute('*', '/settings/drafts', showRemovedForNowMessage),
  MakeStaticRoute('*', '/signup', movedPermanently(Routes.LogIn)),
  MakeStaticRoute('*', '/)', movedPermanently(Routes.HomePage)),
  MakeStaticRoute('*', '/),', movedPermanently(Routes.HomePage)),
])

function movedPermanently(location: string) {
  return RedirectResponse({ location, status: StatusCodes.MovedPermanently })
}
