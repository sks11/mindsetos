"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react"

interface BoxBreathingMeditationProps {
  className?: string
}

export function BoxBreathingMeditation({ className = "" }: BoxBreathingMeditationProps) {
  const [isActive, setIsActive] = useState(false)
  const [phase, setPhase] = useState<"inhale" | "hold1" | "exhale" | "hold2">("inhale")
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(5 * 60) // 5 minutes in seconds
  const [cycleCount, setCycleCount] = useState(0)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isGivingInstructions, setIsGivingInstructions] = useState(false)
  const [instructionStep, setInstructionStep] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const phaseIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const instructionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastPhaseRef = useRef<typeof phase>("inhale")

  // Box breathing timing (4-4-4-4 pattern - 4 seconds each phase)
  const phaseDuration = 4000 // 4 seconds in milliseconds
  const phaseNames = {
    inhale: "Breathe In",
    hold1: "Hold",
    exhale: "Breathe Out", 
    hold2: "Hold"
  }

  const phaseInstructions = {
    inhale: "Slowly breathe in through your nose",
    hold1: "Hold your breath gently",
    exhale: "Slowly breathe out through your mouth",
    hold2: "Hold your breath gently"
  }

  const audioInstructions = {
    inhale: "Breathe in",
    hold1: "Hold",
    exhale: "Breathe out", 
    hold2: "Hold"
  }

  const introductionSteps = [
    "Welcome to your 5-minute box breathing meditation.",
    "Find a comfortable position... and close your eyes when you're ready.",
    "We'll breathe together in a simple pattern... Breathe in for 4 seconds... hold for 4... breathe out for 4... then hold for 4.",
    "Just follow my voice... and let your body relax naturally.",
    "Let's begin..."
  ]

  const instructionTexts = [
    "Getting ready...",
    "Find a comfortable position",
    "Close your eyes when ready", 
    "Follow the 4-4-4-4 pattern",
    "Starting meditation..."
  ]

  // Check for speech synthesis support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true)
    }
  }, [])

  // Speak audio instruction
  const speakInstruction = (instruction: string) => {
    if (!audioEnabled || !speechSupported || typeof window === 'undefined') return
    
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(instruction)
      utterance.rate = 0.6 // Much slower, very calm pace
      utterance.pitch = 0.8 // Lower pitch for deeper calmness
      utterance.volume = 0.6 // Softer volume
      
      // Use a calm, soothing voice if available
      const voices = window.speechSynthesis.getVoices()
      const calmVoice = voices.find(voice => 
        voice.name.includes('Samantha') ||
        voice.name.includes('Victoria') ||
        voice.name.includes('Karen') ||
        voice.name.includes('Zira') ||
        (voice.name.includes('Female') && voice.lang.includes('en')) ||
        (voice.gender && voice.gender === 'female') ||
        voice.lang.includes('en-US')
      )
      if (calmVoice) {
        utterance.voice = calmVoice
      }
      
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      console.log('Speech synthesis not available:', error)
    }
  }

  // Generate gentle tone for phase transitions (using Web Audio API)
  const playChime = () => {
    if (!audioEnabled || typeof window === 'undefined') return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Gentle bell-like frequency
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime) // A4 note
      oscillator.type = 'sine'
      
      // Gentle fade in/out
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Web Audio API not available:', error)
    }
  }

  // Give step-by-step instructions before starting meditation
  const giveInstructions = () => {
    setIsGivingInstructions(true)
    setInstructionStep(0)
    
    const giveNextInstruction = (stepIndex: number) => {
      if (stepIndex >= introductionSteps.length) {
        // Instructions complete, start the actual meditation
        setIsGivingInstructions(false)
        setInstructionStep(0)
        setIsActive(true)
        
        // Speak the first breathing instruction immediately
        if (audioEnabled && speechSupported) {
          setTimeout(() => {
            speakInstruction(audioInstructions["inhale"])
          }, 500)
        }
        
        startPhase()
        return
      }
      
      setInstructionStep(stepIndex)
      
      // Speak the instruction if audio is enabled
      if (audioEnabled && speechSupported) {
        speakInstruction(introductionSteps[stepIndex])
      }
      
      // Schedule next instruction (varying delays for natural flow)
      const delays = [4000, 5500, 7000, 5000, 3000] // Longer, more relaxed delays for each step
      instructionTimeoutRef.current = setTimeout(() => {
        giveNextInstruction(stepIndex + 1)
      }, delays[stepIndex] || 3000)
    }
    
    giveNextInstruction(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startBreathing = () => {
    // Start with instructions first, then meditation
    giveInstructions()
  }

  const pauseBreathing = () => {
    setIsActive(false)
    setIsGivingInstructions(false)
    setInstructionStep(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current)
    if (instructionTimeoutRef.current) clearTimeout(instructionTimeoutRef.current)
    
    // Stop any ongoing speech
    if (typeof window !== 'undefined' && speechSupported) {
      window.speechSynthesis.cancel()
    }
  }

  const resetBreathing = () => {
    setIsActive(false)
    setIsGivingInstructions(false)
    setInstructionStep(0)
    setPhase("inhale")
    setProgress(0)
    setTimeRemaining(5 * 60)
    setCycleCount(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current)
    if (instructionTimeoutRef.current) clearTimeout(instructionTimeoutRef.current)
    
    // Stop any ongoing speech
    if (typeof window !== 'undefined' && speechSupported) {
      window.speechSynthesis.cancel()
    }
  }

  const startPhase = () => {
    let currentProgress = 0
    const increment = 100 / (phaseDuration / 100) // Update every 100ms
    
    setProgress(0)
    
    phaseIntervalRef.current = setInterval(() => {
      currentProgress += increment
      setProgress(currentProgress)
      
      if (currentProgress >= 100) {
        // Move to next phase
        setPhase(prevPhase => {
          const phases: Array<typeof phase> = ["inhale", "hold1", "exhale", "hold2"]
          const currentIndex = phases.indexOf(prevPhase)
          const nextPhase = phases[(currentIndex + 1) % phases.length]
          
          if (nextPhase === "inhale") {
            setCycleCount(prev => prev + 1)
          }
          
          // Trigger audio instruction for new phase
          if (audioEnabled && speechSupported) {
            setTimeout(() => {
              playChime() // Gentle chime for transition
              speakInstruction(audioInstructions[nextPhase])
            }, 100)
          }
          
          return nextPhase
        })
        setProgress(0)
      }
    }, 100)
  }

  // Main timer countdown
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false)
            // Meditation completed - play completion message
            if (audioEnabled && speechSupported) {
              setTimeout(() => {
                speakInstruction("Your meditation is complete. Take a moment to notice how you feel. Well done.")
              }, 500)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive, timeRemaining, audioEnabled, speechSupported])

  // Phase management
  useEffect(() => {
    if (isActive) {
      startPhase()
    }

    return () => {
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current)
    }
  }, [isActive, phase])

  const getPhaseColor = () => {
    switch (phase) {
      case "inhale": return "from-blue-400 to-blue-600"
      case "hold1": return "from-green-400 to-green-600"
      case "exhale": return "from-purple-400 to-purple-600"
      case "hold2": return "from-orange-400 to-orange-600"
      default: return "from-gray-400 to-gray-600"
    }
  }

  const getCircleScale = () => {
    switch (phase) {
      case "inhale": return `scale(${1 + (progress / 100) * 0.3})`
      case "exhale": return `scale(${1.3 - (progress / 100) * 0.3})`
      default: return "scale(1.3)"
    }
  }

  return (
    <Card className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg ${className}`}>
      <CardContent className="p-4">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-xl">🧘‍♀️</span>
              Mind Centering
            </h3>
            
            {/* Audio Toggle */}
            {speechSupported && (
              <Button
                onClick={() => setAudioEnabled(!audioEnabled)}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                title={audioEnabled ? "Disable audio guidance" : "Enable audio guidance"}
              >
                {audioEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
          
          {/* Timer */}
          <div className="text-2xl font-mono font-bold text-gray-700">
            {formatTime(timeRemaining)}
          </div>

          {/* Breathing Circle Animation */}
          <div className="relative flex items-center justify-center h-32">
            <div 
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${getPhaseColor()} transition-all duration-100 ease-in-out flex items-center justify-center`}
              style={{ 
                transform: getCircleScale(),
                opacity: 0.8 + (progress / 100) * 0.2
              }}
            >
              <div className="text-white text-xs font-medium text-center px-2">
                {phaseNames[phase]}
              </div>
            </div>
            
            {/* Progress ring */}
            <svg className="absolute w-32 h-32 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-200"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-500"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 h-12 flex items-center justify-center text-center">
            {isGivingInstructions ? (
              <div className="text-purple-700 font-medium">
                {instructionTexts[instructionStep]}
              </div>
            ) : isActive ? (
              phaseInstructions[phase]
            ) : (
              <div>
                <div>Click play to begin your 5-minute breathing meditation</div>
                {speechSupported && audioEnabled && (
                  <div className="text-xs text-green-600 mt-1">🔊 Audio guidance enabled</div>
                )}
                {speechSupported && !audioEnabled && (
                  <div className="text-xs text-gray-500 mt-1">🔇 Audio guidance disabled</div>
                )}
              </div>
            )}
          </div>

          {/* Cycle Counter */}
          {cycleCount > 0 && (
            <div className="text-xs text-gray-500">
              Completed cycles: {cycleCount}
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-2">
            {!isActive && !isGivingInstructions ? (
              <Button
                onClick={startBreathing}
                disabled={timeRemaining === 0}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1"
                size="sm"
              >
                <Play className="w-3 h-3 mr-1" />
                {timeRemaining === 0 ? "Finished" : "Start"}
              </Button>
            ) : (
              <Button
                onClick={pauseBreathing}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1"
                size="sm"
              >
                <Pause className="w-3 h-3 mr-1" />
                {isGivingInstructions ? "Skip" : "Pause"}
              </Button>
            )}
            
            <Button
              onClick={resetBreathing}
              variant="outline"
              className="text-xs px-3 py-1"
              size="sm"
              disabled={isGivingInstructions}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>

          {timeRemaining === 0 && (
            <div className="text-green-600 font-medium text-sm">
              ✨ Meditation Complete! Well done.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
