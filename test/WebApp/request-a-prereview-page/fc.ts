import type * as Form from '../../../src/WebApp/request-a-prereview-page/form.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const invalidForm = (): fc.Arbitrary<Form.InvalidForm> =>
  fc.record({
    _tag: fc.constant('InvalidForm'),
    value: fc.string(),
  })
