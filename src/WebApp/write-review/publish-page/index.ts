import { Effect, Match, Option, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import type { Locale } from '../../../Context.ts'
import { type ClubName, Clubs } from '../../../Domain/Clubs/index.ts'
import { type ContactEmailAddress, ContactEmailAddresses } from '../../../Domain/ContactEmailAddresses/index.ts'
import {
  type CompletedForm,
  CompletedFormC,
  type Form,
  type FormStore,
  type NewPrereview,
  PreprintReviews,
  type PublishPrereviewEnv,
  completedFormToNewPrereview,
  deleteForm,
  getForm,
  getLicense,
  guessLanguage,
  nextFormPath,
  saveForm,
} from '../../../Domain/PreprintReviews/index.ts'
import {
  type IndeterminatePreprintId,
  type PreprintTitle,
  type Preprints,
  getPreprintTitle,
} from '../../../Domain/Preprints/index.ts'
import * as Prereviewers from '../../../Domain/Prereviewers/index.ts'
import type { LanguageDetection } from '../../../ExternalInteractions/index.ts'
import { OpenAlexWorks } from '../../../ExternalInteractions/OpenAlexWorks/index.ts'
import { FeatureFlags } from '../../../FeatureFlags.ts'
import { fixHeadingLevels } from '../../../html.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as Routes from '../../../routes.ts'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../../routes.ts'
import { Temporal } from '../../../types/index.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import type { AddToSessionEnv } from '../../session.ts'
import { storeInformationForWriteReviewPublishedPage } from '../published-review.ts'
import { failureMessage } from './failure-message.ts'
import { publishForm } from './publish-form.ts'

export const writeReviewPublish = ({
  id,
  locale,
  method,
  user,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<
  PublishPrereviewEnv &
    AddToSessionEnv &
    EffectToFpts.EffectEnv<
      | Clubs
      | ContactEmailAddresses
      | FeatureFlags
      | FormStore.Store
      | LanguageDetection.LanguageDetection
      | Locale
      | Prereviewers.Prereviewers
      | Preprints
      | PreprintReviews
      | OpenAlexWorks
    >,
  Response
> =>
  pipe(
    EffectToFpts.toReaderTaskEither(getPreprintTitle(id)),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('preprint', () => preprint),
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.let('locale', () => locale),
          RTE.bindW('originalForm', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('form', ({ originalForm }) => CompletedFormC.decode(originalForm)),
          RTE.let('method', () => method),
          RTE.bindW(
            'contactEmailAddress',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(
                function* ({ user }) {
                  const contactEmailAddresses = yield* ContactEmailAddresses
                  return yield* contactEmailAddresses.getContactEmailAddress(user.orcid)
                },
                Effect.catchTag('ContactEmailAddressIsNotFound', () => Effect.succeed(undefined)),
              ),
            ),
          ),
          RTE.bindW(
            'club',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(function* ({ form }) {
                const clubs = yield* Clubs

                if (E.isLeft(form)) {
                  return
                }

                if (typeof form.right.club !== 'string') {
                  return form.right.club
                }

                return yield* clubs.getClubName(form.right.club)
              }),
            ),
          ),
          RTE.apSW(
            'canClubLeadsAddReviewsToClubs',
            EffectToFpts.toReaderTaskEither(
              Effect.gen(function* () {
                const featureFlags = yield* FeatureFlags

                return featureFlags.canClubLeadsAddReviewsToClubs
              }),
            ),
          ),
          RTE.bindW(
            'isClubLead',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(function* ({ canClubLeadsAddReviewsToClubs, user }) {
                const clubs = yield* Clubs

                if (!canClubLeadsAddReviewsToClubs) {
                  return
                }

                return yield* clubs.isPrereviewerAClubLead(user.orcid)
              }),
            ),
          ),
          RTE.matchEW(
            error =>
              RT.of(
                Match.value(error).pipe(
                  Match.tag('ClubNotFound', 'UnableToQuery', () => havingProblemsPage(locale)),
                  Match.literalsExhaustive({
                    'no-form': () =>
                      RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                    'no-session': () =>
                      RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                    'form-unavailable': () => havingProblemsPage(locale),
                  }),
                ),
              ),
            decideNextStep,
          ),
        ),
    ),
  )

