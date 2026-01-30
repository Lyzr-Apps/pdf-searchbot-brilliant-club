import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { KnowledgeBaseUpload } from '@/components/KnowledgeBaseUpload'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import { cn } from '@/lib/utils'
import {
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  FileText,
  BookOpen,
  AlertCircle,
} from 'lucide-react'

// Agent Configuration
const AGENT_ID = '697d037ad36f070193f5c6c3'
const RAG_ID = '697d0367fd1daac38e53c174'

// TypeScript interfaces based on REAL test response
interface SourceReference {
  document: string
  page: string
  excerpt: string
}

interface AgentResult {
  answer: string
  sources: SourceReference[]
  confidence: number
  retrieved_passages: number
  query_interpretation: string
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  result?: AgentResult
  error?: boolean
}

// Suggested queries for empty state
const SUGGESTED_QUERIES = [
  'What are the main topics covered in the documents?',
  'Summarize the key findings',
  'What policies or guidelines are mentioned?',
  'Can you explain the main concepts?',
]

// Message bubble component
function MessageBubble({ message }: { message: Message }) {
  const [expandedSources, setExpandedSources] = useState(false)
  const [copiedAnswer, setCopiedAnswer] = useState(false)

  const handleCopyAnswer = () => {
    if (message.result?.answer) {
      navigator.clipboard.writeText(message.result.answer)
      setCopiedAnswer(true)
      setTimeout(() => setCopiedAnswer(false), 2000)
    }
  }

  if (message.type === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[70%] bg-[#4361ee] text-white rounded-2xl px-4 py-3 shadow-md">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-5 py-4">
          {message.error ? (
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-700 font-medium">Error</p>
                <p className="text-sm text-gray-600 mt-1">{message.content}</p>
              </div>
            </div>
          ) : message.result ? (
            <div className="space-y-4">
              {/* Answer Text */}
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {message.result.answer}
                </p>
              </div>

              {/* Confidence & Metadata */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  variant={message.result.confidence >= 0.7 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {Math.round(message.result.confidence * 100)}% confidence
                </Badge>
                <span className="text-xs text-gray-500">
                  {message.result.retrieved_passages} passages retrieved
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAnswer}
                  className="h-7 px-2 text-xs ml-auto"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copiedAnswer ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              {/* Sources Section */}
              {message.result.sources && message.result.sources.length > 0 && (
                <div className="border-t pt-3">
                  <button
                    onClick={() => setExpandedSources(!expandedSources)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span>
                      {message.result.sources.length} Source
                      {message.result.sources.length !== 1 ? 's' : ''}
                    </span>
                    {expandedSources ? (
                      <ChevronRight className="h-4 w-4 rotate-90 transition-transform" />
                    ) : (
                      <ChevronRight className="h-4 w-4 transition-transform" />
                    )}
                  </button>

                  {expandedSources && (
                    <div className="mt-3 space-y-2">
                      {message.result.sources.map((source, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              [{idx + 1}]
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {source.document}
                              </p>
                              {source.page !== 'Not specified' && (
                                <p className="text-xs text-gray-500">Page: {source.page}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed italic">
                            "{source.excerpt}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Query Interpretation (if available) */}
              {message.result.query_interpretation && (
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer hover:text-gray-700">
                    Query interpretation
                  </summary>
                  <p className="mt-2 pl-2 border-l-2 border-gray-300">
                    {message.result.query_interpretation}
                  </p>
                </details>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Welcome screen component
function WelcomeScreen({ onQueryClick }: { onQueryClick: (query: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#4361ee] rounded-full mb-6">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-[#1a1a2e] mb-3">
          Knowledge Search Assistant
        </h2>
        <p className="text-gray-600 mb-8">
          Upload your documents and ask questions to get instant, cited answers from your
          knowledge base.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {SUGGESTED_QUERIES.map((query, idx) => (
            <button
              key={idx}
              onClick={() => onQueryClick(query)}
              className="text-left p-4 border border-gray-200 rounded-lg hover:border-[#4361ee] hover:bg-[#4361ee]/5 transition-all group"
            >
              <p className="text-sm text-gray-700 group-hover:text-[#4361ee]">{query}</p>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          Start by uploading documents or try one of the suggested queries above
        </p>
      </div>
    </div>
  )
}

// Document sidebar component
function DocumentSidebar({
  isOpen,
  onToggle,
}: {
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg transition-transform duration-300 z-20',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'w-[280px]'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1a1a2e] text-sm">Document Library</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Document Upload & List */}
          <ScrollArea className="flex-1 p-4">
            <KnowledgeBaseUpload
              ragId={RAG_ID}
              onUploadSuccess={(doc) => {
                console.log('Document uploaded:', doc)
              }}
              onDeleteSuccess={(fileName) => {
                console.log('Document deleted:', fileName)
              }}
            />
          </ScrollArea>
        </div>
      </div>

      {/* Toggle Button (when sidebar is closed) */}
      {!isOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="fixed left-4 top-4 z-10 shadow-md bg-white"
        >
          <ChevronRight className="h-4 w-4 mr-1" />
          <span className="text-xs">Documents</span>
        </Button>
      )}

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-10 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  )
}

// Main component
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSendMessage = async (query?: string) => {
    const messageText = query || inputValue.trim()
    if (!messageText || loading) return

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setLoading(true)

    try {
      // Call AI agent
      const result = await callAIAgent(messageText, AGENT_ID)

      if (result.success && result.response.status === 'success') {
        // Extract result fields from the actual response
        const agentResult = result.response.result as AgentResult

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: agentResult.answer || 'No answer provided',
          timestamp: new Date(),
          result: agentResult,
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        // Error from agent
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          type: 'assistant',
          content: result.response.message || result.error || 'Failed to get response',
          timestamp: new Date(),
          error: true,
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      // Network or unexpected error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Network error. Please try again.',
        timestamp: new Date(),
        error: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSuggestedQuery = (query: string) => {
    setInputValue(query)
    handleSendMessage(query)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Document Sidebar */}
      <DocumentSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300 h-screen flex flex-col',
          sidebarOpen ? 'md:ml-[280px]' : 'ml-0'
        )}
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white shadow-sm z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#4361ee] rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-[#1a1a2e]">Knowledge Search</h1>
            </div>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Settings className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <ScrollArea className="flex-1 px-6">
          <div className="max-w-4xl mx-auto py-8">
            {messages.length === 0 ? (
              <WelcomeScreen onQueryClick={handleSuggestedQuery} />
            ) : (
              <div>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {loading && (
                  <div className="flex justify-start mb-6">
                    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-[#4361ee]" />
                        <span className="text-sm text-gray-600">Searching knowledge base...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Bar (Fixed Bottom) */}
        <div className="border-t border-gray-200 bg-white shadow-lg">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask anything about your documents..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="h-12 pr-12 rounded-full border-gray-300 focus:border-[#4361ee] focus:ring-[#4361ee]"
                />
              </div>
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || loading}
                className="h-12 w-12 rounded-full bg-[#4361ee] hover:bg-[#3651de] p-0 flex-shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
