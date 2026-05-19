import { useState, useRef } from 'react';
import {
  Title,
  Tabs,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Text,
  Paper,
  Table,
  ActionIcon,
  Badge,
  Avatar,
  Loader,
  Center,
  Image,
  Grid,
  FileButton,
} from '@mantine/core';
import {
  IconBuilding,
  IconPhoto,
  IconFile,
  IconUsers,
  IconTrash,
  IconUpload,
  IconPlus,
  IconX,
  IconBolt,
  IconMap,
} from '@tabler/icons-react';
import { useAtomValue } from 'jotai';
import { activeHomeIdAtom } from '../store/atoms';
import {
  useHome,
  useUpdateHome,
  useHomePhotos,
  useUploadHomePhoto,
  useDeleteHomePhoto,
  useHomeDocuments,
  useUploadHomeDocument,
  useDeleteHomeDocument,
  useHomeMembers,
  useAddHomeMember,
  useRemoveHomeMember,
} from '../api/queries';
import type { PropertyType, HomeDocumentType } from '../api/types';
import { ElectricalPanelsTab } from './ElectricalPanelsScreen';
import { FloorPlansTab } from './FloorPlansTab';

const propertyTypeOptions = [
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'mobile', label: 'Mobile Home' },
  { value: 'land', label: 'Land' },
];

