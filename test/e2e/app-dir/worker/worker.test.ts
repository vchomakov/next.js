import { nextTestSetup } from 'e2e-utils'
import { retry } from 'next-test-utils'
import { skip } from 'node:test'
import { Page } from 'playwright'

describe('app dir - workers', () => {
  const { next, skipped, isTurbopack } = nextTestSetup({
    files: __dirname,
    skipDeployment: true,
  })

  if (skipped) {
    return
  }

  function beforePageLoad(page: Page) {
    page.on('request', (request) => {
      const url = request.url()
      // TODO fix deployment id for webpack
      if (isTurbopack) {
        if (url.includes('_next') && !url.includes('wasm')) {
          expect(url).toMatch(/^[^?]+\?(v=\d+&)?dpl=test-deployment-id$/)
        }
      }
    })
  }

  it('should support web workers with dynamic imports', async () => {
    const browser = await next.browser('/classic', {
      beforePageLoad,
    })
    expect(await browser.elementByCss('#worker-state').text()).toBe('default')

    await browser.elementByCss('button').click()

    await retry(async () =>
      expect(await browser.elementByCss('#worker-state').text()).toBe(
        'worker.ts:worker-dep'
      )
    )
  })

  it('should support module web workers with dynamic imports', async () => {
    const browser = await next.browser('/module', {
      beforePageLoad,
    })
    expect(await browser.elementByCss('#worker-state').text()).toBe('default')

    await browser.elementByCss('button').click()

    await retry(async () =>
      expect(await browser.elementByCss('#worker-state').text()).toBe(
        'worker.ts:worker-dep'
      )
    )
  })

  it('should not bundle web workers with string specifiers', async () => {
    const browser = await next.browser('/string', {
      beforePageLoad,
    })
    expect(await browser.elementByCss('#worker-state').text()).toBe('default')

    await browser.elementByCss('button').click()

    await retry(async () =>
      expect(await browser.elementByCss('#worker-state').text()).toBe(
        'unbundled-worker'
      )
    )
  })

  it('should support loading WASM files in workers', async () => {
    const browser = await next.browser('/wasm', {
      beforePageLoad,
    })
    expect(await browser.elementByCss('#worker-state').text()).toBe('default')

    await browser.elementByCss('button').click()

    // The WASM add_one(41) should return 42
    await retry(async () =>
      expect(await browser.elementByCss('#worker-state').text()).toBe(
        'result:42'
      )
    )
  })

  it('should support shared workers', async () => {
    if (!isTurbopack) {
      skip(
        'webpack requires a magic attribute for shared workers to function and this test does not include it'
      )
      return
    }
    const browser = await next.browser('/shared', {
      beforePageLoad,
    })
    expect(await browser.elementByCss('#worker-state').text()).toBe('default')

    await browser.elementByCss('button').click()

    await retry(async () =>
      expect(await browser.elementByCss('#worker-state').text()).toBe(
        'shared-worker.ts:worker-dep:2'
      )
    )
  })
})
