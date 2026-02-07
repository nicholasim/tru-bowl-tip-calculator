import { useState } from 'react'

export function UserScreen({ onAddUser }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    onAddUser(trimmed)
    setInput('')
  }

  return (
    <div className="user-screen">
      <div className="user-screen-card">
        <h2>Who&apos;s using the Tip Calculator?</h2>
        <p className="user-screen-hint">Enter your name to continue.</p>

        <form onSubmit={handleSubmit} className="user-screen-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your name"
            autoFocus
            aria-label="Your name"
            className="user-screen-input"
          />
          <button type="submit" className="user-screen-continue">
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
