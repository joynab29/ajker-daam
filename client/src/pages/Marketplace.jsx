import { useEffect, useState } from 'react'
import { Title, TextInput, Textarea, NumberInput, FileInput, Button, Stack, Group, SimpleGrid, Card, Image, Text, Alert } from '@mantine/core'
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
      <Title order={1} mb="md">Farmer Marketplace</Title>

      {user?.role === 'farmer' && (
        <>
          <Title order={2} mb="sm">Post a listing</Title>
          <form onSubmit={add}>
            <Stack gap="sm" maw={520}>
              <TextInput placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <Textarea placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Group gap="xs" grow>
                <NumberInput placeholder="price" value={price} onChange={(v) => setPrice(v ?? '')} min={0} decimalScale={2} required />
                <TextInput placeholder="unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
                <NumberInput placeholder="qty available" value={quantityAvailable} onChange={(v) => setQty(v ?? '')} min={0} />
              </Group>
              <Group gap="xs" grow>
                <TextInput placeholder="area" value={area} onChange={(e) => setArea(e.target.value)} />
                <TextInput placeholder="district" value={district} onChange={(e) => setDistrict(e.target.value)} />
              </Group>
              <TextInput placeholder="contact (phone/email)" value={contact} onChange={(e) => setContact(e.target.value)} />
              <FileInput accept="image/*" placeholder="photo" value={photo} onChange={setPhoto} />
              <Button type="submit">Post listing</Button>
            </Stack>
          </form>
          {err && <Alert color="red" mt="sm">{err}</Alert>}
        </>
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
              <Text size="xs" c="dimmed">By {l.farmerId?.name}{l.contact && ` — ${l.contact}`}</Text>
              {(user?.id === l.farmerId?._id || user?.role === 'admin') && (
                <Button size="xs" color="red" mt="xs" onClick={() => remove(l._id)}>Delete</Button>
              )}
            </Card>
          ))}
        </SimpleGrid>
      )}
    </div>
  )
}
