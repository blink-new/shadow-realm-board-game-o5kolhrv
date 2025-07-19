import { useState, useEffect } from 'react'
import { blink } from '../lib/blink'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Gamepad2, Users, User, Settings, Plus, Crown, Sword } from 'lucide-react'
import { toast } from 'sonner'

interface Game {
  id: string
  name: string
  status: string
  current_players: number
  max_players: number
  host_user_id: string
  created_at: string
}

interface MainLobbyProps {
  user: any
  onStartGame: (gameId: string) => void
}

export default function MainLobby({ user, onStartGame }: MainLobbyProps) {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [gameName, setGameName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadGames()
    // Auto-refresh games every 30 seconds
    const interval = setInterval(loadGames, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadGames = async () => {
    try {
      // Get all games and filter in memory since OR queries are causing issues
      const gamesList = await blink.db.games.list({
        orderBy: { created_at: 'desc' },
        limit: 20
      })
      
      // Filter for waiting or active games
      const filteredGames = gamesList.filter(game => 
        game.status === 'waiting' || game.status === 'active'
      ).slice(0, 10)
      setGames(filteredGames)
    } catch (error) {
      console.error('Failed to load games:', error)
      toast.error('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const createGame = async () => {
    if (!gameName.trim()) {
      toast.error('Please enter a game name')
      return
    }

    setCreating(true)
    try {
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create the game
      await blink.db.games.create({
        id: gameId,
        name: gameName.trim(),
        status: 'waiting',
        max_players: 4,
        current_players: 0,
        host_user_id: user.id,
        adventure_prompt: '',
        adventure_story: '',
        current_turn: 1,
        current_player: 1
      })

      toast.success('Game created successfully!')
      setShowCreateGame(false)
      setGameName('')
      onStartGame(gameId)
    } catch (error) {
      console.error('Failed to create game:', error)
      toast.error('Failed to create game')
    } finally {
      setCreating(false)
    }
  }

  const joinGame = async (gameId: string) => {
    try {
      // Check current players
      const existingPlayers = await blink.db.players.list({
        where: { game_id: gameId }
      })

      if (existingPlayers.length >= 4) {
        toast.error('Game is full')
        return
      }

      // Check if user already in game
      const userInGame = existingPlayers.find(p => p.user_id === user.id)
      if (userInGame) {
        toast.success('Rejoining game...')
        // Skip character creation if already have a character
        onStartGame(gameId)
        return
      }

      // Go to character creation for new players
      toast.success('Joining game...')
      onStartGame(gameId)
    } catch (error) {
      console.error('Failed to join game:', error)
      toast.error('Failed to join game')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-shadow-realm-bg via-shadow-realm-surface to-shadow-realm-bg">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-10 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${6 + Math.random() * 4}s`
            }}
          >
            <div className="w-16 h-16 border-2 border-shadow-realm-purple transform rotate-45" />
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center">
        <div>
          <h1 className="text-5xl font-cinzel font-bold text-shadow-realm-gold mb-2">
            SHADOW REALM
          </h1>
          <p className="text-shadow-realm-text/80 text-lg">
            D&D Adventure Meets Strategic Board Game
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-shadow-realm-text">
            Welcome, {user.email?.split('@')[0]}
          </span>
          <Button
            variant="outline"
            onClick={() => blink.auth.logout()}
            className="border-shadow-realm-purple text-shadow-realm-purple hover:bg-shadow-realm-purple hover:text-white"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 pb-12">
        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* New Game */}
          <Card className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30 hover:border-shadow-realm-purple/60 transition-all duration-300 hover:shadow-lg hover:shadow-shadow-realm-purple/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-shadow-realm-gold">
                <Gamepad2 className="w-6 h-6" />
                New Game
              </CardTitle>
              <CardDescription className="text-shadow-realm-text/70">
                Create a new adventure with AI Game Master
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateGame ? (
                <Button
                  onClick={() => setShowCreateGame(true)}
                  className="w-full bg-shadow-realm-purple hover:bg-purple-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Game
                </Button>
              ) : (
                <div className="space-y-4">
                  <Input
                    placeholder="Enter game name..."
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    className="bg-shadow-realm-bg border-shadow-realm-purple/30 text-shadow-realm-text"
                    onKeyPress={(e) => e.key === 'Enter' && createGame()}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={createGame}
                      disabled={creating}
                      className="flex-1 bg-shadow-realm-purple hover:bg-purple-600 text-white"
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateGame(false)
                        setGameName('')
                      }}
                      className="border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Multiplayer */}
          <Card className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30 hover:border-shadow-realm-purple/60 transition-all duration-300 hover:shadow-lg hover:shadow-shadow-realm-purple/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-shadow-realm-gold">
                <Users className="w-6 h-6" />
                Multiplayer
              </CardTitle>
              <CardDescription className="text-shadow-realm-text/70">
                Join existing games or browse active sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  loadGames()
                  toast.success('Loading available games...')
                }}
                className="w-full bg-shadow-realm-gold hover:bg-amber-600 text-shadow-realm-bg font-semibold"
              >
                <Sword className="w-4 h-4 mr-2" />
                Browse Games
              </Button>
            </CardContent>
          </Card>

          {/* Profile */}
          <Card className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30 hover:border-shadow-realm-purple/60 transition-all duration-300 hover:shadow-lg hover:shadow-shadow-realm-purple/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-shadow-realm-gold">
                <User className="w-6 h-6" />
                Profile
              </CardTitle>
              <CardDescription className="text-shadow-realm-text/70">
                Manage your character and game statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/10"
                  >
                    View Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-shadow-realm-surface border-shadow-realm-purple/30">
                  <DialogHeader>
                    <DialogTitle className="text-shadow-realm-gold">Player Profile</DialogTitle>
                    <DialogDescription className="text-shadow-realm-text/70">
                      Your Shadow Realm adventurer details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-shadow-realm-text/80">Email</label>
                        <div className="text-shadow-realm-text font-medium">{user.email}</div>
                      </div>
                      <div>
                        <label className="text-sm text-shadow-realm-text/80">Player ID</label>
                        <div className="text-shadow-realm-text font-medium text-xs">{user.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-shadow-realm-text/80">Default Character Name</label>
                      <div className="text-shadow-realm-text font-medium">{user.email?.split('@')[0] || 'Hero'}</div>
                    </div>
                    <div className="text-center pt-4">
                      <p className="text-sm text-shadow-realm-text/60">
                        More profile features coming soon!
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Options */}
          <Card className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30 hover:border-shadow-realm-purple/60 transition-all duration-300 hover:shadow-lg hover:shadow-shadow-realm-purple/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-shadow-realm-gold">
                <Settings className="w-6 h-6" />
                Options
              </CardTitle>
              <CardDescription className="text-shadow-realm-text/70">
                Configure game settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/10"
                  >
                    Game Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-shadow-realm-surface border-shadow-realm-purple/30">
                  <DialogHeader>
                    <DialogTitle className="text-shadow-realm-gold">Game Options</DialogTitle>
                    <DialogDescription className="text-shadow-realm-text/70">
                      Configure your Shadow Realm experience
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-shadow-realm-text">Sound Effects</label>
                        <Button variant="outline" size="sm" className="border-shadow-realm-purple/30">
                          Enabled
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-shadow-realm-text">Auto-scroll Chat</label>
                        <Button variant="outline" size="sm" className="border-shadow-realm-purple/30">
                          Enabled
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-shadow-realm-text">Animation Speed</label>
                        <Button variant="outline" size="sm" className="border-shadow-realm-purple/30">
                          Normal
                        </Button>
                      </div>
                    </div>
                    <div className="text-center pt-4 border-t border-shadow-realm-purple/20">
                      <p className="text-sm text-shadow-realm-text/60">
                        More options coming in future updates!
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Available Games */}
        {games.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-cinzel text-shadow-realm-gold">Available Games</h2>
            <div className="grid gap-4">
              {games.map((game) => (
                <Card
                  key={game.id}
                  className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30 hover:border-shadow-realm-purple/60 transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-shadow-realm-text flex items-center gap-2">
                            {game.name}
                            {game.host_user_id === user.id && (
                              <Crown className="w-4 h-4 text-shadow-realm-gold" />
                            )}
                          </h3>
                          <p className="text-shadow-realm-text/70 text-sm">
                            Created {new Date(game.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="bg-shadow-realm-purple/20 text-shadow-realm-purple">
                          {game.current_players}/{game.max_players} Players
                        </Badge>
                        <Button
                          onClick={() => joinGame(game.id)}
                          className="bg-shadow-realm-purple hover:bg-purple-600 text-white"
                        >
                          {game.host_user_id === user.id ? 'Resume' : 'Join'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-cinzel text-shadow-realm-gold mb-4">
            Enter the Shadow Realm
          </h2>
          <p className="text-shadow-realm-text/80 text-lg max-w-2xl mx-auto">
            Embark on epic adventures where D&D meets strategic board gameplay. 
            Each game features unique AI-generated stories, turn-based combat, 
            and mystical properties to acquire across 100 enchanted tiles.
          </p>
        </div>
      </main>
    </div>
  )
}