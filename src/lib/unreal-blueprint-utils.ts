/**
 * Unreal Engine Template & Blueprint Utility Library
 *
 * Provides pre-built templates for common UE5 game genres, Blueprint description
 * generators, C++ header/source generators, project structure builders, and
 * Blueprint connection validators.
 *
 * These are structured starting points for the Unreal Vibe Agent swarm.
 */

// ── Types ──

export interface BlueprintNode {
  type: "event" | "function" | "macro" | "branch" | "cast" | "sequence" | "custom";
  properties: Record<string, string>;
  connections: string[];
}

export interface BlueprintSpec {
  name: string;
  type: "actor" | "widget" | "game-mode" | "component";
  description: string;
  nodes: BlueprintNode[];
  variables: Array<{ name: string; type: string; default: string }>;
}

export interface Property {
  name: string;
  type: string;
  category?: string;
  meta?: string;
  default?: string;
}

export interface Function {
  name: string;
  returnType: string;
  params: Array<{ name: string; type: string }>;
  body: string;
  specifiers?: string[];
}

export interface ProjectFile {
  path: string;
  content: string;
  type: "header" | "source" | "config" | "blueprint-stub" | "material" | "map";
}

export interface ValidationResult {
  blueprint: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UnrealTemplate {
  label: string;
  description: string;
  complexity: "beginner" | "intermediate" | "advanced";
  baseBlueprints: Array<{
    name: string;
    type: "actor" | "widget" | "game-mode" | "component";
    description: string;
    nodes_summary: string;
  }>;
  baseLevelLayout: {
    description: string;
    key_areas: string[];
    lighting_preset: string;
  };
  baseCppStubs: Array<{
    className: string;
    parentClass: string;
    header_snippet: string;
    source_snippet: string;
  }>;
  projectConfig: string;
}

// ── Templates ──

export const UNREAL_TEMPLATES: Record<string, UnrealTemplate> = {
  "fps-shooter": {
    label: "FPS Shooter",
    description: "First-person shooter with weapons, enemies, and multiplayer-ready architecture",
    complexity: "intermediate",
    baseBlueprints: [
      {
        name: "BP_FPSCharacter",
        type: "actor",
        description: "First-person player character with weapon socket, ADS, sprint, crouch, health system",
        nodes_summary: "EventBeginPlay -> InitWeaponSlots; EventTick -> UpdateRecoil; InputAction.Fire -> FireWeapon -> LineTrace -> ApplyDamage; InputAction.Reload -> PlayReloadMontage",
      },
      {
        name: "BP_EnemyAI",
        type: "actor",
        description: "Enemy AI with patrol, chase, attack states using Behavior Tree and AI Perception",
        nodes_summary: "EventBeginPlay -> RunBehaviorTree; OnPerceptionUpdated -> SetTargetActor; TakeDamage -> UpdateHealth -> Branch(Dead) -> Ragdoll",
      },
      {
        name: "BP_FPSGameMode",
        type: "game-mode",
        description: "Deathmatch/TDM game mode with scoring, round timer, and respawn logic",
        nodes_summary: "OnPostLogin -> SpawnPlayer; OnKill -> UpdateScore -> CheckWinCondition; RoundTimer -> EndRound -> ShowScoreboard",
      },
      {
        name: "WBP_HUD",
        type: "widget",
        description: "FPS HUD with crosshair, health bar, ammo counter, kill feed, minimap",
        nodes_summary: "Construct -> BindHealthBar; UpdateAmmo -> SetText; OnKillEvent -> AddKillFeedEntry; UpdateMinimap -> SetPlayerIcon",
      },
    ],
    baseLevelLayout: {
      description: "Symmetrical three-lane arena map with verticality, cover objects, and weapon pickup spawns",
      key_areas: ["Spawn Zone A", "Spawn Zone B", "Mid Control Point", "Sniper Tower", "Underground Tunnel", "Ammo Cache Room"],
      lighting_preset: "Lumen Dynamic GI, directional sun at 60deg, volumetric fog in tunnels, neon accent lights",
    },
    baseCppStubs: [
      {
        className: "AFPSGameInstance",
        parentClass: "UGameInstance",
        header_snippet: `#pragma once
#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "FPSGameInstance.generated.h"

UCLASS()
class MYGAME_API AFPSGameInstance : public UGameInstance
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintReadWrite, Category = "Game State")
    int32 TotalKills;

    UPROPERTY(BlueprintReadWrite, Category = "Game State")
    int32 TotalDeaths;

    UFUNCTION(BlueprintCallable, Category = "Save")
    void SavePlayerStats();

    UFUNCTION(BlueprintCallable, Category = "Save")
    void LoadPlayerStats();
};`,
        source_snippet: `#include "FPSGameInstance.h"
#include "Kismet/GameplayStatics.h"

void AFPSGameInstance::SavePlayerStats()
{
    // TODO: Implement save to local/cloud storage
}

void AFPSGameInstance::LoadPlayerStats()
{
    // TODO: Implement load from local/cloud storage
}`,
      },
      {
        className: "UFPSBallisticsComponent",
        parentClass: "UActorComponent",
        header_snippet: `#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "FPSBallisticsComponent.generated.h"

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class MYGAME_API UFPSBallisticsComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ballistics")
    float MuzzleVelocity = 900.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Ballistics")
    float GravityScale = 1.0f;

    UFUNCTION(BlueprintCallable, Category = "Ballistics")
    FVector PredictProjectileLocation(float Time) const;
};`,
        source_snippet: `#include "FPSBallisticsComponent.h"

FVector UFPSBallisticsComponent::PredictProjectileLocation(float Time) const
{
    if (FMath::IsNaN(Time) || Time < 0.0f) return FVector::ZeroVector;
    const float Gravity = 980.0f * GravityScale;
    const FVector Forward = GetOwner()->GetActorForwardVector() * MuzzleVelocity * Time;
    const float Drop = 0.5f * Gravity * Time * Time;
    return GetOwner()->GetActorLocation() + Forward - FVector(0, 0, Drop);
}`,
      },
    ],
    projectConfig: `{
  "FileVersion": 3,
  "EngineAssociation": "5.4",
  "Category": "",
  "Description": "FPS Shooter Project",
  "Modules": [
    { "Name": "MyFPSGame", "Type": "Runtime", "LoadingPhase": "Default" }
  ],
  "Plugins": [
    { "Name": "EnhancedInput", "Enabled": true },
    { "Name": "Niagara", "Enabled": true },
    { "Name": "ChaosPhysics", "Enabled": true },
    { "Name": "OnlineSubsystem", "Enabled": true }
  ]
}`,
  },

  "third-person-adventure": {
    label: "Third-Person Adventure",
    description: "Third-person action-adventure with exploration, puzzles, combat, and narrative",
    complexity: "intermediate",
    baseBlueprints: [
      {
        name: "BP_AdventureCharacter",
        type: "actor",
        description: "Third-person character with camera boom, lock-on targeting, dodge roll, light/heavy attack combo",
        nodes_summary: "EventTick -> UpdateCameraBoom; InputAction.LockOn -> FindNearestEnemy -> SetFocalPoint; InputAction.Dodge -> PlayDodgeMontage -> IFrameWindow; ComboSystem -> LightAttack|HeavyAttack -> ApplyDamage",
      },
      {
        name: "BP_PuzzleInteractable",
        type: "actor",
        description: "Base interactable for puzzle elements: pressure plates, levers, movable blocks",
        nodes_summary: "OnInteract -> CheckPuzzleState -> Branch(Solved) -> PlaySolvedSequence -> OpenDoor; OnOverlap -> ActivatePlate -> UpdatePuzzleManager",
      },
      {
        name: "BP_AdventureGameMode",
        type: "game-mode",
        description: "Story-driven game mode with quest tracking, checkpoint saves, and cutscene triggers",
        nodes_summary: "OnQuestUpdate -> CheckObjectives -> Branch(Complete) -> TriggerCutscene; OnCheckpoint -> AutoSave; OnPlayerDeath -> RespawnAtCheckpoint",
      },
      {
        name: "WBP_AdventureHUD",
        type: "widget",
        description: "Adventure HUD with health/stamina orbs, quest tracker, interaction prompts, inventory quick-slot",
        nodes_summary: "Construct -> BindHealthOrb -> BindStaminaOrb; OnQuestUpdate -> RefreshTracker; OnNearInteractable -> ShowPrompt; OnInventoryChange -> UpdateSlots",
      },
    ],
    baseLevelLayout: {
      description: "Hub-and-spoke overworld with central village, branching paths to themed dungeons, hidden collectible areas",
      key_areas: ["Central Village Hub", "Forest Path", "Mountain Dungeon Entrance", "Underwater Cave", "Ancient Ruins", "Boss Arena"],
      lighting_preset: "Lumen GI with time-of-day cycle, warm directional sun, volumetric clouds, god rays through canopy",
    },
    baseCppStubs: [
      {
        className: "AAdventurePlayerController",
        parentClass: "APlayerController",
        header_snippet: `#pragma once
#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "AdventurePlayerController.generated.h"

UCLASS()
class MYGAME_API AAdventurePlayerController : public APlayerController
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintReadWrite, Category = "Camera")
    float LockOnRange = 1500.0f;

    UFUNCTION(BlueprintCallable, Category = "Targeting")
    AActor* FindNearestLockOnTarget() const;

    UFUNCTION(BlueprintCallable, Category = "Camera")
    void SetCameraMode(FName ModeName);
};`,
        source_snippet: `#include "AdventurePlayerController.h"
#include "Kismet/KismetSystemLibrary.h"

AActor* AAdventurePlayerController::FindNearestLockOnTarget() const
{
    TArray<FHitResult> Hits;
    const FVector Start = GetPawn()->GetActorLocation();
    FCollisionShape Sphere = FCollisionShape::MakeSphere(LockOnRange);
    GetWorld()->SweepMultiByChannel(Hits, Start, Start, FQuat::Identity, ECC_Pawn, Sphere);

    AActor* Nearest = nullptr;
    float MinDist = LockOnRange;
    for (const auto& Hit : Hits)
    {
        if (Hit.GetActor() && Hit.GetActor() != GetPawn())
        {
            const float Dist = FVector::Dist(Start, Hit.GetActor()->GetActorLocation());
            if (Dist < MinDist) { MinDist = Dist; Nearest = Hit.GetActor(); }
        }
    }
    return Nearest;
}

void AAdventurePlayerController::SetCameraMode(FName ModeName)
{
    // TODO: Switch camera behavior (exploration, combat, cutscene)
}`,
      },
    ],
    projectConfig: `{
  "FileVersion": 3,
  "EngineAssociation": "5.4",
  "Category": "",
  "Description": "Third-Person Adventure Project",
  "Modules": [
    { "Name": "MyAdventureGame", "Type": "Runtime", "LoadingPhase": "Default" }
  ],
  "Plugins": [
    { "Name": "EnhancedInput", "Enabled": true },
    { "Name": "Niagara", "Enabled": true },
    { "Name": "MetaSounds", "Enabled": true },
    { "Name": "ChaosPhysics", "Enabled": true }
  ]
}`,
  },

  "top-down-strategy": {
    label: "Top-Down Strategy",
    description: "Real-time or turn-based strategy with unit management, resource economy, and fog of war",
    complexity: "advanced",
    baseBlueprints: [
      {
        name: "BP_StrategyCamera",
        type: "actor",
        description: "RTS camera pawn with edge scrolling, zoom, rotation, and click-to-select",
        nodes_summary: "EventTick -> EdgeScroll -> UpdateCameraPosition; InputAction.Zoom -> SmoothZoomLerp; InputAction.Select -> BoxSelect|ClickSelect -> UpdateSelectedUnits",
      },
      {
        name: "BP_UnitBase",
        type: "actor",
        description: "Base unit with pathfinding, formation movement, attack, and resource gathering",
        nodes_summary: "CommandMoveTo -> FindPath -> FollowPath; CommandAttack -> SetTarget -> RotateToFace -> FireProjectile; CommandGather -> MoveToResource -> Gather -> ReturnToBase",
      },
      {
        name: "BP_StrategyGameMode",
        type: "game-mode",
        description: "RTS game mode with fog of war, resource management, tech tree, and win conditions",
        nodes_summary: "OnMatchStart -> InitFogOfWar -> SpawnStartingUnits; OnResourceUpdate -> UpdateUI; OnBuildingComplete -> UnlockTechTree; CheckVictoryConditions -> EndMatch",
      },
      {
        name: "WBP_StrategyHUD",
        type: "widget",
        description: "RTS HUD with minimap, resource counters, unit selection panel, build queue, tech tree",
        nodes_summary: "Construct -> InitMinimap -> BindResources; OnSelectionChanged -> UpdateUnitPanel; OnBuildOrder -> AddToQueue; OnTechResearched -> UpdateTechTree",
      },
    ],
    baseLevelLayout: {
      description: "Symmetrical 2-4 player map with resource nodes, choke points, high ground advantage, and expansion zones",
      key_areas: ["Player Base 1", "Player Base 2", "Central Resource Node", "Northern Choke Point", "Eastern Expansion", "River Crossing"],
      lighting_preset: "Baked lighting with top-down directional sun, soft shadows, minimap-friendly flat lighting",
    },
    baseCppStubs: [
      {
        className: "UStrategyFogOfWarSubsystem",
        parentClass: "UWorldSubsystem",
        header_snippet: `#pragma once
#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "StrategyFogOfWarSubsystem.generated.h"

UCLASS()
class MYGAME_API UStrategyFogOfWarSubsystem : public UWorldSubsystem
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable, Category = "Fog of War")
    void RevealArea(FVector2D Center, float Radius, int32 TeamId);

    UFUNCTION(BlueprintCallable, Category = "Fog of War")
    bool IsLocationVisible(FVector2D Location, int32 TeamId) const;

private:
    TArray<TArray<uint8>> FogGrid;
    int32 GridResolution = 256;
};`,
        source_snippet: `#include "StrategyFogOfWarSubsystem.h"

void UStrategyFogOfWarSubsystem::RevealArea(FVector2D Center, float Radius, int32 TeamId)
{
    if (Radius <= 0.0f || TeamId < 0) return;
    // TODO: Update fog grid cells within radius for team
}

bool UStrategyFogOfWarSubsystem::IsLocationVisible(FVector2D Location, int32 TeamId) const
{
    if (TeamId < 0 || FogGrid.Num() == 0) return false;
    // TODO: Sample fog grid at location for team
    return false;
}`,
      },
    ],
    projectConfig: `{
  "FileVersion": 3,
  "EngineAssociation": "5.4",
  "Category": "",
  "Description": "Top-Down Strategy Project",
  "Modules": [
    { "Name": "MyStrategyGame", "Type": "Runtime", "LoadingPhase": "Default" }
  ],
  "Plugins": [
    { "Name": "EnhancedInput", "Enabled": true },
    { "Name": "Niagara", "Enabled": true },
    { "Name": "GameplayAbilities", "Enabled": true },
    { "Name": "AIModule", "Enabled": true }
  ]
}`,
  },

  "racing-game": {
    label: "Racing Game",
    description: "Arcade or simulation racing with vehicle physics, tracks, and lap management",
    complexity: "intermediate",
    baseBlueprints: [
      {
        name: "BP_RacingVehicle",
        type: "actor",
        description: "Vehicle pawn with Chaos Vehicle physics, boost, drift mechanics, and damage model",
        nodes_summary: "EventTick -> UpdateEngineRPM -> UpdateSpeedometer; InputAction.Throttle -> ApplyThrottle; InputAction.Brake -> ApplyBrake; InputAction.Boost -> ActivateNitro -> DepletBoostMeter",
      },
      {
        name: "BP_TrackSpline",
        type: "actor",
        description: "Spline-based track definition with checkpoints, lap counting, and position tracking",
        nodes_summary: "OnCheckpointOverlap -> ValidateLapProgress -> IncrementCheckpoint; OnLapComplete -> UpdateLeaderboard -> CheckFinishCondition",
      },
      {
        name: "BP_RacingGameMode",
        type: "game-mode",
        description: "Race game mode with countdown start, position tracking, rubber banding, and podium finish",
        nodes_summary: "OnMatchStart -> CountdownSequence -> EnableInput; UpdatePositions -> SortByTrackProgress; OnAllFinished -> ShowResults -> AwardXP",
      },
      {
        name: "WBP_RacingHUD",
        type: "widget",
        description: "Racing HUD with speedometer, position indicator, minimap track, lap counter, boost meter",
        nodes_summary: "EventTick -> UpdateSpeedNeedle -> UpdateBoostBar; OnPositionChange -> AnimatePositionText; OnLapComplete -> FlashLapCounter",
      },
    ],
    baseLevelLayout: {
      description: "Circuit track with varied terrain sections, elevation changes, shortcuts, and spectator areas",
      key_areas: ["Start/Finish Straight", "Hairpin Corner", "S-Curve Section", "Tunnel Shortcut", "Jump Ramp", "Pit Lane"],
      lighting_preset: "Dynamic time-of-day with Lumen, HDR sky, track-side neon lights for night racing",
    },
    baseCppStubs: [
      {
        className: "URacingPhysicsComponent",
        parentClass: "UActorComponent",
        header_snippet: `#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "RacingPhysicsComponent.generated.h"

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class MYGAME_API URacingPhysicsComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Physics")
    float DownforceCoefficient = 3.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Physics")
    float DriftFrictionMultiplier = 0.6f;

    UFUNCTION(BlueprintCallable, Category = "Physics")
    float CalculateDownforce(float Speed) const;

    UFUNCTION(BlueprintCallable, Category = "Physics")
    FVector CalculateDriftForce(FVector Velocity, FVector ForwardVector) const;
};`,
        source_snippet: `#include "RacingPhysicsComponent.h"

float URacingPhysicsComponent::CalculateDownforce(float Speed) const
{
    if (FMath::IsNaN(Speed) || Speed < 0.0f) return 0.0f;
    return DownforceCoefficient * Speed * Speed * 0.001f;
}

FVector URacingPhysicsComponent::CalculateDriftForce(FVector Velocity, FVector ForwardVector) const
{
    const float Speed = Velocity.Size();
    if (Speed < KINDA_SMALL_NUMBER) return FVector::ZeroVector;
    const FVector LateralVelocity = Velocity - (FVector::DotProduct(Velocity, ForwardVector) * ForwardVector);
    return -LateralVelocity * DriftFrictionMultiplier;
}`,
      },
    ],
    projectConfig: `{
  "FileVersion": 3,
  "EngineAssociation": "5.4",
  "Category": "",
  "Description": "Racing Game Project",
  "Modules": [
    { "Name": "MyRacingGame", "Type": "Runtime", "LoadingPhase": "Default" }
  ],
  "Plugins": [
    { "Name": "EnhancedInput", "Enabled": true },
    { "Name": "ChaosVehiclesPlugin", "Enabled": true },
    { "Name": "Niagara", "Enabled": true }
  ]
}`,
  },

  "horror-survival": {
    label: "Horror Survival",
    description: "First-person horror with resource scarcity, stealth mechanics, and atmospheric tension",
    complexity: "intermediate",
    baseBlueprints: [
      {
        name: "BP_SurvivorCharacter",
        type: "actor",
        description: "Survival character with flashlight, sanity meter, limited inventory, stealth crouch, heartbeat audio",
        nodes_summary: "EventTick -> UpdateSanity -> UpdateHeartbeatAudio; InputAction.Flashlight -> ToggleFlashlight -> DrainBattery; InputAction.Interact -> PickupItem -> AddToInventory; OnDamage -> ScreenBloodEffect -> CheckDeath",
      },
      {
        name: "BP_HorrorAI",
        type: "actor",
        description: "Enemy AI with patrol routes, sound-based detection, hunt/search states, jumpscare triggers",
        nodes_summary: "EventTick -> UpdatePatrol; OnHearNoise -> InvestigateLocation; OnSeePlayer -> EnterHuntState -> ChasePlayer; OnLosePlayer -> SearchArea -> ResumePatrol; OnCatchPlayer -> TriggerJumpscare",
      },
      {
        name: "BP_HorrorGameMode",
        type: "game-mode",
        description: "Horror game mode with save rooms, key item progression, dynamic difficulty, and escape objective",
        nodes_summary: "OnKeyItemCollected -> UpdateProgress -> UnlockArea; OnSaveRoom -> SaveGame; OnPlayerDeath -> GameOverScreen; DynamicDifficulty -> AdjustEnemyAggression",
      },
      {
        name: "WBP_HorrorHUD",
        type: "widget",
        description: "Minimal horror HUD with sanity indicator, inventory overlay, interaction prompts, film grain overlay",
        nodes_summary: "Construct -> InitSanityIndicator; OnSanityChange -> UpdateVignetteIntensity; OnInventoryOpen -> ShowGrid; OnInteractable -> FadeInPrompt",
      },
    ],
    baseLevelLayout: {
      description: "Abandoned mansion/facility with interconnected rooms, locked doors, hidden passages, and claustrophobic corridors",
      key_areas: ["Main Entrance Hall", "Library (Save Room)", "Basement Laboratory", "Attic Crawlspace", "Garden Maze", "Final Escape Route"],
      lighting_preset: "Minimal Lumen GI, heavy volumetric fog, flickering point lights, near-black ambient, flashlight-primary illumination",
    },
    baseCppStubs: [
      {
        className: "UHorrorAudioSubsystem",
        parentClass: "UGameInstanceSubsystem",
        header_snippet: `#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HorrorAudioSubsystem.generated.h"

UCLASS()
class MYGAME_API UHorrorAudioSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable, Category = "Horror Audio")
    void SetTensionLevel(float Level);

    UFUNCTION(BlueprintCallable, Category = "Horror Audio")
    void TriggerSting(FName StingId);

    UPROPERTY(BlueprintReadOnly, Category = "Horror Audio")
    float CurrentTension = 0.0f;
};`,
        source_snippet: `#include "HorrorAudioSubsystem.h"

void UHorrorAudioSubsystem::SetTensionLevel(float Level)
{
    CurrentTension = FMath::Clamp(Level, 0.0f, 1.0f);
    // TODO: Crossfade ambient layers based on tension level
}

void UHorrorAudioSubsystem::TriggerSting(FName StingId)
{
    // TODO: Play one-shot audio sting by ID
}`,
      },
    ],
    projectConfig: `{
  "FileVersion": 3,
  "EngineAssociation": "5.4",
  "Category": "",
  "Description": "Horror Survival Project",
  "Modules": [
    { "Name": "MyHorrorGame", "Type": "Runtime", "LoadingPhase": "Default" }
  ],
  "Plugins": [
    { "Name": "EnhancedInput", "Enabled": true },
    { "Name": "MetaSounds", "Enabled": true },
    { "Name": "Niagara", "Enabled": true },
    { "Name": "ChaosPhysics", "Enabled": true }
  ]
}`,
  },

  "open-world-rpg": {
    label: "Open World RPG",
    description: "Large-scale open-world RPG with character progression, quests, crafting, and dynamic world",
    complexity: "advanced",
    baseBlueprints: [
      {
        name: "BP_RPGCharacter",
        type: "actor",
        description: "RPG character with stat system, equipment slots, ability loadout, XP/leveling, dialogue interaction",
        nodes_summary: "EventBeginPlay -> LoadCharacterData; OnLevelUp -> IncreaseStats -> UnlockAbilities; InputAction.Ability1 -> CheckCooldown -> CastAbility -> ApplyEffects; OnEquipItem -> RecalculateStats -> UpdateMesh",
      },
      {
        name: "BP_QuestManager",
        type: "actor",
        description: "Quest system with main/side quests, branching objectives, NPC dialogue triggers, reward distribution",
        nodes_summary: "AcceptQuest -> AddObjectives -> TrackProgress; OnObjectiveComplete -> CheckAllObjectives -> Branch(Complete) -> GrantRewards -> TriggerNextQuest; OnDialogueChoice -> BranchNarrative",
      },
      {
        name: "BP_RPGGameMode",
        type: "game-mode",
        description: "Open-world game mode with world streaming, dynamic events, day/night cycle, weather system",
        nodes_summary: "OnWorldLoad -> StreamLevels -> InitDayNightCycle; EventTick -> UpdateWeather -> CheckDynamicEvents; OnAreaEnter -> LoadSubLevel -> SpawnEncounters",
      },
      {
        name: "WBP_RPGHUD",
        type: "widget",
        description: "RPG HUD with health/mana/stamina bars, compass, quest tracker, XP bar, hotbar, dialogue box",
        nodes_summary: "Construct -> BindBars -> InitCompass -> InitHotbar; OnQuestUpdate -> RefreshTracker; OnDialogueStart -> ShowDialogueBox -> WaitForInput; OnXPGain -> AnimateXPBar",
      },
    ],
    baseLevelLayout: {
      description: "Vast open-world with biome regions, cities, dungeons, and points of interest connected by roads and paths",
      key_areas: ["Starting Village", "Capital City", "Dark Forest", "Mountain Pass Dungeon", "Coastal Trading Port", "Dragon's Peak (Endgame)"],
      lighting_preset: "Full Lumen GI with dynamic day/night cycle, per-biome post-process volumes, real-time weather lighting changes",
    },
    baseCppStubs: [
      {
        className: "URPGAttributeSet",
        parentClass: "UAttributeSet",
        header_snippet: `#pragma once
#include "CoreMinimal.h"
#include "AttributeSet.h"
#include "AbilitySystemComponent.h"
#include "RPGAttributeSet.generated.h"

#define ATTRIBUTE_ACCESSORS(ClassName, PropertyName) \\
    GAMEPLAYATTRIBUTE_PROPERTY_GETTER(ClassName, PropertyName) \\
    GAMEPLAYATTRIBUTE_VALUE_GETTER(PropertyName) \\
    GAMEPLAYATTRIBUTE_VALUE_SETTER(PropertyName) \\
    GAMEPLAYATTRIBUTE_VALUE_INITTER(PropertyName)

UCLASS()
class MYGAME_API URPGAttributeSet : public UAttributeSet
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintReadOnly, Category = "Attributes", ReplicatedUsing = OnRep_Health)
    FGameplayAttributeData Health;
    ATTRIBUTE_ACCESSORS(URPGAttributeSet, Health)

    UPROPERTY(BlueprintReadOnly, Category = "Attributes", ReplicatedUsing = OnRep_Mana)
    FGameplayAttributeData Mana;
    ATTRIBUTE_ACCESSORS(URPGAttributeSet, Mana)

    UPROPERTY(BlueprintReadOnly, Category = "Attributes")
    FGameplayAttributeData Strength;
    ATTRIBUTE_ACCESSORS(URPGAttributeSet, Strength)

    UFUNCTION()
    void OnRep_Health(const FGameplayAttributeData& OldHealth);
    UFUNCTION()
    void OnRep_Mana(const FGameplayAttributeData& OldMana);
};`,
        source_snippet: `#include "RPGAttributeSet.h"
#include "Net/UnrealNetwork.h"

void URPGAttributeSet::OnRep_Health(const FGameplayAttributeData& OldHealth)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(URPGAttributeSet, Health, OldHealth);
}

void URPGAttributeSet::OnRep_Mana(const FGameplayAttributeData& OldMana)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(URPGAttributeSet, Mana, OldMana);
}`,
      },
      {
        className: "ARPGWorldStreamingManager",
        parentClass: "AActor",
        header_snippet: `#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "RPGWorldStreamingManager.generated.h"

UCLASS()
class MYGAME_API ARPGWorldStreamingManager : public AActor
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Streaming")
    float StreamingRadius = 15000.0f;

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    void UpdateStreamedLevels(FVector PlayerLocation);

    UFUNCTION(BlueprintCallable, Category = "Streaming")
    TArray<FName> GetLoadedLevelNames() const;
};`,
        source_snippet: `#include "RPGWorldStreamingManager.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/LevelStreaming.h"

void ARPGWorldStreamingManager::UpdateStreamedLevels(FVector PlayerLocation)
{
    if (StreamingRadius <= 0.0f) return;
    // TODO: Load/unload sub-levels based on distance to PlayerLocation
}

TArray<FName> ARPGWorldStreamingManager::GetLoadedLevelNames() const
{
    TArray<FName> Names;
    // TODO: Return currently loaded streaming level names
    return Names;
}`,
      },
    ],
    projectConfig: `{
  "FileVersion": 3,
  "EngineAssociation": "5.4",
  "Category": "",
  "Description": "Open World RPG Project",
  "Modules": [
    { "Name": "MyRPGGame", "Type": "Runtime", "LoadingPhase": "Default" }
  ],
  "Plugins": [
    { "Name": "EnhancedInput", "Enabled": true },
    { "Name": "GameplayAbilities", "Enabled": true },
    { "Name": "Niagara", "Enabled": true },
    { "Name": "MetaSounds", "Enabled": true },
    { "Name": "ChaosPhysics", "Enabled": true },
    { "Name": "WorldPartition", "Enabled": true }
  ]
}`,
  },
};

// ── Utility Functions ──

/**
 * Get a template by key. Returns undefined if key does not match any template.
 */
export function getTemplate(key: string): UnrealTemplate | undefined {
  return UNREAL_TEMPLATES[key];
}

/**
 * Generate a human-readable text description of a Blueprint graph.
 */
export function generateBlueprintDescription(bp: BlueprintSpec): string {
  const lines: string[] = [];
  lines.push(`Blueprint: ${bp.name} (${bp.type})`);
  lines.push(`Description: ${bp.description}`);
  lines.push("");

  if (bp.variables.length > 0) {
    lines.push("Variables:");
    for (const v of bp.variables) {
      lines.push(`  - ${v.name}: ${v.type} = ${v.default}`);
    }
    lines.push("");
  }

  if (bp.nodes.length > 0) {
    lines.push("Node Graph:");
    for (const node of bp.nodes) {
      const name = node.properties.name || node.type;
      const category = node.properties.category ? ` [${node.properties.category}]` : "";
      const connections = node.connections.length > 0
        ? ` -> ${node.connections.join(", ")}`
        : "";
      lines.push(`  ${node.type.toUpperCase()}: ${name}${category}${connections}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate an Unreal Engine 5 C++ header file with proper UE macros.
 */
export function generateCppHeader(
  className: string,
  parentClass: string,
  properties: Property[],
  functions: Function[]
): string {
  const guardName = className.toUpperCase() + "_H";
  const lines: string[] = [];

  lines.push(`#pragma once`);
  lines.push(``);
  lines.push(`#include "CoreMinimal.h"`);

  // Guess include path from parent class
  if (parentClass === "AActor") {
    lines.push(`#include "GameFramework/Actor.h"`);
  } else if (parentClass === "ACharacter") {
    lines.push(`#include "GameFramework/Character.h"`);
  } else if (parentClass === "APlayerController") {
    lines.push(`#include "GameFramework/PlayerController.h"`);
  } else if (parentClass === "UActorComponent") {
    lines.push(`#include "Components/ActorComponent.h"`);
  } else if (parentClass === "USceneComponent") {
    lines.push(`#include "Components/SceneComponent.h"`);
  } else if (parentClass === "UGameInstance") {
    lines.push(`#include "Engine/GameInstance.h"`);
  } else if (parentClass === "UObject") {
    lines.push(`#include "UObject/NoExportTypes.h"`);
  }

  lines.push(`#include "${className.replace(/^[AUF]/, "")}.generated.h"`);
  lines.push(``);
  lines.push(`UCLASS()`);
  lines.push(`class MYGAME_API ${className} : public ${parentClass}`);
  lines.push(`{`);
  lines.push(`    GENERATED_BODY()`);
  lines.push(``);
  lines.push(`public:`);

  // Properties
  for (const prop of properties) {
    const meta = prop.meta ? `, meta=(${prop.meta})` : "";
    const category = prop.category || "Default";
    lines.push(`    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "${category}"${meta})`);
    lines.push(`    ${prop.type} ${prop.name}${prop.default ? ` = ${prop.default}` : ""};`);
    lines.push(``);
  }

  // Functions
  for (const fn of functions) {
    const specifiers = fn.specifiers?.join(", ") || "BlueprintCallable";
    const params = fn.params
      .map((p) => `${p.type} ${p.name}`)
      .join(", ");
    lines.push(`    UFUNCTION(${specifiers}, Category = "Default")`);
    lines.push(`    ${fn.returnType} ${fn.name}(${params});`);
    lines.push(``);
  }

  lines.push(`};`);

  return lines.join("\n");
}

/**
 * Generate an Unreal Engine 5 C++ source file.
 */
export function generateCppSource(
  className: string,
  functions: Function[]
): string {
  const headerName = className.replace(/^[AUF]/, "");
  const lines: string[] = [];

  lines.push(`#include "${headerName}.h"`);
  lines.push(``);

  for (const fn of functions) {
    const params = fn.params
      .map((p) => `${p.type} ${p.name}`)
      .join(", ");
    lines.push(`${fn.returnType} ${className}::${fn.name}(${params})`);
    lines.push(`{`);
    lines.push(`    ${fn.body}`);
    lines.push(`}`);
    lines.push(``);
  }

  return lines.join("\n");
}

/**
 * Generate the full project file structure from a template and project name.
 */
export function generateProjectStructure(
  template: UnrealTemplate,
  projectName: string
): ProjectFile[] {
  const files: ProjectFile[] = [];

  // .uproject file
  files.push({
    path: `${projectName}/${projectName}.uproject`,
    content: template.projectConfig,
    type: "config",
  });

  // Content folder structure
  const contentFolders = [
    "Blueprints",
    "Maps",
    "Materials",
    "Meshes",
    "UI",
    "Audio",
    "Textures",
    "VFX",
  ];

  for (const folder of contentFolders) {
    files.push({
      path: `${projectName}/Content/${folder}/.gitkeep`,
      content: "",
      type: "config",
    });
  }

  // Blueprint stubs
  for (const bp of template.baseBlueprints) {
    const subfolder = bp.type === "widget" ? "UI" : "Blueprints";
    files.push({
      path: `${projectName}/Content/${subfolder}/${bp.name}.uasset`,
      content: `// Blueprint stub: ${bp.name}\n// Type: ${bp.type}\n// ${bp.description}\n// Nodes: ${bp.nodes_summary}`,
      type: "blueprint-stub",
    });
  }

  // C++ source files
  for (const stub of template.baseCppStubs) {
    const headerFileName = stub.className.replace(/^[AUF]/, "");
    files.push({
      path: `${projectName}/Source/${projectName}/Public/${headerFileName}.h`,
      content: stub.header_snippet,
      type: "header",
    });
    files.push({
      path: `${projectName}/Source/${projectName}/Private/${headerFileName}.cpp`,
      content: stub.source_snippet,
      type: "source",
    });
  }

  // Default map stub
  files.push({
    path: `${projectName}/Content/Maps/MainLevel.umap`,
    content: `// Level stub: ${template.baseLevelLayout.description}\n// Key areas: ${template.baseLevelLayout.key_areas.join(", ")}\n// Lighting: ${template.baseLevelLayout.lighting_preset}`,
    type: "map",
  });

  // Build configs
  files.push({
    path: `${projectName}/Source/${projectName}/${projectName}.Build.cs`,
    content: `using UnrealBuildTool;\n\npublic class ${projectName} : ModuleRules\n{\n    public ${projectName}(ReadOnlyTargetRules Target) : base(Target)\n    {\n        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;\n        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore", "EnhancedInput" });\n    }\n}`,
    type: "config",
  });

  return files;
}

/**
 * Validate Blueprint node connections for consistency.
 * Checks that referenced connections point to existing nodes within or across Blueprints.
 */
export function validateBlueprintConnections(blueprints: BlueprintSpec[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Build a global set of known node names across all blueprints
  const allNodeNames = new Set<string>();
  for (const bp of blueprints) {
    for (const node of bp.nodes) {
      const name = node.properties.name || node.type;
      allNodeNames.add(name);
    }
  }

  for (const bp of blueprints) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Build local node name set
    const localNodeNames = new Set<string>();
    for (const node of bp.nodes) {
      const name = node.properties.name || node.type;
      localNodeNames.add(name);
    }

    // Check each node's connections
    for (const node of bp.nodes) {
      const nodeName = node.properties.name || node.type;

      for (const connection of node.connections) {
        if (!localNodeNames.has(connection)) {
          if (allNodeNames.has(connection)) {
            warnings.push(
              `Node "${nodeName}" references "${connection}" which exists in another Blueprint (cross-BP reference)`
            );
          } else {
            errors.push(
              `Node "${nodeName}" references "${connection}" which does not exist in any Blueprint`
            );
          }
        }
      }
    }

    // Check for orphan nodes (no connections in or out)
    for (const node of bp.nodes) {
      const nodeName = node.properties.name || node.type;
      const hasOutgoing = node.connections.length > 0;
      const hasIncoming = bp.nodes.some((other) =>
        other.connections.includes(nodeName)
      );

      if (!hasOutgoing && !hasIncoming && bp.nodes.length > 1) {
        warnings.push(`Node "${nodeName}" is orphaned (no connections in or out)`);
      }
    }

    // Check variable type validity
    const validTypes = new Set([
      "float", "int", "bool", "vector", "rotator", "string",
      "object-ref", "class-ref", "enum", "array", "map", "set",
      "transform", "color", "name", "text",
    ]);

    for (const variable of bp.variables) {
      if (!validTypes.has(variable.type)) {
        warnings.push(`Variable "${variable.name}" has non-standard type "${variable.type}"`);
      }
    }

    results.push({
      blueprint: bp.name,
      valid: errors.length === 0,
      errors,
      warnings,
    });
  }

  return results;
}
