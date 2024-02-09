import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { getInput, invalidE, missingE } from '../../form'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../../preprint'
import { type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../routes'
import { EmailAddressC } from '../../types/email-address'
import type { IndeterminatePreprintId } from '../../types/preprint-id'
import { type NonEmptyString, NonEmptyStringC } from '../../types/string'
import type { User } from '../../user'
import { type FormStoreEnv, getForm } from '../form'
import { changeAuthorForm } from './change-author-form'

export const writeReviewChangeAuthor = ({
  body,
  id,
  method,
  number,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  method: string
  number: number
  user?: User
}): RT.ReaderTask<FormStoreEnv & GetPreprintTitleEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
          RTE.let('body', () => body),
          RTE.let('number', () => number),
          RTE.bindW(
            'form',
            flow(
              ({ preprint, user }) => getForm(user.orcid, preprint.id),
              RTE.filterOrElseW(
                form => form.moreAuthors === 'yes',
                () => 'not-found' as const,
              ),
            ),
          ),
          RTE.bindW(
            'author',
            RTE.fromOptionK(() => 'no-author' as const)(
              flow(
                O.fromNullableK(({ form }) => form.otherAuthors),
                O.chain(RA.lookup(number - 1)),
              ),
            ),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with('no-author', () =>
                  RedirectResponse({ location: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }) }),
                )
                .with('no-form', 'no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('not-found', () => pageNotFound)
                .with('form-unavailable', () => havingProblemsPage)
                .exhaustive(),
            state =>
              match(state)
                .with({ method: 'POST' }, handleChangeAuthorForm)
                .otherwise(state =>
                  changeAuthorForm({
                    ...state,
                    form: { name: E.right(state.author.name), emailAddress: E.right(state.author.emailAddress) },
                  }),
                ),
          ),
        ),
    ),
  )

const handleChangeAuthorForm = ({
  author,
  body,
  number,
  preprint,
}: {
  author: { name: NonEmptyString }
  body: unknown
  number: number
  preprint: PreprintTitle
}) =>
  pipe(
    E.Do,
    E.let('name', () => pipe(NameFieldD.decode(body), E.mapLeft(missingE))),
    E.let('emailAddress', () =>
      pipe(
        EmailAddressFieldD.decode(body),
        E.mapLeft(error =>
          match(getInput('emailAddress')(error))
            .with(P.union(P.when(O.isNone), { value: '' }), () => missingE())
            .with({ value: P.select() }, invalidE)
            .exhaustive(),
        ),
      ),
    ),
    E.chain(fields =>
      pipe(
        E.Do,
        E.apS('name', fields.name),
        E.apS('emailAddress', fields.emailAddress),
        E.mapLeft(() => fields),
      ),
    ),
    E.matchW(
      error =>
        match(error)
          .with({ name: P.any }, error => changeAuthorForm({ author, form: error, number, preprint }))
          .exhaustive(),
      () => havingProblemsPage,
    ),
  )

const NameFieldD = pipe(D.struct({ name: NonEmptyStringC }), D.map(get('name')))

const EmailAddressFieldD = pipe(
  D.struct({ emailAddress: pipe(D.string, D.map(s.trim), D.compose(EmailAddressC)) }),
  D.map(get('emailAddress')),
)
