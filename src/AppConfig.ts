import { Array, Config, Effect, HashSet, Layer, pipe, Redacted, Schema } from 'effect'
import * as Clubs from './Clubs/index.ts'
import { AllowSiteCrawlers, EnabledLocales, ScietyListToken, SessionSecret } from './Context.ts'
import { ContentfulConfig, ContentfulId } from './ExternalApis/Contentful/index.ts'
import { Cloudinary, Ghost, OpenAlex, Orcid, Slack, Zenodo } from './ExternalApis/index.ts'
import { CommunitySlack } from './ExternalInteractions/index.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import { UserSelectableLocales } from './locales/index.ts'
import * as OrcidOauth from './OrcidOauth.ts'
import * as Prereviews from './Prereviews/index.ts'
import { PublicUrl } from './public-url.ts'
import * as SlackOauth from './SlackOauth.ts'
import { NonEmptyString, OrcidId } from './types/index.ts'
import { isPrereviewTeam, type User } from './user.ts'
import * as WebApp from './WebApp/index.ts'
import { IsUserBlocked } from './WebApp/log-in/index.ts'

export const layer = Layer.mergeAll(
  Layer.effect(AllowSiteCrawlers, Config.withDefault(Config.Boolean('ALLOW_SITE_CRAWLERS'), false)),
  CommunitySlack.layerChannelIdsConfig({
    requestAReview: Config.schema(Slack.ChannelId, 'SLACK_REQUEST_REVIEW_CHANNEL_ID'),
    shareAReview: Config.schema(Slack.ChannelId, 'SLACK_SHARE_REVIEW_CHANNEL_ID'),
  }),
  CommunitySlack.layerShouldUpdateCommunitySlackConfig(Config.withDefault(Config.Boolean('SLACK_UPDATE'), false)),
  FeatureFlags.layerConfig({
    canAddMultipleAuthors: pipe(
      Config.withDefault(Config.Boolean('CAN_ADD_MULTIPLE_AUTHORS'), false),
      Config.map(canAddMultipleAuthors =>
        Effect.fnUntraced(function* (user) {
          const clubs = yield* Clubs.Clubs

          return (
            canAddMultipleAuthors &&
            (user ? isPrereviewTeam(user) || (yield* clubs.isPrereviewerAClubLead(user.orcid)) : false)
          )
        }),
      ),
    ),
    canClubLeadsAddReviewsToClubs: Config.withDefault(Config.Boolean('CAN_CLUB_LEADS_ADD_REVIEWS_TO_CLUBS'), false),
    canLogInAsDemoUser: Config.withDefault(Config.Boolean('CAN_LOG_IN_AS_DEMO_USER'), false),
    canPreviewContentFromContentful: Config.withDefault(Config.Boolean('CAN_PREVIEW_CONTENT_FROM_CONTENTFUL'), false),
    canUseMatchmaking: pipe(
      Config.Boolean('CAN_USE_MATCHMAKING'),
      Config.map(canUseMatchmaking => {
        return (user?: User) => canUseMatchmaking && isPrereviewTeam(user)
      }),
      Config.withDefault(() => false),
    ),
    useEventsForPreprintReviews: Config.withDefault(Config.Boolean('USE_EVENTS_FOR_PREPRINT_REVIEWS'), false),
    loadBlogFromContentful: Config.withDefault(Config.Boolean('LOAD_BLOG_FROM_CONTENTFUL'), false),
    loadPagesFromContentful: Config.withDefault(Config.Boolean('LOAD_PAGES_FROM_CONTENTFUL'), false),
    sendCoarNotifyMessages: Config.withDefault(
      Config.Literals([true, false, 'sandbox'], 'SEND_COAR_NOTIFY_MESSAGES'),
      false,
    ),
    useCrowdinInContext: Config.withDefault(Config.Boolean('USE_CROWDIN_IN_CONTEXT'), false),
    showSpotlight: Config.withDefault(Config.Boolean('SHOW_SPOTLIGHT'), true),
  }),
  ContentfulConfig.layerConfig({
    accessToken: Config.Redacted('CONTENTFUL_ACCESS_TOKEN'),
    previewAccessToken: Config.Redacted('CONTENTFUL_PREVIEW_ACCESS_TOKEN'),
    environmentId: Config.succeed(ContentfulId.make('master')),
    spaceId: Config.withDefault(Config.schema(ContentfulId, 'CONTENTFUL_SPACE_ID'), ContentfulId.make('dapbmjoaf8gb')),
  }),
  Layer.effect(Ghost.GhostApi, Config.all({ key: Config.Redacted('GHOST_API_KEY') })),
  Layer.effect(
    Slack.SlackApi,
    Config.all({
      apiToken: Config.Redacted('SLACK_API_TOKEN'),
    }),
  ),
  Layer.effect(
    EnabledLocales,
    Config.withDefault(
      Config.Array(Schema.Literals([...UserSelectableLocales]), 'ENABLED_LOCALES').pipe(
        Config.map(HashSet.fromIterable),
      ),
      UserSelectableLocales,
    ),
  ),
  Layer.effect(
    Cloudinary.CloudinaryApi,
    Config.all({
      cloudName: Config.succeed('prereview'),
      key: Config.Redacted('CLOUDINARY_API_KEY'),
      secret: Config.Redacted('CLOUDINARY_API_SECRET'),
    }),
  ),
  Layer.effect(
    Orcid.OrcidApi,
    Config.all({
      origin: Config.withDefault(Config.URL('ORCID_API_URL'), new URL('https://pub.orcid.org/')),
      token: Config.option(Config.Redacted('ORCID_API_READ_PUBLIC_TOKEN')),
    }),
  ),
  OrcidOauth.layerConfig({
    url: Config.withDefault(Config.URL('ORCID_URL'), new URL('https://orcid.org/')),
    clientId: Config.String('ORCID_CLIENT_ID'),
    clientSecret: Config.Redacted('ORCID_CLIENT_SECRET'),
  }),
  SlackOauth.layerConfig({
    clientId: Config.String('SLACK_CLIENT_ID'),
    clientSecret: Config.Redacted('SLACK_CLIENT_SECRET'),
  }),
  WebApp.optionsLayerConfig({
    fathomId: Config.option(Config.String('FATHOM_SITE_ID')),
    environmentLabel: Config.option(Config.Literals(['dev', 'sandbox'], 'ENVIRONMENT_LABEL')),
  }),
  Layer.effect(
    IsUserBlocked,
    pipe(
      Config.withDefault(Config.Array(OrcidId.OrcidIdSchema, 'BLOCKED_USERS'), []),
      Config.map(blockedUsers => IsUserBlocked.of(user => Array.contains(blockedUsers, user))),
    ),
  ),
  Layer.effect(
    Prereviews.WasPrereviewRemoved,
    pipe(
      Config.withDefault(Config.Array(Schema.Int, 'REMOVED_PREREVIEWS'), []),
      Config.map(removedPrereviews => Prereviews.WasPrereviewRemoved.of(id => Array.contains(removedPrereviews, id))),
    ),
  ),
  Layer.effect(PublicUrl, Config.URL('PUBLIC_URL')),
  Layer.effect(
    ScietyListToken,
    Config.schema(NonEmptyString.NonEmptyStringSchema, 'SCIETY_LIST_TOKEN').pipe(Config.map(Redacted.make)),
  ),
  Layer.effect(SessionSecret, Config.Redacted('SECRET')),
  Layer.effect(
    Zenodo.ZenodoApi,
    Config.all({ key: Config.Redacted('ZENODO_API_KEY'), origin: Config.URL('ZENODO_URL') }),
  ),
  OpenAlex.layerApiConfig({ key: Config.Redacted('OPENALEX_API_KEY') }),
)
