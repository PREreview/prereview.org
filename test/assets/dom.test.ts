import { expect } from '@open-wc/testing'
import * as _ from '../../assets/dom'

describe('preventDefault', () => {
  it('calls preventDefault() on an event', () => {
    const event = new Event('test', { cancelable: true })

    _.preventDefault(event)

    expect(event.defaultPrevented).to.be.true
  })
})