const documentTypeOptions: { value: HomeDocumentType; label: string }[] = [
  { value: 'deed', label: 'Deed' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'survey', label: 'Survey / Plat' },
  { value: 'hoa', label: 'HOA Documents' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'permit', label: 'Permit' },
  { value: 'tax', label: 'Tax Records' },
  { value: 'floor_plan', label: 'Floor Plan' },
  { value: 'other', label: 'Other' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DetailsTab({ homeId }: { homeId: string }) {
  const { data: home, isLoading } = useHome(homeId);
  const updateHome = useUpdateHome(homeId);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

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
  const [purchasePrice, setPurchasePrice] = useState<number | string>('');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<number | string>('');
  const [mortgageLender, setMortgageLender] = useState('');
  const [mortgageNotes, setMortgageNotes] = useState('');
  const [hoaName, setHoaName] = useState('');
  const [hoaContact, setHoaContact] = useState('');
  const [hoaMonthlyDues, setHoaMonthlyDues] = useState<number | string>('');
  const [initialized, setInitialized] = useState(false);

  // Populate form from fetched data (only once)
  if (home && !initialized) {
    setName(home.name);
    setPropertyType(home.property_type ?? null);
    setStreet(home.address_street ?? '');
    setCity(home.address_city ?? '');
    setState(home.address_state ?? '');
    setZip(home.address_zip ?? '');
    setCountry(home.address_country ?? '');
    setYearBuilt(home.year_built ?? '');
    setSqft(home.sqft ?? '');
    setAcreage(home.acreage ?? '');
    setNotes(home.notes ?? '');
    setPurchasePrice(home.purchase_price ?? '');
    setPurchasedAt(home.purchased_at ? home.purchased_at.slice(0, 10) : '');
    setEstimatedValue(home.estimated_value ?? '');
    setMortgageLender(home.mortgage_lender ?? '');
    setMortgageNotes(home.mortgage_notes ?? '');
    setHoaName(home.hoa_name ?? '');
    setHoaContact(home.hoa_contact ?? '');
    setHoaMonthlyDues(home.hoa_monthly_dues ?? '');
    setInitialized(true);
  }

  if (isLoading)
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );

  const handleSave = async () => {
    setSaveStatus('idle');
    setSaveError('');
    try {
      await updateHome.mutateAsync({
        name,
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
        purchase_price: purchasePrice ? Number(purchasePrice) : undefined,
        purchased_at: purchasedAt || undefined,
        estimated_value: estimatedValue ? Number(estimatedValue) : undefined,
        mortgage_lender: mortgageLender || undefined,
        mortgage_notes: mortgageNotes || undefined,
        hoa_name: hoaName || undefined,
        hoa_contact: hoaContact || undefined,
        hoa_monthly_dues: hoaMonthlyDues ? Number(hoaMonthlyDues) : undefined,
      });
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      setSaveError((err as Error).message);
    }
  };

  return (
    <Stack gap="xl">
      <Paper p="lg" withBorder radius="md">
        <Text fw={600} mb="md">
          Basic info
        </Text>
        <Stack gap="md">
          <SimpleGrid cols={2} spacing="md">
            <TextInput
              label="Home name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
            />
            <Select
              label="Property type"
              data={propertyTypeOptions}
              value={propertyType}
              onChange={(v) => setPropertyType(v as PropertyType | null)}
              clearable
            />
          </SimpleGrid>
          <SimpleGrid cols={3} spacing="md">
            <TextInput
              label="Street"
              value={street}
              onChange={(e) => setStreet(e.currentTarget.value)}
            />
            <TextInput label="City" value={city} onChange={(e) => setCity(e.currentTarget.value)} />
            <TextInput
              label="State"
              value={state}
              onChange={(e) => setState(e.currentTarget.value)}
            />
            <TextInput label="ZIP" value={zip} onChange={(e) => setZip(e.currentTarget.value)} />
            <TextInput
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.currentTarget.value)}
            />
          </SimpleGrid>
          <SimpleGrid cols={3} spacing="md">
            <NumberInput
              label="Year built"
              value={yearBuilt}
              onChange={setYearBuilt}
              min={1800}
              max={new Date().getFullYear()}
            />
            <NumberInput label="Square footage" value={sqft} onChange={setSqft} min={0} />
            <NumberInput
              label="Acreage"
              value={acreage}
              onChange={setAcreage}
              min={0}
              decimalScale={4}
            />
          </SimpleGrid>
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={3}
          />
        </Stack>
      </Paper>

      <Paper p="lg" withBorder radius="md">
        <Text fw={600} mb="md">
          Financial info
        </Text>
        <SimpleGrid cols={2} spacing="md">
          <NumberInput
            label="Purchase price"
            value={purchasePrice}
            onChange={setPurchasePrice}
            min={0}
            prefix="$"
            thousandSeparator=","
          />
          <TextInput
            label="Purchase date"
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.currentTarget.value)}
          />
          <NumberInput
            label="Estimated current value"
            value={estimatedValue}
            onChange={setEstimatedValue}
            min={0}
            prefix="$"
            thousandSeparator=","
          />
          <TextInput
            label="Mortgage lender"
            value={mortgageLender}
            onChange={(e) => setMortgageLender(e.currentTarget.value)}
          />
        </SimpleGrid>
        <Textarea
          label="Mortgage notes"
          value={mortgageNotes}
          onChange={(e) => setMortgageNotes(e.currentTarget.value)}
          rows={2}
          mt="md"
        />
      </Paper>

      <Paper p="lg" withBorder radius="md">
        <Text fw={600} mb="md">
          HOA info
        </Text>
        <SimpleGrid cols={3} spacing="md">
          <TextInput
            label="HOA name"
            value={hoaName}
            onChange={(e) => setHoaName(e.currentTarget.value)}
          />
          <TextInput
            label="HOA contact"
            value={hoaContact}
            onChange={(e) => setHoaContact(e.currentTarget.value)}
          />
          <NumberInput
            label="Monthly dues"
            value={hoaMonthlyDues}
            onChange={setHoaMonthlyDues}
            min={0}
            prefix="$"
          />
        </SimpleGrid>
      </Paper>

      <Group justify="flex-end" align="center">
        {saveStatus === 'saved' && (
          <Text c="green" size="sm">
            Saved.
          </Text>
        )}
        {saveStatus === 'error' && (
          <Text c="red" size="sm">
            {saveError}
          </Text>
        )}
        <Button onClick={() => void handleSave()} loading={updateHome.isPending}>
          Save changes
        </Button>
      </Group>
    </Stack>
  );
}

