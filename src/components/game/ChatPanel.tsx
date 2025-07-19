import { useState, useEffect, useRef } from 'react'
import { blink } from '../../lib/blink'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import { Send, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  game_id: string
  user_id: string | null
  player_id: string | null
  message_type: string
  content: string
  metadata: string
  created_at: string
}

interface Player {
  id: string
  character_name: string
  avatar: string
}

interface ChatPanelProps {
  gameId: string
  currentPlayer: Player
}

export default function ChatPanel({ gameId, currentPlayer }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 3000) // Poll for new messages
    return () => clearInterval(interval)
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const loadMessages = async () => {
    try {
      const messagesData = await blink.db.chat_messages.list({
        where: { game_id: gameId },
        orderBy: { created_at: 'asc' },
        limit: 100
      })
      setMessages(messagesData)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      await blink.db.chat_messages.create({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        game_id: gameId,
        user_id: currentPlayer.id,
        player_id: currentPlayer.id,
        message_type: 'player',
        content: newMessage.trim(),
        metadata: JSON.stringify({ character_name: currentPlayer.character_name })
      })

      setNewMessage('')
      loadMessages() // Refresh messages
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    }
  }

  const getMessageStyle = (type: string) => {
    const styles = {
      narrator: 'bg-shadow-realm-purple/20 border-l-4 border-shadow-realm-purple text-shadow-realm-text italic',
      system: 'bg-shadow-realm-gold/20 border-l-4 border-shadow-realm-gold text-shadow-realm-text',
      player: 'bg-shadow-realm-surface border-l-4 border-blue-500 text-shadow-realm-text',
      action: 'bg-green-500/20 border-l-4 border-green-500 text-shadow-realm-text'
    }
    return styles[type as keyof typeof styles] || styles.system
  }

  const getMessageIcon = (type: string) => {
    const icons = {
      narrator: '🎭',
      system: '⚙️',
      player: '💬',
      action: '⚔️'
    }
    return icons[type as keyof typeof icons] || '💬'
  }

  const formatMessage = (message: ChatMessage) => {
    try {
      const metadata = JSON.parse(message.metadata || '{}')
      const characterName = metadata.character_name || 'Unknown'
      
      switch (message.message_type) {
        case 'narrator':
          return {
            sender: 'Game Master',
            content: message.content,
            avatar: '🎭'
          }
        case 'system':
          return {
            sender: 'System',
            content: message.content,
            avatar: '⚙️'
          }
        case 'player':
          return {
            sender: characterName,
            content: message.content,
            avatar: '💬'
          }
        case 'action':
          return {
            sender: 'Action',
            content: message.content,
            avatar: '⚔️'
          }
        default:
          return {
            sender: 'Unknown',
            content: message.content,
            avatar: '❓'
          }
      }
    } catch {
      return {
        sender: 'Unknown',
        content: message.content,
        avatar: '❓'
      }
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-shadow-realm-text/60">Loading chat...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-shadow-realm-purple/30 bg-shadow-realm-surface">
        <h3 className="text-sm font-semibold text-shadow-realm-gold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Game Chat & Narration
        </h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div ref={scrollRef} className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-shadow-realm-text/60 py-8">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No messages yet. The adventure awaits...</p>
            </div>
          ) : (
            messages.map((message) => {
              const formatted = formatMessage(message)
              return (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${getMessageStyle(message.message_type)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getMessageIcon(message.message_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-shadow-realm-gold">
                          {formatted.sender}
                        </span>
                        <span className="text-xs text-shadow-realm-text/60">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed break-words">
                        {formatted.content}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-3 border-t border-shadow-realm-purple/30 bg-shadow-realm-surface">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 bg-shadow-realm-bg border-shadow-realm-purple/30 text-shadow-realm-text placeholder:text-shadow-realm-text/50"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            size="sm"
            className="bg-shadow-realm-purple hover:bg-purple-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}