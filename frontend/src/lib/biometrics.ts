/**
 * Biometric Authentication Utilities
 * Uses WebAuthn API for fingerprint, face recognition, etc.
 */

export interface BiometricAuthResult {
  success: boolean;
  credential?: any;
  error?: string;
}

/**
 * Check if biometric authentication is supported
 */
export const supportsBiometrics = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return false;
  }
};

/**
 * Request biometric authentication
 * Note: This is a simplified implementation. In production, you'd need to:
 * 1. Generate a proper challenge from your server
 * 2. Store and verify credentials properly
 * 3. Handle different authenticator types
 */
export const biometricAuth = async (): Promise<BiometricAuthResult> => {
  // Check if WebAuthn is supported
  if (!window.PublicKeyCredential) {
    return {
      success: false,
      error: 'WebAuthn is not supported in this browser'
    };
  }

  try {
    // Check if biometric is available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

    if (!available) {
      return {
        success: false,
        error: 'Biometric authentication not available on this device'
      };
    }

    // Generate a random challenge (in production, this should come from your server)
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Request biometric authentication
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [], // Empty for first-time authentication
        userVerification: 'preferred',
        timeout: 60000
      }
    });

    if (credential) {
      return {
        success: true,
        credential
      };
    } else {
      return {
        success: false,
        error: 'Authentication was cancelled'
      };
    }
  } catch (error: any) {
    console.error('Biometric authentication error:', error);

    // Handle specific error types
    if (error.name === 'NotAllowedError') {
      return {
        success: false,
        error: 'Authentication was cancelled or permission denied'
      };
    } else if (error.name === 'NotSupportedError') {
      return {
        success: false,
        error: 'Biometric authentication is not supported'
      };
    } else if (error.name === 'SecurityError') {
      return {
        success: false,
        error: 'Security error: The operation is insecure (HTTPS required)'
      };
    } else if (error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Authentication timed out'
      };
    }

    return {
      success: false,
      error: error.message || 'Biometric authentication failed'
    };
  }
};

/**
 * Register biometric credentials (simplified implementation)
 * In production, this would involve server-side registration
 */
export const registerBiometric = async (userId: string, username: string): Promise<BiometricAuthResult> => {
  if (!window.PublicKeyCredential) {
    return {
      success: false,
      error: 'WebAuthn is not supported in this browser'
    };
  }

  try {
    // Check availability
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      return {
        success: false,
        error: 'Biometric authentication not available'
      };
    }

    // Create user handle
    const userHandle = new TextEncoder().encode(userId);

    // Generate challenge (should come from server in production)
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Create credentials
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Dumuwaks',
          id: window.location.hostname
        },
        user: {
          id: userHandle,
          name: username,
          displayName: username
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred'
        },
        timeout: 60000,
        attestation: 'direct'
      }
    });

    if (credential) {
      return {
        success: true,
        credential
      };
    } else {
      return {
        success: false,
        error: 'Registration failed'
      };
    }
  } catch (error: any) {
    console.error('Biometric registration error:', error);
    return {
      success: false,
      error: error.message || 'Biometric registration failed'
    };
  }
};

/**
 * Check if the context is secure (HTTPS required for biometric)
 */
export const isSecureContext = (): boolean => {
  return window.isSecureContext || window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

/**
 * Get available authentication methods
 */
export const getAvailableAuthMethods = async (): Promise<{
  biometric: boolean;
  webAuthn: boolean;
  secureContext: boolean;
}> => {
  const biometric = await supportsBiometrics();
  const webAuthn = !!window.PublicKeyCredential;
  const secureContext = isSecureContext();

  return {
    biometric: biometric && secureContext,
    webAuthn,
    secureContext
  };
};
