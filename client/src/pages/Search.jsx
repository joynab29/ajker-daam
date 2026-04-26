import { useEffect, useState } from 'react'
import { Title, Select, TextInput, NumberInput, Button, SimpleGrid, Stack, Text, Group } from '@mantine/core'
import { api } from '../api.js'

export default function Search() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    api('/products').then((d) => setProducts(d.products))
  }, [])

  async function search(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (productId) params.set('productId', productId)
    if (area) params.set('area', area)
    if (district) params.set('district', district)
    if (minPrice !== '') params.set('minPrice', minPrice)
    if (maxPrice !== '') params.set('maxPrice', maxPrice)
    if (q) params.set('q', q)
    const data = await api('/prices?' + params.toString())
    setResults(data.prices)
  }

  return (
    <div>
      <Title order={1} mb="md">Search prices</Title>
      <form onSubmit={search}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} maw={600} spacing="sm">
          <Select
            value={productId}
            onChange={(v) => setProductId(v || '')}
            data={[{ value: '', label: '— any product —' }, ...products.map((p) => ({ value: p._id, label: p.name }))]}
          />
          <TextInput placeholder="search product name" value={q} onChange={(e) => setQ(e.target.value)} />
          <TextInput placeholder="area" value={area} onChange={(e) => setArea(e.target.value)} />
          <TextInput placeholder="district" value={district} onChange={(e) => setDistrict(e.target.value)} />
          <NumberInput placeholder="min price" value={minPrice} onChange={(v) => setMinPrice(v ?? '')} min={0} />
          <NumberInput placeholder="max price" value={maxPrice} onChange={(v) => setMaxPrice(v ?? '')} min={0} />
        </SimpleGrid>
        <Button type="submit" mt="sm">Search</Button>
      </form>

      <Title order={2} mt="md" mb="xs">Results ({results.length})</Title>
      <Stack gap={0}>
        {results.map((p) => (
          <Group key={p._id} py="xs" gap="xs" style={{ borderBottom: '1px solid #eee' }} wrap="wrap">
            <Text fw={600}>{p.productId?.name}</Text>
            <Text>— {p.price} / {p.unit} —</Text>
            <Text>{[p.area, p.district].filter(Boolean).join(', ') || 'unknown'}</Text>
          </Group>
        ))}
      </Stack>
    </div>
  )
}
