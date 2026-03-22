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
import Vendor from './pages/Vendor.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Compare from './pages/Compare.jsx'
import Search from './pages/Search.jsx'
import History from './pages/History.jsx'
import Anomalies from './pages/Anomalies.jsx'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/search" element={<Search />} />
            <Route path="/history" element={<History />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/submit" element={<Submit />} />
            <Route
              path="/vendor"
              element={
                <RequireRole roles={['vendor']}>
                  <Vendor />
                </RequireRole>
              }
            />
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
