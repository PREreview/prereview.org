import { defineCE, expect, fixture } from '@open-wc/testing'
import * as _ from '../../assets/single-use-form'

describe('when the form is submitted', () => {
  it('prevents a second submission', async () => {
    const element = defineCE(class extends _.SingleUseForm {})
    const singleUseForm = await fixture<_.SingleUseForm>(
      `<${element}><form><input type="text" name="input"></form></${element}>`,
    )

    let submissions = 0
    document.addEventListener('submit', event => {
      if (!event.defaultPrevented) {
        submissions++
        event.preventDefault()
      }
    })

    singleUseForm.querySelector('form')?.requestSubmit()
    singleUseForm.querySelector('form')?.requestSubmit()

    await expect(submissions).to.equal(1)
  })

  it('disables the submit button', async () => {
    const element = defineCE(class extends _.SingleUseForm {})
    const singleUseForm = await fixture<_.SingleUseForm>(
      `<${element}><form><input type="text" name="input"><button/></form></${element}>`,
    )

    document.addEventListener('submit', event => event.preventDefault())

    singleUseForm.querySelector('form')?.requestSubmit()

    expect(singleUseForm.querySelector('button')).to.have.attribute('aria-disabled', 'true')
  })

  it('prevents the submit button from being clicked', async () => {
    const element = defineCE(class extends _.SingleUseForm {})
    const singleUseForm = await fixture<_.SingleUseForm>(
      `<${element}><form><input type="text" name="input"><button/></form></${element}>`,
    )

    document.addEventListener('submit', event => event.preventDefault())

    singleUseForm.querySelector('form')?.requestSubmit()
    singleUseForm.querySelector('button')?.click()
  })
})
