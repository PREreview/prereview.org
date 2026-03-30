import { capitalCase } from 'case-anything'
import { isDoi } from 'doi-ts'
import { Data, Match, Option, Schema, Tuple, flow, identity, pipe } from 'effect'
import * as P from 'fp-ts-routing'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import iso6391 from 'iso-639-1'
import { match, P as p } from 'ts-pattern'
import { ClubIdSchema } from './Clubs/index.ts'
import * as Datasets from './Datasets/index.ts'
import * as Preprints from './Preprints/index.ts'
import { PhilsciPreprintId, PreprintDoiD, fromPreprintDoi } from './Preprints/index.ts'
import { FptsToEffect } from './RefactoringUtilities/index.ts'
import { isFieldId } from './types/field.ts'
import { ProfileId, Uuid } from './types/index.ts'
import { NonEmptyStringC } from './types/NonEmptyString.ts'
import { isOrcidId } from './types/OrcidId.ts'
import { PseudonymC } from './types/Pseudonym.ts'
import { UuidC } from './types/uuid.ts'

export interface Route<A extends { readonly [K in keyof A]: unknown }> {
  path: `/${string}`
  href: (a: A) => `/${string}`
  schema: Schema.Schema<A, { readonly [K in keyof A]: string }>
}

const Route: <A extends { readonly [K in keyof A]: unknown }>(route: Route<A>) => Route<A> = Data.struct

export const HomePage = '/'
export const Inbox = '/inbox'
export const AboutUs = '/about'
export const ChooseLocale = '/choose-language'
export const Menu = '/menu'
export const PrivacyPolicy = '/privacy-policy'
export const Trainings = '/trainings'
export const ChampionsProgram = '/champions-program'
export const People = '/people'
export const HowToUse = '/how-to-use'
export const CodeOfConduct = '/code-of-conduct'
export const EdiaStatement = '/edia-statement'
export const Clubs = '/clubs'
export const Funding = '/funding'
export const Partners = '/partners'
export const LiveReviews = '/live-reviews'
export const Resources = '/resources'
export const LogIn = '/log-in'
export const LogInDemo = '/log-in-demo'
export const LogOut = '/log-out'
export const OrcidAuth = '/orcid'
export const RequestsData = '/requests-data'

const stringStartsWith =
  <P extends string>(prefix: P) =>
  (s: string): s is `${P}${string}` =>
    s.startsWith(prefix)

const PreprintIdSchema = Schema.transform(
  Schema.compose(
    Schema.String,
    Schema.Union(
      Schema.TemplateLiteralParser('doi-', pipe(Schema.NonEmptyString, Schema.lowercased())),
      Schema.TemplateLiteralParser('philsci-', Schema.NonNegativeInt),
    ),
  ),
  Preprints.IndeterminatePreprintIdFromStringSchema,
  {
    strict: true,
    decode: flow(
      Match.value,
      Match.when(
        ['doi-', Match.string],
        ([, match]) => `doi:${match.replaceAll('-', '/').replaceAll('+', '-')}` as const,
      ),
      Match.when(['philsci-', Match.number], ([, match]) => `https://philsci-archive.pitt.edu/${match}/` as const),
      Match.exhaustive,
    ),
    encode: flow(
      Match.value,
      Match.when(stringStartsWith('doi:'), id =>
        Tuple.make('doi-' as const, id.substring(4).toLowerCase().replaceAll('-', '+').replaceAll('/', '-')),
      ),
      Match.when(stringStartsWith('https://philsci-archive.pitt.edu/'), id =>
        Tuple.make('philsci-' as const, Number.parseInt(id.slice(33, -1))),
      ),
      Match.exhaustive,
    ),
  },
)

const DatasetIdSchema = Schema.transform(
  Schema.compose(Schema.String, Schema.TemplateLiteralParser('doi-', pipe(Schema.NonEmptyString, Schema.lowercased()))),
  Datasets.DatasetIdFromString,
  {
    strict: true,
    decode: ([, match]) => `doi:${match.replaceAll('-', '/').replaceAll('+', '-')}` as const,
    encode: value =>
      Tuple.make('doi-' as const, value.substring(4).toLowerCase().replaceAll('-', '+').replaceAll('/', '-')),
  },
)

