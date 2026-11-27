import type { Zenodo } from '../../../ExternalApis/index.ts'

export const DraftForWithdrawnComment = (draft: Zenodo.Draft): Zenodo.Draft => ({
  ...draft,
  access: { ...draft.access, files: 'restricted' },
  metadata: {
    resource_type: draft.metadata.resource_type,
    creators: [{ person_or_org: { type: 'personal', family_name: 'Anonymous' } }],
    title: 'Withdrawn comment',
    description: '<p>This comment on a PREreview has been withdrawn.</p>',
    publisher: 'Zenodo',
    publication_date: draft.metadata.publication_date,
  },
})
