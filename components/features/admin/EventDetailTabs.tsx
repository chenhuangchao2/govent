'use client'

import { useState } from 'react'

interface Props {
  tabs: { key: string; label: string; count?: number }[]
  children: React.ReactNode[]
}

export default function EventDetailTabs({ tabs, children }: Props) {
  const [active, setActive] = useState(tabs[0].key)

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  active === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      {children.map((child, i) => (
        <div key={tabs[i].key} className={active === tabs[i].key ? '' : 'hidden'}>
          {child}
        </div>
      ))}
    </div>
  )
}
