import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { ScrollArea } from '../ui/scroll-area'
import { Heart, Coins, Crown, Bot } from 'lucide-react'

interface Player {
  id: string
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

interface PlayerPanelProps {
  players: Player[]
  currentPlayer: Player
  gameCurrentPlayer: number
}

export default function PlayerPanel({ players, currentPlayer, gameCurrentPlayer }: PlayerPanelProps) {
  const getInventoryItems = (inventoryJson: string) => {
    try {
      return JSON.parse(inventoryJson) || []
    } catch {
      return []
    }
  }

  const getProperties = (propertiesJson: string) => {
    try {
      return JSON.parse(propertiesJson) || []
    } catch {
      return []
    }
  }

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'bg-green-500'
    if (health >= 50) return 'bg-yellow-500'
    if (health >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-shadow-realm-purple/30 bg-shadow-realm-surface">
        <h3 className="text-sm font-semibold text-shadow-realm-gold flex items-center gap-2">
          <Crown className="w-4 h-4" />
          Players & Inventory
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Current Player Details */}
          <Card className="bg-shadow-realm-bg/50 border-shadow-realm-purple/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-shadow-realm-gold flex items-center gap-2">
                <span className="text-lg">{currentPlayer.avatar}</span>
                {currentPlayer.character_name}
                <Badge variant="secondary" className="bg-shadow-realm-purple/20 text-shadow-realm-purple text-xs">
                  You
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Health */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-shadow-realm-text">
                    <Heart className="w-3 h-3" />
                    Health
                  </span>
                  <span className="text-shadow-realm-text">{currentPlayer.health}/100</span>
                </div>
                <Progress 
                  value={currentPlayer.health} 
                  className="h-2"
                />
              </div>

              {/* Gold */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-shadow-realm-text">
                  <Coins className="w-3 h-3" />
                  Gold
                </span>
                <span className="text-shadow-realm-gold font-semibold">{currentPlayer.gold}</span>
              </div>

              {/* Position */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-shadow-realm-text">Position</span>
                <span className="text-shadow-realm-text">Tile {currentPlayer.position}</span>
              </div>

              {/* Inventory */}
              <div className="space-y-1">
                <span className="text-xs text-shadow-realm-text">Inventory</span>
                <div className="flex flex-wrap gap-1">
                  {getInventoryItems(currentPlayer.inventory).length === 0 ? (
                    <span className="text-xs text-shadow-realm-text/60">Empty</span>
                  ) : (
                    getInventoryItems(currentPlayer.inventory).map((item: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs border-shadow-realm-purple/30">
                        {item.name || item}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Properties */}
              <div className="space-y-1">
                <span className="text-xs text-shadow-realm-text">Properties</span>
                <div className="flex flex-wrap gap-1">
                  {getProperties(currentPlayer.properties).length === 0 ? (
                    <span className="text-xs text-shadow-realm-text/60">None</span>
                  ) : (
                    getProperties(currentPlayer.properties).map((prop: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs border-shadow-realm-gold/30 text-shadow-realm-gold">
                        Tile {prop.position || prop}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Other Players */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-shadow-realm-text/80">Other Players</h4>
            {players
              .filter(p => p.id !== currentPlayer.id)
              .sort((a, b) => a.player_number - b.player_number)
              .map((player) => (
                <Card 
                  key={player.id} 
                  className={`bg-shadow-realm-surface/50 border-shadow-realm-purple/20 ${
                    player.player_number === gameCurrentPlayer ? 'ring-2 ring-shadow-realm-gold/50' : ''
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{player.avatar}</span>
                        <span className="text-sm font-medium text-shadow-realm-text">
                          {player.character_name}
                        </span>
                        {Number(player.is_ai) > 0 && (
                          <Bot className="w-3 h-3 text-shadow-realm-text/60" />
                        )}
                        {player.player_number === gameCurrentPlayer && (
                          <Badge variant="secondary" className="bg-shadow-realm-gold/20 text-shadow-realm-gold text-xs">
                            Turn
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-shadow-realm-text/60">Health</div>
                        <div className="text-shadow-realm-text font-medium">{player.health}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-shadow-realm-text/60">Gold</div>
                        <div className="text-shadow-realm-gold font-medium">{player.gold}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-shadow-realm-text/60">Position</div>
                        <div className="text-shadow-realm-text font-medium">{player.position}</div>
                      </div>
                    </div>

                    {/* Mini health bar */}
                    <div className="mt-2">
                      <div className="w-full bg-shadow-realm-bg/50 rounded-full h-1">
                        <div 
                          className={`h-1 rounded-full transition-all duration-300 ${getHealthColor(player.health)}`}
                          style={{ width: `${player.health}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Add AI Players Button (if less than 4 players) */}
          {players.length < 4 && (
            <Card className="bg-shadow-realm-surface/30 border-shadow-realm-purple/20 border-dashed">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-shadow-realm-text/60 mb-1">
                  {4 - players.length} AI player{4 - players.length > 1 ? 's' : ''} will join automatically
                </div>
                <div className="text-xs text-shadow-realm-text/40">
                  when the game starts
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}