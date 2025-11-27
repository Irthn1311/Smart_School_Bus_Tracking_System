"use client"

import React, { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send } from "lucide-react"

type Message = {
  id: string
  from: "user" | "admin"
  text: string
  ts: number
}

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Only load from localStorage after component mounts on client
  useEffect(() => {
    setMounted(true)
    // load recent messages from localStorage so chat persists across reloads
    try {
      const raw = localStorage.getItem("ssb_chat_msgs")
      if (raw) setMessages(JSON.parse(raw))
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("ssb_chat_msgs", JSON.stringify(messages))
    } catch (e) {}
  }, [messages])

  useEffect(() => {
    // focus input when opening
    if (open) {
      const input = panelRef.current?.querySelector("textarea") as HTMLTextAreaElement | null
      input?.focus()
    }
  }, [open])

  function sendMessage() {
    if (!text.trim()) return
    const m: Message = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 8),
      from: "user",
      text: text.trim(),
      ts: Date.now(),
    }
    setMessages((s) => [...s, m])
    setText("")

    // demo auto-reply from admin
    setTimeout(() => {
      const reply: Message = {
        id: String(Date.now()) + "-r",
        from: "admin",
        text: "Cảm ơn bạn — admin sẽ trả lời sớm nhất.",
        ts: Date.now(),
      }
      setMessages((s) => [...s, reply])
    }, 800)
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div>
      {/* Floating button */}
      <div className="fixed right-6 bottom-6 z-[60] flex items-end">
        {/* Chat panel */}
        <div
          ref={panelRef}
          className={`transition-all duration-200 origin-bottom-right flex flex-col bg-[var(--color-popover)] border border-[var(--color-border)] shadow-lg rounded-lg overflow-hidden w-80 ${
            open ? "h-96" : "h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <div className="font-medium">Liên hệ Admin</div>
            </div>
              <button
              aria-label="Close chat"
              className="p-1 rounded hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 p-3 overflow-auto bg-[var(--color-popover)] text-[var(--color-popover-foreground)]">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">Xin chào! Bạn cần hỗ trợ gì?</div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                      m.from === "user"
                        ? "self-end bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                        : "self-start bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-popover)]">
            <div className="flex gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={1}
                className="resize-none flex-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm bg-transparent outline-none"
                placeholder="Nhập tin nhắn..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <button
                onClick={sendMessage}
                className="flex items-center justify-center rounded-md px-3 bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Floating circle button */}
          <button
          onClick={() => setOpen((s) => !s)}
          className="ml-3 w-14 h-14 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
          title="Liên hệ Admin"
        >
          <MessageCircle size={20} />
        </button>
      </div>
    </div>
  )
}
