import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { ZoomIn, ZoomOut, RotateCcw, Target } from 'lucide-react'
import { blink } from '../../lib/blink'

interface Player {
  id: string
  player_number: number
  character_name: string
  position: number
  health: number
  gold: number
  avatar: string
  is_ai: number
}

interface BoardTile {
  position: number
  tile_type: string
  name: string
  description: string
  region: string
  purchase_price: number
  rent_price: number
}

interface BoardRendererProps {
  players: Player[]
  currentPlayer: Player
  zoom: number
  center: { x: number; y: number }
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onCenterPlayer: (position: number) => void
}

export default function BoardRenderer({
  players,
  currentPlayer,
  zoom,
  center,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onCenterPlayer
}: BoardRendererProps) {
  const [tiles, setTiles] = useState<BoardTile[]>([])
  const [hoveredTile, setHoveredTile] = useState<number | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTiles()
  }, [])

  const loadTiles = async () => {
    try {
      const tilesData = await blink.db.board_tiles.list({
        orderBy: { position: 'asc' }
      })
      setTiles(tilesData)
    } catch (error) {
      console.error('Failed to load tiles:', error)
    }
  }

  // Calculate tile positions in octagonal spiral
  const getTilePosition = (index: number) => {
    const centerX = 400
    const centerY = 375
    const tileSize = 24
    const spacing = 28

    if (index === 0) {
      // Start tile at center
      return { x: centerX - 40, y: centerY - 12, width: 80, height: 24 }
    }

    // Octagonal spiral calculation
    const rings = Math.ceil(Math.sqrt(index / 8))
    const ringStart = 8 * (rings - 1) * rings / 2
    const posInRing = index - ringStart - 1
    const sidesPerRing = 8 * rings
    const tilesPerSide = sidesPerRing / 8

    const side = Math.floor(posInRing / tilesPerSide)
    const posOnSide = posInRing % tilesPerSide

    const radius = rings * spacing
    const angle = (side * Math.PI / 4) + (posOnSide / tilesPerSide) * (Math.PI / 4)

    const x = centerX + Math.cos(angle) * radius - tileSize / 2
    const y = centerY + Math.sin(angle) * radius - tileSize / 2

    return { x, y, width: tileSize, height: tileSize }
  }

  // Get region color
  const getRegionColor = (region: string) => {
    const colors = {
      'Portal': '#F59E0B',
      'Shadow Forest': '#22C55E',
      'Cursed Swamp': '#84CC16',
      'Haunted Graveyard': '#6B7280',
      'Crystal Caverns': '#06B6D4',
      'Dragon Mountains': '#EF4444',
      'Wizard Tower': '#8B5CF6',
      'Demon Fortress': '#DC2626',
      'Celestial Gardens': '#F59E0B',
      'Void Nexus': '#1F2937',
      'Vampire Castle': '#7C2D12'
    }
    return colors[region as keyof typeof colors] || '#6B7280'
  }

  // Get tile type color
  const getTileTypeColor = (type: string) => {
    const colors = {
      'start': '#F59E0B',
      'property': '#8B5CF6',
      'monster': '#EF4444',
      'treasure': '#F59E0B',
      'event': '#06B6D4'
    }
    return colors[type as keyof typeof colors] || '#6B7280'
  }

  // Get players on tile
  const getPlayersOnTile = (position: number) => {
    return players.filter(p => p.position === position)
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onZoomIn}
          className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/20"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onZoomOut}
          className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/20"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onZoomReset}
          className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/20"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCenterPlayer(currentPlayer.position)}
          className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/20"
        >
          <Target className="w-4 h-4" />
        </Button>
      </div>

      {/* Board Container */}
      <div
        ref={boardRef}
        className="w-full h-full flex items-center justify-center"
        style={{
          transform: `scale(${zoom}) translate(${center.x}px, ${center.y}px)`,
          transformOrigin: 'center'
        }}
      >
        <svg
          width="800"
          height="750"
          viewBox="0 0 800 750"
          className="border border-shadow-realm-purple/30 rounded-lg bg-gradient-to-br from-shadow-realm-bg/50 to-shadow-realm-surface/50"
        >
          {/* Background Pattern */}
          <defs>
            <pattern id="stars" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1" fill="rgba(139, 92, 246, 0.3)" />
              <circle cx="10" cy="10" r="0.5" fill="rgba(245, 158, 11, 0.2)" />
              <circle cx="40" cy="15" r="0.5" fill="rgba(245, 158, 11, 0.2)" />
            </pattern>
          </defs>
          <rect width="800" height="750" fill="url(#stars)" />

          {/* Region Labels */}
          {['Shadow Forest', 'Cursed Swamp', 'Haunted Graveyard', 'Crystal Caverns', 'Dragon Mountains', 
            'Wizard Tower', 'Demon Fortress', 'Celestial Gardens', 'Void Nexus', 'Vampire Castle'].map((region, i) => {
            const angle = (i * Math.PI * 2) / 10
            const radius = 300
            const x = 400 + Math.cos(angle) * radius
            const y = 375 + Math.sin(angle) * radius
            
            return (
              <text
                key={region}
                x={x}
                y={y}
                textAnchor="middle"
                className="fill-shadow-realm-text/60 text-xs font-cinzel"
                style={{ fontSize: '10px' }}
              >
                {region}
              </text>
            )
          })}

          {/* Tiles */}
          {tiles.map((tile) => {
            const pos = getTilePosition(tile.position)
            const playersOnTile = getPlayersOnTile(tile.position)
            const isHovered = hoveredTile === tile.position
            const isCurrentPlayer = currentPlayer.position === tile.position

            return (
              <g key={tile.position}>
                {/* Tile Background */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={pos.height}
                  fill={getTileTypeColor(tile.tile_type)}
                  stroke={getRegionColor(tile.region)}
                  strokeWidth={isCurrentPlayer ? 3 : 1}
                  rx={tile.position === 0 ? 8 : 2}
                  className={`transition-all duration-200 ${
                    isHovered ? 'opacity-80' : 'opacity-70'
                  } ${isCurrentPlayer ? 'animate-glow' : ''}`}
                  onMouseEnter={() => setHoveredTile(tile.position)}
                  onMouseLeave={() => setHoveredTile(null)}
                />

                {/* Tile Number */}
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + pos.height / 2 + 3}
                  textAnchor="middle"
                  className="fill-white text-xs font-bold pointer-events-none"
                  style={{ fontSize: tile.position === 0 ? '10px' : '8px' }}
                >
                  {tile.position === 0 ? 'START' : tile.position}
                </text>

                {/* Players on Tile */}
                {playersOnTile.map((player, i) => (
                  <text
                    key={player.id}
                    x={pos.x + pos.width + 2 + (i * 12)}
                    y={pos.y + pos.height / 2 + 4}
                    className="text-sm"
                    style={{ fontSize: '12px' }}
                  >
                    {player.avatar}
                  </text>
                ))}

                {/* Current Player Glow */}
                {isCurrentPlayer && (
                  <rect
                    x={pos.x - 2}
                    y={pos.y - 2}
                    width={pos.width + 4}
                    height={pos.height + 4}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    rx={tile.position === 0 ? 10 : 4}
                    className="animate-pulse"
                  />
                )}
              </g>
            )
          })}

          {/* Connection Lines */}
          {tiles.slice(0, -1).map((tile, i) => {
            const pos1 = getTilePosition(tile.position)
            const pos2 = getTilePosition(tiles[i + 1]?.position || 0)
            
            return (
              <line
                key={`line-${i}`}
                x1={pos1.x + pos1.width / 2}
                y1={pos1.y + pos1.height / 2}
                x2={pos2.x + pos2.width / 2}
                y2={pos2.y + pos2.height / 2}
                stroke="rgba(139, 92, 246, 0.3)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            )
          })}
        </svg>
      </div>

      {/* Tile Tooltip */}
      {hoveredTile !== null && (
        <div className="absolute bottom-4 left-4 bg-shadow-realm-surface/90 border border-shadow-realm-purple/30 rounded-lg p-3 max-w-xs z-10">
          {tiles.find(t => t.position === hoveredTile) && (
            <div className="text-shadow-realm-text">
              <h3 className="font-semibold text-shadow-realm-gold">
                {tiles.find(t => t.position === hoveredTile)?.name}
              </h3>
              <p className="text-sm text-shadow-realm-text/80 mb-2">
                {tiles.find(t => t.position === hoveredTile)?.description}
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-shadow-realm-text/60">
                  {tiles.find(t => t.position === hoveredTile)?.region}
                </span>
                {tiles.find(t => t.position === hoveredTile)?.purchase_price > 0 && (
                  <span className="text-shadow-realm-gold">
                    {tiles.find(t => t.position === hoveredTile)?.purchase_price} gold
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}