import { useState } from 'react'
import { blink } from '../../lib/blink'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Swords, Move, Coins } from 'lucide-react'
import { toast } from 'sonner'

interface Game {
  id: string
  current_turn: number
  current_player: number
  status: string
}

interface Player {
  id: string
  player_number: number
  character_name: string
  position: number
  health: number
  gold: number
  is_ai: number
}

interface TurnControlsProps {
  game: Game
  currentPlayer: Player
  players: Player[]
  onGameUpdate: () => void
}

export default function TurnControls({ game, currentPlayer, players, onGameUpdate }: TurnControlsProps) {
  const [rolling, setRolling] = useState(false)
  const [lastRoll, setLastRoll] = useState<number[]>([])
  const [actionPhase, setActionPhase] = useState(false)
  const [processing, setProcessing] = useState(false)

  const isMyTurn = currentPlayer.player_number === game.current_player

  const rollDice = (count: number = 2) => {
    const rolls = []
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * 6) + 1)
    }
    return rolls
  }

  const getDiceIcon = (value: number) => {
    const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]
    const Icon = icons[value - 1] || Dice1
    return <Icon className="w-5 h-5" />
  }

  const rollMovement = async () => {
    if (!isMyTurn || rolling) return

    setRolling(true)
    try {
      // Roll 2d6 for movement
      const diceRolls = rollDice(2)
      const totalMovement = diceRolls.reduce((sum, roll) => sum + roll, 0)
      setLastRoll(diceRolls)

      // Calculate new position
      const newPosition = (currentPlayer.position + totalMovement) % 100

      // Update player position
      await blink.db.players.update(currentPlayer.id, {
        position: newPosition
      })

      // Add movement message
      await blink.db.chat_messages.create({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        game_id: game.id,
        user_id: null,
        player_id: currentPlayer.id,
        message_type: 'action',
        content: `${currentPlayer.character_name} rolled ${diceRolls.join(' + ')} = ${totalMovement} and moved to tile ${newPosition}`,
        metadata: JSON.stringify({ 
          action: 'movement', 
          dice: diceRolls, 
          total: totalMovement, 
          newPosition 
        })
      })

      // Check if passed start (tile 0)
      if (currentPlayer.position + totalMovement >= 100) {
        await blink.db.players.update(currentPlayer.id, {
          gold: currentPlayer.gold + 200
        })
        
        await blink.db.chat_messages.create({
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          game_id: game.id,
          user_id: null,
          player_id: currentPlayer.id,
          message_type: 'system',
          content: `${currentPlayer.character_name} passed the Shadow Portal and collected 200 gold!`,
          metadata: '{}'
        })
      }

      setActionPhase(true)
      toast.success(`Rolled ${totalMovement}! Moved to tile ${newPosition}`)
      
    } catch (error) {
      console.error('Failed to roll movement:', error)
      toast.error('Failed to roll dice')
    } finally {
      setRolling(false)
    }
  }

  const rollAction = async () => {
    if (!isMyTurn || processing) return

    setProcessing(true)
    try {
      // Roll 1d20 for action
      const actionRoll = rollDice(1)[0]
      
      // Get current tile info
      const tiles = await blink.db.board_tiles.list({
        where: { position: currentPlayer.position },
        limit: 1
      })

      if (tiles.length === 0) {
        toast.error('Tile not found')
        return
      }

      const currentTile = tiles[0]
      
      // Generate AI narration for the tile encounter
      const { text: narration } = await blink.ai.generateText({
        prompt: `${currentPlayer.character_name} has landed on "${currentTile.name}" (${currentTile.description}) in the ${currentTile.region}. 
        They rolled a ${actionRoll} on a d20 action roll. 
        
        This is a ${currentTile.tile_type} tile. Based on the roll and tile type, create a short 1-2 sentence narration of what happens. 
        
        For property tiles: High rolls (15+) might find treasure or get a discount. Low rolls (5-) might face a challenge.
        For monster tiles: High rolls mean victory, low rolls mean taking damage.
        For event tiles: The roll determines the outcome of the random event.
        For treasure tiles: Higher rolls find better treasure.
        
        Keep it exciting and appropriate for a D&D adventure!`,
        maxTokens: 100
      })

      // Add action message
      await blink.db.chat_messages.create({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        game_id: game.id,
        user_id: null,
        player_id: currentPlayer.id,
        message_type: 'narrator',
        content: narration,
        metadata: JSON.stringify({ 
          action: 'tile_encounter', 
          roll: actionRoll, 
          tile: currentTile 
        })
      })

      // Apply tile effects based on roll and type
      await applyTileEffects(currentTile, actionRoll)

      toast.success(`Action roll: ${actionRoll}`)
      
    } catch (error) {
      console.error('Failed to roll action:', error)
      toast.error('Failed to perform action')
    } finally {
      setProcessing(false)
    }
  }

  const applyTileEffects = async (tile: any, roll: number) => {
    let healthChange = 0
    let goldChange = 0

    switch (tile.tile_type) {
      case 'monster':
        if (roll >= 15) {
          goldChange = 50 + (roll * 5) // Victory reward
        } else if (roll <= 8) {
          healthChange = -15 // Take damage
        }
        break
      
      case 'treasure':
        goldChange = 25 + (roll * 3) // Better rolls = more treasure
        break
      
      case 'event':
        if (roll >= 12) {
          goldChange = 30 // Good event
        } else if (roll <= 6) {
          goldChange = -20 // Bad event
        }
        break
      
      case 'property':
        // Property purchase logic would go here
        break
    }

    // Apply changes
    if (healthChange !== 0 || goldChange !== 0) {
      const newHealth = Math.max(0, Math.min(100, currentPlayer.health + healthChange))
      const newGold = Math.max(0, currentPlayer.gold + goldChange)

      await blink.db.players.update(currentPlayer.id, {
        health: newHealth,
        gold: newGold
      })

      if (healthChange !== 0) {
        const changeText = healthChange > 0 ? `gained ${healthChange}` : `lost ${Math.abs(healthChange)}`
        await blink.db.chat_messages.create({
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          game_id: game.id,
          user_id: null,
          player_id: currentPlayer.id,
          message_type: 'system',
          content: `${currentPlayer.character_name} ${changeText} health!`,
          metadata: '{}'
        })
      }

      if (goldChange !== 0) {
        const changeText = goldChange > 0 ? `gained ${goldChange}` : `lost ${Math.abs(goldChange)}`
        await blink.db.chat_messages.create({
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          game_id: game.id,
          user_id: null,
          player_id: currentPlayer.id,
          message_type: 'system',
          content: `${currentPlayer.character_name} ${changeText} gold!`,
          metadata: '{}'
        })
      }
    }
  }

  const endTurn = async () => {
    if (!isMyTurn || processing) return

    setProcessing(true)
    try {
      // Move to next player
      const nextPlayer = (game.current_player % 4) + 1
      const nextTurn = nextPlayer === 1 ? game.current_turn + 1 : game.current_turn

      await blink.db.games.update(game.id, {
        current_player: nextPlayer,
        current_turn: nextTurn
      })

      // Add turn end message
      await blink.db.chat_messages.create({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        game_id: game.id,
        user_id: null,
        player_id: null,
        message_type: 'system',
        content: `${currentPlayer.character_name} ended their turn. Player ${nextPlayer}'s turn begins!`,
        metadata: '{}'
      })

      setActionPhase(false)
      setLastRoll([])
      onGameUpdate()
      
    } catch (error) {
      console.error('Failed to end turn:', error)
      toast.error('Failed to end turn')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-shadow-realm-purple/30 bg-shadow-realm-surface">
        <h3 className="text-sm font-semibold text-shadow-realm-gold flex items-center gap-2">
          <Swords className="w-4 h-4" />
          Turn Controls
        </h3>
      </div>

      <div className="flex-1 p-3 space-y-3">
        {/* Turn Status */}
        <Card className="bg-shadow-realm-bg/50 border-shadow-realm-purple/30">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-xs text-shadow-realm-text/60 mb-1">Current Turn</div>
              <div className="text-lg font-bold text-shadow-realm-gold">
                Player {game.current_player}
              </div>
              {isMyTurn ? (
                <Badge className="bg-shadow-realm-purple text-white mt-1">Your Turn</Badge>
              ) : (
                <Badge variant="outline" className="border-shadow-realm-purple/30 text-shadow-realm-text mt-1">
                  Waiting...
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Roll Display */}
        {lastRoll.length > 0 && (
          <Card className="bg-shadow-realm-surface/50 border-shadow-realm-purple/30">
            <CardContent className="p-3">
              <div className="text-center">
                <div className="text-xs text-shadow-realm-text/60 mb-2">Last Roll</div>
                <div className="flex justify-center gap-2 mb-2">
                  {lastRoll.map((roll, i) => (
                    <div key={i} className="text-shadow-realm-gold">
                      {getDiceIcon(roll)}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-shadow-realm-text">
                  Total: {lastRoll.reduce((sum, roll) => sum + roll, 0)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {isMyTurn && (
          <div className="space-y-2">
            {!actionPhase ? (
              <Button
                onClick={rollMovement}
                disabled={rolling}
                className="w-full bg-shadow-realm-purple hover:bg-purple-600 text-white"
              >
                <Move className="w-4 h-4 mr-2" />
                {rolling ? 'Rolling...' : 'Roll Movement (2d6)'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={rollAction}
                  disabled={processing}
                  className="w-full bg-shadow-realm-gold hover:bg-amber-600 text-shadow-realm-bg"
                >
                  <Swords className="w-4 h-4 mr-2" />
                  {processing ? 'Processing...' : 'Take Action (1d20)'}
                </Button>
                
                <Button
                  onClick={endTurn}
                  disabled={processing}
                  variant="outline"
                  className="w-full border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/10"
                >
                  End Turn
                </Button>
              </>
            )}
          </div>
        )}

        {/* Game Stats */}
        <Card className="bg-shadow-realm-surface/30 border-shadow-realm-purple/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-shadow-realm-text/80">Game Stats</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <div className="text-shadow-realm-text/60">Turn</div>
                <div className="text-shadow-realm-text font-medium">{game.current_turn}</div>
              </div>
              <div className="text-center">
                <div className="text-shadow-realm-text/60">Players</div>
                <div className="text-shadow-realm-text font-medium">{players.length}/4</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-shadow-realm-bg/30 rounded p-2 text-center">
            <div className="text-shadow-realm-text/60">Your Health</div>
            <div className="text-shadow-realm-text font-medium">{currentPlayer.health}/100</div>
          </div>
          <div className="bg-shadow-realm-bg/30 rounded p-2 text-center">
            <div className="text-shadow-realm-text/60">Your Gold</div>
            <div className="text-shadow-realm-gold font-medium">{currentPlayer.gold}</div>
          </div>
        </div>
      </div>
    </div>
  )
}