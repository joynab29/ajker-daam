import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Title, Text, SimpleGrid, Card, Image, Anchor, Alert } from '@mantine/core'
import { api } from '../api.js'

export default function Home() {
  const [products, setProducts] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/products')
      .then((d) => setProducts(d.products))
      .catch((e) => setErr(e.message))
  }, [])

  return (
    <div>
      <Title order={1} mb="md">Products</Title>
      {err && <Alert color="red" mb="sm">{err}</Alert>}
      {products.length === 0 ? (
        <Text>No products yet.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {products.map((p) => (
            <Card key={p._id} withBorder padding="sm" radius="md">
              {p.imageUrl && (
                <Card.Section>
                  <Image src={p.imageUrl} alt={p.name} h={100} fit="cover" />
                </Card.Section>
              )}
              <Title order={3} mt="xs">{p.name}</Title>
              <Text size="sm" c="dimmed">per {p.unit}</Text>
              <Anchor component={Link} to={`/products/${p._id}`} mt="xs">
                View prices →
              </Anchor>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </div>
  )
}
