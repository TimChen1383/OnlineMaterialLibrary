import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Gallery from './components/Gallery'
import Editor from './components/Editor'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  )
}
