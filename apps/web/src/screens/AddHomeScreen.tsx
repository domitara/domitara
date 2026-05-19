import { useState } from 'react';
import {
  Paper,
  Title,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Text,
} from '@mantine/core';
import { IconBuilding } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { activeHomeIdAtom } from '../store/atoms';
import { useCreateHome } from '../api/queries';
import type { PropertyType } from '../api/types';

const propertyTypeOptions = [
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'mobile', label: 'Mobile Home' },
  { value: 'land', label: 'Land' },
];

export function AddHomeScreen() {
  const navigate = useNavigate();
  const setActiveHomeId = useSetAtom(activeHomeIdAtom);
  const createHome = useCreateHome();

  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [yearBuilt, setYearBuilt] = useState<number | string>('');
  const [sqft, setSqft] = useState<number | string>('');
  const [acreage, setAcreage] = useState<number | string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Home name is required.');
      return;
    }
    setError('');
    try {
      const home = await createHome.mutateAsync({
        name: name.trim(),
        property_type: propertyType ?? undefined,
        address_street: street || undefined,
        address_city: city || undefined,
        address_state: state || undefined,
        address_zip: zip || undefined,
        address_country: country || undefined,
        year_built: yearBuilt ? Number(yearBuilt) : undefined,
        sqft: sqft ? Number(sqft) : undefined,
        acreage: acreage ? Number(acreage) : undefined,
        notes: notes || undefined,
      });
      setActiveHomeId(home.id);
      navigate({ to: '/home' });
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create home.');
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>
      <Group gap={12} mb="xl">
        <IconBuilding size={28} />
        <Title order={2}>Add a home</Title>
      </Group>

      <Paper p="xl" radius="md" withBorder>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <Stack gap="md">
            <TextInput
              label="Home name"
              placeholder="My House, Mountain Cabin…"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
            />

            <Select
              label="Property type"
              placeholder="Select type"
              data={propertyTypeOptions}
              value={propertyType}
              onChange={(v) => setPropertyType(v as PropertyType | null)}
              clearable
            />

            <SimpleGrid cols={2} spacing="md">
              <TextInput
                label="Street address"
                placeholder="123 Main St"
                value={street}
                onChange={(e) => setStreet(e.currentTarget.value)}
              />
              <TextInput
                label="City"
                placeholder="Springfield"
                value={city}
                onChange={(e) => setCity(e.currentTarget.value)}
              />
              <TextInput
                label="State / Province"
                placeholder="CA"
                value={state}
                onChange={(e) => setState(e.currentTarget.value)}
              />
              <TextInput
                label="ZIP / Postal code"
                placeholder="90210"
                value={zip}
                onChange={(e) => setZip(e.currentTarget.value)}
              />
              <TextInput
                label="Country"
                placeholder="USA"
                value={country}
                onChange={(e) => setCountry(e.currentTarget.value)}
              />
            </SimpleGrid>

            <SimpleGrid cols={3} spacing="md">
              <NumberInput
                label="Year built"
                placeholder="1990"
                min={1800}
                max={new Date().getFullYear()}
                value={yearBuilt}
                onChange={setYearBuilt}
              />
              <NumberInput
                label="Square footage"
                placeholder="2400"
                min={0}
                value={sqft}
                onChange={setSqft}
              />
              <NumberInput
                label="Acreage"
                placeholder="0.25"
                min={0}
                decimalScale={4}
                value={acreage}
                onChange={setAcreage}
              />
            </SimpleGrid>

            <Textarea
              label="Notes"
              placeholder="Any notes about this property…"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              rows={3}
            />

            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}

            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={() => navigate({ to: '/dashboard' })}>
                Cancel
              </Button>
              <Button type="submit" loading={createHome.isPending}>
                Add home
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
