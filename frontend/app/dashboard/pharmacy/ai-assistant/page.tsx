'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { FiSend, FiMessageSquare, FiLock, FiDollarSign } from 'react-icons/fi'
import { getScopedItem } from '@/lib/storage'



type ChatMessage = {
  id: number
  type: 'ai' | 'user'
  content: string
  timestamp: Date
}

export default function PharmacyAIAssistantPage() {
  const router = useRouter()
  const [enabled, setEnabled] = useState(true)
  const [message, setMessage] = useState('')
  const [hasAIChatbot, setHasAIChatbot] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: 'ai' as const,
      content: "Hello! I'm here to help customers with medication questions, prescription refills, and pharmacy services. How can I assist you today?",
      timestamp: new Date(),
    },
  ])

  useEffect(() => {
    // Check if user template includes AI chatbot
    const selectedFeatures = getScopedItem('selectedFeatures')
    let hasAI = false

    if (selectedFeatures) {
      const features = JSON.parse(selectedFeatures)
      hasAI = features.aiChatbot === true
    }

    const selectedTemplate = getScopedItem('selectedTemplate')
    if (selectedTemplate) {
      const templateId = parseInt(selectedTemplate)
      // Templates 1 and 2 include AI (Modern and Classic)
      if (templateId === 1 || templateId === 2) {
        hasAI = true
      }
    }

    setHasAIChatbot(hasAI)
  }, [])



  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    const userMessage = {
      id: messages.length + 1,
      type: 'user' as const,
      content: message,
      timestamp: new Date(),
    }

    setMessages([...messages, userMessage])
    setMessage('')

    // Simulate AI response for pharmacy
    setTimeout(() => {
      let aiContent = 'Hello! I can help you with medication information, prescription refills, and general health questions. How can I assist you today?'
      const lowerMessage = message.toLowerCase()

      if (lowerMessage.includes('medication') || lowerMessage.includes('medicine') || lowerMessage.includes('drug')) {
        aiContent = 'I can provide general information about medications, including common uses and side effects. For specific medical advice, please consult with our pharmacist or your doctor. What medication would you like to know about?'
      } else if (lowerMessage.includes('refill') || lowerMessage.includes('prescription')) {
        aiContent = 'I can help you with prescription refills! Please provide your prescription number or name, and I can check the status and estimated ready time for pickup.'
      } else if (lowerMessage.includes('side effect') || lowerMessage.includes('interaction')) {
        aiContent = 'For medication side effects and drug interactions, I recommend speaking directly with our pharmacist for personalized advice. They can review your complete medication list for safety.'
      } else if (lowerMessage.includes('hours') || lowerMessage.includes('open') || lowerMessage.includes('close')) {
        aiContent = 'Our pharmacy hours are Monday-Friday 9AM-8PM, Saturday 9AM-6PM, and Sunday 10AM-4PM. We also offer 24/7 prescription refill requests online!'
      }

      const aiResponse = {
        id: messages.length + 2,
        type: 'ai' as const,
        content: aiContent,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold text-neutral-dark mb-2">
          AI Assistant for Customers
        </h1>
        <p className="text-neutral-gray">
          Configure the AI chatbot that helps customers on your website
        </p>
      </div>

      {!hasAIChatbot && (
        <Card className="p-8 text-center">
          <FiLock className="mx-auto text-neutral-gray mb-4" size={48} />
          <h3 className="text-xl font-semibold text-neutral-dark mb-2">AI Chatbot Not Enabled on Website</h3>
          <p className="text-neutral-gray mb-6">
            AI Chatbot is included with Modern and Classic Pharmacy templates ..etc. Upgrade your template to enable customer assistance on your live website. However, you can try out the chatbot behavior and support tools below.
          </p>
          <Button variant="primary" onClick={() => router.push('/dashboard/pharmacy/templates')}>
            Upgrade Template
          </Button>
        </Card>
      )}

      {hasAIChatbot && (
        <Card className="p-6">
          <Toggle
            label="Enable AI Assistant for Customers"
            checked={enabled}
            onChange={setEnabled}
            description="Allow customers to chat with AI assistant on your website for questions about medications, prescriptions, and pharmacy services"
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
                  Customer AI Assistant
                </h2>
                <p className="text-sm text-neutral-gray">
                  Test the chatbot that customers will see
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
                  className={`max-w-[70%] rounded-lg p-4 ${msg.type === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-neutral-border'
                    }`}
                >
                  <p className={msg.type === 'user' ? 'text-white' : 'text-neutral-dark'}>
                    {msg.content}
                  </p>
                  <p
                    className={`text-xs mt-2 ${msg.type === 'user' ? 'text-primary-light' : 'text-neutral-gray'
                      }`}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-3">
            <Input
              placeholder="Ask a question as a customer would..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="primary">
              <FiSend className="mr-2" />
              Send
            </Button>
          </form>
        </Card>
      )}



      {/* Features preview */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-dark mb-2">Medication Information & Guidance</h3>
          <p className="text-sm text-neutral-gray mb-3">
            Customers can ask about medications, dosages, side effects, and drug interactions. AI provides general pharmaceutical guidance.
          </p>
          <div className="bg-neutral-light rounded-lg p-3 text-xs text-neutral-gray">
            <p className="font-medium mb-1">Example:</p>
            <p className="italic">"What are the side effects of ibuprofen?" → AI provides: "Common side effects and precautions"</p>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-dark mb-2">Prescription Refill Assistance</h3>
          <p className="text-sm text-neutral-gray">
            Help customers check prescription status, refill requests, and provide information about pickup times.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold text-neutral-dark mb-2 text-sm sm:text-base">Product Information</h3>
          <p className="text-xs sm:text-sm text-neutral-gray">
            Provide details about available medications, health products, and pharmacy services
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold text-neutral-dark mb-2 text-sm sm:text-base">Health & Wellness Tips</h3>
          <p className="text-xs sm:text-sm text-neutral-gray">
            Share general health advice, wellness tips, and information about over-the-counter products
          </p>
        </Card>
        <Card className="p-4 sm:p-6">
          <h3 className="font-semibold text-neutral-dark mb-2 text-sm sm:text-base">Store Information</h3>
          <p className="text-xs sm:text-sm text-neutral-gray">
            Answer questions about store hours, location, services, and contact information
          </p>
        </Card>
      </div>
    </div>
  )
}
