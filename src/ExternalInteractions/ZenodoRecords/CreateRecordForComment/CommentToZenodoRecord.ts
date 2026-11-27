import type { Temporal } from '@js-temporal/polyfill'
import { Match, Option } from 'effect'
import type * as Preprints from '../../../Domain/Preprints/index.ts'
import type * as Prereviewers from '../../../Domain/Prereviewers/index.ts'
import type { Zenodo } from '../../../ExternalApis/index.ts'
import { html, plainText, type Html } from '../../../html.ts'
import { DefaultLocale, translate } from '../../../locales/index.ts'
import type { Doi, NonEmptyString } from '../../../types/index.ts'

export const CommentToZenodoRecord = (comment: Comment): { draft: Zenodo.NewDraft; file: Zenodo.File } => ({
  draft: CommentToNewDraft(comment),
  file: { name: 'comment.html', content: CommentToHtml(comment).toString() },
})

export interface Comment {
  readonly author: Prereviewers.Persona
  readonly comment: Html
  readonly competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  readonly prereview: {
    readonly doi: Doi.Doi
    readonly url: URL
    readonly preprint: {
      readonly id: Preprints.IndeterminatePreprintId
      readonly title: Html
    }
  }
  readonly publicationDate: Temporal.PlainDate
}

const CommentToHtml = ({ comment, competingInterests }: Pick<Comment, 'comment' | 'competingInterests'>) => {
  const t = translate(DefaultLocale, 'write-comment-flow')

  return html`${comment}

    <h2>${t('competingInterestsHeading')()}</h2>

    <p>${Option.getOrElse(competingInterests, () => t('noCompetingInterests')())}</p>`
}

const CommentToNewDraft = ({
  author,
  comment,
  competingInterests,
  prereview,
  publicationDate,
}: Comment): Zenodo.NewDraft => ({
  access: { record: 'public', files: 'public' },
  files: { enabled: true },
  metadata: {
    resource_type: { id: 'publication-other' },
    title: plainText`Comment on a PREreview of “${prereview.preprint.title}”`.toString(),
    creators: [
      Match.valueTags(author, {
        PublicPersona: author => ({
          person_or_org: {
            type: 'personal',
            family_name: author.displayName,
            identifiers: [{ scheme: 'orcid', identifier: author.orcidId }],
          },
        }),
        PseudonymPersona: author => ({ person_or_org: { type: 'personal', family_name: author.pseudonym } }),
      }),
    ],
    description: html`<p>
        <strong
          >This Zenodo record is a permanently preserved version of a comment on a PREreview. You can view the complete
          PREreview and comments at <a href="${prereview.url.href}">${prereview.url.href}</a>.</strong
        >
      </p>

      ${CommentToHtml({ comment, competingInterests })}`.toString(),
    publisher: 'Zenodo',
    publication_date: publicationDate.toString(),
    rights: [{ id: 'cc-by-4.0' }],
    related_identifiers: [
      {
        ...toExternalIdentifier(prereview.preprint.id),
        relation_type: { id: 'references' },
        resource_type: { id: 'publication-preprint' },
      },
      {
        identifier: prereview.doi,
        scheme: 'doi',
        relation_type: { id: 'references' },
        resource_type: { id: 'publication-peerreview' },
      },
    ],
  },
})

const toExternalIdentifier = (preprint: Preprints.IndeterminatePreprintId) => {
  if (preprint._tag === 'PhilsciPreprintId') {
    return { scheme: 'url', identifier: `https://philsci-archive.pitt.edu/${preprint.value}/` }
  }

  return { scheme: 'doi', identifier: preprint.value }
}
