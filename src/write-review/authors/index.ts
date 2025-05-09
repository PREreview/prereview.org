import { Match, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { missingE } from '../../form.js'
import { sendHtml } from '../../html.js'
import type { SupportedLocale } from '../../locales/index.js'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../../middleware.js'
import { type PreprintTitle, getPreprintTitle } from '../../preprint.js'
import { writeReviewAddAuthorsMatch, writeReviewMatch } from '../../routes.js'
import { type User, getUser } from '../../user.js'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from '../form.js'
import { type AuthorsForm, authorsForm } from './authors-form.js'

export const writeReviewAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.apSW(
        'locale',
        RM.asks((env: { locale: SupportedLocale }) => env.locale),
      ),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handleAuthorsForm).otherwise(showAuthorsForm)),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(
    Match.valueTags({
      PreprintIsNotFound: () => notFound,
      PreprintIsUnavailable: () => serviceUnavailable,
    }),
  ),
)

const showAuthorsForm = flow(
  RM.fromReaderK(
    ({ form, preprint, user, locale }: { form: Form; preprint: PreprintTitle; user: User; locale: SupportedLocale }) =>
      authorsForm(
        preprint,
        {
          moreAuthors: E.right(form.moreAuthors),
          moreAuthorsApproved: E.right(form.moreAuthorsApproved),
        },
        user,
        locale,
      ),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAuthorsErrorForm = (preprint: PreprintTitle, user: User, locale: SupportedLocale) =>
  flow(
    RM.fromReaderK((form: AuthorsForm) => authorsForm(preprint, form, user, locale)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleAuthorsForm = ({
  form,
  preprint,
  user,
  locale,
}: {
  form: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RM.decodeBody(body =>
      pipe(
        E.Do,
        E.let('moreAuthors', () => pipe(MoreAuthorsFieldD.decode(body), E.mapLeft(missingE))),
        E.let('moreAuthorsApproved', ({ moreAuthors }) =>
          match(moreAuthors)
            .with({ right: 'yes' }, () => pipe(MoreAuthorsApprovedFieldD.decode(body), E.mapLeft(missingE)))
            .otherwise(() => E.right(undefined)),
        ),
      ),
    ),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('moreAuthors', fields.moreAuthors),
        E.apS('moreAuthorsApproved', fields.moreAuthorsApproved),
        E.let('otherAuthors', () => form.otherAuthors ?? []),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.bindTo('form'),
    RM.ichainMiddlewareKW(state =>
      match(state)
        .with({ form: { moreAuthors: 'yes' } }, () =>
          seeOther(format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })),
        )
        .otherwise(({ form }) => redirectToNextForm(preprint.id)(form)),
    ),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ moreAuthors: P.any }, showAuthorsErrorForm(preprint, user, locale))
        .exhaustive(),
    ),
  )

const MoreAuthorsFieldD = pipe(
  D.struct({
    moreAuthors: D.literal('yes', 'yes-private', 'no'),
  }),
  D.map(Struct.get('moreAuthors')),
)

const MoreAuthorsApprovedFieldD = pipe(
  D.struct({
    moreAuthorsApproved: D.literal('yes'),
  }),
  D.map(Struct.get('moreAuthorsApproved')),
)
