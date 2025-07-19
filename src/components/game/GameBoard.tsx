import { useState, useEffect } from 'react'
import { blink } from '../../lib/blink'
import BoardRenderer from './BoardRenderer'
import ChatPanel from './ChatPanel'
import PlayerPanel from './PlayerPanel'
import TurnControls from './TurnControls'
import { Button } from '../ui/button'
import { ArrowLeft, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface Player {
  id: string
  game_id: string
  user_id: string
  player_number: number
  character_name: string
  character_class: string
  position: number
  health: number
  gold: number
  inventory: string
  properties: string
  is_ai: number
  avatar: string
}

interface Game {
  id: string
  name: string
  status: string
  current_turn: number
  current_player: number
  adventure_story: string
}

interface GameBoardProps {
  gameId: string
  user: any
  onExitGame: () => void
}

export default function GameBoard({ gameId, user, onExitGame }: GameBoardProps) {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardZoom, setBoardZoom] = useState(1)
  const [boardCenter, setBoardCenter] = useState({ x: 0, y: 0 })
  const [generatingAdventure, setGeneratingAdventure] = useState(false)

  useEffect(() => {
    loadGameData()
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadGameData = async () => {
    try {
      // Load game - get all games and filter in memory to avoid SQL issues
      const allGames = await blink.db.games.list({
        orderBy: { created_at: 'desc' },
        limit: 50
      })
      
      const gameInfo = allGames.find(g => g.id === gameId)
      if (!gameInfo) {
        toast.error('Game not found')
        onExitGame()
        return
      }

      setGame(gameInfo)

      // Load players
      const allPlayers = await blink.db.players.list({
        orderBy: { player_number: 'asc' },
        limit: 100
      })
      
      // Filter players for this game
      const playersData = allPlayers.filter(p => p.game_id === gameId)
      setPlayers(playersData)

      // Find current user's player
      const userPlayer = playersData.find(p => p.user_id === user.id)
      setCurrentPlayer(userPlayer || null)

      // Generate adventure if not exists
      if (!gameInfo.adventure_story && playersData.length > 0) {
        await generateAdventure(gameInfo, playersData)
      }

    } catch (error) {
      console.error('Failed to load game data:', error)
      toast.error('Failed to load game data')
    } finally {
      setLoading(false)
    }
  }

  const generateAdventure = async (gameInfo: Game, playersData: Player[]) => {
    setGeneratingAdventure(true)
    try {
      const playerNames = playersData.map(p => p.character_name).join(', ')
      
      const { text: adventure } = await blink.ai.generateText({
        prompt: `Create an epic D&D adventure story for a board game called "${gameInfo.name}". 
        The players are: ${playerNames}. 
        This should be a mystical adventure in the Shadow Realm with 10 different regions: 
        Shadow Forest, Cursed Swamp, Haunted Graveyard, Crystal Caverns, Dragon Mountains, 
        Wizard Tower, Demon Fortress, Celestial Gardens, Void Nexus, and Vampire Castle.
        
        Write a compelling 2-3 paragraph adventure hook that sets up the story and explains 
        why the heroes are traveling through these dangerous lands. Make it exciting and 
        mysterious, suitable for a fantasy board game adventure.`,
        maxTokens: 300
      })

      // Update game with adventure
      await blink.db.games.update(gameId, {
        adventure_story: adventure,
        status: 'active'
      })

      // Add initial narration message
      await blink.db.chat_messages.create({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        game_id: gameId,
        user_id: null,
        player_id: null,
        message_type: 'narrator',
        content: adventure,
        metadata: '{}'
      })

      setGame(prev => prev ? { ...prev, adventure_story: adventure, status: 'active' } : null)
      toast.success('Adventure generated! The game begins...')

    } catch (error) {
      console.error('Failed to generate adventure:', error)
      toast.error('Failed to generate adventure')
    } finally {
      setGeneratingAdventure(false)
    }
  }

  const handleZoomIn = () => {
    setBoardZoom(prev => Math.min(prev + 0.2, 2))
  }

  const handleZoomOut = () => {
    setBoardZoom(prev => Math.max(prev - 0.2, 0.5))
  }

  const handleZoomReset = () => {
    setBoardZoom(1)
    setBoardCenter({ x: 0, y: 0 })
  }

  const centerOnPlayer = (position: number) => {
    // Calculate board position for centering
    // This will be implemented in BoardRenderer
    setBoardCenter({ x: 0, y: 0 })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-shadow-realm-bg flex items-center justify-center">
        <div className="text-shadow-realm-text text-xl font-cinzel">
          Loading game...
        </div>
      </div>
    )
  }

  if (!game || !currentPlayer) {
    return (
      <div className="min-h-screen bg-shadow-realm-bg flex items-center justify-center">
        <div className="text-center text-shadow-realm-text">
          <h2 className="text-2xl font-cinzel mb-4">Game Error</h2>
          <p className="mb-6">Unable to load game data</p>
          <Button onClick={onExitGame} variant="outline">
            Return to Lobby
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-shadow-realm-bg text-shadow-realm-text flex flex-col">
      {/* Header */}
      <header className="bg-shadow-realm-surface border-b border-shadow-realm-purple/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onExitGame}
            className="border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Game
          </Button>
          <div>
            <h1 className="text-xl font-cinzel text-shadow-realm-gold">{game.name}</h1>
            <p className="text-sm text-shadow-realm-text/70">
              Turn {game.current_turn} • Player {game.current_player}
            </p>
          </div>
        </div>
        
        {generatingAdventure && (
          <div className="flex items-center gap-2 text-shadow-realm-gold">
            <Zap className="w-4 h-4 animate-pulse" />
            <span className="text-sm">AI Game Master is crafting your adventure...</span>
          </div>
        )}
      </header>

      {/* Main Game Area */}
      <div className="flex-1 flex">
        {/* Left Panel - Game Board (60%) */}
        <div className="w-3/5 relative bg-gradient-to-br from-shadow-realm-bg to-shadow-realm-surface">
          <BoardRenderer
            players={players}
            currentPlayer={currentPlayer}
            zoom={boardZoom}
            center={boardCenter}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            onCenterPlayer={centerOnPlayer}
          />
        </div>

        {/* Right Panel (40%) */}
        <div className="w-2/5 flex flex-col bg-shadow-realm-surface border-l border-shadow-realm-purple/30">
          {/* Chat Panel (40% of right panel) */}
          <div className="h-2/5 border-b border-shadow-realm-purple/30">
            <ChatPanel gameId={gameId} currentPlayer={currentPlayer} />
          </div>

          {/* Player Panel (35% of right panel) */}
          <div className="h-1/3 border-b border-shadow-realm-purple/30">
            <PlayerPanel 
              players={players}
              currentPlayer={currentPlayer}
              gameCurrentPlayer={game.current_player}
            />
          </div>

          {/* Turn Controls (25% of right panel) */}
          <div className="flex-1">
            <TurnControls
              game={game}
              currentPlayer={currentPlayer}
              players={players}
              onGameUpdate={loadGameData}
            />
          </div>
        </div>
      </div>
    </div>
  )
}