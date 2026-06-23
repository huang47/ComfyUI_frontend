import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

import type { RemoteConfig } from '@/platform/remoteConfig/types'
import type { WorkspaceWithRole } from '@/platform/workspace/api/workspaceApi'
import type { WorkspaceTokenResponse } from '@/platform/workspace/stores/workspaceAuthStore'
import type { operations } from '@/types/comfyRegistryTypes'
import { comfyPageFixture } from '@e2e/fixtures/ComfyPage'

const PERSONAL_WORKSPACE_NAME = 'Personal Workspace'

type CloudSubscriptionStatusResponse =
  operations['GetCloudSubscriptionStatus']['responses']['200']['content']['application/json']
type CustomerBalanceResponse =
  operations['GetCustomerBalance']['responses']['200']['content']['application/json']

const mockRemoteConfig: RemoteConfig = {
  subscription_required: true,
  team_workspaces_enabled: true
}

const mockListWorkspacesResponse: { workspaces: WorkspaceWithRole[] } = {
  workspaces: [
    {
      id: 'ws-personal',
      name: PERSONAL_WORKSPACE_NAME,
      type: 'personal',
      created_at: '2026-01-01T00:00:00Z',
      joined_at: '2026-01-01T00:00:00Z',
      role: 'owner'
    }
  ]
}

const mockTokenResponse: WorkspaceTokenResponse = {
  token: 'mock-workspace-token',
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  workspace: {
    id: 'ws-personal',
    name: PERSONAL_WORKSPACE_NAME,
    type: 'personal'
  },
  role: 'owner',
  permissions: []
}

const mockSubscriptionStatus: CloudSubscriptionStatusResponse = {
  is_active: false,
  subscription_tier: null,
  has_fund: false
}

const mockBalance: CustomerBalanceResponse = {
  amount_micros: 0,
  prepaid_balance_micros: 0,
  cloud_credit_balance_micros: 0,
  effective_balance_micros: 0,
  currency: 'usd'
}

async function routeJson(page: Page, url: string, body: unknown) {
  await page.route(url, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body)
    })
  )
}

async function routeSetupObjectInfo(page: Page) {
  const setupApiUrl =
    process.env.PLAYWRIGHT_SETUP_API_URL ?? 'http://127.0.0.1:8188'
  const objectInfoUrl = new URL('/object_info', setupApiUrl).toString()

  await page.route('**/object_info', async (route) => {
    const response = await fetch(objectInfoUrl, {
      signal: AbortSignal.timeout(5_000)
    })

    await route.fulfill({
      status: response.status,
      contentType: response.headers.get('content-type') ?? 'application/json',
      body: await response.text()
    })
  })
}

async function closeStartupPricingDialog(page: Page) {
  const plansHeading = page.getByRole('heading', {
    name: 'Plans for Personal Workspace'
  })

  if (!(await plansHeading.isVisible())) return

  await page
    .locator('[data-pc-section="mask"]')
    .getByRole('button', { name: 'Close' })
    .click()
  await expect(plansHeading).toBeHidden()
}

const test = comfyPageFixture.extend({
  page: async ({ page }, use) => {
    await routeJson(page, '**/api/features', mockRemoteConfig)
    await routeJson(page, '**/api/settings**', {})
    await routeJson(page, '**/api/userdata**', [])
    await routeJson(page, '**/i18n', {})
    await routeJson(page, '**/api/workspaces', mockListWorkspacesResponse)
    await routeJson(page, '**/api/auth/token', mockTokenResponse)
    await routeJson(
      page,
      '**/customers/cloud-subscription-status',
      mockSubscriptionStatus
    )
    await routeJson(page, '**/customers/balance', mockBalance)
    await routeSetupObjectInfo(page)

    await use(page)
  }
})

test.use({ trace: 'off', video: 'off' })

test.describe('Subscribe to Run', { tag: ['@cloud', '@ui'] }, () => {
  test.setTimeout(60_000)

  test('opens billing plans from the locked run button', async ({
    comfyPage
  }) => {
    const page = comfyPage.page
    await closeStartupPricingDialog(page)

    const subscribeToRun = page.getByTestId('subscribe-to-run-button')
    await expect(subscribeToRun).toBeVisible()
    await subscribeToRun.click()

    await expect(
      page.getByRole('heading', { name: 'Plans for Personal Workspace' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Subscribe to Standard Yearly' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Subscribe to Creator Yearly' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Subscribe to Pro Yearly' })
    ).toBeVisible()
  })
})
