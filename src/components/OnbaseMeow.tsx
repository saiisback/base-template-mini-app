"use client";

import { useState, useCallback, useEffect } from "react";
import { useMiniApp } from "@neynar/react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import Image from "next/image";
import { ShareButton } from "./ui/Share";
import { Button } from "./ui/Button";
// import { config } from "~/components/providers/WagmiProvider";

type GameState = 
  | "welcome" 
  | "invite" 
  | "waiting" 
  | "cat-care" 
  | "marketplace" 
  | "playground";

interface CatStats {
  love: number;
  hunger: number;
  happiness: number;
}

interface Partner {
  fid: number;
  username: string;
  pfpUrl?: string;
}

interface ActivityLog {
  id: string;
  action: 'feed' | 'cuddle' | 'love';
  user: 'you' | 'partner';
  timestamp: Date;
}

export default function OnbaseMeow() {
  const { isSDKLoaded, context } = useMiniApp();
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { signMessage, isPending: isSignPending, data: signature, error: signError } = useSignMessage();
  
  const [gameState, setGameState] = useState<GameState>("welcome");
  const [partner, setPartner] = useState<Partner | null>(null);
  const [catStats, setCatStats] = useState<CatStats>({
    love: 50,
    hunger: 30,
    happiness: 75
  });
  const [selectedCat] = useState("3Aug2025Update.png");
  const [showLoveAnimation, setShowLoveAnimation] = useState(false);
  const [showFeedAnimation, setShowFeedAnimation] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const addActivityLog = useCallback(async (action: 'feed' | 'cuddle' | 'love', user: 'you' | 'partner') => {
    const newActivity: ActivityLog = {
      id: Date.now().toString(),
      action,
      user,
      timestamp: new Date()
    };
    setActivityLog(prev => [newActivity, ...prev.slice(0, 4)]); // Keep only last 5 activities

    // Log to database if we have a session
    if (gameState === "cat-care" && context?.user?.fid && currentSessionId) {
      console.log('Logging activity to database...', { action, fid: context.user.fid, sessionId: currentSessionId });
      try {
        const response = await fetch('/api/activity', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.user.fid}` // Add auth header
          },
          body: JSON.stringify({
            sessionId: currentSessionId,
            action
          })
        });
        const data = await response.json();
        console.log('Activity logged successfully:', data);
      } catch (error) {
        console.error('Failed to log activity to database:', error);
      }
    }
  }, [gameState, context?.user?.fid]);

  // Simulate partner activities occasionally
  useEffect(() => {
    if (gameState === "cat-care" && partner) {
      const interval = setInterval(() => {
        const actions: ('feed' | 'cuddle' | 'love')[] = ['feed', 'cuddle', 'love'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        // 30% chance of partner activity every 10 seconds
        if (Math.random() < 0.3) {
          addActivityLog(randomAction, 'partner');
          
          // Update cat stats based on partner action
          setCatStats(prev => {
            const updates = {
              feed: { hunger: Math.min(100, prev.hunger + 15), happiness: Math.min(100, prev.happiness + 3) },
              cuddle: { love: Math.min(100, prev.love + 8), happiness: Math.min(100, prev.happiness + 8) },
              love: { love: Math.min(100, prev.love + 12), happiness: Math.min(100, prev.happiness + 6) }
            };
            return { ...prev, ...updates[randomAction] };
          });
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [gameState, partner, addActivityLog]);

  // Debug wallet connection state
  useEffect(() => {
    console.log("Wallet state:", { isConnected, address, isConnecting });
    console.log("Game state:", gameState);
    console.log("Available connectors:", connectors.map(c => c.name));
    console.log("Connect error:", connectError);
    console.log("Sign error:", signError);
    console.log("Signature:", signature);
  }, [isConnected, address, isConnecting, connectors, connectError, signError, signature, gameState]);

  // Handle successful signature
  useEffect(() => {
    if (signature) {
      console.log("Message signed successfully, transitioning to invite screen");
      
      // Log wallet connection to database
      if (address && context?.user?.fid) {
        console.log('Logging wallet connection to database...', { address, fid: context.user.fid });
        fetch('/api/wallet-connection', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.user.fid}` // Add auth header
          },
          body: JSON.stringify({
            address,
            chainId: 84532, // Base Sepolia testnet
            connector: 'MetaMask' // This should be dynamic based on actual connector used
          })
        })
        .then(response => response.json())
        .then(data => {
          console.log('Wallet connection logged successfully:', data);
        })
        .catch(error => {
          console.error('Failed to log wallet connection:', error);
        });
      }
      
      setGameState("invite");
      setIsConnecting(false);
    }
  }, [signature, address, context?.user?.fid]);

  // Handle connection errors
  useEffect(() => {
    if (connectError && isConnecting) {
      console.error("Failed to connect wallet:", connectError);
      setIsConnecting(false);
    }
  }, [connectError, isConnecting]);

  // Handle sign errors
  useEffect(() => {
    if (signError && isConnecting) {
      console.error("Failed to sign message:", signError);
      setIsConnecting(false);
    }
  }, [signError, isConnecting]);

  // Handle connection state changes
  useEffect(() => {
    if (isConnected && isConnecting) {
      // Wallet just connected, now sign the message
      console.log("Wallet connected, now signing message...");
      signMessage({ 
        message: "Welcome to onbase Meow! Let's raise a cat together 🐱"
      });
    }
  }, [isConnected, isConnecting, signMessage]);

  // Handle case where user is already connected but needs to sign
  useEffect(() => {
    if (isConnected && !isConnecting && gameState === "welcome") {
      console.log("User already connected, prompting to sign...");
      setIsConnecting(true);
      signMessage({ 
        message: "Welcome to onbase Meow! Let's raise a cat together 🐱"
      });
    }
  }, [isConnected, isConnecting, gameState, signMessage]);

  // All hooks must be called before any conditional logic
  const handlePlay = useCallback(() => {
    if (!isConnected) {
      setIsConnecting(true);
      // Try to connect with the first available connector to Base Sepolia testnet
      connect({ 
        connector: connectors[0],
        chainId: baseSepolia.id
      });
    } else {
      // If already connected, just sign the message
      signMessage({ 
        message: "Welcome to onbase Meow! Let's raise a cat together 🐱"
      });
    }
  }, [isConnected, connect, connectors, signMessage]);

  const handleInvitePartner = useCallback(async () => {
    // Simulate partner joining
    setPartner({
      fid: 12345,
      username: "partner",
      pfpUrl: "/placeholder-user.jpg"
    });
    
    // Create cat session in database
    if (context?.user?.fid) {
      console.log('Creating cat session in database...', { fid: context.user.fid });
      try {
        const response = await fetch('/api/cat-session', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.user.fid}` // Add auth header
          },
          body: JSON.stringify({
            partnerFid: 12345,
            name: 'cattyyy'
          })
        });
        const data = await response.json();
        console.log('Cat session created:', data);
        if (data.session?.id) {
          setCurrentSessionId(data.session.id);
        }
      } catch (error) {
        console.error('Failed to create cat session:', error);
      }
    }
    
    // Add some initial partner activities
    const initialActivities: ActivityLog[] = [
      {
        id: "1",
        action: "feed",
        user: "partner",
        timestamp: new Date(Date.now() - 30000) // 30 seconds ago
      },
      {
        id: "2", 
        action: "love",
        user: "partner",
        timestamp: new Date(Date.now() - 60000) // 1 minute ago
      }
    ];
    setActivityLog(initialActivities);
    
    setGameState("cat-care");
  }, [context?.user?.fid]);

  const handleFeed = useCallback(() => {
    setShowFeedAnimation(true);
    setCatStats(prev => ({
      ...prev,
      hunger: Math.min(100, prev.hunger + 20),
      happiness: Math.min(100, prev.happiness + 5)
    }));
    addActivityLog('feed', 'you');
    setTimeout(() => setShowFeedAnimation(false), 2000);
  }, [addActivityLog]);

  const handleShowLove = useCallback(() => {
    setShowLoveAnimation(true);
    setCatStats(prev => ({
      ...prev,
      love: Math.min(100, prev.love + 15),
      happiness: Math.min(100, prev.happiness + 10)
    }));
    addActivityLog('love', 'you');
    setTimeout(() => setShowLoveAnimation(false), 2000);
  }, [addActivityLog]);

  const handleCuddle = useCallback(() => {
    setCatStats(prev => ({
      ...prev,
      love: Math.min(100, prev.love + 10),
      happiness: Math.min(100, prev.happiness + 15)
    }));
    addActivityLog('cuddle', 'you');
  }, [addActivityLog]);

  // Now we can have conditional logic after all hooks are called
  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-bounce text-2xl mb-4">🐱</div>
          <div className="text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  const StatBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="mb-3">
      <div className="text-xs mb-1">{label}</div>
      <div className="w-full h-4 bg-secondary border-2 border-primary rounded">
        <div 
          className="h-full rounded transition-all duration-500"
          style={{ 
            width: `${value}%`, 
            backgroundColor: color 
          }}
        />
      </div>
    </div>
  );

  const MarketplaceItem = ({ name, icon, price }: { name: string; icon: string; price: number }) => (
    <div className="bg-card border-2 border-primary rounded-lg p-3 text-center cursor-pointer hover:bg-accent transition-colors">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs mb-1">{name}</div>
      <div className="text-xs text-primary">{price} coins</div>
    </div>
  );

  // Welcome Screen
  if (gameState === "welcome") {
    return (
      <div 
        className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
        style={{
          paddingTop: context?.client.safeAreaInsets?.top ?? 0,
          paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        }}
      >
        <div className="bg-card border-4 border-primary rounded-3xl p-8 max-w-sm w-full text-center">
          <h1 className="text-2xl mb-6 text-primary">ONBASE MEOW</h1>
          
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-primary overflow-hidden bg-yellow-950">
              <Image 
                src="/idle.gif" 
                alt="Cat" 
                width={128}
                height={128}
                className="w-full h-full object-cover p-4"
              />
            </div>
          </div>

          <Button 
            onClick={handlePlay}
            disabled={isConnecting || isSignPending}
            className="mb-6 px-8 py-3 bg-primary text-primary-foreground border-2 border-primary rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            {isConnecting ? "Connecting..." : isSignPending ? "Signing..." : "play"}
          </Button>

          <div className="text-xs text-muted-foreground">
            get a cat with<br />
            your loved ones
          </div>
        </div>
      </div>
    );
  }

  // Invite Partner Screen
  if (gameState === "invite") {
    return (
      <div 
        className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
        style={{
          paddingTop: context?.client.safeAreaInsets?.top ?? 0,
          paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        }}
      >
        <div className="bg-card border-4 border-primary rounded-3xl p-8 max-w-sm w-full text-center">
          <h2 className="text-lg mb-6 text-primary">Invite Your Partner</h2>
          
          <div className="text-xs mb-6 text-muted-foreground">
            Share this with your loved one to start raising a cat together!
          </div>

          <ShareButton
            buttonText="Invite Partner"
            cast={{
              text: "Let's raise a cute cat together on onbase Meow! 🐱💕",
              bestFriends: true,
              embeds: [
                `${process.env.NEXT_PUBLIC_URL}/share/${context?.user?.fid || ""}`,
              ],
            }}
            className="mb-4 w-full"
          />

          <Button 
            onClick={handleInvitePartner}
            className="w-full bg-accent text-accent-foreground border-2 border-primary rounded-lg"
          >
            Skip (Demo Mode)
          </Button>
        </div>
      </div>
    );
  }

  // Cat Care Screen
  if (gameState === "cat-care") {
    return (
      <div 
        className="min-h-screen bg-background px-4 py-6"
        style={{
          paddingTop: context?.client.safeAreaInsets?.top ?? 0,
          paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-card border-2 border-primary rounded-lg p-3">
          <div className="text-sm">onbase Meow</div>
          <button className="text-primary">
            <div className="w-6 h-6 border-2 border-primary bg-primary"></div>
          </button>
        </div>

        {/* Cat Display */}
        <div className="relative mb-6 bg-yellow-950 border-2 border-primary rounded-lg p-4 min-h-[300px] flex items-center justify-center">
          <Image 
            src={`/idle.gif`}
            alt="Your Cat" 
            width={192}
            height={192}
            className="w-48 h-48 object-contain"
          />
          
          {showLoveAnimation && (
            <img 
              src="/love.gif" 
              alt="Love animation"
              className="absolute top-4 right-4 w-12 h-12"
            />
          )}
          
          {showFeedAnimation && (
            <Image 
              src="/eating.gif" 
              alt="Eating animation"
              width={48}
              height={48}
              className="absolute bottom-4 left-4 w-12 h-12"
            />
          )}
        </div>

        {/* Love Bar */}
        <div className="mb-4 bg-card border-2 border-primary rounded-lg p-3">
          <StatBar label="love bar" value={catStats.love} color="#FF69B4" />
        </div>

        {/* Action Buttons */}
        <div className="mb-4 bg-card border-2 border-primary rounded-lg p-3">
          <Button 
            onClick={handleShowLove}
            className="w-full mb-2 bg-primary text-primary-foreground"
          >
            show love
          </Button>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleFeed}
              className="flex-1 bg-accent text-accent-foreground"
            >
              feed
            </Button>
            <Button 
              onClick={handleCuddle}
              className="flex-1 bg-accent text-accent-foreground"
            >
              cuddle
            </Button>
          </div>
        </div>

        {/* Activity Log */}
        <div className="mb-4 bg-card border-2 border-primary rounded-lg p-3">
          <div className="text-xs text-primary mb-2">dairy</div>
          <div className="space-y-1">
            {activityLog.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                <div>no activities yet</div>
              </div>
            ) : (
              activityLog.map((activity) => (
                <div key={activity.id} className="text-xs text-muted-foreground">
                  {activity.user === 'you' ? 'u' : 'ur partner'} {activity.action}ed it
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 bg-card border-2 border-primary rounded-lg p-3">
          <StatBar label="Hunger" value={catStats.hunger} color="#4CAF50" />
          <StatBar label="Happiness" value={catStats.happiness} color="#FFD700" />
        </div>

        {/* Navigation */}
        <div className="flex gap-2 flex-col">
          <Button 
            onClick={() => setGameState("marketplace")}
            className="flex-1 bg-secondary text-secondary-foreground border-2 border-primary"
          >
            Marketplace
          </Button>
          <Button 
            onClick={() => setGameState("playground")}
            className="flex-1 bg-secondary text-secondary-foreground border-2 border-primary"
          >
            Playground
          </Button>
        </div>
      </div>
    );
  }

  // Marketplace Screen
  if (gameState === "marketplace") {
    return (
      <div 
        className="min-h-screen bg-background px-4 py-6"
        style={{
          paddingTop: context?.client.safeAreaInsets?.top ?? 0,
          paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={() => setGameState("cat-care")}
            className="text-sm bg-secondary text-secondary-foreground border-2 border-primary px-3 py-1"
          >
            ← Back
          </Button>
          <h2 className="text-lg text-primary">Marketplace</h2>
          <div></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MarketplaceItem name="food" icon="🍽️" price={10} />
          <MarketplaceItem name="bed" icon="🛏️" price={25} />
          <MarketplaceItem name="bowl" icon="🥣" price={15} />
          <MarketplaceItem name="cat toy" icon="🧸" price={20} />
          <MarketplaceItem name="treats" icon="🦴" price={12} />
          <MarketplaceItem name="ribbon" icon="🎀" price={30} />
        </div>
      </div>
    );
  }

  // Playground Screen
  if (gameState === "playground") {
    return (
      <div 
        className="min-h-screen bg-background px-4 py-6"
        style={{
          paddingTop: context?.client.safeAreaInsets?.top ?? 0,
          paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={() => setGameState("cat-care")}
            className="text-sm bg-secondary text-secondary-foreground border-2 border-primary px-3 py-1"
          >
            ← Back
          </Button>
          <h2 className="text-lg text-primary">playground</h2>
          <div></div>
        </div>

        <div className="bg-secondary border-2 border-primary rounded-lg p-4 mb-4 min-h-[400px] relative">
          <Image 
            src="/CatPackPaid/CatItems/Rooms/Room1.png"
            alt="Playground background"
            width={400}
            height={400}
            className="absolute inset-0 w-full h-full object-cover rounded"
          />
          
          <div className="relative z-10 flex items-center justify-center h-full">
            <Image 
              src={`/CatPackPaid/Sprites/${selectedCat}`}
              alt="Playing cat" 
              width={128}
              height={128}
              className="w-32 h-32 object-contain animate-bounce"
            />
          </div>
        </div>

        <div className="bg-card border-2 border-primary rounded-lg p-3 text-center">
          <div className="text-sm mb-2">cattyyy is happy</div>
          <div className="text-xs text-muted-foreground mb-3">
            <div>i am hungry</div>
            <div>i need love</div>
          </div>
          
          {catStats.happiness > 70 && (
            <div className="text-xs text-primary animate-pulse">
              cattyyy is sleepy
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
