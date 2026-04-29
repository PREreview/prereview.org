import { it } from '@effect/vitest'
import { format } from 'fp-ts-routing'
import { expect } from 'vitest'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-prereviews-page/list-of-prereviews.ts'
import { myPrereviewsMatch } from '../../../src/routes.ts'
import * as fc from './fc.ts'

it.prop(
  'toResponse',
  [fc.nonEmptyArray(fc.localPrereview()), fc.publicPersona(), fc.pseudonymPersona(), fc.supportedLocale()],
  ([prereviews, publicPersona, pseudonymPersona, locale]) => {
    const actual = _.toResponse(_.ListOfPrereviews({ prereviews, publicPersona, pseudonymPersona }), locale)

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(myPrereviewsMatch.formatter, {}),
      current: 'my-prereviews',
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  },
)
