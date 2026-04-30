import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Title, Text, SimpleGrid, Card, Anchor, Alert, Group, Button, Stack, Box } from '@mantine/core'
import { api } from '../api.js'

const SERVER = 'http://localhost:4000'

function HeroImage({ src, alt, fallbackEmoji = '🛒', height = 140 }) {
  const [errored, setErrored] = useState(false)
  if (!src || errored) {
    return (
      <Box
        style={{
          height,
          background: 'linear-gradient(135deg, #ecfccb 0%, #bef264 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56,
        }}
      >
        {fallbackEmoji}
      </Box>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      style={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
    />
  )
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/products')
      .then((d) => setProducts(d.products))
      .catch((e) => setErr(e.message))
  }, [])

  return (
    <Stack gap="xl">
      <section className="hero-band">
        <span className="hero-blob" />
        <Group align="center" justify="space-between" wrap="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <Stack gap="md" maw={620}>
            <span className="lime-pill">Live food prices</span>
            <h1 style={{ margin: 0 }}>
              GROCERY<br />
              <span style={{ color: '#bef264' }}>that's honest.</span>
            </h1>
            <Text className="hero-sub">Ajker Daam · Bangladesh marketplace</Text>
            <Text c="rgba(255,255,255,0.82)" size="md" maw={520}>
              See what vendors are asking and what the community is actually paying — across districts, in real time.
            </Text>
            <Group gap="sm" mt="xs">
              <Anchor component={Link} to="/marketplace" className="hero-cta" underline="never">
                <span className="hero-cta-circle">🛒</span>
                Shop now
              </Anchor>
              <Anchor
                component={Link}
                to="/heatmap"
                underline="never"
                style={{
                  color: '#bef264',
                  fontWeight: 700,
                  padding: '14px 18px',
                  borderRadius: 999,
                  border: '1px solid rgba(190,242,100,0.4)',
                }}
              >
                See heatmap →
              </Anchor>
            </Group>
          </Stack>
          <Box visibleFrom="sm" style={{ position: 'relative' }}>
            <Box
              style={{
                width: 280,
                height: 280,
                borderRadius: '50%',
                background: '#bef264',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 140,
                fontWeight: 800,
                color: '#0b3d2e',
              }}
            >
              ৳
            </Box>
            <span className="ring-deco" style={{ top: -30, right: -30 }} />
            <span className="ring-deco" style={{ bottom: -20, left: -40, width: 80, height: 80 }} />
          </Box>
        </Group>
      </section>

      <section>
        <Group justify="space-between" align="end" mb="md" wrap="wrap">
          <Stack gap={4}>
            <span className="section-eyebrow">Catalog</span>
            <h2 className="display" style={{ margin: 0 }}>What's on the shelves</h2>
          </Stack>
          <Button component={Link} to="/search" variant="subtle" color="forest" radius="xl">
            Browse all →
          </Button>
        </Group>
        {err && <Alert color="red" mb="sm" radius="lg">{err}</Alert>}
        {products.length === 0 ? (
          <Text c="dimmed">No products yet.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
            {products.map((p) => (
              <Card
                key={p._id}
                component={Link}
                to={`/products/${p._id}`}
                padding="lg"
                radius="xl"
                className="card-soft"
                style={{ textDecoration: 'none', color: 'inherit', transition: 'transform 120ms ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <Card.Section>
                  <HeroImage
                    src={
                      p.imageUrl
                        ? p.imageUrl.startsWith('http')
                          ? p.imageUrl
                          : p.imageUrl.startsWith('/uploads/')
                            ? SERVER + p.imageUrl
                            : p.imageUrl
                        : null
                    }
                    alt={p.name}
                    height={140}
                    fallbackEmoji="🥬"
                  />
                </Card.Section>
                <Group justify="space-between" align="center" mt="md">
                  <Title order={4} style={{ margin: 0 }}>{p.name}</Title>
                  {p.category && <span className="chip-lime">{p.category}</span>}
                </Group>
                <Text size="sm" c="dimmed" mt={4}>per {p.unit}</Text>
                <Text size="sm" c="forest.7" fw={600} mt="sm">
                  View prices →
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </section>
    </Stack>
  )
}
