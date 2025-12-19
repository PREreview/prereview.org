import { HttpRouter } from '@effect/platform'
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

const MakeRoute = <E, R>(path: `/${string}`, response: Effect.Effect<Response.Response, E, R>) =>
  HttpRouter.makeRoute('*', path, Effect.andThen(response, Response.toHttpServerResponse))

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
  MakeRoute('/blog', movedPermanently('https://content.prereview.org/')),
  MakeRoute('/clubs/hhmi-training-pilot', movedPermanently(Routes.ClubProfile.href({ id: 'hhmi-training-program' }))),
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
  MakeRoute('/prereview.org', movedPermanently(Routes.HomePage)),
  MakeRoute('/prereviewers', showRemovedForNowMessage),
  MakeRoute('/reviews/new', movedPermanently(format(Routes.reviewAPreprintMatch.formatter, {}))),
  MakeRoute('/settings/api', showRemovedForNowMessage),
  MakeRoute('/settings/drafts', showRemovedForNowMessage),
  MakeRoute('/signup', movedPermanently(Routes.LogIn)),
  MakeRoute('/)', movedPermanently(Routes.HomePage)),
  MakeRoute('/),', movedPermanently(Routes.HomePage)),
])

function movedPermanently(location: string) {
  return Effect.succeed(RedirectResponse({ location, status: StatusCodes.MovedPermanently }))
}