export const ClubProfile = Route({
  path: '/clubs/:id',
  href: params => `/clubs/${Schema.encodeSync(ClubIdSchema)(params.id)}`,
  schema: Schema.Struct({ id: Schema.compose(Schema.String, ClubIdSchema) }),
})

export const DatasetReviews = Route({
  path: '/datasets/:datasetId',
  href: params => `/datasets/${Schema.encodeSync(DatasetIdSchema)(params.datasetId)}`,
  schema: Schema.Struct({ datasetId: DatasetIdSchema }),
})

export const DatasetReview = Route({
  path: '/reviews/:datasetReviewId',
  href: params => `/reviews/${params.datasetReviewId}`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const RequestAReviewOfThisPreprint = Route({
  path: '/preprints/:preprintId/request-a-prereview',
  href: params => `/preprints/${Schema.encodeSync(PreprintIdSchema)(params.preprintId)}/request-a-prereview`,
  schema: Schema.Struct({ preprintId: PreprintIdSchema }),
})

export const RequestAReviewStartNow = Route({
  path: '/preprints/:preprintId/request-a-prereview/start-now',
  href: params => `/preprints/${Schema.encodeSync(PreprintIdSchema)(params.preprintId)}/request-a-prereview/start-now`,
  schema: Schema.Struct({ preprintId: PreprintIdSchema }),
})

export const RequestAReviewPublished = Route({
  path: '/preprints/:preprintId/request-a-prereview/request-published',
  href: params =>
    `/preprints/${Schema.encodeSync(PreprintIdSchema)(params.preprintId)}/request-a-prereview/request-published`,
  schema: Schema.Struct({ preprintId: PreprintIdSchema }),
})

export const ReviewADataset = '/review-a-dataset'

export const ReviewThisDataset = Route({
  path: '/datasets/:datasetId/review-this-dataset',
  href: params => `/datasets/${Schema.encodeSync(DatasetIdSchema)(params.datasetId)}/review-this-dataset`,
  schema: Schema.Struct({ datasetId: DatasetIdSchema }),
})

export const ReviewThisDatasetStartNow = Route({
  path: '/datasets/:datasetId/start-now',
  href: params => `/datasets/${Schema.encodeSync(DatasetIdSchema)(params.datasetId)}/start-now`,
  schema: Schema.Struct({ datasetId: DatasetIdSchema }),
})

export const ReviewADatasetRateTheQuality = Route({
  path: '/review-a-dataset/:datasetReviewId/rate-the-quality',
  href: params => `/review-a-dataset/${params.datasetReviewId}/rate-the-quality`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetFollowsFairAndCarePrinciples = Route({
  path: '/review-a-dataset/:datasetReviewId/follows-fair-and-care-principles',
  href: params => `/review-a-dataset/${params.datasetReviewId}/follows-fair-and-care-principles`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetHasEnoughMetadata = Route({
  path: '/review-a-dataset/:datasetReviewId/has-enough-metadata',
  href: params => `/review-a-dataset/${params.datasetReviewId}/has-enough-metadata`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetHasTrackedChanges = Route({
  path: '/review-a-dataset/:datasetReviewId/has-tracked-changes',
  href: params => `/review-a-dataset/${params.datasetReviewId}/has-tracked-changes`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetHasDataCensoredOrDeleted = Route({
  path: '/review-a-dataset/:datasetReviewId/has-data-censored-or-deleted',
  href: params => `/review-a-dataset/${params.datasetReviewId}/has-data-censored-or-deleted`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetIsAppropriateForThisKindOfResearch = Route({
  path: '/review-a-dataset/:datasetReviewId/is-appropriate-for-this-kind-of-research',
  href: params => `/review-a-dataset/${params.datasetReviewId}/is-appropriate-for-this-kind-of-research`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetSupportsRelatedConclusions = Route({
  path: '/review-a-dataset/:datasetReviewId/supports-related-conclusions',
  href: params => `/review-a-dataset/${params.datasetReviewId}/supports-related-conclusions`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetIsDetailedEnough = Route({
  path: '/review-a-dataset/:datasetReviewId/is-detailed-enough',
  href: params => `/review-a-dataset/${params.datasetReviewId}/is-detailed-enough`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetIsErrorFree = Route({
  path: '/review-a-dataset/:datasetReviewId/is-error-free',
  href: params => `/review-a-dataset/${params.datasetReviewId}/is-error-free`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetMattersToItsAudience = Route({
  path: '/review-a-dataset/:datasetReviewId/matters-to-its-audience',
  href: params => `/review-a-dataset/${params.datasetReviewId}/matters-to-its-audience`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetIsReadyToBeShared = Route({
  path: '/review-a-dataset/:datasetReviewId/is-ready-to-be-shared',
  href: params => `/review-a-dataset/${params.datasetReviewId}/is-ready-to-be-shared`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetIsMissingAnything = Route({
  path: '/review-a-dataset/:datasetReviewId/is-missing-anything',
  href: params => `/review-a-dataset/${params.datasetReviewId}/is-missing-anything`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetChooseYourPersona = Route({
  path: '/review-a-dataset/:datasetReviewId/choose-name',
  href: params => `/review-a-dataset/${params.datasetReviewId}/choose-name`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetDeclareCompetingInterests = Route({
  path: '/review-a-dataset/:datasetReviewId/declare-competing-interests',
  href: params => `/review-a-dataset/${params.datasetReviewId}/declare-competing-interests`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetDeclareFollowingCodeOfConduct = Route({
  path: '/review-a-dataset/:datasetReviewId/declare-following-code-of-conduct',
  href: params => `/review-a-dataset/${params.datasetReviewId}/declare-following-code-of-conduct`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetCheckYourReview = Route({
  path: '/review-a-dataset/:datasetReviewId/check-your-review',
  href: params => `/review-a-dataset/${params.datasetReviewId}/check-your-review`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetReviewBeingPublished = Route({
  path: '/review-a-dataset/:datasetReviewId/review-being-published',
  href: params => `/review-a-dataset/${params.datasetReviewId}/review-being-published`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const ReviewADatasetReviewPublished = Route({
  path: '/review-a-dataset/:datasetReviewId/review-published',
  href: params => `/review-a-dataset/${params.datasetReviewId}/review-published`,
  schema: Schema.Struct({ datasetReviewId: Uuid.UuidSchema }),
})

export const WriteComment = Route({
  path: '/reviews/:id/write-a-comment',
  href: params => `/reviews/${params.id}/write-a-comment`,
  schema: Schema.Struct({ id: Schema.NumberFromString }),
})

export const WriteCommentStartNow = Route({
  path: '/reviews/:id/write-a-comment/start-now',
  href: params => `/reviews/${params.id}/write-a-comment/start-now`,
  schema: Schema.Struct({ id: Schema.NumberFromString }),
})

export const WriteCommentEnterComment = Route({
  path: '/write-a-comment/:commentId/write-your-comment',
  href: params => `/write-a-comment/${params.commentId}/write-your-comment`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
})

export const WriteCommentChoosePersona = Route({
  path: '/write-a-comment/:commentId/choose-name',
  href: params => `/write-a-comment/${params.commentId}/choose-name`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
})

export const WriteCommentCompetingInterests = Route({
  path: '/write-a-comment/:commentId/competing-interests',
  href: params => `/write-a-comment/${params.commentId}/competing-interests`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
})

export const WriteCommentCodeOfConduct = Route({
  path: '/write-a-comment/:commentId/code-of-conduct',
  href: params => `/write-a-comment/${params.commentId}/code-of-conduct`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
})

export const WriteCommentEnterEmailAddress = Route({
  path: '/write-a-comment/:commentId/enter-email-address',
  href: params => `/write-a-comment/${params.commentId}/enter-email-address`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
})

export const WriteCommentNeedToVerifyEmailAddress = Route({
  path: '/write-a-comment/:commentId/need-to-verify-email-address',
  href: params => `/write-a-comment/${params.commentId}/need-to-verify-email-address`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
})

export const WriteCommentVerifyEmailAddress = Route({
  path: '/write-a-comment/:commentId/verify-email-address',
  href: params => `/write-a-comment/${params.commentId}/verify-email-address?token=${params.token}`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema, token: Uuid.UuidSchema }),
})

export const WriteCommentCheck = Route({
  path: '/write-a-comment/:commentId/check-your-comment',
  href: params => `/write-a-comment/${params.commentId}/check-your-comment`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
})

export const WriteCommentPublishing = Route({
  path: '/write-a-comment/:commentId/comment-being-published',
  href: params => `/write-a-comment/${params.commentId}/comment-being-published`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
})

export const WriteCommentPublished = Route({
  path: '/write-a-comment/:commentId/comment-published',
  href: params => `/write-a-comment/${params.commentId}/comment-published`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
})

const IntegerFromStringC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const n = +s
      return isNaN(n) || !Number.isInteger(n) || n.toString() !== s ? D.failure(s, 'integer') : D.success(n)
    }),
  ),
  {
    encode: value => value.toString(),
  },
)

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
const EmptyAsUndefinedC = <I, O, A>(codec: C.Codec<I, O, A>) =>
  C.make(
    D.union(
      codec,
      pipe(
        D.literal(''),
        D.map(() => undefined),
      ),
    ),
    { encode: value => (value === undefined ? '' : codec.encode(value)) },
  ) satisfies C.Codec<I, O | '', A | undefined>

const FieldIdC = pipe(C.string, C.refine(isFieldId, 'FieldId'))

const LanguageC = pipe(C.string, C.refine(iso6391.validate, 'LanguageCode'))

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcidId, 'ORCID'))

const OrcidProfileIdC = pipe(
  OrcidC,
  C.imap(ProfileId.forOrcid, profile => profile.orcid),
)

const SlugC = C.make(
  pipe(
    D.string,
    D.parse(s => (s.toLowerCase() === s ? D.success(s.replaceAll('-', ' ')) : D.failure(s, 'Slug'))),
  ),
  {
    encode: string => string.toLowerCase().replaceAll(' ', '-'),
  },
)

const PseudonymSlugC = pipe(SlugC, C.imap(capitalCase, identity), C.compose(PseudonymC))

const PseudonymProfileIdC = pipe(
  PseudonymSlugC,
  C.imap(ProfileId.forPseudonym, profile => profile.pseudonym),
)

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
const ProfileIdC = C.make(D.union(OrcidProfileIdC, PseudonymProfileIdC), {
  encode: ProfileId.match({ onOrcid: OrcidProfileIdC.encode, onPseudonym: PseudonymProfileIdC.encode }),
})

const PreprintDoiC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = /^doi-(.+)$/.exec(s) ?? []

      if (typeof match === 'string' && match.toLowerCase() === match) {
        return pipe(PreprintDoiD, D.map(fromPreprintDoi)).decode(match.replaceAll('-', '/').replaceAll('+', '-'))
      }

      return D.failure(s, 'DOI')
    }),
  ),
  {
    encode: id => `doi-${id.value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-')}`,
  },
)

const PreprintPhilsciC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = /^philsci-([1-9][0-9]*)$/.exec(s) ?? []

      if (typeof match === 'string') {
        return D.success(new PhilsciPreprintId({ value: parseInt(match, 10) }))
      }

      return D.failure(s, 'ID')
    }),
  ),
  {
    encode: id => `philsci-${id.value}`,
  },
)

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
const PreprintIdC = C.make(D.union(PreprintDoiC, PreprintPhilsciC), {
  encode: id =>
    match(id)
      .with({ _tag: 'PhilsciPreprintId' }, PreprintPhilsciC.encode)
      .with({ value: p.when(isDoi) }, PreprintDoiC.encode)
      .exhaustive(),
})

export const orcidCodeMatch = pipe(
  P.lit('orcid'),
  P.andThen(query(C.struct({ code: C.string, state: C.string }))),
  P.andThen(P.end),
)

export const connectOrcidMatch = pipe(P.lit('connect-orcid'), P.andThen(P.end))

export const connectOrcidStartMatch = pipe(P.lit('connect-orcid'), P.andThen(P.lit('start-now')), P.andThen(P.end))

export const connectOrcidCodeMatch = pipe(
  P.lit('connect-orcid'),
  P.andThen(query(C.struct({ code: C.string }))),
  P.andThen(P.end),
)

export const connectOrcidErrorMatch = pipe(
  P.lit('connect-orcid'),
  P.andThen(query(C.struct({ error: C.string }))),
  P.andThen(P.end),
)

export const disconnectOrcidMatch = pipe(P.lit('disconnect-orcid'), P.andThen(P.end))

export const connectSlackMatch = pipe(P.lit('connect-slack'), P.andThen(P.end))

export const connectSlackStartMatch = pipe(P.lit('connect-slack'), P.andThen(P.lit('start-now')), P.andThen(P.end))

export const connectSlackCodeMatch = pipe(
  P.lit('connect-slack'),
  P.andThen(query(C.struct({ code: C.string, state: C.string }))),
  P.andThen(P.end),
)

export const connectSlackErrorMatch = pipe(
  P.lit('connect-slack'),
  P.andThen(query(C.struct({ error: C.string }))),
  P.andThen(P.end),
)

export const disconnectSlackMatch = pipe(P.lit('disconnect-slack'), P.andThen(P.end))

export const myPrereviewsMatch = pipe(P.lit('my-prereviews'), P.andThen(P.end))

export const myDetailsMatch = pipe(P.lit('my-details'), P.andThen(P.end))

export const changeAvatarMatch = pipe(P.lit('my-details'), P.andThen(P.lit('change-avatar')), P.andThen(P.end))

export const removeAvatarMatch = pipe(P.lit('my-details'), P.andThen(P.lit('remove-avatar')), P.andThen(P.end))

export const changeCareerStageMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-career-stage')),
  P.andThen(P.end),
)

export const changeCareerStageVisibilityMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-career-stage-visibility')),
  P.andThen(P.end),
)

export const changeOpenForRequestsMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-open-for-requests')),
  P.andThen(P.end),
)

export const changeOpenForRequestsVisibilityMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-open-for-requests-visibility')),
  P.andThen(P.end),
)

export const changeResearchInterestsMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-research-interests')),
  P.andThen(P.end),
)

export const changeResearchInterestsVisibilityMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-research-interests-visibility')),
  P.andThen(P.end),
)

export const changeLocationMatch = pipe(P.lit('my-details'), P.andThen(P.lit('change-location')), P.andThen(P.end))

export const changeLocationVisibilityMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-location-visibility')),
  P.andThen(P.end),
)

export const changeLanguagesMatch = pipe(P.lit('my-details'), P.andThen(P.lit('change-languages')), P.andThen(P.end))

export const changeLanguagesVisibilityMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-languages-visibility')),
  P.andThen(P.end),
)

export const changeContactEmailAddressMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-email-address')),
  P.andThen(P.end),
)

export const verifyContactEmailAddressMatch = pipe(
  P.lit('my-details'),
  P.andThen(P.lit('change-email-address')),
  P.andThen(query(C.struct({ verify: UuidC }))),
  P.andThen(P.end),
)

export const profileMatch = pipe(P.lit('profiles'), P.andThen(type('profile', ProfileIdC)), P.andThen(P.end))

export const preprintReviewsMatch = pipe(P.lit('preprints'), P.andThen(type('id', PreprintIdC)), P.andThen(P.end))

export const reviewsMatch = pipe(
  P.lit('reviews'),
  P.andThen(
    query(
      C.partial({
        field: EmptyAsUndefinedC(FieldIdC),
        language: EmptyAsUndefinedC(LanguageC),
        page: IntegerFromStringC,
        query: EmptyAsUndefinedC(NonEmptyStringC),
      }),
    ),
  ),
  P.andThen(P.end),
)

export const reviewMatch = pipe(
  P.lit('reviews'),
  P.andThen(type('id', IntegerFromStringC)),
  P.andThen(query(C.partial({}))),
  P.andThen(P.end),
)

const writeReviewBaseMatch = pipe(
  P.lit('preprints'),
  P.andThen(type('id', PreprintIdC)),
  P.andThen(P.lit('write-a-prereview')),
)

export const reviewAPreprintMatch = pipe(P.lit('review-a-preprint'), P.andThen(P.end))

export const writeReviewMatch = pipe(writeReviewBaseMatch, P.andThen(P.end))

export const writeReviewStartMatch = pipe(writeReviewBaseMatch, P.andThen(P.lit('start-now')), P.andThen(P.end))

export const writeReviewReviewTypeMatch = pipe(writeReviewBaseMatch, P.andThen(P.lit('review-type')), P.andThen(P.end))

export const writeReviewReviewMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('write-your-prereview')),
  P.andThen(P.end),
)

export const writeReviewIntroductionMatchesMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('introduction-matches')),
  P.andThen(P.end),
)

export const writeReviewMethodsAppropriateMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('methods-appropriate')),
  P.andThen(P.end),
)

export const writeReviewResultsSupportedMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('results-supported')),
  P.andThen(P.end),
)

export const writeReviewDataPresentationMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('data-presentation')),
  P.andThen(P.end),
)

export const writeReviewFindingsNextStepsMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('findings-next-steps')),
  P.andThen(P.end),
)

