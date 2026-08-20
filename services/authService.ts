
import { UserProfile } from '../types';
import { supabase } from './supabaseClient';

/**
 * AUTHENTICATION SERVICE
 * Uses Supabase Auth directly - no backend calls for auth
 */

const getRedirectUrl = () => {
  // Use VITE_APP_URL for production, or current origin for development
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  // Use current window origin to handle any port (5173, 3000, etc.)
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
};


// Helper to map Supabase errors to User-Friendly UX messages
// Based on FINAL COMPLETE AUTH FAILURE MATRIX
const mapAuthError = (error: any): string => {
  const msg = (error?.message || "").toLowerCase();
  const code = error?.code || "";

  // 1. SIGNUP ERRORS
  if (msg.includes("already registered") || msg.includes("already exists") || code === "user_already_exists") {
    return "An account with this email already exists. Please sign in."; // MATRIX: Email already registered
  }
  if (msg.includes("password should be at least")) {
    return "Password must be at least 6 characters long."; // MATRIX: Weak password
  }
  if (msg.includes("invalid email") || msg.includes("valid email") || msg.includes("validation failed")) {
    return "Please enter a valid email address."; // MATRIX: Invalid email format
  }
  if (msg.includes("email not confirmed")) {
    return "Email not verified. Please complete OTP verification."; // MATRIX: Email not verified
  }

  // 2. OTP ERRORS
  // Check invalid token FIRST - Supabase often returns "invalid" for wrong OTP codes
  if (msg.includes("invalid token") || msg.includes("token is invalid") || code === "otp_invalid") {
    return "Invalid OTP. Please check the code and try again."; // MATRIX: OTP incorrect
  }
  if (msg.includes("token has expired") || msg.includes("token is expired")) {
    return "OTP expired. Please request a new code."; // MATRIX: OTP expired
  }
  if (msg.includes("already been used") || msg.includes("token has been used")) {
    return "This OTP has already been used."; // MATRIX: OTP already used
  }

  // 3. LOGIN ERRORS
  // 3. LOGIN ERRORS
  if (msg.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (msg.includes("user not found") || code === "user_not_found") {
    return "No account found with this email."; // MATRIX
  }
  if (code === "over_email_send_rate_limit" || msg.includes("send_rate_limit")) {
    return "Too many OTP requests. Please try again later."; // MATRIX: OTP specific
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Too many failed attempts. Please try again later."; // MATRIXVal: General login rate limit
  }

  // 4. GOOGLE / OAUTH ERRORS
  if (msg.includes("oauth") || msg.includes("google")) {
    if (msg.includes("popup blocked")) return "Google sign-in popup was blocked. Please allow popups."; // MATRIX
    if (msg.includes("cancelled") || msg.includes("closed")) return "Google sign-in was cancelled."; // MATRIX
    if (msg.includes("cant be used") || msg.includes("not authorized")) return "Unable to sign in with Google. Please try another method."; // MATRIX
  }

  // 5. SESSION / SYSTEM ERRORS
  if (msg.includes("session expired") || msg.includes("refresh token")) {
    return "Session expired. Please sign in again."; // MATRIX
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "Network error. Please check your internet connection."; // MATRIX
  }
  if (msg.includes("service unavailable") || msg.includes("500") || msg.includes("502") || msg.includes("503")) {
    return "Authentication service is currently unavailable."; // MATRIX
  }

  // FALLBACK for Custom Errors (Pass through my custom errors like "This account uses Google...")
  return error.message || "Authentication failed. Please start again.";
};

export const authService = {

  // ... (getSession, getCurrentUser unchanged) ...
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async signup(name: string, email: string, password: string): Promise<UserProfile> {
    if (!supabase) throw new Error("Supabase is not configured");
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
          data: {
            full_name: cleanName
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("Signup failed");



      // Fetch credits from profile
      const { data: profile } = await supabase.from('profiles').select('credits').eq('id', data.user.id).single();

      return {
        id: data.user.id,
        fullName: data.user.user_metadata?.full_name || cleanName,
        email: data.user.email || cleanEmail,
        credits: profile?.credits || 0,
        createdAt: new Date(data.user.created_at).getTime()
      };
    } catch (err) {
      throw new Error(mapAuthError(err));
    }
  },

  async login(email: string, password: string): Promise<UserProfile> {
    if (!supabase) throw new Error("Supabase is not configured");
    const cleanEmail = email.toLowerCase().trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) throw error;
      if (!data.user) throw new Error("Login failed");

      // Fetch credits from profile
      const { data: profile } = await supabase.from('profiles').select('credits').eq('id', data.user.id).single();

      return {
        id: data.user.id,
        fullName: data.user.user_metadata?.full_name || "Traveler",
        email: data.user.email || cleanEmail,
        credits: profile?.credits || 0,
        createdAt: new Date(data.user.created_at).getTime()
      };
    } catch (err) {
      throw new Error(mapAuthError(err));
    }
  },

  async loginWithGoogle(isSignup: boolean = false) {
    if (!supabase) throw new Error("Supabase is not configured");
    try {
      const redirectUrl = getRedirectUrl();
      console.log("Flux: Initiating Google OAuth with redirect:", redirectUrl);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: isSignup ? 'consent' : 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google Login Error:", err);
      throw new Error(mapAuthError(err));
    }
  },

  async loginWithOtp(email: string) {
    if (!supabase) throw new Error("Supabase is not configured");
    const cleanEmail = email.toLowerCase().trim();
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail });
      if (error) throw error;
    } catch (err) {
      // For "Email not registered", Supabase actually sends nothing (silent) or error?
      // Matrix wants: "No account found with this email."
      // We can't know for sure. Generic fallback.
      throw new Error(mapAuthError(err));
    }
  },

  async verifyOtp(email: string, token: string, type: 'signup' | 'email' | 'recovery' = 'email'): Promise<UserProfile> {
    if (!supabase) throw new Error("Supabase is not configured");
    const cleanEmail = email.toLowerCase().trim();
    const cleanToken = token.trim();

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: type
      });

      if (error) throw error;
      if (!data.user) throw new Error("Verification failed");

      // BLOCK FORGOT PASSWORD FOR GOOGLE USERS
      if (type === 'recovery' && data.user.app_metadata?.provider === 'google') {
        await supabase.auth.signOut();
        // EXACT MSG FROM MATRIX
        throw new Error("This account uses Google sign-in. Password reset is not available.");
      }

      // Fetch credits from profile
      const { data: profile } = await supabase.from('profiles').select('credits').eq('id', data.user.id).single();

      return {
        id: data.user.id,
        fullName: data.user.user_metadata?.full_name || "Traveler",
        email: data.user.email || cleanEmail,
        credits: profile?.credits || 0,
        createdAt: new Date(data.user.created_at).getTime()
      };
    } catch (err) {
      throw new Error(mapAuthError(err));
    }
  },

  async requestPasswordReset(email: string): Promise<{ message: string; success: boolean }> {
    if (!supabase) throw new Error("Supabase is not configured");
    const cleanEmail = email.toLowerCase().trim();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${getRedirectUrl()}/update-password`, // Ensure this route exists or is handled
      });

      if (error) throw error;

      // Matrix wants: "No account found" if not registered.
      // Supabase returns success even if not found (security).
      // We cannot satisfy "No account found" securely here.
      // We stick to neutral or assume success.
      return {
        message: "If an account exists, we’ve sent a reset link.", // Can't change to "No account found" safely
        success: true
      };
    } catch (err) {
      throw new Error(mapAuthError(err));
    }
  },

  async updatePassword(newPassword: string): Promise<{ message: string; success: boolean }> {
    if (!supabase) throw new Error("Supabase is not configured");

    try {
      // Check if user is a Google user
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.app_metadata?.provider === 'google') {
        throw new Error("This account uses Google sign-in. Password reset is not available.");
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return {
        message: "Password updated successfully.",
        success: true
      };
    } catch (err) {
      throw new Error(mapAuthError(err));
    }
  },

  async resendConfirmation(email: string) {
    if (!supabase) throw new Error("Supabase is not configured");
    const cleanEmail = email.toLowerCase().trim();
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: getRedirectUrl()
        }
      });
      if (error) throw error;
      return { message: "Confirmation email sent." };
    } catch (err) {
      throw new Error(mapAuthError(err));
    }
  },



  // --- LEGACY COMPATIBILITY ---
  async requestForgotOtp(email: string): Promise<{ message: string; success: boolean }> {
    return this.requestPasswordReset(email);
  },

  async verifyForgotOtp(_email: string, _otp: string): Promise<{ message: string; success: boolean; resetToken?: string }> {
    return {
      message: "Use the link in your email to reset password",
      success: true
    };
  },

  async resetPasswordWithOtp(_email: string, _resetToken: string, newPassword: string): Promise<{ message: string; success: boolean }> {
    return this.updatePassword(newPassword);
  },

  // Refresh user credits from profiles table (for real-time updates)
  async refreshUserCredits(userId: string): Promise<number> {
    if (!supabase) return 0;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error refreshing credits:", error);
        return 0;
      }
      return data?.credits ?? 0;
    } catch (e) {
      console.error("Exception refreshing credits:", e);
      return 0;
    }
  }
};
