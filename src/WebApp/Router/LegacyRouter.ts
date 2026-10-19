import { HttpRouter, HttpServerError, HttpServerRequest } from '@effect/platform'
import { Array, Effect, pipe, Schema, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../Context.ts'
import * as Preprints from '../../Preprints/index.ts'
import { ArxivPreprintId, BiorxivOrMedrxivPreprintId, ZenodoOrAfricarxivPreprintId } from '../../Preprints/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { Doi } from '../../types/Doi.ts'
import { Slug } from '../../types/Slug.ts'
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

const BlogPostRoutes = HttpRouter.fromIterable(
  Array.map(
    [
      'october-2026-newsletter',
      'interview-prereview-champion-daniel-adediran',
      'interview-prereview-champion-shitondo-yahila',
      'prereview-platform-news-4-september-2026',
      'prereview-platform-news-28-august-2026',
      'interview-prereview-champion-mabel-omoniwa',
      'august-newsletter',
      'register-for-review-a-thon',
      'prereview-platform-news-17-july-2026',
      'prereview-platform-news-10-july-2026',
      'prereview-platform-news-26-june-2026',
      'an-interview-with-prereview-champion-xiuqi-jade-li',
      'prereview-platform-news-12-june-2026',
      'prereview-june-2026-newsletter',
      'prereview-platform-news-29-may-2026',
      'an-interview-with-prereview-champion-akuma-ifeanyichukwu',
      'prereview-platform-news-22-may-2026',
      'localization-and-translation-info-session',
      '2026-q2-prereview-advisory-committee-meeting-minutes',
      'prereview-platform-news-15-may-2026',
      'design-sprints-educational-use',
      'an-interview-with-prereview-champion-carlos-herold-junior',
      'prereview-platform-news-17-april-2026',
      'an-interview-with-prereview-champion-alan-colin-arce',
      'prereview-april-2026-newsletter',
      '2026-q1-prereview-advisory-committee-meeting-minutes',
      'prereview-platform-news-27-march-2026',
      'strategic-plan-community-call-what-we-learned',
      'prereview-platform-news-6-march-2026',
      'engaging-communities-with-preprint-review',
      'announcing-2026-prereview-champions',
      '2025-q4-prereview-advisory-committee-meeting-minutes-2',
      'change-is-in-the-air-for-our-advisory-committee-welcomes-goodbyes-and-deep-gratitude-to-all',
      'peer-review-in-a-team-how-asapbio-leverages-prereview-to-build-a-community-of-open-preprint-reviewers',
      'prereview-platform-news-13-february-2026',
      'construir-revision-abierta-en-comunidad',
      'prereview-february-2026-newsletter',
      'prereview-platform-news-30-january-2026',
      'welcome-sol',
      'prereview-2026-2029-strategic-plan',
      '2025-annual-report',
      'welcome-to-our-december-2025-prereview-newsletter-2',
      'welcome-pia',
      '2026-prereview-champions-apply',
      'prereview-champions-2025-wrap-up',
      'prereview-platform-news-31-october-2025',
      'prereview-platform-news-17-october-2025',
      'now-you-can-review-datasets-on-prereview-org',
      'prereview-platform-news-10-october-2025',
      'prereview-platform-news-3-october-2025',
      '2025-q3-part-2-prereview-advisory-committee-meeting-minutes',
      'prereview-platform-news-26-september-2025',
      'prereview-september-2025-newsletter',
      '2025-q4-prereview-advisory-committee-meeting-minutes',
      'from-surviving-to-thriving',
      'celebrating-our-localization-and-translation-milestone',
      'prereview-july-2025-newsletter',
      'prereview-platform-news-10-july-2025',
      'prereview-platform-news-3-july-2025',
      'prereviews-community-localization-and-translation-campaign-is-live',
      'prereview-platform-news-13-june-2025',
      'prereview-platform-news-6-june-2025',
      'prereview-platform-news-23-may-2025',
      'prereview-platform-news-16-may-2025',
      'prereview-may-2025-newsletter',
      'prereview-platform-news-2-may-2025',
      'help-translate-prereview',
      'prereview-platform-news-11-april-2025',
      'announcing-our-2025-prereview-champions',
      'prereview-platform-news-4-april-2025',
      'prereview-platform-news-28-march-2025',
      'prereview-platform-news-21-march-2025',
      'prereview-platform-news-14-march-2025',
      'prereview-march-2025-newsletter',
      'prereview-platform-news-7-march-2025',
      'announcing-new-dataset-review-community-design-sprints',
      'live-reviews-facilitating-collaboration-inclusion-and-transparency-in-peer-review',
      'edia-not-optional-essential',
      'prereview-platform-news-14-february-2025',
      '2024-q4-prereview-advisory-committee-meeting-minutes',
      'prereview-platform-news-7-february-2025',
      'prereview-platform-news-31-january-2025',
      'prereview-january-2025-newsletter',
      'prereview-platform-news-17-january-2025',
      '2024-a-year-of-expansion-and-introspection',
      '2025-prereview-champions-program',
      'prereview-platform-news-10-january-2025',
      'prereview-platform-news-2024-end-of-year-edition',
      'welcome-grace',
      'untitled',
      'prereview',
      'prereview-platform-news-15-november-2024',
      'champions-2024-wrap-up',
      'prereview-advisory-committee-meeting-minutes-2024-09-09',
      'commenting-is-live-on-prereview',
      'publish-pre-review-curate',
      'prereview-platform-news-23-september-2024',
      'prereview-september-2024-newsletter',
      '2024-q2-advisory-committee-meeting-minutes',
      'prereview-platform-news-6-september-2024',
      'from-global-to-local',
      'community-building-for-a-better-tomorrow',
      'prereview-platform-news-2-august-2024',
      'prereview-platform-news-26-july-2024',
      'prereview-platform-news-19-july-2024',
      'prereview-july-2024-newsletter',
      'how-collaborative-peer-review-can-transform-scientific-research',
      'prereview-org-in-2024-a-6-month-review',
      'prereview-platform-news-21-june-2024',
      'prereview-platform-news-7-june-2024',
      'championing-preprints-a-call-for-recognition-in-african-research-settings',
      'prereview-welcomes-funding',
      'prereview-platform-news-31-may-2024',
      'prereview-platform-news-24-may-2024',
      'welcome-aurelia-and-chris',
      'prereview-platform-news-10-may-2024',
      'prereview-may-2024-newsletter',
      'prereview-platform-news-3-may-2024',
      'request-a-review-live-on-prereview',
      'prereview-platform-news-26-april-2024',
      'organizational-membership-model-design-sprints-what-we-learned',
      'prereview-platform-news-19-april-2024',
      'prereview-platform-news-12-april-2024',
      'help-us-shape',
      'prereview-platform-news-29-march-2024',
      'advisory-committee-q1-2024-meeting-minutes',
      'prereview-platform-news-21-march-2024',
      'recruiting-advisory-committee',
      'prereview-platform-news-15-march-2024',
      'prereview-march-2024-newsletter',
      'prereview-platform-news-23-february-2024',
      'prereview-platform-news-16-february-2024',
      'prereview-gives-you-credit-on-orcid',
      'prereview-platform-news-9-february-2024',
      'announcing-our-2024-prereview-champions',
      'prereview-platform-news-26-january-2024',
      'prereview-platform-news-19-january-2024',
      'prereview-platform-news-12-january-2024',
      'prereview-platform-news-5-january-2024',
      'prereview-january2024-newsletter',
      '2023-a-year-of-community-engagement-and-growth',
      'prereview-platform-news-15-december-2023',
      'prereview-platform-news-8-december-2023',
      'request-a-review',
      'announcing-the-prereview-champions-program',
      'support-prereview-this-giving-tuesday',
      'prereview-platform-news-17-november-2023',
      'prereview-platform-news-10-november-2023',
      'prereview-november-newsletter',
      'customize-your-profile-on-prereview-org',
      'prereview-platform-news-13-october-2023',
      'prereview-platform-news-6-october-2023',
      'prereview-platform-news-29-september-2023',
      'prereview-platform-news-22-september-2023',
      'prereview-platform-news-15-september-2023',
      'introducing-structured-prereviews-on-prereview-org',
      'prereview-platform-news-8-september-2023',
      'newsletter-september',
      'prereview-platform-news-25-august-2023',
      'prereview-platform-news-18-august-2023',
      'announcing-prereview-clubs',
      'prereview-platform-news-4-august-2023',
      'prereview-platform-news-28-july-2023',
      'prereview-platform-news-21-july-2023',
      'prereview-platform-news-14-july-2023',
      'newsletter-july',
      'prereview-platform-news-30-june-2023',
      'join-prereview-slack',
      'prereview-platform-news-23-june-2023',
      'prereview-platform-news-16-june-2023',
      'prereview-platform-news-9-june-2023',
      'check-out-our-brand-new-design-at-prereview-org',
      'prereview-platform-news-26-may-2023',
      'prereview-platform-news-19-may-2023',
      'prereview-and-crneur-pilot',
      'prereview-platform-news-12-may-2023',
      'may-n',
      'prereview-platform-news-5-may-2023',
      'prereview-platform-news-28-april-2023',
      'prereview-platform-news-21-april-2023',
      'prereview-platform-news-14-april-2023',
      'prereview-platform-news-6-april-2023',
      'march-newsletter',
      'prereview-platform-news-31-march-2023',
      'prereview-platform-news-24-march-2023',
      'prereview-platform-news-17-march-2023',
      'prereview-platform-news-10-march-2023',
      'prereview-platform-news-3-march-2023',
      'prereview-platform-news-24-february-2023',
      'prereview-platform-news-17-february-2023',
      'open-peer-reviewers-in-africa-a-train-of-trainer-program',
      'prereview-platform-news-10-february-2023',
      'prereview-platform-news-3-february-2023',
      'newsletter-january-2023',
      'exciting-platform-news-for-prereview-in-2023',
      'welcome-vanessa',
      'welcome-chad',
      'openrprints',
      'welcome-arturo',
      'new-collaboration-and-job',
      'open-reviewers-toolkit-is-now-openly-available',
      'peer-review-week-2021',
      'introducing-prereview-communities',
      'best-practise-and-innovative-approaches-to-peer-review',
      'prereview-open-reviewers-reflections-on-the-pilot-program',
      'prereview-open-reviewers-pilot-announcement',
      'help-rapidly-review-covid-19-preprints',
      'contribute-during-the-prereview-open-source-software-design-sprint',
      'raising-voices-through-preprint-journal-clubs',
      'elife-preprint-journal-club-series',
      'plos-pathogens-prereview-live-covid-19-preprint-journal-club',
      'open-roadmap-prereview-peer-review-mentoring-program',
      'live-streamed-preprint-journal-clubs-we-can-help',
      'outbreak-science-rapid-prereview-call-to-action',
      'an-open-platform-for-the-rapid-review-of-outbreak-related-preprints',
      'prereview-v2',
      'prereview-hello-world',
    ],
    slug => MakeRoute(`/${slug}`, movedPermanently(Routes.BlogPost.href({ slug: Slug(slug) }))),
  ),
)

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
  MakeRoute('/author/:author', showRemovedPermanentlyMessage),
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
  MakeRoute('/tag/prereview-champion', movedPermanently(Routes.Tag.href({ page: 1 }))),
  MakeRoute('/tag/:tag', showRemovedPermanentlyMessage),
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
]).pipe(HttpRouter.concat(BlogPostRoutes))

function movedPermanently(location: string) {
  return Effect.succeed(RedirectResponse({ location, status: StatusCodes.MovedPermanently }))
}
