import { useState } from 'react'
import { blink } from '../lib/blink'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { ArrowLeft, Dice6, Sparkles, Sword, Shield, Wand2, Target, Heart, Brain } from 'lucide-react'
import { toast } from 'sonner'

interface CharacterStats {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

interface CharacterCreationProps {
  user: any
  gameId: string
  onCharacterCreated: () => void
  onBack: () => void
}

const CHARACTER_CLASSES = [
  {
    name: 'Fighter',
    icon: Sword,
    description: 'Master of weapons and armor, excels in combat',
    primaryStats: ['Strength', 'Constitution'],
    color: 'text-red-400'
  },
  {
    name: 'Rogue',
    icon: Shield,
    description: 'Stealthy and agile, skilled in stealth and precision',
    primaryStats: ['Dexterity', 'Intelligence'],
    color: 'text-purple-400'
  },
  {
    name: 'Wizard',
    icon: Wand2,
    description: 'Wielder of arcane magic and ancient knowledge',
    primaryStats: ['Intelligence', 'Wisdom'],
    color: 'text-blue-400'
  },
  {
    name: 'Ranger',
    icon: Target,
    description: 'Nature warrior with survival skills and ranged combat',
    primaryStats: ['Dexterity', 'Wisdom'],
    color: 'text-green-400'
  },
  {
    name: 'Cleric',
    icon: Heart,
    description: 'Divine spellcaster with healing and support abilities',
    primaryStats: ['Wisdom', 'Charisma'],
    color: 'text-yellow-400'
  },
  {
    name: 'Sorcerer',
    icon: Brain,
    description: 'Innate magic user with powerful elemental spells',
    primaryStats: ['Charisma', 'Constitution'],
    color: 'text-pink-400'
  }
]

const STAT_NAMES = {
  strength: 'Strength',
  dexterity: 'Dexterity', 
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma'
}

const STAT_DESCRIPTIONS = {
  strength: 'Physical power and muscle',
  dexterity: 'Agility and reflexes',
  constitution: 'Health and stamina',
  intelligence: 'Reasoning and memory',
  wisdom: 'Perception and insight',
  charisma: 'Force of personality'
}

export default function CharacterCreation({ user, gameId, onCharacterCreated, onBack }: CharacterCreationProps) {
  const [characterName, setCharacterName] = useState(user.email?.split('@')[0] || '')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [stats, setStats] = useState<CharacterStats>({
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  })
  const [creating, setCreating] = useState(false)
  const [hasRolled, setHasRolled] = useState(false)

  const rollStats = () => {
    const newStats: CharacterStats = {
      strength: rollStat(),
      dexterity: rollStat(),
      constitution: rollStat(),
      intelligence: rollStat(),
      wisdom: rollStat(),
      charisma: rollStat()
    }
    setStats(newStats)
    setHasRolled(true)
    toast.success('Character attributes rolled!')
  }

  const rollStat = (): number => {
    // Roll 4d6, drop lowest (standard D&D method)
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
    rolls.sort((a, b) => b - a)
    return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0)
  }

  const getStatModifier = (stat: number): string => {
    const modifier = Math.floor((stat - 10) / 2)
    return modifier >= 0 ? `+${modifier}` : `${modifier}`
  }

  const getStatColor = (stat: number): string => {
    if (stat >= 16) return 'text-green-400'
    if (stat >= 14) return 'text-blue-400'
    if (stat >= 12) return 'text-yellow-400'
    if (stat >= 10) return 'text-gray-400'
    return 'text-red-400'
  }

