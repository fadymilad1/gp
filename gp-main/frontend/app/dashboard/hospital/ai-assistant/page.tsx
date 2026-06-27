'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { FiSend, FiMessageSquare, FiLock, FiDollarSign } from 'react-icons/fi'
import { getScopedItem } from '@/lib/storage'
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext'
import { chatbotApi } from '@/lib/api'

type ChatMessage = {
  id: number
  type: 'ai' | 'user'
  content: string
  timestamp: Date
}

function HospitalAIAssistantContent() {
  const router = useRouter()
  const { hasFeature } = useSubscription()
  const canChatbot = hasFeature('ai_chatbot')

  const [enabled, setEnabled] = useState(true)
  const [message, setMessage] = useState('')
  const [hasAIChatbot, setHasAIChatbot] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: 'ai' as const,
      content: "Hello! I'm here to help patients with their questions about your medical services. How can I assist you today?",
      timestamp: new Date(),
    },
  ])

  useEffect(() => {
    // Check if user has paid for AI chatbot feature (user-scoped / backend plan)
    const selectedFeatures = getScopedItem('selectedFeatures')
    let hasFeatureLocal = false
    if (selectedFeatures) {
      const features = JSON.parse(selectedFeatures)
      hasFeatureLocal = features.aiChatbot === true
    }
    setHasAIChatbot(canChatbot || hasFeatureLocal)
  }, [canChatbot])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isTyping) return

    const userText = message.trim()
    const userMessage = {
      id: Date.now(),
      type: 'user' as const,
      content: userText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setMessage('')
    setIsTyping(true)

    if (hasAIChatbot) {
      try {
        const response = await chatbotApi.sendMessage({
          message: userText,
          conversation_id: conversationId,
        })
        if (response.error) {
          console.warn('Backend chatbot API returned error, falling back to simulation:', response.error)
          triggerSimulationResponse(userText)
        } else if (response.data) {
          setConversationId(response.data.conversation_id)
          const aiResponse = {
            id: Date.now() + 1,
            type: 'ai' as const,
            content: response.data.assistant.content,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, aiResponse])
          setIsTyping(false)
        }
      } catch (err) {
        console.error('Failed to communicate with backend chatbot, using simulation fallback:', err)
        triggerSimulationResponse(userText)
      }
    } else {
      triggerSimulationResponse(userText)
    }
  }

  const triggerSimulationResponse = (userText: string) => {
    setTimeout(() => {
      let aiContent = 'Thank you for your question. I can help you with information about appointments, services, and finding the right specialist for your needs.'
      const lowerMessage = userText.toLowerCase()
      
      // Hospital-specific symptom responses
      if (lowerMessage.includes('pain') || lowerMessage.includes('hurt') || lowerMessage.includes('ache')) {
        if (lowerMessage.includes('chest') || lowerMessage.includes('heart')) {
          aiContent = 'Based on your chest pain symptoms, I recommend seeing a Cardiologist immediately. They specialize in heart and cardiovascular conditions. Would you like me to help you schedule an appointment?'
        } else if (lowerMessage.includes('head') || lowerMessage.includes('migraine')) {
          aiContent = 'For headaches and migraines, I suggest consulting with a Neurologist. They can properly diagnose and treat various types of headaches. Shall I check available appointments?'
        } else if (lowerMessage.includes('stomach') || lowerMessage.includes('abdomen')) {
          aiContent = 'Stomach pain could require a Gastroenterologist consultation. They specialize in digestive system issues. Would you like to book an appointment?'
        }
      } else if (lowerMessage.includes('skin') || lowerMessage.includes('rash') || lowerMessage.includes('acne')) {
        aiContent = 'For skin concerns, I recommend seeing a Dermatologist. They can help with various skin conditions. Would you like me to check their availability?'
      } else if (lowerMessage.includes('eye') || lowerMessage.includes('vision')) {
        aiContent = 'For eye or vision problems, an Ophthalmologist would be the right specialist to see. They can examine and treat eye conditions. Shall I help you schedule?'
      } else if (lowerMessage.includes('appointment') || lowerMessage.includes('book') || lowerMessage.includes('schedule')) {
        aiContent = 'I can help you book an appointment! We have specialists in Cardiology, Neurology, Gastroenterology, Dermatology, and Ophthalmology. Which department do you need?'
      } else if (lowerMessage.includes('hours') || lowerMessage.includes('open') || lowerMessage.includes('time')) {
        aiContent = 'Our hospital clinics operate Monday through Saturday from 9:00 AM to 8:00 PM. Emergency care is available 24/7.'
      }

      const aiResponse = {
        id: Date.now() + 2,
        type: 'ai' as const,
        content: aiContent,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)
    }, 1000)
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold text-neutral-dark mb-2">
          AI Assistant for Patients
        </h1>
        <p className="text-neutral-gray">
          Configure the AI chatbot that helps patients on your website
        </p>
      </div>

      {!hasAIChatbot && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <FiLock size={20} />
            </span>
            <div>
              <p className="font-semibold text-amber-900 text-sm">Preview Mode Only</p>
              <p className="text-xs text-amber-700">Use the premium plan to have the chatbot enabled on your live website.</p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/dashboard/hospital/setup')}
            className="!px-4 !py-2 !text-xs shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-none"
          >
            Upgrade Plan
          </Button>
        </div>
      )}

      {hasAIChatbot && (
        <Card className="p-6">
          <Toggle
            label="Enable AI Assistant for Patients"
            checked={enabled}
            onChange={setEnabled}
            description="Allow patients to chat with AI assistant on your website for questions about services, appointments, and general medical inquiries"
          />
        </Card>
      )}

      {/* Chat Interface */}
      {(hasAIChatbot ? enabled : true) && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ai rounded-full flex items-center justify-center">
                <FiMessageSquare className="text-white" size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-dark">
                  Patient AI Assistant
                </h2>
                <p className="text-sm text-neutral-gray">
                  Test the chatbot that patients will see
                </p>
              </div>
            </div>
            <div className={`text-xs font-semibold px-3 py-1 rounded-full ${hasAIChatbot ? 'text-primary bg-primary-light' : 'text-amber-700 bg-amber-50 border border-amber-200 animate-pulse'}`}>
              {hasAIChatbot ? 'Preview Mode' : 'Test Drive Mode (Unsubscribed)'}
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 bg-neutral-light rounded-lg p-4 mb-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    msg.type === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-neutral-border'
                  }`}
                >
                  <p className={msg.type === 'user' ? 'text-white' : 'text-neutral-dark'}>
                    {msg.content}
                  </p>
                  <p
                    className={`text-xs mt-2 ${
                      msg.type === 'user' ? 'text-primary-light' : 'text-neutral-gray'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-neutral-gray flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-gray animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-gray animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-gray animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-3">
            <Input
              placeholder="Ask a question as a patient would..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
              disabled={isTyping}
            />
            <Button type="submit" variant="primary" disabled={isTyping}>
              <FiSend className="mr-2" />
              Send
            </Button>
          </form>
        </Card>
      )}

      {/* Features preview */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-dark mb-2">Symptom Assessment & Doctor Recommendations</h3>
          <p className="text-sm text-neutral-gray mb-3">
            Patients can describe their symptoms or health problems, and the AI will suggest which doctor specialist they should see.
          </p>
          <div className="bg-neutral-light rounded-lg p-3 text-xs text-neutral-gray">
            <p className="font-medium mb-1">Example:</p>
            <p className="italic">"I have chest pain and shortness of breath" → AI suggests: "You should see a Cardiologist"</p>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-dark mb-2">Appointment Assistance</h3>
          <p className="text-sm text-neutral-gray">
            Help patients book appointments with the recommended specialists and answer scheduling questions.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold text-neutral-dark mb-2 text-sm sm:text-base">Service Information</h3>
          <p className="text-xs sm:text-sm text-neutral-gray">
            Provide details about medical services, departments, and available specialists
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold text-neutral-dark mb-2 text-sm sm:text-base">Doctor Profiles</h3>
          <p className="text-xs sm:text-sm text-neutral-gray">
            Share information about doctors' specialties, experience, and availability
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold text-neutral-dark mb-2 text-sm sm:text-base">General Inquiries</h3>
          <p className="text-xs sm:text-sm text-neutral-gray">
            Answer common patient questions about location, hours, and contact information
          </p>
        </Card>
      </div>
    </div>
  )
}

export default function HospitalAIAssistantPage() {
  return (
    <SubscriptionProvider>
      <HospitalAIAssistantContent />
    </SubscriptionProvider>
  )
}
