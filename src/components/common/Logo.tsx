'use client'

import React from 'react'

interface LogoProps {
  variant?: 'login' | 'header' | 'icon'
  className?: string
  size?: number
  showWordmark?: boolean
  showTagline?: boolean
}

export default function Logo({
  variant = 'header',
  className = '',
  size,
  showWordmark = true,
  showTagline = false,
}: LogoProps) {
  if (variant === 'login') {
    const markSize = size || 64
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div
          className="mark relative mb-4"
          style={{ width: `${markSize}px`, height: `${markSize}px` }}
        >
          <img
            src="/assets/nomore-logo.png"
            alt="NOMORE Logo"
            className="w-full h-full object-contain block"
          />
        </div>
        {showWordmark && (
          <p className="wordmark text-[20px] font-light tracking-[6px] text-[var(--text-1,#1d1d1f)] mb-[3px] uppercase select-none">
            NOMORE
          </p>
        )}
        {(showTagline || variant === 'login') && (
          <p className="since text-[10px] font-normal tracking-[3px] text-[var(--text-2,#6e6e73)] mb-[30px] uppercase select-none">
            SINCE 2026
          </p>
        )}
      </div>
    )
  }

  const iconSize = size || (variant === 'icon' ? 32 : 32)

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center overflow-hidden"
        style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
      >
        <img
          src="/assets/nomore-logo.png"
          alt="NOMORE Logo"
          className="w-full h-full object-contain block"
        />
      </div>
      {showWordmark && variant !== 'icon' && (
        <span className="font-light text-lg tracking-[3px] text-[var(--text-1,#1d1d1f)] uppercase select-none">
          NOMORE
        </span>
      )}
    </div>
  )
}
