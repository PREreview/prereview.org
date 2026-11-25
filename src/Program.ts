import { Layer, pipe } from 'effect'
import { RateLimiter } from 'effect/persistence'
import * as CachingHttpClient from './CachingHttpClient/index.ts'
import * as CookieSignature from './CookieSignature.ts'
import * as AuthorInvites from './Domain/AuthorInvites/index.ts'
import * as Clubs from './Domain/Clubs/index.ts'
import * as Comments from './Domain/Comments/index.ts'
import * as ContactEmailAddresses from './Domain/ContactEmailAddresses/index.ts'
import * as DatasetReviews from './Domain/DatasetReviews/index.ts'
import * as Events from './Domain/Events/index.ts'
import { SqlEventStore } from './Domain/Events/index.ts'
import * as PreprintReviews from './Domain/PreprintReviews/index.ts'
import * as Prereviewers from './Domain/Prereviewers/index.ts'
import * as Prereviews from './Domain/Prereviews/index.ts'
import * as ReviewRequests from './Domain/ReviewRequests/index.ts'
import { StatefulQueries } from './EventSourcing/index.ts'
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
import * as RequestCollapsingHttpClient from './RequestCollapsingHttpClient.ts'
import { SqlSensitiveDataStore } from './SensitiveData/index.ts'
import { Uuid } from './types/index.ts'
import * as WebApp from './WebApp/index.ts'

const Workers = Layer.mergeAll(
  AuthorInvites.reactionsWorker,
  DatasetReviews.reactionsWorker,
  ReviewRequests.reactionsWorker,
  Comments.ReactToCommentEvents,
  CachingHttpClient.layerRevalidationWorker,
  StatefulQueries.worker,
)

const Domain = pipe(
  PreprintReviews.workflowsLayer,
  Layer.provideMerge(Layer.mergeAll(AuthorInvites.layer, Comments.layer, Prereviews.layer, ReviewRequests.layer)),
  Layer.provideMerge(Layer.mergeAll(DatasetReviews.layer, PreprintReviews.layer)),
  Layer.provideMerge(Prereviewers.layer),
  Layer.provideMerge(ContactEmailAddresses.layer),
)

const ExternalInteractions = pipe(
  Layer.mergeAll(
    DatasetData.layer,
    PreprintData.layer,
    OpenAlexWorks.layer,
    OrcidRecords.layer,
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
  pipe(
    Crossref.layer,
    Layer.provide(CachingHttpClient.layer('1 day', '10 seconds')),
    Layer.provide(Layer.fresh(RequestCollapsingHttpClient.layer)),
    Layer.provide(Crossref.layerRateLimitedHttpClient),
  ),
  Layer.provide(Datacite.layer, CachingHttpClient.layer('1 day')),
  Layer.provide(Ghost.layer, CachingHttpClient.layer('10 seconds')),
  Layer.provide(JapanLinkCenter.layer, CachingHttpClient.layer('1 day')),
  Layer.provide(OpenAlex.layer, CachingHttpClient.layer('10 minutes')),
  pipe(
    Orcid.layer,
    Layer.provide(CachingHttpClient.layer('1 day', '10 seconds')),
    Layer.provide(Layer.fresh(RequestCollapsingHttpClient.layer)),
    Layer.provide(Orcid.layerRateLimitedHttpClient),
  ),
  Layer.provide(Philsci.layer, CachingHttpClient.layer('1 day')),
  Slack.layer,
  Zenodo.layer,
  Nodemailer.layer,
)

const Infrastructure = pipe(
  Layer.mergeAll(FetchHttpClient.layer, RequestCollapsingHttpClient.layer),
  Layer.provideMerge(Layer.mergeAll(SqlEventStore.layer(Events.Event), LoggingHttpClient.layer)),
  Layer.provideMerge(SqlSensitiveDataStore.layer),
  Layer.provideMerge(
    Layer.mergeAll(
      StatefulQueries.layer,
      Uuid.layer,
      CachingHttpClient.layerRevalidationQueue,
      Layer.provide(RateLimiter.layer, RateLimiter.layerStoreMemory),
      CookieSignature.layer,
    ),
  ),
)

export const Program = pipe(
  Layer.mergeAll(WebApp.layer, Workers),
  Layer.provide(Layer.effectDiscard(StatefulQueries.replay)),
  Layer.provide(Domain),
  Layer.provide(ExternalInteractions),
  Layer.provide(Clubs.layer),
  Layer.provide(ExternalApis),
  Layer.provide(Infrastructure),
)
