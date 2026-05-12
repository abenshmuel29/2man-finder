'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send, Users } from 'lucide-react'

interface GroupMessage {
  id: string
  chat_id: string
  sender_id: string | null
  content: string
  is_system: boolean
  created_at: string
}

interface Member {
  user_id: string
  profile: {
    id: string
    name: string | null
    photos: string[]
    gender: string | null
  }
}

export default function GroupChatPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.chatId as string

  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = supabaseRef.current
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMyId(user.id)

      // Load members with profiles
      const { data: memberRows } = await supabase
        .from('group_chat_members')
        .select('user_id, profile:profiles!group_chat_members_user_id_fkey(id, name, photos, gender)')
        .eq('chat_id', chatId)
      setMembers((memberRows ?? []) as unknown as Member[])

      // Load messages
      const { data: msgs } = await supabase
        .from('group_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
      setMessages(msgs ?? [])
      setLoading(false)

      // Real-time subscription
      const channel = supabase
        .channel(`group:${chatId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `chat_id=eq.${chatId}`,
        }, (payload) => {
          const msg = payload.new as GroupMessage
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [chatId])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !myId || sending) return
    setSending(true)
    const content = text.trim()
    setText('')

    const supabase = supabaseRef.current
    const { data, error } = await supabase.from('group_messages').insert({
      chat_id: chatId,
      sender_id: myId,
      content,
      is_system: false,
    }).select().single()

    if (!error && data) {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev
        return [...prev, data]
      })
    }
    setSending(false)
  }

  function getSenderName(senderId: string | null) {
    if (!senderId) return null
    const m = members.find(m => m.user_id === senderId)
    return m?.profile?.name?.split(' ')[0] ?? 'Someone'
  }

  function getSenderPhoto(senderId: string | null) {
    if (!senderId) return null
    const m = members.find(m => m.user_id === senderId)
    return m?.profile?.photos?.[0] ?? null
  }

  const others = members.filter(m => m.user_id !== myId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 mb-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        {/* Avatar stack */}
        <div className="flex -space-x-2 flex-shrink-0">
          {others.slice(0, 3).map(m => (
            <div key={m.user_id} className="w-9 h-9 rounded-full overflow-hidden border-2"
              style={{ background: '#13131F', borderColor: '#08080F' }}>
              {m.profile?.photos?.[0]
                ? <img src={m.profile.photos[0]} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-sm">
                    {m.profile?.gender === 'male' ? '👨' : '👩'}
                  </div>}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white text-sm flex items-center gap-1">
            <Users size={13} style={{ color: '#9B5DE5' }} />
            2Man Group Chat
          </p>
          <p className="text-xs" style={{ color: '#7B7A96' }}>
            {members.map(m => m.profile?.name?.split(' ')[0]).filter(Boolean).join(', ')}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 py-2 pr-1">
        {messages.map(msg => {
          const isMe = msg.sender_id === myId
          const isSystem = msg.is_system

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="px-4 py-2 rounded-full text-xs font-medium"
                  style={{
                    background: 'linear-gradient(135deg, rgba(155,93,229,0.2), rgba(255,77,109,0.15))',
                    border: '1px solid rgba(155,93,229,0.3)',
                    color: '#C77DFF',
                  }}>
                  {msg.content}
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 self-end mb-1"
                  style={{ background: '#13131F' }}>
                  {getSenderPhoto(msg.sender_id)
                    ? <img src={getSenderPhoto(msg.sender_id)!} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs">👤</div>}
                </div>
              )}
              <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <p className="text-xs px-1" style={{ color: '#7B7A96' }}>{getSenderName(msg.sender_id)}</p>
                )}
                <div className="px-4 py-2.5 rounded-2xl text-sm"
                  style={{
                    background: isMe ? 'linear-gradient(135deg, #FF4D6D, #9B5DE5)' : '#13131F',
                    color: 'white',
                    borderBottomRightRadius: isMe ? 4 : undefined,
                    borderBottomLeftRadius: !isMe ? 4 : undefined,
                    border: isMe ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2 pt-3 pb-1">
        <input
          className="input-field flex-1"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message the group..."
          autoComplete="off"
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #FF4D6D, #9B5DE5)', opacity: !text.trim() ? 0.4 : 1 }}>
          <Send size={18} color="white" />
        </button>
      </form>
    </div>
  )
}
