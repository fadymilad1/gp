'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { FiSend, FiMessageSquare, FiLock, FiDollarSign } from 'react-icons/fi'
import { getScopedItem } from '@/lib/storage'

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: 'Pain Relief', keywords: ['ibuprofen', 'paracetamol', 'acetaminophen', 'pain', 'headache'] },
  { category: 'Vitamins', keywords: ['vitamin', 'omega', 'supplement', 'zinc', 'magnesium'] },
  { category: 'Cold & Flu', keywords: ['cough', 'flu', 'cold', 'congestion', 'sore throat'] },
  { category: 'Allergy', keywords: ['allergy', 'antihistamine', 'sneeze'] },
  { category: 'Digestive Care', keywords: ['stomach', 'digestive', 'probiotic', 'acid'] },
  { category: 'Diabetes Care', keywords: ['glucose', 'insulin', 'diabetic'] },
]

const suggestCategoryFromName = (name: string) => {
  const normalized = name.toLowerCase()
  const match = CATEGORY_KEYWORDS.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword)),
  )
  return match?.category || 'General Wellness'
}

const buildDescription = (productName: string, benefits: string) => {
  const safeName = productName.trim() || 'This product'
  const safeBenefits = benefits.trim() || 'daily wellness support'
  return `${safeName} is designed to support ${safeBenefits}. Always follow package instructions and consult a licensed pharmacist for personalized guidance.`
}

const buildLayoutRecommendations = (pharmacyName: string) => [
  `Lead with a strong hero message for ${pharmacyName || 'your pharmacy'} and a single primary CTA (Shop Medications).`,
  'Move best-selling categories into the first fold to reduce drop-off on mobile.',
  'Highlight trust indicators near checkout: licensed pharmacists, secure payment, and delivery ETA.',
  'Use an offers ribbon for discounts and refill reminders to increase repeat orders.',
]

type ChatMessage = {
  id: number
  type: 'ai' | 'user'
  content: string
  timestamp: Date
}

