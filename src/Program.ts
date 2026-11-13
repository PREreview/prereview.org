import { Layer, pipe } from 'effect'
import * as AuthorInvites from './Domain/AuthorInvites/index.ts'
import * as CachingHttpClient from './CachingHttpClient/index.ts'
import * as Clubs from './Domain/Clubs/index.ts'
import * as Comments from './Domain/Comments/index.ts'
import * as ContactEmailAddresses from './ContactEmailAddresses/index.ts'
import * as CookieSignature from './CookieSignature.ts'
import * as DatasetReviews from './DatasetReviews/index.ts'
import * as EventDispatcher from './EventDispatcher.ts'
import * as Events from './Events.ts'
import { Contentful } from './ExternalApis/Contentful/index.ts'
import {
  Cloudinary,
  CoarNotify,
  Crossref,
  Datacite,
  Ghost,
  JapanLinkCenter,
  Nodemailer,
  OpenAlex,
  Orcid,
  Philsci,
  Slack,
  Zenodo,
} from './ExternalApis/index.ts'
import {
  CloudinaryAvatars,
  CommunitySlack,
  DatasetData,
  Email,
  GhostPage,
  LanguageDetection,
  OpenAlexWorks,
  OrcidRecords,
  PreprintData,
  ZenodoRecords,
} from './ExternalInteractions/index.ts'
import * as FetchHttpClient from './FetchHttpClient.ts'
import * as LoggingHttpClient from './LoggingHttpClient.ts'
import * as PreprintReviews from './PreprintReviews/index.ts'
import * as Prereviewers from './Prereviewers/index.ts'
import * as Prereviews from './Prereviews/index.ts'
import * as RequestCollapsingHttpClient from './RequestCollapsingHttpClient.ts'
import * as ReviewRequests from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import * as SqlSensitiveDataStore from './SqlSensitiveDataStore.ts'
import { Uuid } from './types/index.ts'
import * as WebApp from './WebApp/index.ts'

const Workers = Layer.mergeAll(
  AuthorInvites.reactionsWorker,
  DatasetReviews.reactionsWorker,
  ReviewRequests.reactionsWorker,
  Comments.ReactToCommentEvents,
  CachingHttpClient.layerRevalidationWorker,
  EventDispatcher.worker,
)

const Domain = pipe(
  PreprintReviews.workflowsLayer,
  Layer.provideMerge(
    Layer.mergeAll(AuthorInvites.layer, Comments.layer, PreprintReviews.layer, Prereviews.layer, ReviewRequests.layer),
  ),
  Layer.provideMerge(DatasetReviews.layer),
  Layer.provideMerge(Prereviewers.layer),
  Layer.provideMerge(ContactEmailAddresses.layer),
)

const ExternalInteractions = pipe(
  Layer.mergeAll(
    DatasetData.layer,
    PreprintData.layer,
    OpenAlexWorks.layer,
    OrcidRecords.layer,
    ZenodoRecords.layerCommentsForReview,
    GhostPage.layer,
    CloudinaryAvatars.layer,
    CommunitySlack.layer,
    ZenodoRecords.layer,
  ),
  Layer.provideMerge(Layer.mergeAll(Email.layer, LanguageDetection.layerCld)),
)

const ExternalApis = Layer.mergeAll(
  Cloudinary.layer,
  CoarNotify.layer,
  Layer.provide(Contentful.layer, CachingHttpClient.layer('10 seconds')),
  Layer.provide(Crossref.layer, CachingHttpClient.layer('1 day')),
  Layer.provide(Datacite.layer, CachingHttpClient.layer('1 day')),
  Layer.provide(Ghost.layer, CachingHttpClient.layer('10 seconds')),
  Layer.provide(JapanLinkCenter.layer, CachingHttpClient.layer('1 day')),
  Layer.provide(OpenAlex.layer, CachingHttpClient.layer('10 minutes')),
  Layer.provide(Orcid.layer, CachingHttpClient.layer('1 day')),
  Layer.provide(Philsci.layer, CachingHttpClient.layer('1 day')),
  Slack.layer,
  Zenodo.layer,
  Nodemailer.layer,
)

const Infrastructure = pipe(
  Layer.mergeAll(FetchHttpClient.layer, RequestCollapsingHttpClient.layer),
  Layer.provideMerge(Layer.mergeAll(SqlEventStore.layer, LoggingHttpClient.layer)),
  Layer.provideMerge(SqlSensitiveDataStore.layer),
  Layer.provideMerge(
    Layer.mergeAll(
      Events.layer,
      EventDispatcher.EventDispatcherLayer,
      Uuid.layer,
      CachingHttpClient.layerRevalidationQueue,
      CookieSignature.layer,
    ),
  ),
)

export const Program = pipe(
  Layer.mergeAll(WebApp.layer, Workers),
  Layer.provide(Layer.effectDiscard(EventDispatcher.replayExistingEvents)),
  Layer.provide(Domain),
  Layer.provide(ExternalInteractions),
  Layer.provide(Clubs.layer),
  Layer.provide(ExternalApis),
  Layer.provide(Infrastructure),
)
