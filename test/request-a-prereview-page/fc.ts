import type * as Form from '../../src/request-a-prereview-page/form'
import * as fc from '../fc'

export * from '../fc'

export const invalidForm = (): fc.Arbitrary<Form.InvalidForm> =>
  fc.record({
    _tag: fc.constant('InvalidForm'),
    value: fc.string(),
  })