export const writeReviewNovelMatch = pipe(writeReviewBaseMatch, P.andThen(P.lit('novel')), P.andThen(P.end))

export const writeReviewLanguageEditingMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('language-editing')),
  P.andThen(P.end),
)

export const writeReviewShouldReadMatch = pipe(writeReviewBaseMatch, P.andThen(P.lit('should-read')), P.andThen(P.end))

export const writeReviewReadyFullReviewMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('ready-full-review')),
  P.andThen(P.end),
)

export const writeReviewPersonaMatch = pipe(writeReviewBaseMatch, P.andThen(P.lit('choose-name')), P.andThen(P.end))

export const writeReviewAuthorsMatch = pipe(writeReviewBaseMatch, P.andThen(P.lit('more-authors')), P.andThen(P.end))

export const writeReviewAddAuthorMatch = pipe(writeReviewBaseMatch, P.andThen(P.lit('add-author')), P.andThen(P.end))

export const writeReviewChangeAuthorMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('change-author')),
  P.andThen(query(C.struct({ number: IntegerFromStringC }))),
  P.andThen(P.end),
)

export const writeReviewRemoveAuthorMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('remove-author')),
  P.andThen(query(C.struct({ number: IntegerFromStringC }))),
  P.andThen(P.end),
)

export const writeReviewAddAuthorsMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('add-more-authors')),
  P.andThen(P.end),
)

