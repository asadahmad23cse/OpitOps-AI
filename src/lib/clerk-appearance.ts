/**
 * High-contrast dark theme for OptiOps — explicit text/social/input colors so
 * Sign In / Sign Up stay readable on gray-950 backgrounds.
 */
export const optiopsClerkAppearance = {
  baseTheme: "dark" as const,
  variables: {
    colorPrimary: "#22d3ee",
    colorDanger: "#f87171",
    colorSuccess: "#34d399",
    colorWarning: "#fbbf24",
    colorNeutral: "#9ca3af",
    colorBackground: "#030712",
    colorInputBackground: "rgba(255, 255, 255, 0.08)",
    colorInputText: "#f9fafb",
    colorText: "#f9fafb",
    colorTextSecondary: "#d1d5db",
    colorTextOnPrimaryBackground: "#0f172a",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "mx-auto w-full max-w-[420px]",
    card: "bg-gray-900 !shadow-2xl border border-white/15",
    headerTitle: "!text-white text-xl font-semibold tracking-tight",
    headerSubtitle: "!text-gray-300 text-sm mt-1",
    socialButtonsRoot: "gap-3",
    socialButtonsBlockButton:
      "!bg-white/10 !border-white/20 !text-white hover:!bg-white/15 hover:!border-white/30",
    socialButtonsBlockButtonText: "!text-white font-medium",
    socialButtonsBlockButtonArrow: "!text-gray-300",
    dividerRow: "!bg-white/15",
    dividerText: "!text-gray-400 text-sm",
    formFieldLabel: "!text-gray-200 text-sm font-medium",
    formFieldRow: "!text-gray-200",
    formFieldInput:
      "!bg-white/10 !border-white/20 !text-white placeholder:!text-gray-500 focus:!ring-2 focus:!ring-cyan-500/40 focus:!border-cyan-500/50",
    formFieldInputShowPasswordButton: "!text-gray-300 hover:!text-white",
    formFieldHintText: "!text-gray-400 text-sm",
    formFieldErrorText: "!text-red-300 text-sm",
    formFieldSuccessText: "!text-emerald-300 text-sm",
    formButtonPrimary:
      "!bg-cyan-500 hover:!bg-cyan-400 !text-gray-950 font-semibold shadow-lg shadow-cyan-500/20",
    formButtonSecondary:
      "!bg-transparent !border-white/25 !text-white hover:!bg-white/10",
    footer: "!bg-transparent",
    footerAction: "!text-gray-300",
    footerActionText: "!text-gray-400",
    footerActionLink: "!text-cyan-400 hover:!text-cyan-300 font-medium",
    identityPreviewText: "!text-white",
    identityPreviewEditButton: "!text-cyan-400",
    otpCodeFieldInput: "!bg-white/10 !border-white/20 !text-white",
    alert: "!border-white/10",
    alertText: "!text-gray-100",
    formResendCodeLink: "!text-cyan-400",
    alternativeMethodsBlockButton:
      "!text-white !border-white/20 !bg-white/5 hover:!bg-white/10",
  },
} as const;
