import { useEffect, useState } from 'react'
import { Title, TextInput, Textarea, NumberInput, FileInput, Button, Stack, Group, SimpleGrid, Card, Image, Text, Alert, Paper } from '@mantine/core'
import { api, apiUpload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

const SERVER = 'http://localhost:4000'

export default function Marketplace() {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('kg')
  const [quantityAvailable, setQty] = useState('')
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [contact, setContact] = useState('')
  const [photo, setPhoto] = useState(null)
  const [err, setErr] = useState('')

  function load() {
    api('/listings').then((d) => setListings(d.listings))
  }

  useEffect(() => {
    load()
  }, [])

  async function add(e) {
    e.preventDefault()
    setErr('')
    const fd = new FormData()
    fd.append('title', title)
    fd.append('description', description)
    fd.append('price', price)
    fd.append('unit', unit)
    fd.append('quantityAvailable', quantityAvailable)
    fd.append('area', area)
    fd.append('district', district)
    fd.append('contact', contact)
    if (photo) fd.append('photo', photo)
    try {
      await apiUpload('/listings', fd)
      setTitle('')
      setDescription('')
      setPrice('')
      setQty('')
      setContact('')
      setPhoto(null)
      load()
    } catch (e) {
      setErr(e.message)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this listing?')) return
    await api(`/listings/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <Title order={1} mb="md">Marketplace</Title>

      {user?.role === 'vendor' && (
        <Paper withBorder p="md" radius="md" mb="lg">
          <Title order={3} mb="sm">Post a listing</Title>
          <form onSubmit={add}>
            <Stack gap="sm" maw={520}>
              <TextInput label="Title" placeholder="e.g. Fresh tomatoes" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <Textarea label="Description" placeholder="optional details" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Group gap="xs" grow>
                <NumberInput label="Price" placeholder="0.00" value={price} onChange={(v) => setPrice(v ?? '')} min={0} decimalScale={2} required />
                <TextInput label="Unit" placeholder="kg, L, dozen" value={unit} onChange={(e) => setUnit(e.target.value)} />
                <NumberInput label="Qty available" placeholder="0" value={quantityAvailable} onChange={(v) => setQty(v ?? '')} min={0} />
              </Group>
              <Group gap="xs" grow>
                <TextInput label="Area" placeholder="e.g. Mirpur" value={area} onChange={(e) => setArea(e.target.value)} />
                <TextInput label="District" placeholder="e.g. Dhaka" value={district} onChange={(e) => setDistrict(e.target.value)} />
              </Group>
              <TextInput label="Contact" placeholder="phone or email" value={contact} onChange={(e) => setContact(e.target.value)} />
              <FileInput label="Photo" accept="image/*" placeholder="optional" value={photo} onChange={setPhoto} clearable />
              <Button type="submit">Post listing</Button>
            </Stack>
          </form>
          {err && <Alert color="red" mt="sm">{err}</Alert>}
        </Paper>
      )}

      <Title order={2} mt="lg" mb="sm">All listings</Title>
      {listings.length === 0 ? (
        <Text>No listings yet.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {listings.map((l) => (
            <Card key={l._id} withBorder padding="sm" radius="md">
              {l.imageUrl && (
                <Card.Section>
                  <Image src={SERVER + l.imageUrl} alt={l.title} h={140} fit="cover" />
                </Card.Section>
              )}
              <Title order={3} mt="xs">{l.title}</Title>
              <Text>{l.price} / {l.unit} {l.quantityAvailable ? `(${l.quantityAvailable} avail)` : ''}</Text>
              {l.description && <Text size="sm">{l.description}</Text>}
              <Text size="xs" c="dimmed">{[l.area, l.district].filter(Boolean).join(', ')}</Text>
              <Text size="xs" c="dimmed">By {l.vendorId?.name}{l.contact && ` — ${l.contact}`}</Text>
              {(user?.id === l.vendorId?._id || user?.role === 'admin') && (
                <Button size="xs" color="red" mt="xs" onClick={() => remove(l._id)}>Delete</Button>
              )}
            </Card>
          ))}
        </SimpleGrid>
      )}
    </div>
  )
}
