import { EnhancedSettings } from "@/components/settings/EnhancedSettings";

export default function SettingsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Configure integrations, team access, and automation</p>
      </div>
      <EnhancedSettings />
    </>
  );
}