export const writeReviewUseOfAiMatch = pipe(writeReviewBaseMatch, P.andThen(P.lit('use-of-ai')), P.andThen(P.end))

export const writeReviewCompetingInterestsMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('competing-interests')),
  P.andThen(P.end),
)

export const writeReviewConductMatch = pipe(writeReviewBaseMatch, P.andThen(P.lit('code-of-conduct')), P.andThen(P.end))

export const writeReviewEnterEmailAddressMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('enter-email-address')),
  P.andThen(P.end),
)

export const writeReviewNeedToVerifyEmailAddressMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('verify-email-address')),
  P.andThen(P.end),
)

export const writeReviewVerifyEmailAddressMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('verify-email-address')),
  P.andThen(query(C.struct({ verify: UuidC }))),
  P.andThen(P.end),
)

export const writeReviewPublishMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('check-your-prereview')),
  P.andThen(P.end),
)

export const writeReviewPublishedMatch = pipe(
  writeReviewBaseMatch,
  P.andThen(P.lit('prereview-published')),
  P.andThen(P.end),
)

export const reviewRequestsMatch = pipe(
  P.lit('review-requests'),
  P.andThen(
    query(
      C.partial({
        field: EmptyAsUndefinedC(FieldIdC),
        language: EmptyAsUndefinedC(LanguageC),
        page: IntegerFromStringC,
      }),
    ),
  ),
  P.andThen(P.end),
)

