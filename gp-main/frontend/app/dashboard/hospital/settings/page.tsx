'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { hospitalAdminApi } from '@/lib/hospitalAdminApi';
import type { HospitalProfile } from '@/types/hospital';

type TabKey = 'hospital-info' | 'notifications';


type NotificationPreferences = {
  newPatientRegistration: boolean;
  appointmentCancellations: boolean;
  labResultsAvailable: boolean;
  emergencyCodeBlue: boolean;
};


export default function HospitalSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('hospital-info');
  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [yearsOfExcellence, setYearsOfExcellence] = useState('25');
  const [patientsTreated, setPatientsTreated] = useState('50k+');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    newPatientRegistration: true,
    appointmentCancellations: true,
    labResultsAvailable: false,
    emergencyCodeBlue: true,
  });

  useEffect(() => {
    const load = async () => {
      const response = await hospitalAdminApi.getProfile();
      if (!response.data) return;

      setProfile(response.data);
      setName(response.data.name || '');
      setDescription(response.data.description || '');
      setTimezone(response.data.timezone || 'UTC');
      setYearsOfExcellence(response.data.years_of_excellence?.toString() || '25');
      setPatientsTreated(response.data.patients_treated || '50k+');

      const notificationsFromProfile = response.data.theme_settings?.notifications as NotificationPreferences | undefined;

      if (notificationsFromProfile) {
        setNotifications({
          newPatientRegistration: Boolean(notificationsFromProfile.newPatientRegistration),
          appointmentCancellations: Boolean(notificationsFromProfile.appointmentCancellations),
          labResultsAvailable: Boolean(notificationsFromProfile.labResultsAvailable),
          emergencyCodeBlue: Boolean(notificationsFromProfile.emergencyCodeBlue),
        });
      }
    };
    void load();
  }, []);


  const saveHospitalInfo = async () => {
    setSaving(true);
    setSaveMessage('');
    const response = await hospitalAdminApi.updateProfile({
      name,
      description,
      timezone,
      years_of_excellence: parseInt(yearsOfExcellence) || 25,
      patients_treated: patientsTreated,
    });
    if (response.data) {
      setProfile(response.data);
      setSaveMessage('Hospital profile updated.');
    } else if (response.error) {
      setSaveMessage(response.error);
    }
    setSaving(false);
  };


  const saveNotifications = async () => {
    setSaving(true);
    setSaveMessage('');
    if (profile) {
      const response = await hospitalAdminApi.updateProfile({
        theme_settings: {
          ...(profile.theme_settings || {}),
          notifications,
        },
      });
      if (response.data) setProfile(response.data);
    }
    setSaveMessage('Notification preferences saved.');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-dark">Settings</h1>
        <p className="mt-1 text-neutral-gray">Manage hospital details and system preferences.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { key: 'hospital-info', label: 'Hospital Info' },
          { key: 'notifications', label: 'Notifications' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-light text-primary border border-primary/25'
                : 'bg-white text-neutral-gray border border-neutral-border hover:text-neutral-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'hospital-info' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-dark mb-4">Hospital Information</h2>
          <div className="grid gap-4">
            <Input label="Hospital Name" value={name} onChange={(event) => setName(event.target.value)} />
            <Textarea
              label="Description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Input label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            
            <div className="border-t border-neutral-border pt-4 mt-2">
              <h3 className="text-lg font-semibold text-neutral-dark mb-3">Website Statistics</h3>
              <p className="text-sm text-neutral-gray mb-4">These numbers appear on your public website to highlight your hospital's achievements</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="Years of Excellence" 
                  type="number"
                  value={yearsOfExcellence} 
                  onChange={(event) => setYearsOfExcellence(event.target.value)}
                  placeholder="25"
                />
                <Input 
                  label="Patients Treated" 
                  value={patientsTreated} 
                  onChange={(event) => setPatientsTreated(event.target.value)}
                  placeholder="e.g., 50k+, 100k+, 1M+"
                />
              </div>
              <p className="text-xs text-neutral-gray mt-2">
                Note: Doctors and Departments count are automatically calculated from your data
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={saveHospitalInfo} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-dark">System Notifications</h2>
          <p className="mt-1 text-sm text-neutral-gray">Choose which alerts are sent to staff.</p>

          <div className="mt-6 space-y-5">
            <Toggle
              label="New Patient Registration"
              description="Notify admin desk when a patient self-registers online."
              checked={notifications.newPatientRegistration}
              onChange={(value) => setNotifications((current) => ({ ...current, newPatientRegistration: value }))}
            />
            <Toggle
              label="Appointment Cancellations"
              description="Alert assigned doctors when a patient cancels."
              checked={notifications.appointmentCancellations}
              onChange={(value) => setNotifications((current) => ({ ...current, appointmentCancellations: value }))}
            />
            <Toggle
              label="Lab Results Available"
              description="Send summary to attending physician when labs complete."
              checked={notifications.labResultsAvailable}
              onChange={(value) => setNotifications((current) => ({ ...current, labResultsAvailable: value }))}
            />
            <Toggle
              label="Emergency Code Blue"
              description="Push urgent notification to active on-call devices."
              checked={notifications.emergencyCodeBlue}
              onChange={(value) => setNotifications((current) => ({ ...current, emergencyCodeBlue: value }))}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={saveNotifications} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </Card>
      )}

      {saveMessage ? <p className="text-sm text-primary">{saveMessage}</p> : null}
    </div>
  );
}