export default function AIAssistantPage() {
  const [enabled, setEnabled] = useState(true)
  const [message, setMessage] = useState('')
  const [hasAIChatbot, setHasAIChatbot] = useState(false)
  const [userType, setUserType] = useState<'hospital' | 'pharmacy'>('hospital')
  const [productName, setProductName] = useState('')
  const [productBenefits, setProductBenefits] = useState('')
  const [generatedDescription, setGeneratedDescription] = useState('')
  const [suggestedCategory, setSuggestedCategory] = useState('')
  const [pharmacyNameDraft, setPharmacyNameDraft] = useState('')
  const [cityDraft, setCityDraft] = useState('')
  const [autoFilledInfo, setAutoFilledInfo] = useState('')
  const [layoutRecommendations, setLayoutRecommendations] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: 'ai' as const,
      content: userType === 'hospital' 
        ? "Hello! I'm here to help patients with their questions about your medical services. How can I assist you today?"
        : "Hello! I'm here to help customers with medication questions, prescription refills, and pharmacy services. How can I assist you today?",
      timestamp: new Date(),
    },
  ])

  useEffect(() => {
    // Check if user has paid for AI chatbot feature (user-scoped)
    const selectedFeatures = getScopedItem('selectedFeatures')
    const userData = localStorage.getItem('user')
    
    if (userData) {
      const user = JSON.parse(userData)
      setUserType(user.businessType || user.business_type || 'hospital')
    }

    if (selectedFeatures) {
      const features = JSON.parse(selectedFeatures)
      setHasAIChatbot(features.aiChatbot === true)
    }

    const selectedTemplate = getScopedItem('selectedTemplate')
    if (userType === 'pharmacy' && selectedTemplate) {
      const templateId = parseInt(selectedTemplate)
      // Templates 1 and 2 include AI (Modern and Classic)
      setHasAIChatbot(templateId === 1 || templateId === 2)
    }
  }, [userType])

  const handleGenerateDescription = () => {
    setGeneratedDescription(buildDescription(productName, productBenefits))
  }

  const handleSuggestCategory = () => {
    setSuggestedCategory(suggestCategoryFromName(productName))
  }

  const handleAutoFillInfo = () => {
    const name = pharmacyNameDraft.trim() || 'Your Pharmacy'
    const city = cityDraft.trim() || 'your city'
    const template = [
      `${name} is a patient-first pharmacy serving ${city} with trusted medications and pharmacist guidance.`,
      `Address: Main medical district, ${city}.`,
      'Phone: +20 100 000 0000.',
      'Working hours: Mon-Sat 09:00-22:00, Sun 11:00-18:00.',
    ]
    setAutoFilledInfo(template.join('\n'))
  }

  const handleRecommendLayout = () => {
    setLayoutRecommendations(buildLayoutRecommendations(pharmacyNameDraft))
  }

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

    // Simulate AI response based on user type
    setTimeout(() => {
      let aiContent = ''
      const lowerMessage = message.toLowerCase()
      
      if (userType === 'hospital') {
        aiContent = 'Thank you for your question. I can help you with information about appointments, services, and finding the right specialist for your needs.'
        
        // Hospital-specific symptom responses
        if (lowerMessage.includes('pain') || lowerMessage.includes('hurt') || lowerMessage.includes('ache')) {
          if (lowerMessage.includes('chest') || lowerMessage.includes('heart')) {
            aiContent = 'Based on your chest pain symptoms, I recommend seeing a Cardiologist. They specialize in heart and cardiovascular conditions. Would you like me to help you schedule an appointment?'
          } else if (lowerMessage.includes('head') || lowerMessage.includes('migraine')) {
            aiContent = 'For headaches and migraines, I suggest consulting with a Neurologist. They can properly diagnose and treat various types of headaches. Shall I check available appointments?'
          } else if (lowerMessage.includes('stomach') || lowerMessage.includes('abdomen')) {
            aiContent = 'Stomach pain could require a Gastroenterologist consultation. They specialize in digestive system issues. Would you like to book an appointment?'
          }
        } else if (lowerMessage.includes('skin') || lowerMessage.includes('rash') || lowerMessage.includes('acne')) {
          aiContent = 'For skin concerns, I recommend seeing a Dermatologist. They can help with various skin conditions. Would you like me to check their availability?'
        } else if (lowerMessage.includes('eye') || lowerMessage.includes('vision')) {
          aiContent = 'For eye or vision problems, an Ophthalmologist would be the right specialist to see. They can examine and treat eye conditions. Shall I help you schedule?'
        }
      } else if (userType === 'pharmacy') {
        aiContent = 'Hello! I can help you with medication information, prescription refills, and general health questions. How can I assist you today?'
        
        // Pharmacy-specific responses
        if (lowerMessage.includes('medication') || lowerMessage.includes('medicine') || lowerMessage.includes('drug')) {
          aiContent = 'I can provide general information about medications, including common uses and side effects. For specific medical advice, please consult with our pharmacist or your doctor. What medication would you like to know about?'
        } else if (lowerMessage.includes('refill') || lowerMessage.includes('prescription')) {
          aiContent = 'I can help you with prescription refills! Please provide your prescription number or name, and I can check the status and estimated ready time for pickup.'
        } else if (lowerMessage.includes('side effect') || lowerMessage.includes('interaction')) {
          aiContent = 'For medication side effects and drug interactions, I recommend speaking directly with our pharmacist for personalized advice. They can review your complete medication list for safety.'
        } else if (lowerMessage.includes('hours') || lowerMessage.includes('open') || lowerMessage.includes('close')) {
          aiContent = 'Our pharmacy hours are Monday-Friday 9AM-8PM, Saturday 9AM-6PM, and Sunday 10AM-4PM. We also offer 24/7 prescription refill requests online!'
        }
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
          AI Assistant for {userType === 'hospital' ? 'Patients' : 'Customers'}
        </h1>
        <p className="text-neutral-gray">
          Configure the AI chatbot that helps {userType === 'hospital' ? 'patients' : 'customers'} on your website
        </p>
      </div>

      {!hasAIChatbot ? (
        <Card className="p-8 text-center">
          <FiLock className="mx-auto text-neutral-gray mb-4" size={48} />
          <h3 className="text-xl font-semibold text-neutral-dark mb-2">AI Chatbot Not Available</h3>
          <p className="text-neutral-gray mb-6">
            {userType === 'hospital' 
              ? 'You need to subscribe to the AI Chatbot feature ($29/month) to enable patient assistance on your website.'
              : 'AI Chatbot is included with Modern and Classic pharmacy templates. Upgrade your template to enable patient assistance.'
            }
          </p>
          <Button variant="primary">
            <FiDollarSign className="mr-2" />
            {userType === 'hospital' ? 'Subscribe to AI Chatbot ($29/month)' : 'Upgrade Template'}
          </Button>
        </Card>
      ) : (
        <>
          {/* Toggle */}
          <Card className="p-6">
            <Toggle
              label={`Enable AI Assistant for ${userType === 'hospital' ? 'Patients' : 'Customers'}`}
              checked={enabled}
              onChange={setEnabled}
              description={userType === 'hospital' 
                ? "Allow patients to chat with AI assistant on your website for questions about services, appointments, and general medical inquiries"
                : "Allow customers to chat with AI assistant on your website for questions about medications, prescriptions, and pharmacy services"
              }
            />
          </Card>
        </>
      )}

      {/* Chat Interface */}
      {hasAIChatbot && enabled && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ai rounded-full flex items-center justify-center">
                <FiMessageSquare className="text-white" size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-dark">
                  {userType === 'hospital' ? 'Patient' : 'Customer'} AI Assistant
                </h2>
                <p className="text-sm text-neutral-gray">
                  Test the chatbot that {userType === 'hospital' ? 'patients' : 'customers'} will see
                </p>
              </div>
            </div>
            <div className="text-xs text-neutral-gray bg-neutral-light px-3 py-1 rounded-full">
              Preview Mode
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
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-3">
            <Input
              placeholder={`Ask a question as a ${userType === 'hospital' ? 'patient' : 'customer'} would...`}
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

      {hasAIChatbot && userType === 'pharmacy' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-dark mb-4">Pharmacy AI Support Tools</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-neutral-border p-4 space-y-3">
              <h3 className="font-semibold text-neutral-dark">Generate Product Description</h3>
              <Input
                label="Product name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ibuprofen 400mg"
              />
              <Input
                label="Benefits"
                value={productBenefits}
                onChange={(e) => setProductBenefits(e.target.value)}
                placeholder="pain relief and fever reduction"
              />
              <div className="flex gap-2">
                <Button type="button" onClick={handleGenerateDescription}>Generate</Button>
                <Button type="button" variant="secondary" onClick={handleSuggestCategory}>Suggest Category</Button>
              </div>
              {suggestedCategory && (
                <p className="text-sm text-neutral-gray">
                  Suggested category: <span className="font-semibold text-neutral-dark">{suggestedCategory}</span>
                </p>
              )}
              {generatedDescription && (
                <Textarea value={generatedDescription} readOnly rows={4} label="AI Description" />
              )}
            </div>

            <div className="rounded-lg border border-neutral-border p-4 space-y-3">
              <h3 className="font-semibold text-neutral-dark">Auto-Fill Pharmacy Info</h3>
              <Input
                label="Pharmacy name"
                value={pharmacyNameDraft}
                onChange={(e) => setPharmacyNameDraft(e.target.value)}
                placeholder="Medify Central Pharmacy"
              />
              <Input
                label="City"
                value={cityDraft}
                onChange={(e) => setCityDraft(e.target.value)}
                placeholder="Cairo"
              />
              <div className="flex gap-2">
                <Button type="button" onClick={handleAutoFillInfo}>Auto-fill Content</Button>
                <Button type="button" variant="secondary" onClick={handleRecommendLayout}>Recommend Layout</Button>
              </div>
              {autoFilledInfo && <Textarea value={autoFilledInfo} readOnly rows={5} label="Suggested business content" />}
              {layoutRecommendations.length > 0 && (
                <div className="rounded-lg bg-neutral-light p-3">
                  <p className="text-sm font-semibold text-neutral-dark mb-2">Layout improvements</p>
                  <ul className="space-y-1 text-sm text-neutral-gray">
                    {layoutRecommendations.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Features */}
      {hasAIChatbot && userType === 'hospital' && (
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
              Help patients book appointments with the recommended specialists and answer scheduling questions
            </p>
          </Card>
        </div>
      )}

      {hasAIChatbot && userType === 'pharmacy' && (
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
              Help customers check prescription status, refill requests, and provide information about pickup times
            </p>
          </Card>
        </div>
      )}

      {hasAIChatbot && userType === 'hospital' && (
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
      )}

      {hasAIChatbot && userType === 'pharmacy' && (
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
      )}
    </div>
  )
}

