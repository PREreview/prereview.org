import type { HttpRouter } from '@effect/platform'

import { capitalCase } from 'case-anything'
import { isDoi } from 'doi-ts'
import { Schema } from 'effect'
import * as P from 'fp-ts-routing'
import * as O from 'fp-ts/lib/Option.js'
import { identity, pipe, tuple } from 'fp-ts/lib/function.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import iso6391, { type LanguageCode } from 'iso-639-1'
import { isOrcid } from 'orcid-id-ts'
import { match, P as p } from 'ts-pattern'
import { ClubIdC } from './types/club-id.js'
import { isFieldId } from './types/field.js'
import { ProfileId, Uuid } from './types/index.js'
import { type PhilsciPreprintId, PreprintDoiD, fromPreprintDoi } from './types/preprint-id.js'
import { PseudonymC } from './types/pseudonym.js'
import { NonEmptyStringC } from './types/string.js'
import { UuidC } from './types/uuid.js'

export interface Route<A extends { readonly [K in keyof A]: unknown }> {
  path: HttpRouter.PathInput
  href: (a: A) => string
  schema: Schema.Schema<A, { readonly [K in keyof A]: string }>
}

export const WriteComment: Route<{ id: number }> = {
  path: '/reviews/:id/write-a-comment',
  href: params => `/reviews/${params.id}/write-a-comment`,
  schema: Schema.Struct({ id: Schema.NumberFromString }),
}

export const WriteCommentStartNow: Route<{ id: number }> = {
  path: '/reviews/:id/write-a-comment/start-now',
  href: params => `/reviews/${params.id}/write-a-comment/start-now`,
  schema: Schema.Struct({ id: Schema.NumberFromString }),
}

export const WriteCommentEnterComment: Route<{ commentId: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/write-your-comment',
  href: params => `/write-a-comment/${params.commentId}/write-your-comment`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
}

export const WriteCommentChoosePersona: Route<{ commentId: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/choose-name',
  href: params => `/write-a-comment/${params.commentId}/choose-name`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
}

export const WriteCommentCompetingInterests: Route<{ commentId: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/competing-interests',
  href: params => `/write-a-comment/${params.commentId}/competing-interests`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
}

export const WriteCommentCodeOfConduct: Route<{ commentId: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/code-of-conduct',
  href: params => `/write-a-comment/${params.commentId}/code-of-conduct`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
}

export const WriteCommentEnterEmailAddress: Route<{ commentId: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/enter-email-address',
  href: params => `/write-a-comment/${params.commentId}/enter-email-address`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
}

export const WriteCommentNeedToVerifyEmailAddress: Route<{ commentId: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/need-to-verify-email-address',
  href: params => `/write-a-comment/${params.commentId}/need-to-verify-email-address`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
}

export const WriteCommentVerifyEmailAddress: Route<{ commentId: Uuid.Uuid; token: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/verify-email-address',
  href: params => `/write-a-comment/${params.commentId}/verify-email-address?token=${params.token}`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema, token: Uuid.UuidSchema }),
}

export const WriteCommentCheck: Route<{ commentId: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/check-your-comment',
  href: params => `/write-a-comment/${params.commentId}/check-your-comment`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
}

export const WriteCommentPublishing: Route<{ commentId: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/comment-being-published',
  href: params => `/write-a-comment/${params.commentId}/comment-being-published`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
}

export const WriteCommentPublished: Route<{ commentId: Uuid.Uuid }> = {
  path: '/write-a-comment/:commentId/comment-published',
  href: params => `/write-a-comment/${params.commentId}/comment-published`,
  schema: Schema.Struct({ commentId: Uuid.UuidSchema }),
}

const IntegerFromStringC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const n = +s
      return isNaN(n) || !Number.isInteger(n) || n.toString() !== s ? D.failure(s, 'integer') : D.success(n)
    }),
  ),
  {
    encode: String,
  },
)

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
export const EmptyAsUndefinedC = <I, O, A>(codec: C.Codec<I, O, A>) =>
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

const LanguageC = pipe(C.string, C.refine(iso6391Validate, 'LanguageCode'))

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

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
        return D.success({ type: 'philsci', value: parseInt(match, 10) } satisfies PhilsciPreprintId)
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
      .with({ type: 'philsci' }, PreprintPhilsciC.encode)
      .with({ value: p.when(isDoi) }, PreprintDoiC.encode)
      .exhaustive(),
})

export const homeMatch = pipe(query(C.partial({})), P.then(P.end))

export const aboutUsMatch = pipe(P.lit('about'), P.then(P.end))

export const peopleMatch = pipe(P.lit('people'), P.then(P.end))

export const howToUseMatch = pipe(P.lit('how-to-use'), P.then(P.end))

