import { HttpRouter, HttpServerError, HttpServerRequest } from '@effect/platform'
import { Doi } from 'doi-ts'
import { Effect, pipe, Schema, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../Context.ts'
import * as Preprints from '../../Preprints/index.ts'
import { ArxivPreprintId, BiorxivOrMedrxivPreprintId, ZenodoOrAfricarxivPreprintId } from '../../Preprints/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { UuidSchema } from '../../types/Uuid.ts'
import * as Response from '../Response/index.ts'
import { RedirectResponse } from '../Response/index.ts'
import { removedForNowPage } from './RemovedForNowPage.ts'
import { removedPermanentlyPage } from './RemovedPermanentlyPage.ts'

const MakeRoute = <E, R>(path: `/${string}`, response: Effect.Effect<Response.Response, E, R>) =>
  HttpRouter.makeRoute('*', path, Effect.andThen(response, Response.toHttpServerResponse))

const MakeQueryRoute = <A, I extends { readonly [K in keyof I]: string | ReadonlyArray<string> | undefined }, E, R>(
  path: `/${string}`,
  schema: Schema.Schema<A, I>,
  response: (a: A) => Effect.Effect<Response.Response, E, R>,
) =>
  HttpRouter.makeRoute(
    '*',
    path,
    pipe(
      HttpServerRequest.schemaSearchParams(schema),
      Effect.catchTag('ParseError', () =>
        Effect.andThen(HttpServerRequest.HttpServerRequest, request => new HttpServerError.RouteNotFound({ request })),
      ),
      Effect.andThen(response),
      Effect.andThen(Response.toHttpServerResponse),
    ),
  )

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
  MakeRoute('/admin', showRemovedForNowMessage),
  MakeRoute('/api', showRemovedForNowMessage),
  MakeRoute('/api/*', showRemovedForNowMessage),
  MakeQueryRoute('/author-invite/:id/verify-email-address', Schema.Struct({ verify: UuidSchema }), ({ verify }) =>
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ id: UuidSchema })),
      Effect.andThen(({ id }) =>
        movedPermanently(
          Routes.VerifyEmailAddress.href({
            verificationToken: verify,
            redirectTo: format(Routes.authorInviteCheckMatch.formatter, { id }) as `/${string}`,
          }),
        ),
      ),
    ),
  ),
  MakeRoute('/blog', movedPermanently('https://content.prereview.org/')),
  MakeRoute(
    '/clubs/hhmi-training-pilot',
    movedPermanently(Routes.ClubProfile.href({ id: '206ef17f-c5f3-44d3-acee-ba9b1f8299e9' })),
  ),
  MakeRoute('/coc', movedPermanently(Routes.CodeOfConduct)),
  MakeRoute('/communities', movedPermanently(Routes.Clubs)),
  MakeRoute(
    '/communities/:communityName',
    Effect.andThen(
      HttpRouter.schemaParams(Schema.Struct({ communityName: Schema.NonEmptyString })),
      showRemovedForNowMessage,
    ),
  ),
  MakeRoute(
    '/communities/:communityName/new',
    Effect.andThen(
      HttpRouter.schemaParams(Schema.Struct({ communityName: Schema.NonEmptyString })),
      showRemovedForNowMessage,
    ),
  ),
  MakeRoute(
    '/community-settings/:communityUuid',
    Effect.andThen(HttpRouter.schemaParams(Schema.Struct({ communityUuid: Schema.UUID })), showRemovedForNowMessage),
  ),
  MakeRoute('/dashboard', showRemovedPermanentlyMessage),
  MakeRoute('/dashboard/new', showRemovedPermanentlyMessage),
  MakeRoute('/docs/about', movedPermanently(Routes.AboutUs)),
  MakeRoute('/docs/codeofconduct', movedPermanently(Routes.CodeOfConduct)),
  MakeRoute('/docs/code_of_conduct', movedPermanently(Routes.CodeOfConduct)),
  MakeRoute('/docs/resources', movedPermanently(Routes.Resources)),
  MakeRoute('/edi-statement', movedPermanently(Routes.EdiaStatement)),
  MakeRoute('/edia', movedPermanently(Routes.EdiaStatement)),
  MakeRoute(
    '/events/:eventUuid',
    Effect.andThen(HttpRouter.schemaParams(Schema.Struct({ eventUuid: Schema.UUID })), showRemovedForNowMessage),
  ),
  MakeRoute('/extension', showRemovedPermanentlyMessage),
  MakeRoute('/find-a-preprint', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
  MakeRoute('/login', movedPermanently(Routes.LogIn)),
  MakeRoute('/logout', movedPermanently(Routes.LogOut)),
  MakeQueryRoute('/my-details/change-email-address', Schema.Struct({ verify: UuidSchema }), ({ verify }) =>
    movedPermanently(Routes.VerifyEmailAddress.href({ verificationToken: verify })),
  ),
  MakeRoute('/preprint-journal-clubs', movedPermanently(Routes.LiveReviews)),
  MakeRoute(
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
    '/preprints/:id/write-a-prereview/already-written',
    pipe(
      HttpRouter.schemaParams(Schema.Struct({ id: PreprintIdSchema })),
      Effect.andThen(({ id }) => movedPermanently(format(Routes.writeReviewReviewTypeMatch.formatter, { id }))),
    ),
  ),
  MakeQueryRoute(
    '/preprints/:id/write-a-prereview/verify-email-address',
    Schema.Struct({ verify: UuidSchema }),
    ({ verify }) =>
      pipe(
        HttpRouter.schemaParams(Schema.Struct({ id: PreprintIdSchema })),
        Effect.andThen(({ id }) =>
          movedPermanently(
            Routes.VerifyEmailAddress.href({
              verificationToken: verify,
              redirectTo: format(Routes.writeReviewPublishMatch.formatter, { id }) as `/${string}`,
            }),
          ),
        ),
      ),
  ),
  MakeRoute('/prereview.org', movedPermanently(Routes.HomePage)),
  MakeRoute('/prereviewers', showRemovedForNowMessage),
  MakeRoute('/reviews/new', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
  MakeRoute('/settings/api', showRemovedForNowMessage),
  MakeRoute('/settings/drafts', showRemovedForNowMessage),
  MakeRoute('/signup', movedPermanently(Routes.LogIn)),
  MakeQueryRoute(
    '/write-a-comment/:commentId/verify-email-address',
    Schema.Struct({ token: UuidSchema }),
    ({ token }) =>
      pipe(
        HttpRouter.schemaParams(Schema.Struct({ commentId: UuidSchema })),
        Effect.andThen(({ commentId }) =>
          movedPermanently(
            Routes.VerifyEmailAddress.href({
              verificationToken: token,
              redirectTo: Routes.WriteCommentNeedToVerifyEmailAddress.href({ commentId }),
            }),
          ),
        ),
      ),
  ),
  MakeRoute('/)', movedPermanently(Routes.HomePage)),
  MakeRoute('/),', movedPermanently(Routes.HomePage)),
])

function movedPermanently(location: string) {
  return Effect.succeed(RedirectResponse({ location, status: StatusCodes.MovedPermanently }))
}
