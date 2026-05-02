export type AuthResponse = {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  requiresTwoFactor?: boolean;
  requiresRegistrationVerification?: boolean;
  twoFactorToken?: string;
  user?: {
    name?: string;
    email?: string;
  };
  message?: string;
};
