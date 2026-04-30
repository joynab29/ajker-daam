import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Title,
  Text,
  Stack,
  Group,
  SimpleGrid,
  Paper,
  TextInput,
  NumberInput,
  Select,
  Button,
  Badge,
  Center,
  Loader,
  Box,
  Autocomplete,
  ActionIcon,
} from '@mantine/core'
import { api } from '../api.js'

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(11,61,46,0.08)',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(11,61,46,0.06)',
  padding: 22,
}

const PAGE_SIZE = 9
const DEBOUNCE_MS = 220

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toFixed(2)
}

function timeAgo(ts) {
  const sec = Math.max(1, Math.round((Date.now() - ts) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  return `${d}d ago`
}

function FilterChip({ label, onRemove }) {
  return (
    <Badge
      variant="filled"
      color="lime"
      radius="xl"
      size="lg"
      styles={{ root: { color: '#0b3d2e', textTransform: 'none', fontWeight: 600, paddingRight: 8 } }}
      rightSection={
        <ActionIcon
          size="xs"
          radius="xl"
          variant="transparent"
          onClick={onRemove}
          aria-label={`remove ${label}`}
          style={{ color: '#0b3d2e' }}
        >
          ×
        </ActionIcon>
      }
    >
      {label}
    </Badge>
  )
}

export default function Search() {
  const [products, setProducts] = useState([])
  const [productAvg, setProductAvg] = useState({})
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const [query, setQuery] = useState('')
  const [productId, setProductId] = useState('')
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)

  const reqId = useRef(0)
  const initial = useRef(true)

  useEffect(() => {
    api('/products').then((d) => setProducts(d.products || []))
    api('/prices').then((d) => {
      const all = d.prices || []
      const map = {}
      for (const p of all) {
        const id = p.productId?._id
        if (!id) continue
        if (!map[id]) map[id] = { sum: 0, n: 0 }
        map[id].sum += p.price
        map[id].n += 1
      }
      const avg = {}
      for (const [id, { sum, n }] of Object.entries(map)) avg[id] = sum / n
      setProductAvg(avg)
    })
  }, [])

  useEffect(() => {
    const me = ++reqId.current
    setLoading(true)
    const t = setTimeout(async () => {
      const params = new URLSearchParams()
      if (productId) params.set('productId', productId)
      if (area) params.set('area', area)
      if (district) params.set('district', district)
      if (minPrice !== '') params.set('minPrice', minPrice)
      if (maxPrice !== '') params.set('maxPrice', maxPrice)
      if (query) params.set('q', query)
      try {
        const data = await api('/prices?' + params.toString())
        if (reqId.current === me) {
          setResults(data.prices || [])
          setPage(1)
        }
      } catch {
        if (reqId.current === me) setResults([])
      } finally {
        if (reqId.current === me) setLoading(false)
      }
    }, initial.current ? 0 : DEBOUNCE_MS)
    initial.current = false
    return () => clearTimeout(t)
  }, [productId, area, district, minPrice, maxPrice, query])

  // suggestions: union of product names matching the query + recent locations
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products.slice(0, 8).map((p) => p.name)
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => p.name)
  }, [products, query])

  const sorted = useMemo(() => {
    if (!results) return []
    const arr = [...results]
    arr.sort((a, b) => {
      if (sort === 'price_asc')  return a.price - b.price
      if (sort === 'price_desc') return b.price - a.price
      // latest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return arr
  }, [results, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilters = [
    productId && {
      key: 'product',
      label: `Product: ${products.find((p) => p._id === productId)?.name || '…'}`,
      clear: () => setProductId(''),
    },
    area && { key: 'area', label: `Area: ${area}`, clear: () => setArea('') },
    district && { key: 'district', label: `District: ${district}`, clear: () => setDistrict('') },
    minPrice !== '' && { key: 'min', label: `Min ৳${minPrice}`, clear: () => setMinPrice('') },
    maxPrice !== '' && { key: 'max', label: `Max ৳${maxPrice}`, clear: () => setMaxPrice('') },
    query && { key: 'q', label: `“${query}”`, clear: () => setQuery('') },
  ].filter(Boolean)

  function clearAll() {
    setQuery(''); setProductId(''); setArea(''); setDistrict(''); setMinPrice(''); setMaxPrice('')
  }

  return (
    <Stack gap="xl">
      <style>{`
        .result-card { transition: transform 160ms ease, box-shadow 160ms ease; }
        .result-card:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(11,61,46,0.10); }
      `}</style>

      <Stack gap={4}>
        <span className="section-eyebrow">Search</span>
        <h1 className="display" style={{ margin: 0 }}>Find a <span style={{ color: '#65a30d' }}>fair price</span></h1>
        <Text c="dimmed" maw={620}>
          Type a product, area, or district. Results update as you type, with each card showing how it compares to the global average.
        </Text>
      </Stack>

      <Paper style={cardStyle}>
        <Stack gap="sm">
          <Autocomplete
            placeholder="Search a product (e.g. tomato, onion)…"
            value={query}
            onChange={setQuery}
            data={suggestions}
            radius="xl"
            size="md"
            limit={8}
            leftSection={<Text>🔎</Text>}
            rightSection={
              query ? (
                <ActionIcon variant="subtle" onClick={() => setQuery('')} aria-label="clear">×</ActionIcon>
              ) : null
            }
          />

          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
            <Select
              label="Product"
              value={productId}
              onChange={(v) => setProductId(v || '')}
              data={[{ value: '', label: 'Any product' }, ...products.map((p) => ({ value: p._id, label: p.name }))]}
              radius="xl"
              searchable
              allowDeselect={false}
            />
            <TextInput
              label="Area"
              placeholder="e.g. Mirpur"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              radius="xl"
            />
            <TextInput
              label="District"
              placeholder="e.g. Dhaka"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              radius="xl"
            />
            <Select
              label="Sort"
              value={sort}
              onChange={(v) => setSort(v || 'latest')}
              data={[
                { value: 'latest', label: 'Latest' },
                { value: 'price_asc', label: 'Price: low → high' },
                { value: 'price_desc', label: 'Price: high → low' },
              ]}
              radius="xl"
              allowDeselect={false}
            />
          </SimpleGrid>

          <Group gap="sm" align="end" wrap="wrap">
            <NumberInput
              label="Min ৳"
              placeholder="0"
              value={minPrice}
              onChange={(v) => setMinPrice(v ?? '')}
              min={0}
              radius="xl"
              w={120}
            />
            <NumberInput
              label="Max ৳"
              placeholder="∞"
              value={maxPrice}
              onChange={(v) => setMaxPrice(v ?? '')}
              min={0}
              radius="xl"
              w={120}
            />
            <Box style={{ flex: 1 }} />
            {activeFilters.length > 0 && (
              <Button
                variant="subtle"
                color="forest"
                radius="xl"
                onClick={clearAll}
              >
                Clear all
              </Button>
            )}
          </Group>

          {activeFilters.length > 0 && (
            <Group gap={6} wrap="wrap">
              {activeFilters.map((f) => (
                <FilterChip key={f.key} label={f.label} onRemove={f.clear} />
              ))}
            </Group>
          )}
        </Stack>
      </Paper>

      <Group justify="space-between" align="center" wrap="wrap">
        <Text size="sm" c="dimmed">
          {results == null
            ? 'Searching…'
            : `${sorted.length} result${sorted.length === 1 ? '' : 's'}${
                totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''
              }`}
        </Text>
        {loading && (
          <Group gap={6}>
            <Loader size="xs" color="forest.7" />
            <Text size="xs" c="dimmed">updating…</Text>
          </Group>
        )}
      </Group>

      {results === null ? (
        <Center mih={260}>
          <Stack align="center" gap="sm">
            <Loader color="forest.7" />
            <Text c="dimmed">Loading prices…</Text>
          </Stack>
        </Center>
      ) : sorted.length === 0 ? (
        <Paper style={cardStyle}>
          <Center mih={220}>
            <Stack align="center" gap={6}>
              <Box style={{ fontSize: 44 }}>🥬</Box>
              <Text fw={600}>No results.</Text>
              <Text c="dimmed" size="sm" ta="center" maw={360}>
                {activeFilters.length === 0
                  ? 'No price reports yet. Submit a price to get the feed going.'
                  : 'Try removing a filter or broadening the search.'}
              </Text>
              {activeFilters.length > 0 && (
                <Button variant="light" color="forest" radius="xl" mt="xs" onClick={clearAll}>
                  Clear filters
                </Button>
              )}
            </Stack>
          </Center>
        </Paper>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {pageRows.map((p) => {
              const avg = productAvg[p.productId?._id]
              const diff = avg && avg > 0 ? ((p.price - avg) / avg) * 100 : null
              return (
                <Paper
                  key={p._id}
                  className="result-card"
                  style={cardStyle}
                  component={p.productId?._id ? Link : 'div'}
                  to={p.productId?._id ? `/products/${p.productId._id}` : undefined}
                >
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={2}>
                      <Text fw={700} size="lg" c="forest.7">
                        {p.productId?.name || 'Unknown product'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        📍 {[p.area, p.district].filter(Boolean).join(', ') || 'Location unknown'}
                      </Text>
                    </Stack>
                    <Badge
                      size="xs"
                      variant="light"
                      color={p.source === 'vendor' ? 'lime' : 'forest'}
                      radius="xl"
                    >
                      {p.source}
                    </Badge>
                  </Group>

                  <Text fw={800} fz={28} c="forest.7" mt="xs">
                    ৳{p.price}
                    <Text span size="sm" c="dimmed" fw={500}> /{p.unit}</Text>
                  </Text>

                  {avg != null ? (
                    <Group gap={6} mt={6} wrap="wrap">
                      <Text size="xs" c="dimmed">Avg ৳{fmt(avg)}</Text>
                      {diff != null && (
                        <Badge
                          radius="xl"
                          variant="filled"
                          color={diff > 5 ? 'red' : diff < -5 ? 'lime' : 'gray'}
                          styles={diff < -5 ? { root: { color: '#0b3d2e' } } : undefined}
                        >
                          {diff > 0 ? '▲' : diff < 0 ? '▼' : '•'} {diff > 0 ? '+' : ''}{diff.toFixed(0)}% vs avg
                        </Badge>
                      )}
                    </Group>
                  ) : (
                    <Text size="xs" c="dimmed" mt={6}>No baseline yet</Text>
                  )}

                  <Group justify="space-between" mt="md">
                    <Text size="xs" c="dimmed">
                      {p.userId?.name || 'Anonymous'} · {timeAgo(new Date(p.createdAt).getTime())}
                    </Text>
                    {p.productId?._id && (
                      <Text size="xs" c="forest.7" fw={600}>View →</Text>
                    )}
                  </Group>
                </Paper>
              )
            })}
          </SimpleGrid>

          {totalPages > 1 && (
            <Group justify="center" gap="xs" mt="md" wrap="wrap">
              <Button
                variant="default"
                radius="xl"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </Button>
              {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
                const n = i + 1
                const target = totalPages <= 7 ? n : Math.min(Math.max(page - 3, 1), totalPages - 6) + i
                if (target > totalPages) return null
                return (
                  <Button
                    key={target}
                    radius="xl"
                    variant={target === page ? 'filled' : 'default'}
                    color={target === page ? 'lime' : undefined}
                    styles={target === page ? { root: { color: '#0b3d2e', fontWeight: 700 } } : undefined}
                    onClick={() => setPage(target)}
                  >
                    {target}
                  </Button>
                )
              })}
              <Button
                variant="default"
                radius="xl"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </Button>
            </Group>
          )}
        </>
      )}
    </Stack>
  )
}