export const requestAPrereviewMatch = pipe(P.lit('request-a-prereview'), P.andThen(P.end))

const requestReviewBaseMatch = pipe(
  P.lit('preprints'),
  P.andThen(type('id', PreprintIdC)),
  P.andThen(P.lit('request-a-prereview')),
)

export const requestReviewPersonaMatch = pipe(requestReviewBaseMatch, P.andThen(P.lit('choose-name')), P.andThen(P.end))

export const requestReviewCheckMatch = pipe(
  requestReviewBaseMatch,
  P.andThen(P.lit('check-your-request')),
  P.andThen(P.end),
)

export const authorInviteMatch = pipe(P.lit('author-invite'), P.andThen(type('id', UuidC)), P.andThen(P.end))

export const authorInviteDeclineMatch = pipe(
  P.lit('author-invite'),
  P.andThen(type('id', UuidC)),
  P.andThen(P.lit('decline')),
  P.andThen(P.end),
)

export const authorInviteStartMatch = pipe(
  P.lit('author-invite'),
  P.andThen(type('id', UuidC)),
  P.andThen(P.lit('start-now')),
  P.andThen(P.end),
)

export const authorInvitePersonaMatch = pipe(
  P.lit('author-invite'),
  P.andThen(type('id', UuidC)),
  P.andThen(P.lit('choose-name')),
  P.andThen(P.end),
)