function PhotosTab({ homeId }: { homeId: string }) {
  const { data: photos = [], isLoading } = useHomePhotos(homeId);
  const upload = useUploadHomePhoto(homeId);
  const deletePhoto = useDeleteHomePhoto(homeId);

  const [uploadError, setUploadError] = useState('');
  const handleUpload = (file: File | null) => {
    if (!file) return;
    setUploadError('');
    upload.mutate(file, {
      onError: (err) => setUploadError((err as Error).message),
    });
  };

  if (isLoading)
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );

  return (
    <Stack gap="md">
      <Group justify="flex-end" align="center">
        {uploadError && (
          <Text c="red" size="sm">
            {uploadError}
          </Text>
        )}
        <FileButton onChange={handleUpload} accept="image/jpeg,image/png,image/webp">
          {(props) => (
            <Button {...props} leftSection={<IconUpload size={16} />} loading={upload.isPending}>
              Upload photo
            </Button>
          )}
        </FileButton>
      </Group>

      {photos.length === 0 ? (
        <Center p="xl">
          <Stack align="center" gap="sm">
            <IconPhoto size={40} color="var(--dt-fg-3)" />
            <Text c="dimmed">No photos yet. Upload exterior shots, renovation photos, etc.</Text>
          </Stack>
        </Center>
      ) : (
        <Grid>
          {photos.map((p) => (
            <Grid.Col key={p.id} span={{ base: 6, sm: 4, md: 3 }}>
              <Paper withBorder radius="md" style={{ overflow: 'hidden', position: 'relative' }}>
                <Image src={p.url} alt={p.filename} h={160} fit="cover" />
                <ActionIcon
                  size="sm"
                  color="red"
                  variant="filled"
                  style={{ position: 'absolute', top: 6, right: 6 }}
                  onClick={() => deletePhoto.mutate(p.id)}
                >
                  <IconX size={12} />
                </ActionIcon>
                <Text size="xs" c="dimmed" p={6} truncate>
                  {p.filename}
                </Text>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

function DocumentsTab({ homeId }: { homeId: string }) {
  const { data: docs = [], isLoading } = useHomeDocuments(homeId);
  const upload = useUploadHomeDocument(homeId);
  const deleteDoc = useDeleteHomeDocument(homeId);
  const [uploadType, setUploadType] = useState<HomeDocumentType | null>(null);
  const [uploadError, setUploadError] = useState('');
  const resetRef = useRef<() => void>(null);

  const handleUpload = (file: File | null) => {
    if (!file) return;
    setUploadError('');
    upload.mutate(
      { file, documentType: uploadType ?? undefined },
      {
        onSuccess: () => resetRef.current?.(),
        onError: (err) => setUploadError((err as Error).message),
      }
    );
  };

  if (isLoading)
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );

  return (
    <Stack gap="md">
      <Paper p="md" withBorder radius="md">
        <Group gap="md" wrap="nowrap">
          <Select
            placeholder="Document type"
            data={documentTypeOptions}
            value={uploadType}
            onChange={(v) => setUploadType(v as HomeDocumentType | null)}
            clearable
            style={{ flex: 1 }}
          />
          <FileButton
            resetRef={resetRef}
            onChange={handleUpload}
            accept="application/pdf,image/jpeg,image/png,image/webp"
          >
            {(props) => (
              <Button {...props} leftSection={<IconUpload size={16} />} loading={upload.isPending}>
                Upload document
              </Button>
            )}
          </FileButton>
        </Group>
        {uploadError && (
          <Text c="red" size="sm" mt={6}>
            {uploadError}
          </Text>
        )}
      </Paper>

      {docs.length === 0 ? (
        <Center p="xl">
          <Stack align="center" gap="sm">
            <IconFile size={40} color="var(--dt-fg-3)" />
            <Text c="dimmed">
              No documents yet. Upload deeds, insurance policies, floor plans, etc.
            </Text>
          </Stack>
        </Center>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Size</Table.Th>
              <Table.Th>Uploaded</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {docs.map((d) => (
              <Table.Tr key={d.id}>
                <Table.Td>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--dt-fg)' }}
                  >
                    {d.filename}
                  </a>
                </Table.Td>
                <Table.Td>
                  {d.document_type ? (
                    <Badge variant="light" size="sm">
                      {documentTypeOptions.find((o) => o.value === d.document_type)?.label ??
                        d.document_type}
                    </Badge>
                  ) : (
                    <Text c="dimmed" size="sm">
                      —
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>{formatBytes(d.size)}</Table.Td>
                <Table.Td>{new Date(d.created_at).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <ActionIcon color="red" variant="subtle" onClick={() => deleteDoc.mutate(d.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}

function MembersTab({ homeId }: { homeId: string }) {
  const { data: members = [], isLoading } = useHomeMembers(homeId);
  const addMember = useAddHomeMember(homeId);
  const removeMember = useRemoveHomeMember(homeId);
  const [email, setEmail] = useState('');
  const [addError, setAddError] = useState('');

  const handleAdd = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setAddError('');
    try {
      await addMember.mutateAsync({ email: email.trim() });
      setEmail('');
    } catch (err) {
      setAddError((err as Error).message);
    }
  };

  if (isLoading)
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );

  return (
    <Stack gap="md">
      <Paper p="md" withBorder radius="md">
        <Text fw={600} mb="sm">
          Invite member
        </Text>
        <form onSubmit={(e) => void handleAdd(e)}>
          <Group gap="md" wrap="nowrap">
            <TextInput
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              type="email"
              style={{ flex: 1 }}
            />
            <Button
              type="submit"
              leftSection={<IconPlus size={16} />}
              loading={addMember.isPending}
            >
              Invite
            </Button>
          </Group>
          {addError && (
            <Text c="red" size="sm" mt={6}>
              {addError}
            </Text>
          )}
        </form>
      </Paper>

      <Stack gap="sm">
        {members.map((m) => (
          <Paper key={m.user_id} p="sm" withBorder radius="md">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm">
                <Avatar size={36} radius="xl" color="blue">
                  {m.user_name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </Avatar>
                <div>
                  <Text size="sm" fw={500}>
                    {m.user_name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {m.user_email}
                  </Text>
                </div>
              </Group>
              <Group gap="sm">
                <Badge variant="light" color={m.role === 'owner' ? 'blue' : 'gray'}>
                  {m.role}
                </Badge>
                {m.role !== 'owner' && (
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => removeMember.mutate(m.user_id)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
          </Paper>
        ))}
        {members.length === 0 && (
          <Center p="xl">
            <Stack align="center" gap="sm">
              <IconUsers size={40} color="var(--dt-fg-3)" />
              <Text c="dimmed">No members found.</Text>
            </Stack>
          </Center>
        )}
      </Stack>
    </Stack>
  );
}

export function HomeDetailScreen() {
  const activeHomeId = useAtomValue(activeHomeIdAtom);
  const { data: home } = useHome(activeHomeId ?? '');

  if (!activeHomeId) {
    return (
      <Center p="xl">
        <Text c="dimmed">No active home selected. Use the home picker in the header.</Text>
      </Center>
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 860 }}>
        <Group gap={12} mb="xl">
          <IconBuilding size={26} />
          <Title order={2}>{home?.name ?? 'Home'}</Title>
          {home?.role === 'owner' && (
            <Badge variant="light" color="blue" size="sm">
              owner
            </Badge>
          )}
        </Group>
      </div>

      <Tabs defaultValue="details">
        <div style={{ maxWidth: 860 }}>
          <Tabs.List mb="lg">
            <Tabs.Tab value="details" leftSection={<IconBuilding size={16} />}>
              Details
            </Tabs.Tab>
            <Tabs.Tab value="photos" leftSection={<IconPhoto size={16} />}>
              Photos
            </Tabs.Tab>
            <Tabs.Tab value="documents" leftSection={<IconFile size={16} />}>
              Documents
            </Tabs.Tab>
            <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>
              Members
            </Tabs.Tab>
            <Tabs.Tab value="electrical" leftSection={<IconBolt size={16} />}>
              Electrical Panels
            </Tabs.Tab>
            <Tabs.Tab value="floor-plans" leftSection={<IconMap size={16} />}>
              Floor Plans
            </Tabs.Tab>
          </Tabs.List>
        </div>

        <div style={{ maxWidth: 860 }}>
          <Tabs.Panel value="details">
            <DetailsTab homeId={activeHomeId} />
          </Tabs.Panel>
          <Tabs.Panel value="photos">
            <PhotosTab homeId={activeHomeId} />
          </Tabs.Panel>
          <Tabs.Panel value="documents">
            <DocumentsTab homeId={activeHomeId} />
          </Tabs.Panel>
          <Tabs.Panel value="members">
            <MembersTab homeId={activeHomeId} />
          </Tabs.Panel>
          <Tabs.Panel value="electrical">
            <ElectricalPanelsTab homeId={activeHomeId} homeName={home?.name ?? 'Home'} />
          </Tabs.Panel>
        </div>

        <Tabs.Panel value="floor-plans">
          <FloorPlansTab homeId={activeHomeId} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