export const codeOfConductMatch = pipe(P.lit('code-of-conduct'), P.then(P.end))

export const ediaStatementMatch = pipe(P.lit('edia-statement'), P.then(P.end))

export const clubsMatch = pipe(P.lit('clubs'), P.then(P.end))

export const fundingMatch = pipe(P.lit('funding'), P.then(P.end))

export const partnersMatch = pipe(P.lit('partners'), P.then(P.end))

export const liveReviewsMatch = pipe(P.lit('live-reviews'), P.then(P.end))

export const privacyPolicyMatch = pipe(P.lit('privacy-policy'), P.then(P.end))

export const trainingsMatch = pipe(P.lit('trainings'), P.then(P.end))

export const resourcesMatch = pipe(P.lit('resources'), P.then(P.end))

export const logInMatch = pipe(P.lit('log-in'), P.then(P.end))

export const logOutMatch = pipe(P.lit('log-out'), P.then(P.end))

export const orcidCodeMatch = pipe(
  P.lit('orcid'),
  P.then(query(C.struct({ code: C.string, state: C.string }))),
  P.then(P.end),
)

export const orcidErrorMatch = pipe(
  P.lit('orcid'),
  P.then(query(C.struct({ error: C.string, state: C.string }))),
  P.then(P.end),
)

export const connectOrcidMatch = pipe(P.lit('connect-orcid'), P.then(P.end))

export const connectOrcidStartMatch = pipe(P.lit('connect-orcid'), P.then(P.lit('start-now')), P.then(P.end))

export const connectOrcidCodeMatch = pipe(
  P.lit('connect-orcid'),
  P.then(query(C.struct({ code: C.string }))),
  P.then(P.end),
)

export const connectOrcidErrorMatch = pipe(
  P.lit('connect-orcid'),
  P.then(query(C.struct({ error: C.string }))),
  P.then(P.end),
)

export const disconnectOrcidMatch = pipe(P.lit('disconnect-orcid'), P.then(P.end))

export const connectSlackMatch = pipe(P.lit('connect-slack'), P.then(P.end))

export const connectSlackStartMatch = pipe(P.lit('connect-slack'), P.then(P.lit('start-now')), P.then(P.end))

export const connectSlackCodeMatch = pipe(
  P.lit('connect-slack'),
  P.then(query(C.struct({ code: C.string, state: C.string }))),
  P.then(P.end),
)

export const connectSlackErrorMatch = pipe(
  P.lit('connect-slack'),
  P.then(query(C.struct({ error: C.string }))),
  P.then(P.end),
)

export const disconnectSlackMatch = pipe(P.lit('disconnect-slack'), P.then(P.end))

export const myPrereviewsMatch = pipe(P.lit('my-prereviews'), P.then(P.end))

export const myDetailsMatch = pipe(P.lit('my-details'), P.then(P.end))

export const changeAvatarMatch = pipe(P.lit('my-details'), P.then(P.lit('change-avatar')), P.then(P.end))

export const removeAvatarMatch = pipe(P.lit('my-details'), P.then(P.lit('remove-avatar')), P.then(P.end))

export const changeCareerStageMatch = pipe(P.lit('my-details'), P.then(P.lit('change-career-stage')), P.then(P.end))

export const changeCareerStageVisibilityMatch = pipe(
  P.lit('my-details'),
  P.then(P.lit('change-career-stage-visibility')),
  P.then(P.end),
)

export const changeOpenForRequestsMatch = pipe(
  P.lit('my-details'),
  P.then(P.lit('change-open-for-requests')),
  P.then(P.end),
)

export const changeOpenForRequestsVisibilityMatch = pipe(
  P.lit('my-details'),
  P.then(P.lit('change-open-for-requests-visibility')),
  P.then(P.end),
)

export const changeResearchInterestsMatch = pipe(
  P.lit('my-details'),
  P.then(P.lit('change-research-interests')),
  P.then(P.end),
)

export const changeResearchInterestsVisibilityMatch = pipe(
  P.lit('my-details'),
  P.then(P.lit('change-research-interests-visibility')),
  P.then(P.end),
)

export const changeLocationMatch = pipe(P.lit('my-details'), P.then(P.lit('change-location')), P.then(P.end))

export const changeLocationVisibilityMatch = pipe(
  P.lit('my-details'),
  P.then(P.lit('change-location-visibility')),
  P.then(P.end),
)

export const changeLanguagesMatch = pipe(P.lit('my-details'), P.then(P.lit('change-languages')), P.then(P.end))

export const changeLanguagesVisibilityMatch = pipe(
  P.lit('my-details'),
  P.then(P.lit('change-languages-visibility')),
  P.then(P.end),
)

export const changeContactEmailAddressMatch = pipe(
  P.lit('my-details'),
  P.then(P.lit('change-email-address')),
  P.then(P.end),
)