export const authorInviteEnterEmailAddressMatch = pipe(
  P.lit('author-invite'),
  P.andThen(type('id', UuidC)),
  P.andThen(P.lit('enter-email-address')),
  P.andThen(P.end),
)

export const authorInviteNeedToVerifyEmailAddressMatch = pipe(
  P.lit('author-invite'),
  P.andThen(type('id', UuidC)),
  P.andThen(P.lit('verify-email-address')),
  P.andThen(P.end),
)

export const authorInviteVerifyEmailAddressMatch = pipe(
  P.lit('author-invite'),
  P.andThen(type('id', UuidC)),
  P.andThen(P.lit('verify-email-address')),
  P.andThen(query(C.struct({ verify: UuidC }))),
  P.andThen(P.end),
)

export const authorInviteCheckMatch = pipe(
  P.lit('author-invite'),
  P.andThen(type('id', UuidC)),
  P.andThen(P.lit('check-your-prereview')),
  P.andThen(P.end),
)

export const authorInvitePublishedMatch = pipe(
  P.lit('author-invite'),
  P.andThen(type('id', UuidC)),
  P.andThen(P.lit('name-published')),
  P.andThen(P.end),
)

export const usersDataMatch = pipe(P.lit('users-data'), P.andThen(P.end))

export const clubsDataMatch = pipe(P.lit('clubs-data'), P.andThen(P.end))

