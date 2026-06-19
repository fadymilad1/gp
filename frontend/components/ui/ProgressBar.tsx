'use client'

import React from 'react'

interface ProgressBarProps {
  steps: { label: string; completed: boolean }[]
  currentStep: number
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  steps,
  currentStep,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={index} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step.completed
                    ? 'bg-primary text-white'
                    : index === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-neutral-border text-neutral-gray'
                }`}
              >
                {step.completed ? '✓' : index + 1}
              </div>
              <p
                className={`mt-2 text-sm text-center ${
                  index === currentStep || step.completed
                    ? 'text-primary font-medium'
                    : 'text-neutral-gray'
                }`}
              >
                {step.label}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-1 flex-1 mx-2 ${
                  step.completed ? 'bg-primary' : 'bg-neutral-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