export const verifyContactEmailAddressMatch = pipe(
  P.lit('my-details'),
  P.then(P.lit('change-email-address')),
  P.then(query(C.struct({ verify: UuidC }))),
  P.then(P.end),
)

export const clubProfileMatch = pipe(P.lit('clubs'), P.then(type('id', ClubIdC)), P.then(P.end))

export const profileMatch = pipe(P.lit('profiles'), P.then(type('profile', ProfileIdC)), P.then(P.end))

export const preprintReviewsMatch = pipe(P.lit('preprints'), P.then(type('id', PreprintIdC)), P.then(P.end))

export const reviewsMatch = pipe(
  P.lit('reviews'),
  P.then(
    query(
      C.partial({
        field: EmptyAsUndefinedC(FieldIdC),
        language: EmptyAsUndefinedC(LanguageC),
        page: IntegerFromStringC,
        query: EmptyAsUndefinedC(NonEmptyStringC),
      }),
    ),
  ),
  P.then(P.end),
)

export const reviewMatch = pipe(P.lit('reviews'), P.then(type('id', IntegerFromStringC)), P.then(P.end))

const writeReviewBaseMatch = pipe(
  P.lit('preprints'),
  P.then(type('id', PreprintIdC)),
  P.then(P.lit('write-a-prereview')),
)

export const reviewAPreprintMatch = pipe(P.lit('review-a-preprint'), P.then(P.end))

export const writeReviewMatch = pipe(writeReviewBaseMatch, P.then(P.end))

export const writeReviewStartMatch = pipe(writeReviewBaseMatch, P.then(P.lit('start-now')), P.then(P.end))

export const writeReviewReviewTypeMatch = pipe(writeReviewBaseMatch, P.then(P.lit('review-type')), P.then(P.end))

export const writeReviewReviewMatch = pipe(writeReviewBaseMatch, P.then(P.lit('write-your-prereview')), P.then(P.end))

export const writeReviewIntroductionMatchesMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('introduction-matches')),
  P.then(P.end),
)

export const writeReviewMethodsAppropriateMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('methods-appropriate')),
  P.then(P.end),
)

export const writeReviewResultsSupportedMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('results-supported')),
  P.then(P.end),
)

export const writeReviewDataPresentationMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('data-presentation')),
  P.then(P.end),
)

export const writeReviewFindingsNextStepsMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('findings-next-steps')),
  P.then(P.end),
)

export const writeReviewNovelMatch = pipe(writeReviewBaseMatch, P.then(P.lit('novel')), P.then(P.end))

export const writeReviewLanguageEditingMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('language-editing')),
  P.then(P.end),
)

export const writeReviewShouldReadMatch = pipe(writeReviewBaseMatch, P.then(P.lit('should-read')), P.then(P.end))

export const writeReviewReadyFullReviewMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('ready-full-review')),
  P.then(P.end),
)

export const writeReviewPersonaMatch = pipe(writeReviewBaseMatch, P.then(P.lit('choose-name')), P.then(P.end))

export const writeReviewAuthorsMatch = pipe(writeReviewBaseMatch, P.then(P.lit('more-authors')), P.then(P.end))

export const writeReviewAddAuthorMatch = pipe(writeReviewBaseMatch, P.then(P.lit('add-author')), P.then(P.end))

export const writeReviewChangeAuthorMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('change-author')),
  P.then(query(C.struct({ number: IntegerFromStringC }))),
  P.then(P.end),
)

export const writeReviewRemoveAuthorMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('remove-author')),
  P.then(query(C.struct({ number: IntegerFromStringC }))),
  P.then(P.end),
)

export const writeReviewAddAuthorsMatch = pipe(writeReviewBaseMatch, P.then(P.lit('add-more-authors')), P.then(P.end))

export const writeReviewCompetingInterestsMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('competing-interests')),
  P.then(P.end),
)

export const writeReviewConductMatch = pipe(writeReviewBaseMatch, P.then(P.lit('code-of-conduct')), P.then(P.end))

export const writeReviewEnterEmailAddressMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('enter-email-address')),
  P.then(P.end),
)

export const writeReviewNeedToVerifyEmailAddressMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('verify-email-address')),
  P.then(P.end),
)

export const writeReviewVerifyEmailAddressMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('verify-email-address')),
  P.then(query(C.struct({ verify: UuidC }))),
  P.then(P.end),
)

export const writeReviewPublishMatch = pipe(writeReviewBaseMatch, P.then(P.lit('check-your-prereview')), P.then(P.end))

export const writeReviewPublishedMatch = pipe(writeReviewBaseMatch, P.then(P.lit('prereview-published')), P.then(P.end))

