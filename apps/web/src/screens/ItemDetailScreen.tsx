import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  ActionIcon,
  Tabs,
  Loader,
  Center,
  Modal,
} from '@mantine/core';
import {
  IconPrinter,
  IconEdit,
  IconTrash,
  IconBox,
  IconChevronLeft,
  IconChevronRight,
  IconCamera,
  IconMapPin,
  IconShield,
  IconPlus,
  IconUpload,
  IconFileTypePdf,
  IconPhoto,
  IconFile,
  IconDownload,
  IconStar,
  IconStarFilled,
} from '@tabler/icons-react';
import { Fragment, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { modals } from '@mantine/modals';
import {
  useItem,
  useLabels,
  useLocations,
  useMaintenance,
  useItemPhotos,
  useUploadPhoto,
  useDeletePhoto,
  useSetCoverPhoto,
  useItemDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDeleteItem,
} from '../api/queries';
import { getLocationChain, formatCurrency, formatDate, formatBytes } from '../utils';
import { StatusBadge } from './AllItemsScreen';

interface ItemDetailScreenProps {
  itemId: string;
}

export function ItemDetailScreen({ itemId }: ItemDetailScreenProps) {
  const navigate = useNavigate();
  const { data: item, isLoading } = useItem(itemId);
  const { data: locations = [] } = useLocations();
  const { data: labels = [] } = useLabels();
  const { data: maintenance = [] } = useMaintenance(itemId);
  const { data: photos = [] } = useItemPhotos(itemId);
  const uploadPhoto = useUploadPhoto(itemId);
  const deletePhoto = useDeletePhoto(itemId);
  const setCoverPhoto = useSetCoverPhoto(itemId);
  const { data: documents = [] } = useItemDocuments(itemId);
  const uploadDocument = useUploadDocument(itemId);
  const deleteDocument = useDeleteDocument(itemId);
  const deleteItem = useDeleteItem();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [docDragOver, setDocDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const currentPhoto = photos[photoIndex] ?? null;

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    uploadPhoto.mutate(files[0], {
      onSuccess: () => {
        setUploadOpen(false);
        setPhotoIndex(photos.length); // jump to new photo
      },
    });
  }

  if (isLoading)
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  if (!item)
    return (
      <Text c="dimmed" ta="center" mt={32}>
        Item not found.
      </Text>
    );

  const chain = item.location_id ? getLocationChain(locations, item.location_id) : [];

  return (
    <>
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete item"
        size="sm"
      >
        <Stack gap={16}>
          <Text size="sm">
            Are you sure you want to delete <strong>{item?.name}</strong>? This cannot be undone.
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="default" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteItem.isPending}
              onClick={() =>
                deleteItem.mutate(itemId, {
                  onSuccess: () => navigate({ to: '/items' }),
                })
              }
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={uploadOpen} onClose={() => setUploadOpen(false)} title="Add photo" size="sm">
        <Stack gap={12}>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            style={{
              padding: 32,
              textAlign: 'center',
              border: `2px dashed ${dragOver ? 'var(--mantine-color-blue-5)' : 'var(--dt-border)'}`,
              borderRadius: 8,
              background: dragOver ? 'var(--mantine-color-blue-0)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <IconUpload
              size={28}
              color={dragOver ? 'var(--mantine-color-blue-6)' : 'var(--dt-gray-5)'}
            />
            <Text size="sm" fw={600}>
              {uploadPhoto.isPending ? 'Uploading…' : 'Drop photo here or click to select'}
            </Text>
            <Text size="xs" c="dimmed">
              JPEG, PNG or WEBP · max 10 MB
            </Text>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploadPhoto.isError && (
            <Text size="xs" c="red">
              {(uploadPhoto.error as Error).message}
            </Text>
          )}
        </Stack>
      </Modal>

      <Stack gap={14}>
        <Group gap={4} style={{ fontSize: 13, color: 'var(--dt-fg-3)' }}>
          <button
            style={{
              background: 'none',
              border: 0,
              cursor: 'pointer',
              color: 'var(--dt-fg-2)',
              fontSize: 13,
            }}
            onClick={() => navigate({ to: '/items' })}
          >
            All items
          </button>
          <span>/</span>
          <span style={{ color: 'var(--dt-fg-1)', fontWeight: 500 }}>{item.name}</span>
        </Group>

        <Group justify="space-between">
          <Title order={1} style={{ fontSize: '1.75rem' }}>
            {item.name}
          </Title>
          <Group gap={8}>
            <Button variant="default" size="sm" leftSection={<IconPrinter size={14} />}>
              Print label
            </Button>
            <Button
              variant="default"
              size="sm"
              leftSection={<IconEdit size={14} />}
              onClick={() => navigate({ to: '/items/$itemId/edit', params: { itemId: itemId } })}
            >
              Edit
            </Button>
            <Button
              variant="light"
              color="red"
              size="sm"
              leftSection={<IconTrash size={14} />}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete
            </Button>
          </Group>
        </Group>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
          <Stack gap={12}>
            <Paper
              withBorder
              radius="md"
              style={{ overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}
            >
              {currentPhoto ? (
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.filename}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div
                  className="item-card-thumb ph-1"
                  style={{ width: '100%', height: '100%', borderRadius: 0 }}
                >
                  <IconBox size={56} color="rgba(255,255,255,.6)" />
                </div>
              )}
              {currentPhoto && (
                <Group gap={6} style={{ position: 'absolute', top: 6, right: 6 }}>
                  {photos.length > 1 && !currentPhoto.is_cover && (
                    <ActionIcon
                      variant="filled"
                      color="yellow"
                      size="sm"
                      title="Set as cover photo"
                      onClick={() => setCoverPhoto.mutate(currentPhoto.id)}
                    >
                      <IconStar size={12} />
                    </ActionIcon>
                  )}
                  {currentPhoto.is_cover && photos.length > 1 && (
                    <ActionIcon
                      variant="filled"
                      color="yellow"
                      size="sm"
                      disabled
                      title="Cover photo"
                    >
                      <IconStarFilled size={12} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size="sm"
                    onClick={() =>
                      modals.openConfirmModal({
                        title: 'Delete photo',
                        children: (
                          <Text size="sm">
                            Are you sure you want to delete this photo? This cannot be undone.
                          </Text>
                        ),
                        labels: { confirm: 'Delete', cancel: 'Cancel' },
                        confirmProps: { color: 'red' },
                        onConfirm: () => {
                          deletePhoto.mutate(currentPhoto.id, {
                            onSuccess: () => setPhotoIndex(Math.max(0, photoIndex - 1)),
                          });
                        },
                      })
                    }
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              )}
            </Paper>
            <Group gap={6} justify="center">
              <ActionIcon
                variant="default"
                size="md"
                disabled={photos.length === 0 || photoIndex === 0}
                onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
              >
                <IconChevronLeft size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {photos.length === 0 ? 'No photos' : `${photoIndex + 1} / ${photos.length}`}
              </Text>
              <ActionIcon
                variant="default"
                size="md"
                disabled={photos.length === 0 || photoIndex === photos.length - 1}
                onClick={() => setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))}
              >
                <IconChevronRight size={16} />
              </ActionIcon>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconCamera size={12} />}
                ml={8}
                onClick={() => setUploadOpen(true)}
              >
                Add photo
              </Button>
            </Group>

            {item.asset_id && (
              <Paper withBorder p={16} radius="md">
                <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={8}>
                  Asset ID
                </Text>
                <span className="qr-pill">{item.asset_id}</span>
              </Paper>
            )}

            <Paper withBorder p={16} radius="md">
              <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={8}>
                Quick facts
              </Text>
              <FactRow label="Status" value={<StatusBadge status={item.status} />} />
              <FactRow
                label="Location"
                value={
                  chain.length > 0 ? (
                    <Group gap={4}>
                      <IconMapPin size={14} color="var(--dt-fg-3)" />
                      <Text size="sm">
                        {chain.map((c, i) => (
                          <span key={c.id}>
                            {i > 0 && <span style={{ color: 'var(--dt-fg-3)' }}> · </span>}
                            <a
                              href="#"
                              style={{ color: 'var(--dt-blue-7)' }}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate({
                                  to: '/locations/$locationId',
                                  params: { locationId: c.id },
                                });
                              }}
                            >
                              {c.name}
                            </a>
                          </span>
                        ))}
                      </Text>
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  )
                }
              />
              <FactRow
                label="Insured"
                value={
                  item.insured ? (
                    <Group gap={4} style={{ color: '#099268' }}>
                      <IconShield size={14} />
                      Yes
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No
                    </Text>
                  )
                }
              />
              <FactRow
                label="Purchased"
                value={<Text size="sm">{formatDate(item.purchased_at)}</Text>}
              />
              <FactRow
                label="Value"
                value={
                  <Text size="sm" className="mono">
                    {formatCurrency(item.purchase_price)}
                  </Text>
                }
              />
            </Paper>
          </Stack>

          <Paper withBorder p={16} radius="md">
            <Tabs defaultValue="overview">
              <Tabs.List mb={16}>
                <Tabs.Tab value="overview">Overview</Tabs.Tab>
                <Tabs.Tab value="documents">Documents</Tabs.Tab>
                <Tabs.Tab value="maintenance">Maintenance</Tabs.Tab>
                <Tabs.Tab value="history">History</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="overview">
                <Stack gap={18}>
                  <div>
                    <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={6}>
                      Description
                    </Text>
                    <Text size="sm">
                      {item.description ?? (
                        <span style={{ color: 'var(--dt-fg-3)' }}>No description yet.</span>
                      )}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={8}>
                      Labels
                    </Text>
                    <Group gap={6} wrap="wrap">
                      {item.label_ids.map((lid) => {
                        const l = labels.find((x) => x.id === lid);
                        return l ? (
                          <span
                            key={lid}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              border: '1px solid var(--dt-border)',
                              borderRadius: 6,
                              fontSize: 12,
                              color: 'var(--dt-fg-2)',
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: l.color,
                              }}
                            />
                            {l.name}
                          </span>
                        ) : null;
                      })}
                      <button
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          border: '1px dashed var(--dt-border)',
                          borderRadius: 6,
                          fontSize: 12,
                          color: 'var(--dt-fg-3)',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <IconPlus size={12} />
                        Add label
                      </button>
                    </Group>
                  </div>
                  <div>
                    <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={8}>
                      Details
                    </Text>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '180px 1fr',
                        rowGap: 8,
                        columnGap: 16,
                        fontSize: 13,
                      }}
                    >
                      <Text size="sm" c="dimmed">
                        Manufacturer
                      </Text>
                      <Text size="sm">{item.manufacturer ?? '—'}</Text>
                      <Text size="sm" c="dimmed">
                        Model
                      </Text>
                      <Text size="sm" className="mono">
                        {item.model ?? '—'}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Serial number
                      </Text>
                      <Text size="sm" className="mono">
                        {item.serial ?? '—'}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Warranty
                      </Text>
                      <Text size="sm">{item.warranty ?? '—'}</Text>
                      <Text size="sm" c="dimmed">
                        Warranty expires
                      </Text>
                      <Text size="sm">{formatDate(item.warranty_expires_at)}</Text>
                      <Text size="sm" c="dimmed">
                        Purchase price
                      </Text>
                      <Text size="sm" className="mono">
                        {formatCurrency(item.purchase_price)}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Quantity
                      </Text>
                      <Text size="sm">1</Text>
                      {item.custom_fields.map((field) => (
                        <Fragment key={field.key}>
                          <Text size="sm" c="dimmed">
                            {field.label}
                          </Text>
                          <Text size="sm">
                            {field.value
                              ? field.unit
                                ? `${field.value} ${field.unit}`
                                : field.value
                              : '—'}
                          </Text>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  {item.notes && (
                    <div>
                      <Text size="xs" fw={700} tt="uppercase" lts="0.06em" c="dimmed" mb={6}>
                        Notes
                      </Text>
                      <div
                        style={{
                          padding: 10,
                          background: 'var(--dt-warn-bg)',
                          borderRadius: 6,
                          fontSize: 13,
                          border: '1px solid #fab00533',
                        }}
                      >
                        {item.notes}
                      </div>
                    </div>
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="documents">
                <Stack gap={10}>
                  {documents.length > 0 && (
                    <Stack gap={6}>
                      {documents.map((doc) => (
                        <Group
                          key={doc.id}
                          gap={10}
                          p={10}
                          style={{ border: '1px solid var(--dt-border)', borderRadius: 6 }}
                        >
                          <div style={{ color: 'var(--dt-fg-3)', flexShrink: 0 }}>
                            {doc.content_type === 'application/pdf' ? (
                              <IconFileTypePdf size={22} />
                            ) : doc.content_type.startsWith('image/') ? (
                              <IconPhoto size={22} />
                            ) : (
                              <IconFile size={22} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={500} truncate>
                              {doc.filename}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {formatBytes(doc.size)}
                            </Text>
                          </div>
                          <ActionIcon
                            component="a"
                            href={doc.url}
                            download={doc.filename}
                            variant="subtle"
                            color="gray"
                            size="sm"
                          >
                            <IconDownload size={15} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            loading={deleteDocument.isPending}
                            onClick={() =>
                              modals.openConfirmModal({
                                title: 'Delete document',
                                children: (
                                  <Text size="sm">
                                    Are you sure you want to delete <strong>{doc.filename}</strong>?
                                    This cannot be undone.
                                  </Text>
                                ),
                                labels: { confirm: 'Delete', cancel: 'Cancel' },
                                confirmProps: { color: 'red' },
                                onConfirm: () => deleteDocument.mutate(doc.id),
                              })
                            }
                          >
                            <IconTrash size={15} />
                          </ActionIcon>
                        </Group>
                      ))}
                    </Stack>
                  )}
                  <div
                    onClick={() => docInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDocDragOver(true);
                    }}
                    onDragLeave={() => setDocDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDocDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) uploadDocument.mutate(file);
                    }}
                    style={{
                      padding: 28,
                      textAlign: 'center',
                      border: `2px dashed ${docDragOver ? 'var(--mantine-color-blue-5)' : 'var(--dt-border)'}`,
                      borderRadius: 8,
                      background: docDragOver ? 'var(--mantine-color-blue-0)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <IconUpload
                      size={24}
                      color={docDragOver ? 'var(--mantine-color-blue-6)' : 'var(--dt-gray-5)'}
                    />
                    <Text size="sm" fw={600}>
                      {uploadDocument.isPending
                        ? 'Uploading…'
                        : 'Drop file here or click to select'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      PDF, JPG, PNG up to 10 MB
                    </Text>
                  </div>
                  <input
                    ref={docInputRef}
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadDocument.mutate(file);
                      e.target.value = '';
                    }}
                  />
                  {uploadDocument.isError && (
                    <Text size="xs" c="red">
                      {(uploadDocument.error as Error).message}
                    </Text>
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="maintenance">
                <Stack gap={10}>
                  <Group gap={8}>
                    <Button size="sm" leftSection={<IconPlus size={14} />}>
                      Log maintenance
                    </Button>
                  </Group>
                  {maintenance.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      No maintenance logs yet.
                    </Text>
                  ) : (
                    maintenance.map((m) => (
                      <Group
                        key={m.id}
                        align="flex-start"
                        gap={12}
                        p={10}
                        style={{ border: '1px solid var(--dt-border)', borderRadius: 6 }}
                      >
                        <Text
                          size="xs"
                          className="mono"
                          c="dimmed"
                          style={{ width: 90, paddingTop: 2 }}
                        >
                          {m.performed_at}
                        </Text>
                        <div style={{ flex: 1 }}>
                          <Text size="sm" fw={500}>
                            {m.title}
                          </Text>
                          {m.notes && (
                            <Text size="xs" c="dimmed" mt={2}>
                              {m.notes}
                            </Text>
                          )}
                        </div>
                        {m.cost != null && (
                          <Text size="xs" className="mono">
                            {formatCurrency(m.cost)}
                          </Text>
                        )}
                      </Group>
                    ))
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="history">
                <Text size="sm" c="dimmed">
                  Activity history coming soon.
                </Text>
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </div>
      </Stack>
    </>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group
      justify="space-between"
      style={{ padding: '6px 0', borderBottom: '1px solid var(--dt-divider)', fontSize: 13 }}
    >
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <div>{value}</div>
    </Group>
  );
}
