import { Match, Struct, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { missingE } from '../../form.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.ts'
import type { IndeterminatePreprintId, PreprintTitle } from '../../Preprints/index.ts'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.ts'
import { writeReviewMatch } from '../../routes.ts'
import { NonEmptyStringC } from '../../types/NonEmptyString.ts'
import type { User } from '../../user.ts'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form.ts'
import { type CompetingInterestsForm, competingInterestsForm } from './competing-interests-form.ts'

export const writeReviewCompetingInterests = ({
  body,
  id,
  locale,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<GetPreprintTitleEnv & FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse> =>
  pipe(
    getPreprintTitle(id),
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
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('body', () => body),
          RTE.let('method', () => method),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            state =>
              match(state)
                .with({ method: 'POST' }, handleCompetingInterestsForm)
                .otherwise(state => RT.of(showCompetingInterestsForm(state))),
          ),
        ),
    ),
  )

const showCompetingInterestsForm = ({
  form,
  preprint,
  locale,
}: {
  form: Form
  preprint: PreprintTitle
  locale: SupportedLocale
}) =>
  competingInterestsForm(
    preprint,
    {
      competingInterests: E.right(form.competingInterests),
      competingInterestsDetails: E.right(form.competingInterestsDetails),
    },
    locale,
    form.moreAuthors,
  )

const showCompetingInterestsErrorForm =
  (preprint: PreprintTitle, moreAuthors: Form['moreAuthors'], locale: SupportedLocale) =>
  (form: CompetingInterestsForm) =>
    competingInterestsForm(preprint, form, locale, moreAuthors)

const handleCompetingInterestsForm = ({
  body,
  form,
  preprint,
  user,
  locale,
}: {
  body: unknown
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RTE.Do,
    RTE.let('competingInterests', () => pipe(CompetingInterestsFieldD.decode(body), E.mapLeft(missingE))),
    RTE.let('competingInterestsDetails', ({ competingInterests }) =>
      match(competingInterests)
        .with({ right: 'yes' }, () => pipe(CompetingInterestsDetailsFieldD.decode(body), E.mapLeft(missingE)))
        .otherwise(() => E.right(undefined)),
    ),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('competingInterests', fields.competingInterests),
        E.apSW('competingInterestsDetails', fields.competingInterestsDetails),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.map(updateForm(form)),
    RTE.chainFirstW(saveForm(user.orcid, preprint.id)),
    RTE.matchW(
      error =>
        match(error)
          .with('form-unavailable', () => havingProblemsPage(locale))
          .with({ competingInterests: P.any }, showCompetingInterestsErrorForm(preprint, form.moreAuthors, locale))
          .exhaustive(),
      form => RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
    ),
  )

const CompetingInterestsFieldD = pipe(
  D.struct({ competingInterests: D.literal('yes', 'no') }),
  D.map(Struct.get('competingInterests')),
)

const CompetingInterestsDetailsFieldD = pipe(
  D.struct({ competingInterestsDetails: NonEmptyStringC }),
  D.map(Struct.get('competingInterestsDetails')),
)
