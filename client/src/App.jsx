import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext.jsx'
import RequireRole from './RequireRole.jsx'
import Nav from './Nav.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Admin from './pages/Admin.jsx'
import Submit from './pages/Submit.jsx'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/submit" element={<Submit />} />
            <Route
              path="/admin"
              element={
                <RequireRole roles={['admin']}>
                  <Admin />
                </RequireRole>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
