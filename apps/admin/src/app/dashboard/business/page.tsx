import Link from 'next/link';
import { getOrCreateBusinessSettings } from '@/lib/business';
import { updateBusinessSettings } from './actions';

const DAYS: Array<[key: string, label: string]> = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
];

export default async function BusinessSettingsPage() {
  const settings = await getOrCreateBusinessSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Business settings</h1>
        <Link href="/dashboard/business/services" className="text-sm text-neon">
          Manage services →
        </Link>
      </div>
      <p className="text-sm text-text-muted">
        The single source of truth for business-identity facts used across the site's structured data and contact info. No
        review counts, ratings, or customer statistics live here — those are never set by hand.
      </p>

      <form action={updateBusinessSettings} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Legal name" name="legalName" defaultValue={settings.legalName ?? ''} />
          <Field label="Display name" name="displayName" defaultValue={settings.displayName ?? ''} />
        </div>
        <TextAreaField label="Description" name="description" defaultValue={settings.description ?? ''} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" name="email" type="email" defaultValue={settings.email ?? ''} />
          <Field label="Phone" name="phone" defaultValue={settings.phone ?? ''} />
        </div>
        <Field label="Address line 1" name="addressLine1" defaultValue={settings.addressLine1 ?? ''} />
        <Field label="Address line 2" name="addressLine2" defaultValue={settings.addressLine2 ?? ''} />
        <div className="grid grid-cols-4 gap-4">
          <Field label="City" name="city" defaultValue={settings.city ?? ''} />
          <Field label="Region" name="region" defaultValue={settings.region ?? ''} />
          <Field label="Postal code" name="postalCode" defaultValue={settings.postalCode ?? ''} />
          <Field label="Country code" name="countryCode" defaultValue={settings.countryCode ?? ''} />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm text-text-muted">Opening hours</legend>
          <div className="grid grid-cols-2 gap-3">
            {DAYS.map(([key, label]) => (
              <Field
                key={key}
                label={label}
                name={`hours_${key}`}
                placeholder="e.g. 09:00–18:00 or Closed"
                defaultValue={settings.openingHours?.[key] ?? ''}
              />
            ))}
          </div>
        </fieldset>

        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, defaultValue, type = 'text', placeholder }: { label: string; name: string; defaultValue: string; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
      />
    </div>
  );
}

function TextAreaField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
      />
    </div>
  );
}
