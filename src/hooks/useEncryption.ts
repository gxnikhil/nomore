'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getOrInitializeLocalKeyPair,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  KeyPairJWK,
} from '@/lib/crypto'
import { toast } from 'sonner'

export function useEncryption(userId: string | undefined, partnerId: string | undefined) {
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null)
  const [keyPair, setKeyPair] = useState<KeyPairJWK | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [partnerHasKey, setPartnerHasKey] = useState(false)

  const initEncryption = useCallback(async () => {
    if (!userId) {
      setIsInitializing(false)
      return
    }

    try {
      setIsInitializing(true)
      const supabase = createClient()

      // 1. Get or initialize local key pair in IndexedDB
      const keys = await getOrInitializeLocalKeyPair(userId)
      setKeyPair(keys)

      // 2. Publish public key JWK to Supabase `encryption_keys`
      const { error: upsertErr } = await supabase.from('encryption_keys').upsert({
        user_id: userId,
        public_key_jwk: keys.publicKeyJwk,
        updated_at: new Date().toISOString(),
      })

      if (upsertErr) {
        console.error('Error publishing public key:', upsertErr)
      }

      // 3. Fetch partner's public key JWK if partnerId is available
      if (partnerId) {
        const { data: partnerKeyData, error: partnerKeyErr } = await supabase
          .from('encryption_keys')
          .select('public_key_jwk')
          .eq('user_id', partnerId)
          .single()

        if (partnerKeyData && partnerKeyData.public_key_jwk) {
          setPartnerHasKey(true)
          // Derive shared AES-256-GCM key
          const derived = await deriveSharedKey(
            keys.privateKeyJwk,
            partnerKeyData.public_key_jwk as JsonWebKey
          )
          setSharedKey(derived)
        } else {
          setPartnerHasKey(false)
        }
      }
    } catch (err: any) {
      console.error('Failed to initialize E2EE:', err)
      toast.error('Could not initialize encryption keys.')
    } finally {
      setIsInitializing(false)
    }
  }, [userId, partnerId])

  useEffect(() => {
    initEncryption()
  }, [initEncryption])

  // Encrypt plaintext string
  const encryptText = async (plaintext: string): Promise<{ ciphertext: string; iv: string } | null> => {
    if (!sharedKey) {
      toast.error('Encryption key not established yet.')
      return null
    }
    try {
      return await encryptMessage(plaintext, sharedKey)
    } catch (err) {
      console.error('Encryption error:', err)
      toast.error('Failed to encrypt message.')
      return null
    }
  }

  // Decrypt ciphertext string
  const decryptText = async (ciphertext: string, iv: string): Promise<string> => {
    if (!sharedKey) return '🔐 [Encrypted message]'
    try {
      return await decryptMessage(ciphertext, iv, sharedKey)
    } catch (err) {
      console.error('Decryption error:', err)
      return '⚠️ [Decryption failed]'
    }
  }

  return {
    sharedKey,
    isInitializing,
    partnerHasKey,
    encryptText,
    decryptText,
    refreshKeys: initEncryption,
  }
}
