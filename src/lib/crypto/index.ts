import { get, set } from 'idb-keyval'

// Web Crypto ECDH P-256 and AES-256-GCM configurations
const ECDH_PARAMS: EcKeyGenParams = {
  name: 'ECDH',
  namedCurve: 'P-256',
}

const AES_KEY_PARAMS: AesDerivedKeyParams = {
  name: 'AES-GCM',
  length: 256,
}

const IV_LENGTH = 12 // 96-bit IV for AES-GCM

export interface KeyPairJWK {
  publicKeyJwk: JsonWebKey
  privateKeyJwk: JsonWebKey
}

/**
 * Generates an ECDH P-256 key pair.
 */
export async function generateKeyPair(): Promise<KeyPairJWK> {
  const keyPair = await crypto.subtle.generateKey(
    ECDH_PARAMS,
    true, // extractable so private key can be safely persisted in IndexedDB on user device
    ['deriveKey']
  )

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

  return { publicKeyJwk, privateKeyJwk }
}

/**
 * Loads or initializes the user's ECDH key pair from IndexedDB.
 * Private key is stored ONLY in client IndexedDB.
 */
export async function getOrInitializeLocalKeyPair(userId: string): Promise<KeyPairJWK> {
  const storageKey = `nomore_e2ee_keys_${userId}`
  const existing = await get<KeyPairJWK>(storageKey)

  if (existing && existing.publicKeyJwk && existing.privateKeyJwk) {
    return existing
  }

  const newKeyPair = await generateKeyPair()
  await set(storageKey, newKeyPair)
  return newKeyPair
}

/**
 * Import a public key JWK into a CryptoKey object for ECDH key derivation.
 */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    ECDH_PARAMS,
    true,
    []
  )
}

/**
 * Import a private key JWK into a CryptoKey object.
 */
export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    ECDH_PARAMS,
    true,
    ['deriveKey']
  )
}

/**
 * Derive a shared AES-256-GCM key from own private key + partner's public key.
 */
export async function deriveSharedKey(
  privateKeyJwk: JsonWebKey,
  partnerPublicKeyJwk: JsonWebKey
): Promise<CryptoKey> {
  const privateKey = await importPrivateKey(privateKeyJwk)
  const partnerPublicKey = await importPublicKey(partnerPublicKeyJwk)

  return crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: partnerPublicKey,
    },
    privateKey,
    AES_KEY_PARAMS,
    false, // derived AES key is non-extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a plaintext message using AES-256-GCM with a derived shared key.
 */
export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  )

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv.buffer),
  }
}

/**
 * Decrypt a ciphertext message using AES-256-GCM with a derived shared key.
 */
export async function decryptMessage(
  ciphertext: string,
  iv: string,
  sharedKey: CryptoKey
): Promise<string> {
  const cipherBuffer = base64ToBuffer(ciphertext)
  const ivBuffer = new Uint8Array(base64ToBuffer(iv))

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    sharedKey,
    cipherBuffer
  )

  return new TextDecoder().decode(plainBuffer)
}

// Helpers for Uint8Array <-> Base64 conversion
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
