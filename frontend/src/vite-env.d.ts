/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_WHATSAPP_NUMBER?: string
  readonly VITE_APP_DESCRIPTION: string
  readonly VITE_ENABLE_2FA: string
  readonly VITE_ENABLE_SOCIAL_LOGIN: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_CLOUDINARY_CLOUD_NAME: string
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
