import { useState, useEffect } from 'react'
import { blink } from './lib/blink'
import MainLobby from './components/MainLobby'
import CharacterCreation from './components/CharacterCreation'
import GameBoard from './components/game/GameBoard'
import { Toaster } from './components/ui/sonner'

export type GameState = 'lobby' | 'character-creation' | 'game'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [gameState, setGameState] = useState<GameState>('lobby')
  const [currentGameId, setCurrentGameId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-shadow-realm-bg flex items-center justify-center">
        <div className="text-shadow-realm-text text-xl font-cinzel">
          Entering the Shadow Realm...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-shadow-realm-bg flex items-center justify-center">
        <div className="text-center text-shadow-realm-text">
          <h1 className="text-4xl font-cinzel mb-4">Shadow Realm</h1>
          <p className="text-lg mb-6">Please sign in to enter the realm</p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-shadow-realm-purple hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-shadow-realm-bg text-shadow-realm-text">
      {gameState === 'lobby' && (
        <MainLobby 
          user={user}
          onStartGame={async (gameId) => {
            setCurrentGameId(gameId)
            
            // Check if user already has a character in this game
            try {
              const existingPlayers = await blink.db.players.list({
                where: { game_id: gameId, user_id: user.id }
              })
              
              if (existingPlayers.length > 0) {
                // User already has a character, go directly to game
                setGameState('game')
              } else {
                // User needs to create a character
                setGameState('character-creation')
              }
            } catch (error) {
              console.error('Error checking existing character:', error)
              // Default to character creation on error
              setGameState('character-creation')
            }
          }}
        />
      )}
      
      {gameState === 'character-creation' && currentGameId && (
        <CharacterCreation
          user={user}
          gameId={currentGameId}
          onCharacterCreated={() => {
            setGameState('game')
          }}
          onBack={() => {
            setGameState('lobby')
            setCurrentGameId(null)
          }}
        />
      )}
      
      {gameState === 'game' && currentGameId && (
        <GameBoard 
          gameId={currentGameId}
          user={user}
          onExitGame={() => {
            setGameState('lobby')
            setCurrentGameId(null)
          }}
        />
      )}
      
      <Toaster />
    </div>
  )
}

export default App