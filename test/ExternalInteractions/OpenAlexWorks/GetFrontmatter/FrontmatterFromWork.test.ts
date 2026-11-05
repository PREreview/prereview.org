import { Option } from 'effect'
import { describe, expect, it } from '../../../vitest.ts'
import * as _ from '../../../../src/ExternalInteractions/OpenAlexWorks/GetFrontmatter/FrontmatterFromWork.ts'
import { html } from '../../../../src/html.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { Name } from '../../../../src/types/Name.ts'
import * as fc from '../../../fc.ts'

describe('FrontmatterFromWork', () => {
  it.prop('keeps the DOI', [fc.doi(), fc.openAlexWork()], ([doi, work]) => {
    expect(_.FrontmatterFromWork(doi, work).doi).toStrictEqual(doi)
  })

  it.prop(
    'puts the words of the abstract in order',
    [
      fc.openAlexWork({
        abstract_inverted_index: fc.constant(Option.some({ the: [0, 3], cat: [1], sat: [2], mat: [4] })),
      }),
    ],
    ([work]) => {
      const actual = _.FrontmatterFromWork(Doi('10.1000/1'), work)

      expect(actual.abstract).toStrictEqual(Option.some(html`<p>the cat sat the mat</p>`))
    },
  )

  it.prop(
    'treats the words of the abstract as text',
    [fc.openAlexWork({ abstract_inverted_index: fc.constant(Option.some({ 'x<y': [0], '&': [1], '<b>z</b>': [2] })) })],
    ([work]) => {
      const actual = _.FrontmatterFromWork(Doi('10.1000/1'), work)

      expect(actual.abstract.pipe(Option.map(String))).toStrictEqual(
        Option.some('<p>x&lt;y &amp; &lt;b&gt;z&lt;/b&gt;</p>'),
      )
    },
  )

  it.prop(
    'has no abstract when there are no words',
    [
      fc.openAlexWork({
        abstract_inverted_index: fc.constantFrom(Option.none(), Option.some({})),
      }),
    ],
    ([work]) => {
      expect(_.FrontmatterFromWork(Doi('10.1000/1'), work).abstract).toStrictEqual(Option.none())
    },
  )

  it.prop(
    'falls back to the raw name for an author without a display name',
    [
      fc.orcidId().chain(orcidId =>
        fc.tuple(
          fc.openAlexWork({
            authorships: fc.constant([
              {
                author: { display_name: Option.some(Name('Ran Si')), orcid: Option.some(orcidId) },
                raw_author_name: Name('Si, R.'),
              },
              {
                author: { display_name: Option.none(), orcid: Option.none() },
                raw_author_name: Name('Qin, H. R.'),
              },
            ]),
          }),
          fc.constant(orcidId),
        ),
      ),
    ],
    ([[work, orcidId]]) => {
      expect(_.FrontmatterFromWork(Doi('10.1000/1'), work).authors).toStrictEqual([
        { displayName: Name('Ran Si'), orcidId: Option.some(orcidId) },
        { displayName: Name('Qin, H. R.'), orcidId: Option.none() },
      ])
    },
  )
})
