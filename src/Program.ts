import { Layer, pipe } from 'effect'
import * as AuthorInvites from './AuthorInvites/index.ts'
import * as CachingHttpClient from './CachingHttpClient/index.ts'
import * as Clubs from './Clubs/index.ts'
import * as Comments from './Comments/index.ts'
import * as ContactEmailAddresses from './ContactEmailAddresses/index.ts'
import * as CookieSignature from './CookieSignature.ts'
import * as DatasetReviews from './DatasetReviews/index.ts'
import * as EventDispatcher from './EventDispatcher.ts'
import * as Events from './Events.ts'
import { Contentful } from './ExternalApis/Contentful/index.ts'
import {
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

export const Program = pipe(
  Layer.mergeAll(
    WebApp.layer,
    AuthorInvites.reactionsWorker,
    DatasetReviews.reactionsWorker,
    ReviewRequests.reactionsWorker,
    Comments.ReactToCommentEvents,
    CachingHttpClient.layerRevalidationWorker,
    EventDispatcher.worker,
  ),
  Layer.provide(Layer.effectDiscard(EventDispatcher.replayExistingEvents)),
  Layer.provide(PreprintReviews.workflowsLayer),
  Layer.provide([AuthorInvites.layer, PreprintReviews.layer, Prereviews.layer, ReviewRequests.layer]),
  Layer.provide(DatasetReviews.layer),
  Layer.provide(Prereviewers.layer),
  Layer.provide(ContactEmailAddresses.layer),
  Layer.provide([
    DatasetData.layer,
    PreprintData.layer,
    OpenAlexWorks.layer,
    OrcidRecords.layer,
    ZenodoRecords.layerCommentsForReview,
    Comments.layer,
    GhostPage.layer,
    CommunitySlack.layer,
    ZenodoRecords.layer,
  ]),
  Layer.provide(Clubs.layer),
  Layer.provide([Email.layer, LanguageDetection.layerCld]),
  Layer.provide([
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
  ]),
  Layer.provide([FetchHttpClient.layer, RequestCollapsingHttpClient.layer]),
  Layer.provide([SqlEventStore.layer, LoggingHttpClient.layer]),
  Layer.provide(SqlSensitiveDataStore.layer),
  Layer.provide([
    Events.layer,
    EventDispatcher.EventDispatcherLayer,
    Uuid.layer,
    CachingHttpClient.layerRevalidationQueue,
    CookieSignature.layer,
  ]),
)
