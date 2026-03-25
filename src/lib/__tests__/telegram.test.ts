import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Unmock telegram so we test the real implementation
vi.unmock("@/lib/telegram")

const mockFetch = vi.fn()

describe("isAllowedChat", () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => { delete process.env.TELEGRAM_ADMIN_CHAT_IDS })

  it("blocks chats if TELEGRAM_ADMIN_CHAT_IDS not set", async () => {
    delete process.env.TELEGRAM_ADMIN_CHAT_IDS
    const { isAllowedChat } = await import("../telegram")
    expect(isAllowedChat(999999)).toBe(false)
  })

  it("allows chat ID in the list", async () => {
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "111,222,333"
    const { isAllowedChat } = await import("../telegram")
    expect(isAllowedChat(222)).toBe(true)
  })

  it("blocks chat ID not in the list", async () => {
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "111,222"
    const { isAllowedChat } = await import("../telegram")
    expect(isAllowedChat(999)).toBe(false)
  })
})

describe("sendMessage & sendAdminMessage (fetch mocked)", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal("fetch", mockFetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    process.env.TELEGRAM_BOT_TOKEN = "test-token-123"
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "111,222"
    process.env.TELEGRAM_REALTIME_CHAT_IDS = "333"
    process.env.TELEGRAM_DAILY_SUMMARY_CHAT_IDS = "444"
    process.env.TELEGRAM_APPROVAL_CHAT_IDS = "555"
    process.env.TELEGRAM_ADMIN_THREAD_ID = "10"
    process.env.TELEGRAM_REALTIME_THREAD_ID = "20"
    process.env.TELEGRAM_DAILY_SUMMARY_THREAD_ID = "30"
    process.env.TELEGRAM_APPROVAL_THREAD_ID = "40"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_ADMIN_CHAT_IDS
    delete process.env.TELEGRAM_REALTIME_CHAT_IDS
    delete process.env.TELEGRAM_DAILY_SUMMARY_CHAT_IDS
    delete process.env.TELEGRAM_APPROVAL_CHAT_IDS
    delete process.env.TELEGRAM_ADMIN_THREAD_ID
    delete process.env.TELEGRAM_REALTIME_THREAD_ID
    delete process.env.TELEGRAM_DAILY_SUMMARY_THREAD_ID
    delete process.env.TELEGRAM_APPROVAL_THREAD_ID
  })

  it("sendMessage calls Telegram API", async () => {
    const { sendMessage } = await import("../telegram")
    await sendMessage("123", "Hello")
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("api.telegram.org"),
      expect.any(Object)
    )
  })

  it("sendMessage sends correct payload", async () => {
    const { sendMessage } = await import("../telegram")
    await sendMessage("999", "Test message")
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.chat_id).toBe("999")
    expect(body.text).toBe("Test message")
  })

  it("sendAdminMessage sends to all IDs", async () => {
    const { sendAdminMessage } = await import("../telegram")
    await sendAdminMessage("Broadcast")
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.message_thread_id).toBe(10)
  })

  it("sendAdminMessage does nothing without BOT_TOKEN", async () => {
    process.env.TELEGRAM_BOT_TOKEN = ""
    const { sendAdminMessage } = await import("../telegram")
    await sendAdminMessage("Test")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("sendRealtimeMessage uses realtime chat IDs", async () => {
    const { sendRealtimeMessage } = await import("../telegram")
    await sendRealtimeMessage("Realtime")
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.chat_id).toBe("333")
    expect(body.message_thread_id).toBe(20)
  })

  it("sendDailySummaryMessage uses daily summary chat IDs", async () => {
    const { sendDailySummaryMessage } = await import("../telegram")
    await sendDailySummaryMessage("Summary")
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.chat_id).toBe("444")
    expect(body.message_thread_id).toBe(30)
  })

  it("sendApprovalMessage uses approval chat IDs", async () => {
    const { sendApprovalMessage } = await import("../telegram")
    await sendApprovalMessage("Approval")
    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.chat_id).toBe("555")
    expect(body.message_thread_id).toBe(40)
  })

  it("throws when Telegram API reports failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ ok: false, description: "Bad Request: chat not found" }),
    })
    const { sendMessage } = await import("../telegram")
    await expect(sendMessage("999", "Test message")).rejects.toThrow(
      "Telegram sendMessage failed for chat 999: Bad Request: chat not found"
    )
  })
})