export const reviewsDataMatch = pipe(P.lit('reviews-data'), P.andThen(P.end))

export const scietyListMatch = pipe(P.lit('sciety-list'), P.andThen(P.end))

// https://github.com/gcanti/fp-ts-routing/pull/64
function query<A>(codec: C.Codec<unknown, Record<string, P.QueryValues>, A>): P.Match<A> {
  return new P.Match(
    new P.Parser(r =>
      Option.map(Option.getRight(FptsToEffect.either(codec.decode(r.query))), query =>
        Tuple.make(query, new P.Route(r.parts, {})),
      ),
    ),
    new P.Formatter((r, query) => new P.Route(r.parts, codec.encode(query))),
  )
}

function type<K extends string, A>(k: K, type: C.Codec<string, string, A>): P.Match<Record<K, A>> {
  return new P.Match(
    new P.Parser(r => {
      if (typeof r.parts[0] !== 'string') {
        return Option.none()
      } else {
        const head = r.parts[0]
        const tail = r.parts.slice(1)
        return Option.map(Option.getRight(FptsToEffect.either(type.decode(head))), a =>
          Tuple.make(singleton(k, a), new P.Route(tail, r.query)),
        )
      }
    }),
    new P.Formatter((r, o) => new P.Route(r.parts.concat(type.encode(o[k])), r.query)),
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
const singleton = <K extends string, V>(k: K, v: V): Record<K, V> => ({ [k as any]: v }) as any
