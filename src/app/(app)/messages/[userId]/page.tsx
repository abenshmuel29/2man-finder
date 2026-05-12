'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Send } from 'lucide-react'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

interface Profile {
  id: string
  name: string | null
  age: number | null
  photos: string[]
}

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const otherUserId = params.userId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
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

      // Load other user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, age, photos')
        .eq('id', otherUserId)
        .single()
      setOtherUser(profile)

      // Load message history
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      setMessages(msgs ?? [])
      setLoading(false)

      // Mark incoming messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .is('read_at', null)

      // Subscribe to new messages in real time
      const channel = supabase
        .channel(`chat:${[user.id, otherUserId].sort().join('-')}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, (payload) => {
          const msg = payload.new as Message
          if (msg.sender_id === otherUserId) {
            setMessages(prev => [...prev, msg])
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
          }
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [otherUserId])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !myId || sending) return
    setSending(true)
    const content = text.trim()
    setText('')

    const supabase = supabaseRef.current
    const { data, error } = await supabase.from('messages').insert({
      sender_id: myId,
      receiver_id: otherUserId,
      content,
    }).select().single()

    if (!error && data) {
      setMessages(prev => [...prev, data])
    }
    setSending(false)
  }

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
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#252540' }}>
          {otherUser?.photos?.[0]
            ? <img src={otherUser.photos[0]} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center">👤</div>}
        </div>
        <div>
          <p className="font-semibold text-white">{otherUser?.name}</p>
          {otherUser?.age && <p className="text-xs text-gray-500">{otherUser.age}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 py-2 pr-1">
        {messages.length === 0 && (
          <p className="text-center text-gray-600 text-sm mt-8">Say hi to {otherUser?.name?.split(' ')[0]}!</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === myId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm"
                style={{
                  background: isMe ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : '#252540',
                  color: 'white',
                  borderBottomRightRadius: isMe ? 4 : undefined,
                  borderBottomLeftRadius: !isMe ? 4 : undefined,
                }}>
                {msg.content}
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
          placeholder="Message..."
          autoComplete="off"
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', opacity: !text.trim() ? 0.4 : 1 }}>
          <Send size={18} color="white" />
        </button>
      </form>
    </div>
  )
}