export const reviewRequestsMatch = pipe(
  P.lit('review-requests'),
  P.then(
    query(
      C.partial({
        field: EmptyAsUndefinedC(FieldIdC),
        language: EmptyAsUndefinedC(LanguageC),
        page: IntegerFromStringC,
      }),
    ),
  ),
  P.then(P.end),
)

export const requestAPrereviewMatch = pipe(P.lit('request-a-prereview'), P.then(P.end))

const requestReviewBaseMatch = pipe(
  P.lit('preprints'),
  P.then(type('id', PreprintIdC)),
  P.then(P.lit('request-a-prereview')),
)

export const requestReviewMatch = pipe(requestReviewBaseMatch, P.then(P.end))

export const requestReviewStartMatch = pipe(requestReviewBaseMatch, P.then(P.lit('start-now')), P.then(P.end))

export const requestReviewPersonaMatch = pipe(requestReviewBaseMatch, P.then(P.lit('choose-name')), P.then(P.end))

export const requestReviewCheckMatch = pipe(requestReviewBaseMatch, P.then(P.lit('check-your-request')), P.then(P.end))

export const requestReviewPublishedMatch = pipe(
  requestReviewBaseMatch,
  P.then(P.lit('request-published')),
  P.then(P.end),
)

export const authorInviteMatch = pipe(P.lit('author-invite'), P.then(type('id', UuidC)), P.then(P.end))

export const authorInviteDeclineMatch = pipe(
  P.lit('author-invite'),
  P.then(type('id', UuidC)),
  P.then(P.lit('decline')),
  P.then(P.end),
)

export const authorInviteStartMatch = pipe(
  P.lit('author-invite'),
  P.then(type('id', UuidC)),
  P.then(P.lit('start-now')),
  P.then(P.end),
)

export const authorInvitePersonaMatch = pipe(
  P.lit('author-invite'),
  P.then(type('id', UuidC)),
  P.then(P.lit('choose-name')),
  P.then(P.end),
)

export const authorInviteEnterEmailAddressMatch = pipe(
  P.lit('author-invite'),
  P.then(type('id', UuidC)),
  P.then(P.lit('enter-email-address')),
  P.then(P.end),
)

export const authorInviteNeedToVerifyEmailAddressMatch = pipe(
  P.lit('author-invite'),
  P.then(type('id', UuidC)),
  P.then(P.lit('verify-email-address')),
  P.then(P.end),
)

export const authorInviteVerifyEmailAddressMatch = pipe(
  P.lit('author-invite'),
  P.then(type('id', UuidC)),
  P.then(P.lit('verify-email-address')),
  P.then(query(C.struct({ verify: UuidC }))),
  P.then(P.end),
)

export const authorInviteCheckMatch = pipe(
  P.lit('author-invite'),
  P.then(type('id', UuidC)),
  P.then(P.lit('check-your-prereview')),
  P.then(P.end),
)

export const authorInvitePublishedMatch = pipe(
  P.lit('author-invite'),
  P.then(type('id', UuidC)),
  P.then(P.lit('name-published')),
  P.then(P.end),
)

export const usersDataMatch = pipe(P.lit('users-data'), P.then(P.end))

export const clubsDataMatch = pipe(P.lit('clubs-data'), P.then(P.end))

export const reviewsDataMatch = pipe(P.lit('reviews-data'), P.then(P.end))

export const scietyListMatch = pipe(P.lit('sciety-list'), P.then(P.end))

// https://github.com/gcanti/fp-ts-routing/pull/64
function query<A>(codec: C.Codec<unknown, Record<string, P.QueryValues>, A>): P.Match<A> {
  return new P.Match(
    new P.Parser(r =>
      O.Functor.map(O.fromEither(codec.decode(r.query)), query => tuple(query, new P.Route(r.parts, {}))),
    ),
    new P.Formatter((r, query) => new P.Route(r.parts, codec.encode(query))),
  )
}

function type<K extends string, A>(k: K, type: C.Codec<string, string, A>): P.Match<Record<K, A>> {
  return new P.Match(
    new P.Parser(r => {
      if (typeof r.parts[0] !== 'string') {
        return O.none
      } else {
        const head = r.parts[0]
        const tail = r.parts.slice(1)
        return O.Functor.map(O.fromEither(type.decode(head)), a => tuple(singleton(k, a), new P.Route(tail, r.query)))
      }
    }),
    new P.Formatter((r, o) => new P.Route(r.parts.concat(type.encode(o[k])), r.query)),
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
const singleton = <K extends string, V>(k: K, v: V): Record<K, V> => ({ [k as any]: v }) as any

// https://github.com/meikidd/iso-639-1/pull/61
function iso6391Validate(code: string): code is LanguageCode {
  return iso6391.validate(code)
}
