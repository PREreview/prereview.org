import { Struct, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { missingE } from '../../form.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { DefaultLocale, type SupportedLocale } from '../../locales/index.js'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../../preprint.js'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import { NonEmptyStringC } from '../../types/string.js'
import type { User } from '../../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch, saveForm, updateForm } from '../form.js'
import {
  type CompetingInterestsForm,
  alternativeCompetingInterestsForm,
  competingInterestsForm,
} from './competing-interests-form.js'

export const writeReviewCompetingInterests = ({
  body,
  id,
  method,
  user,
  alternative = false,
}: {
  body: unknown
  id: IndeterminatePreprintId
  method: string
  user?: User
  alternative?: boolean
}): RT.ReaderTask<GetPreprintTitleEnv & FormStoreEnv, PageResponse | StreamlinePageResponse | RedirectResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound)
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('preprint', () => preprint),
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.let('locale', () => DefaultLocale),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('body', () => body),
          RTE.let('method', () => method),
          RTE.let('alternative', () => alternative),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage)
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
  alternative,
}: {
  form: Form
  preprint: PreprintTitle
  locale: SupportedLocale
  alternative: boolean
}) =>
  (alternative ? alternativeCompetingInterestsForm : competingInterestsForm)(
    preprint,
    {
      competingInterests: E.right(form.competingInterests),
      competingInterestsDetails: E.right(form.competingInterestsDetails),
    },
    locale,
    form.moreAuthors,
  )

const showCompetingInterestsErrorForm =
  (preprint: PreprintTitle, moreAuthors: Form['moreAuthors'], locale: SupportedLocale, alternative: boolean) =>
  (form: CompetingInterestsForm) =>
    (alternative ? alternativeCompetingInterestsForm : competingInterestsForm)(preprint, form, locale, moreAuthors)

const handleCompetingInterestsForm = ({
  body,
  form,
  preprint,
  user,
  locale,
  alternative: alt,
}: {
  body: unknown
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
  alternative: boolean
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
          .with('form-unavailable', () => havingProblemsPage)
          .with({ competingInterests: P.any }, showCompetingInterestsErrorForm(preprint, form.moreAuthors, locale, alt))
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
