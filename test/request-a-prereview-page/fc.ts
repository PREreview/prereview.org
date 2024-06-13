import type * as Form from '../../src/request-a-prereview-page/form.js'
import * as fc from '../fc.js'

export * from '../fc.js'

export const invalidForm = (): fc.Arbitrary<Form.InvalidForm> =>
  fc.record({
    _tag: fc.constant('InvalidForm'),
    value: fc.string(),
  })