  const createCharacter = async () => {
    if (!characterName.trim()) {
      toast.error('Please enter a character name')
      return
    }
    if (!selectedClass) {
      toast.error('Please select a character class')
      return
    }
    if (!hasRolled) {
      toast.error('Please roll for attributes first')
      return
    }

    setCreating(true)
    try {
      // Check how many players are already in the game - get all and filter
      const allPlayers = await blink.db.players.list({
        orderBy: { player_number: 'asc' },
        limit: 100
      })
      
      const existingPlayers = allPlayers.filter(p => p.game_id === gameId)
      const playerNumber = existingPlayers.length + 1
      if (playerNumber > 4) {
        toast.error('Game is full')
        return
      }

      // Create the player with character data
      await blink.db.players.create({
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        game_id: gameId,
        user_id: user.id,
        player_number: playerNumber,
        character_name: characterName.trim(),
        character_class: selectedClass,
        position: 0,
        health: 100,
        gold: 1500,
        inventory: '[]',
        properties: '[]',
        is_ai: 0,
        avatar: CHARACTER_CLASSES.find(c => c.name === selectedClass)?.icon === Sword ? '⚔️' : 
                CHARACTER_CLASSES.find(c => c.name === selectedClass)?.icon === Shield ? '🛡️' :
                CHARACTER_CLASSES.find(c => c.name === selectedClass)?.icon === Wand2 ? '🧙‍♂️' :
                CHARACTER_CLASSES.find(c => c.name === selectedClass)?.icon === Target ? '🏹' :
                CHARACTER_CLASSES.find(c => c.name === selectedClass)?.icon === Heart ? '⛪' : '✨',
        strength: stats.strength,
        dexterity: stats.dexterity,
        constitution: stats.constitution,
        intelligence: stats.intelligence,
        wisdom: stats.wisdom,
        charisma: stats.charisma
      })

      // Update game player count
      await blink.db.games.update(gameId, {
        current_players: playerNumber
      })

      toast.success('Character created successfully!')
      onCharacterCreated()
    } catch (error) {
      console.error('Failed to create character:', error)
      toast.error('Failed to create character')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-shadow-realm-bg via-shadow-realm-surface to-shadow-realm-bg">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-10 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          >
            <div className="w-12 h-12 border-2 border-shadow-realm-purple transform rotate-45" />
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-shadow-realm-purple/30 text-shadow-realm-text hover:bg-shadow-realm-purple/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lobby
        </Button>
        <div>
          <h1 className="text-3xl font-cinzel font-bold text-shadow-realm-gold">
            Create Your Character
          </h1>
          <p className="text-shadow-realm-text/80">
            Forge your legend in the Shadow Realm
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Character Details */}
          <div className="space-y-6">
            {/* Character Name */}
            <Card className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30">
              <CardHeader>
                <CardTitle className="text-shadow-realm-gold">Character Name</CardTitle>
                <CardDescription className="text-shadow-realm-text/70">
                  Choose a name for your hero
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="Enter character name..."
                  className="bg-shadow-realm-bg border-shadow-realm-purple/30 text-shadow-realm-text"
                  maxLength={30}
                />
              </CardContent>
            </Card>

            {/* Character Class */}
            <Card className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30">
              <CardHeader>
                <CardTitle className="text-shadow-realm-gold">Character Class</CardTitle>
                <CardDescription className="text-shadow-realm-text/70">
                  Select your adventuring profession
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CHARACTER_CLASSES.map((charClass) => {
                    const Icon = charClass.icon
                    return (
                      <button
                        key={charClass.name}
                        onClick={() => setSelectedClass(charClass.name)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          selectedClass === charClass.name
                            ? 'border-shadow-realm-purple bg-shadow-realm-purple/20'
                            : 'border-shadow-realm-purple/30 hover:border-shadow-realm-purple/60 bg-shadow-realm-bg/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className={`w-5 h-5 ${charClass.color}`} />
                          <span className="font-semibold text-shadow-realm-text">
                            {charClass.name}
                          </span>
                        </div>
                        <p className="text-sm text-shadow-realm-text/70 mb-2">
                          {charClass.description}
                        </p>
                        <div className="flex gap-1">
                          {charClass.primaryStats.map((stat) => (
                            <Badge
                              key={stat}
                              variant="secondary"
                              className="text-xs bg-shadow-realm-purple/20 text-shadow-realm-purple"
                            >
                              {stat}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Character Attributes */}
          <div className="space-y-6">
            <Card className="bg-shadow-realm-surface/80 border-shadow-realm-purple/30">
              <CardHeader>
                <CardTitle className="text-shadow-realm-gold flex items-center gap-2">
                  <Dice6 className="w-5 h-5" />
                  Character Attributes
                </CardTitle>
                <CardDescription className="text-shadow-realm-text/70">
                  Roll for your character's core abilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={rollStats}
                  className="w-full bg-shadow-realm-purple hover:bg-purple-600 text-white"
                  disabled={creating}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {hasRolled ? 'Reroll Attributes' : 'Roll Attributes'}
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(stats).map(([statKey, value]) => (
                    <div
                      key={statKey}
                      className="bg-shadow-realm-bg/50 rounded-lg p-3 border border-shadow-realm-purple/20"
                    >
                      <Label className="text-sm text-shadow-realm-text/80">
                        {STAT_NAMES[statKey as keyof CharacterStats]}
                      </Label>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-2xl font-bold ${getStatColor(value)}`}>
                          {value}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getStatModifier(value)}
                        </Badge>
                      </div>
                      <p className="text-xs text-shadow-realm-text/60 mt-1">
                        {STAT_DESCRIPTIONS[statKey as keyof CharacterStats]}
                      </p>
                    </div>
                  ))}
                </div>

                {hasRolled && (
                  <div className="bg-shadow-realm-bg/30 rounded-lg p-3 border border-shadow-realm-gold/20">
                    <p className="text-sm text-shadow-realm-text/80">
                      <strong className="text-shadow-realm-gold">Total:</strong>{' '}
                      {Object.values(stats).reduce((sum, stat) => sum + stat, 0)} points
                    </p>
                    <p className="text-xs text-shadow-realm-text/60 mt-1">
                      Attributes rolled using 4d6 drop lowest method
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Character Summary */}
            {characterName && selectedClass && hasRolled && (
              <Card className="bg-shadow-realm-surface/80 border-shadow-realm-gold/30">
                <CardHeader>
                  <CardTitle className="text-shadow-realm-gold">Character Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-shadow-realm-text/80">Name:</span>
                      <span className="text-shadow-realm-text font-semibold">{characterName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-shadow-realm-text/80">Class:</span>
                      <span className="text-shadow-realm-text font-semibold">{selectedClass}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-shadow-realm-text/80">Health:</span>
                      <span className="text-shadow-realm-text font-semibold">100 HP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-shadow-realm-text/80">Starting Gold:</span>
                      <span className="text-shadow-realm-text font-semibold">1,500 GP</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Create Character Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={createCharacter}
            disabled={!characterName || !selectedClass || !hasRolled || creating}
            className="bg-shadow-realm-gold hover:bg-amber-600 text-shadow-realm-bg font-semibold px-8 py-3 text-lg"
          >
            {creating ? 'Creating Character...' : 'Enter the Shadow Realm'}
          </Button>
        </div>
      </main>
    </div>
  )
}