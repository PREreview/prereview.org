import { Schema } from 'effect'
import { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalInteractions/ZenodoRecords/WithdrawRecordForComment/DraftForWithdrawnComment.ts'
import draftInACommunitySample from '../../../ExternalApis/Zenodo/Samples/draft-in-a-community.json' with { type: 'json' }
import draftSample from '../../../ExternalApis/Zenodo/Samples/draft.json' with { type: 'json' }
import { expect, test } from '../../../vitest.ts'

const draft = Schema.decodeUnknownSync(Zenodo.Draft)(draftSample)
const draftInACommunity = Schema.decodeUnknownSync(Zenodo.Draft)(draftInACommunitySample)

test.each([
  ['public', draft],
  ['already restricted', { ...draft, access: { ...draft.access, files: 'restricted' as const } }],
  ['in a community', draftInACommunity],
])('%s', (_name, draft) => {
  const actual = _.DraftForWithdrawnComment(draft)

  expect(actual).toStrictEqual({
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
})