const decideNextStep = (state: {
  contactEmailAddress?: ContactEmailAddress
  form: E.Either<unknown, CompletedForm>
  club: ClubName | null | undefined
  canClubLeadsAddReviewsToClubs: boolean
  isClubLead: boolean | undefined
  originalForm: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  match(state)
    .with(
      P.union({ form: P.when(E.isLeft) }, { originalForm: { alreadyWritten: P.optional(undefined) } }),
      ({ originalForm, preprint }) =>
        RT.of(RedirectResponse({ location: nextFormPath({ form: originalForm, preprintId: preprint.id }) })),
    )
    .with({ canClubLeadsAddReviewsToClubs: true, isClubLead: true, club: P.optional(undefined) }, () =>
      RT.of(RedirectResponse({ location: Routes.ReviewAPreprintAddToAClub.href({ preprintId: state.preprint.id }) })),
    )
    .with({ contactEmailAddress: P.optional({ _tag: 'UnverifiedContactEmailAddress' }) }, () =>
      RT.of(
        RedirectResponse({ location: format(writeReviewEnterEmailAddressMatch.formatter, { id: state.preprint.id }) }),
      ),
    )
    .with({ method: 'POST', form: P.when(E.isRight) }, ({ form, ...state }) =>
      handlePublishForm({ ...state, form: form.right }),
    )
    .with({ form: P.when(E.isRight) }, ({ form, ...state }) =>
      pipe(
        EffectToFpts.toReaderTaskEither(
          Prereviewers.getPersona({ orcidId: state.user.orcid, persona: form.right.persona }),
        ),
        RTE.matchW(
          () => failureMessage(state.locale),
          persona =>
            showPublishForm({
              ...state,
              persona,
              form: form.right,
            }),
        ),
      ),
    )
    .exhaustive()

const handlePublishForm = ({
  form,
  locale,
  originalForm,
  preprint,
  user,
}: {
  form: CompletedForm
  locale: SupportedLocale
  originalForm: Form
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    deleteForm(user.orcid, preprint.id),
    RTE.chainW(() => completedFormToNewPrereview({ form, preprint, orcidId: user.orcid })),
    RTE.chainW(
      flow(
        publishPrereview,
        RTE.orElseFirstW(error =>
          Match.value(error).pipe(
            Match.literalsExhaustive({
              unavailable: () => saveForm(user.orcid, preprint.id)(originalForm),
            }),
          ),
        ),
      ),
    ),
    RTE.chainFirstW(([doi, id]) =>
      EffectToFpts.toReaderTaskEither(
        Effect.gen(function* () {
          const preprintReviews = yield* PreprintReviews
          const openAlex = yield* OpenAlexWorks
          const prereviewers = yield* Prereviewers.Prereviewers

          const author =
            form.persona === 'public'
              ? {
                  _tag: 'PublicPersona' as const,
                  name: yield* pipe(
                    user.orcid,
                    prereviewers.getPublicPersona,
                    Effect.map(persona => persona.displayName),
                    Effect.asSome,
                  ),
                  orcidId: user.orcid,
                }
              : { _tag: 'PseudonymPersona' as const, orcidId: user.orcid }
          const language = yield* pipe(guessLanguage(form), Effect.andThen(Effect.fromOption))
          const topics = preprint.id._tag === 'PhilsciPreprintId' ? [] : yield* openAlex.getTopics(preprint.id.value)
          const published = yield* Temporal.currentInstant

          yield* preprintReviews.importPreprintReview({
            id,
            doi,
            authors: [author],
            otherAuthors: form.moreAuthors === 'yes' ? form.otherAuthors.length : 0,
            ...(typeof form.club === 'string' ? { club: form.club } : {}),
            language,
            topics,
            published,
            license: getLicense(form),
            preprint: preprint.id,
            live: false,
            useOfAi: formToUseOfAi(form),
            competingInterests: formToCompetingInterests(form),
            content: formToContent(form),
          })
        }).pipe(Effect.ignore({ message: 'Failed to import preprint review after publication', log: 'Error' })),
      ),
    ),
    RTE.chainFirstW(([doi, id]) =>
      storeInformationForWriteReviewPublishedPage(
        doi,
        form.moreAuthors,
        form.moreAuthors === 'yes' ? form.otherAuthors.length : 0,
        form.persona,
        id,
      ),
    ),
    RTE.matchW(
      () => failureMessage(locale),
      () => RedirectResponse({ location: format(writeReviewPublishedMatch.formatter, { id: preprint.id }) }),
    ),
  )

const showPublishForm = ({
  form,
  club,
  preprint,
  persona,
  locale,
}: {
  form: CompletedForm
  club: ClubName | null | undefined
  preprint: PreprintTitle
  persona: Prereviewers.Persona
  locale: SupportedLocale
}) => publishForm(preprint, form, club, persona, locale)

const formToUseOfAi = (form: CompletedForm) =>
  form.generativeAiIdeas === 'yes'
    ? { _tag: 'Yes' as const, comment: Option.fromNullishOr(form.generativeAiIdeasDetails) }
    : { _tag: 'No' as const }

const formToCompetingInterests = (form: CompletedForm) =>
  form.competingInterests === 'yes'
    ? { _tag: 'Yes' as const, comment: form.competingInterestsDetails }
    : { _tag: 'No' as const }

const formToContent = (form: CompletedForm) =>
  match(form)
    .with({ reviewType: 'freeform' }, form => ({ _tag: 'Full' as const, text: fixHeadingLevels(1, form.review) }))
    .with({ reviewType: 'questions' }, form => ({
      _tag: 'Structured' as const,
      introductionMatches: {
        answer: form.introductionMatches,
        comment: Option.fromNullishOr(form.introductionMatchesDetails),
      },
      methodsAppropriate: {
        answer: (
          {
            inappropriate: 'highly-inappropriate',
            'somewhat-inappropriate': 'somewhat-inappropriate',
            adequate: 'neither',
            'mostly-appropriate': 'somewhat-appropriate',
            'highly-appropriate': 'highly-appropriate',
            skip: 'skip',
          } as const
        )[form.methodsAppropriate],
        comment: Option.fromNullishOr(form.methodsAppropriateDetails),
      },
      conclusionsSupported: {
        answer: (
          {
            'not-supported': 'highly-unsupported',
            'partially-supported': 'somewhat-unsupported',
            neutral: 'neither',
            'well-supported': 'somewhat-supported',
            'strongly-supported': 'highly-supported',
            skip: 'skip',
          } as const
        )[form.resultsSupported],
        comment: Option.fromNullishOr(form.resultsSupportedDetails),
      },
      dataPresentation: {
        answer: (
          {
            'inappropriate-unclear': 'highly-inappropriate-or-unclear',
            'somewhat-inappropriate-unclear': 'somewhat-inappropriate-or-unclear',
            neutral: 'neither',
            'mostly-appropriate-clear': 'somewhat-appropriate-and-clear',
            'highly-appropriate-clear': 'highly-appropriate-and-clear',
            skip: 'skip',
          } as const
        )[form.dataPresentation],
        comment: Option.fromNullishOr(form.dataPresentationDetails),
      },
      findingsNextSteps: {
        answer: (
          {
            inadequately: 'very-unclearly',
            insufficiently: 'somewhat-unclearly',
            adequately: 'neither',
            'clearly-insightfully': 'somewhat-clearly',
            exceptionally: 'very-clearly',
            skip: 'skip',
          } as const
        )[form.findingsNextSteps],
        comment: Option.fromNullishOr(form.findingsNextStepsDetails),
      },
      advancingKnowledge: {
        answer: (
          {
            no: 'not-at-all',
            limited: 'not',
            some: 'moderately',
            substantial: 'somewhat',
            highly: 'highly',
            skip: 'skip',
          } as const
        )[form.novel],
        comment: Option.fromNullishOr(form.novelDetails),
      },
      languageEditing: {
        answer: form.languageEditing,
        comment: Option.fromNullishOr(form.languageEditingDetails),
      },
      wouldRecommend: {
        answer: form.shouldRead,
        comment: Option.fromNullishOr(form.shouldReadDetails),
      },
      readyForAttention: {
        answer: (
          {
            no: 'no-need-major-revision',
            'yes-changes': 'yes-needs-minor-changes',
            yes: 'yes-as-is',
          } as const
        )[form.readyFullReview],
        comment: Option.fromNullishOr(form.readyFullReviewDetails),
      },
    }))
    .exhaustive()

const publishPrereview = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ publishPrereview }: PublishPrereviewEnv) => publishPrereview(newPrereview)),
  )
