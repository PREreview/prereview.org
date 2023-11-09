import { capitalCase } from 'capital-case'
import { isDoi } from 'doi-ts'
import * as P from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { identity, pipe, tuple } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { isOrcid } from 'orcid-id-ts'
import { match, P as p } from 'ts-pattern'
import { isUuid } from 'uuid-ts'
import { ClubIdC } from './types/club-id'
import { type PhilsciPreprintId, PreprintDoiD, fromPreprintDoi } from './types/preprint-id'
import type { OrcidProfileId, PseudonymProfileId } from './types/profile-id'
import { PseudonymC } from './types/pseudonym'

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

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

const OrcidProfileIdC = pipe(
  OrcidC,
  C.imap(
    orcid => ({ type: 'orcid', value: orcid }) satisfies OrcidProfileId,
    profile => profile.value,
  ),
)

const UuidC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      if (s.toLowerCase() === s) {
        return D.fromRefinement(isUuid, 'UUID').decode(s)
      }

      return D.failure(s, 'UUID')
    }),
  ),
  { encode: uuid => uuid.toLowerCase() },
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
  C.imap(
    pseudonym => ({ type: 'pseudonym', value: pseudonym }) satisfies PseudonymProfileId,
    profile => profile.value,
  ),
)

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
const ProfileIdC = C.make(D.union(OrcidProfileIdC, PseudonymProfileIdC), {
  encode: id =>
    match(id)
      .with({ type: 'orcid' }, OrcidProfileIdC.encode)
      .with({ type: 'pseudonym' }, PseudonymProfileIdC.encode)
      .exhaustive(),
})

const PreprintDoiC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = s.match(/^doi-(.+)$/) ?? []

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
      const [, match] = s.match(/^philsci-([1-9][0-9]*)$/) ?? []

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

export const homeMatch = pipe(
  query(C.partial({ message: C.literal('logged-out', 'logged-in', 'blocked') })),
  P.then(P.end),
)

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

export const findAPreprintMatch = pipe(P.lit('find-a-preprint'), P.then(P.end))

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

export const myDetailsMatch = pipe(P.lit('my-details'), P.then(P.end))

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

export const reviewsMatch = pipe(P.lit('reviews'), P.then(query(C.struct({ page: IntegerFromStringC }))), P.then(P.end))

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

export const writeReviewVerifyEmailAddressMatch = pipe(
  writeReviewBaseMatch,
  P.then(P.lit('verify-email-address')),
  P.then(P.end),
)

export const writeReviewPublishMatch = pipe(writeReviewBaseMatch, P.then(P.lit('check-your-prereview')), P.then(P.end))

export const writeReviewPublishedMatch = pipe(writeReviewBaseMatch, P.then(P.lit('prereview-published')), P.then(P.end))

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

function type<K extends string, A>(k: K, type: C.Codec<string, string, A>): P.Match<{ [_ in K]: A }> {
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
const singleton = <K extends string, V>(k: K, v: V): { [_ in K]: V } => ({ [k as any]: v }) as any
