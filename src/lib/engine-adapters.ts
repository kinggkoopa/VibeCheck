/**
 * Engine Adapters — Multi-engine template and adapter library
 *
 * Provides engine profiles, genre templates, project scaffolding,
 * cross-engine code conversion, and engine comparison utilities.
 *
 * Supported engines: Unity, GameMaker, Bevy, Defold, Godot, Unreal
 */

// ── Types ──

export interface EngineProfile {
  label: string;
  description: string;
  language: string;
  fileExtension: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  projectTemplate: { files: Array<{ path: string; content: string }> };
  sampleCode: string;
}

export interface GameGenreTemplate {
  label: string;
  description: string;
  coreMechanics: string[];
  recommendedEngines: string[];
  mechanicsCode: Record<string, string>;
}

export interface EngineRecommendation {
  engine: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{ engine: string; reasoning: string }>;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface ConversionResult {
  sourceEngine: string;
  targetEngine: string;
  originalCode: string;
  convertedCode: string;
  notes: string[];
  confidence: number;
}

export interface EngineComparison {
  engines: string[];
  dimensions: Array<{
    dimension: string;
    scores: Record<string, number>;
    notes: Record<string, string>;
  }>;
  recommendation: string;
}

// ── Engine Profiles ──

export const ENGINE_PROFILES: Record<string, EngineProfile> = {
  unity: {
    label: "Unity",
    description: "Industry-standard cross-platform game engine with C# scripting, massive asset store, and robust 2D/3D tooling.",
    language: "C#",
    fileExtension: ".cs",
    strengths: [
      "Massive asset store and community",
      "Excellent cross-platform support (25+ platforms)",
      "Strong 2D and 3D tooling",
      "Visual scripting with Bolt",
      "Mature AR/VR support",
    ],
    weaknesses: [
      "Runtime licensing fees for larger studios",
      "Editor can be slow with large projects",
      "Garbage collection pauses in C#",
      "Steep learning curve for advanced features",
    ],
    bestFor: [
      "Mobile games",
      "Indie 3D games",
      "AR/VR experiences",
      "Rapid prototyping",
      "Cross-platform titles",
    ],
    projectTemplate: {
      files: [
        {
          path: "Assets/Scripts/GameManager.cs",
          content: `using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Game Settings")]
    public int targetFrameRate = 60;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        Application.targetFrameRate = targetFrameRate;
    }
}`,
        },
        {
          path: "Assets/Scripts/PlayerController.cs",
          content: `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    [Header("Movement")]
    public float moveSpeed = 5f;
    public float jumpForce = 10f;

    private Rigidbody2D rb;
    private bool isGrounded;

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
    }

    private void Update()
    {
        float horizontal = Input.GetAxisRaw("Horizontal");
        rb.velocity = new Vector2(horizontal * moveSpeed, rb.velocity.y);

        if (Input.GetButtonDown("Jump") && isGrounded)
        {
            rb.velocity = new Vector2(rb.velocity.x, jumpForce);
            isGrounded = false;
        }
    }

    private void OnCollisionEnter2D(Collision2D collision)
    {
        if (collision.gameObject.CompareTag("Ground"))
            isGrounded = true;
    }
}`,
        },
        {
          path: "Assets/Scripts/Assembly/Game.asmdef",
          content: `{
    "name": "Game",
    "rootNamespace": "",
    "references": [],
    "includePlatforms": [],
    "excludePlatforms": [],
    "allowUnsafeCode": false
}`,
        },
      ],
    },
    sampleCode: `using UnityEngine;

public class PlayerMovement : MonoBehaviour
{
    public float speed = 5f;
    private Rigidbody2D rb;
    private Vector2 movement;

    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
    }

    void Update()
    {
        movement.x = Input.GetAxisRaw("Horizontal");
        movement.y = Input.GetAxisRaw("Vertical");
    }

    void FixedUpdate()
    {
        rb.MovePosition(rb.position + movement * speed * Time.fixedDeltaTime);
    }
}`,
  },

  gamemaker: {
    label: "GameMaker",
    description: "Beginner-friendly 2D game engine with GML scripting, drag-and-drop events, and fast iteration for 2D games.",
    language: "GML",
    fileExtension: ".gml",
    strengths: [
      "Best-in-class 2D workflow",
      "Very beginner-friendly",
      "Fast iteration and prototyping",
      "Built-in sprite editor",
      "One-click export to many platforms",
    ],
    weaknesses: [
      "Limited 3D capabilities",
      "GML is non-standard language",
      "Smaller community than Unity/Godot",
      "Subscription-based pricing",
    ],
    bestFor: [
      "2D platformers",
      "Top-down RPGs",
      "Pixel art games",
      "Game jams",
      "Solo developers",
    ],
    projectTemplate: {
      files: [
        {
          path: "scripts/scr_game_init/scr_game_init.gml",
          content: `/// @description Initialize game globals
global.score = 0;
global.lives = 3;
global.game_state = "menu";
global.high_score = 0;

// Set game window
window_set_size(1280, 720);
display_set_gui_size(1280, 720);`,
        },
        {
          path: "objects/obj_player/Create_0.gml",
          content: `/// @description Player initialization
move_speed = 4;
jump_force = -12;
gravity_force = 0.5;
vspeed_current = 0;
on_ground = false;
facing = 1; // 1 = right, -1 = left

// Sprite setup
sprite_index = spr_player_idle;
image_speed = 0.2;`,
        },
        {
          path: "objects/obj_player/Step_0.gml",
          content: `/// @description Player step event
var _input_h = keyboard_check(vk_right) - keyboard_check(vk_left);

// Horizontal movement
x += _input_h * move_speed;
if (_input_h != 0) facing = _input_h;

// Gravity and jumping
vspeed_current += gravity_force;
if (keyboard_check_pressed(vk_space) && on_ground)
{
    vspeed_current = jump_force;
    on_ground = false;
}

// Apply vertical movement
y += vspeed_current;

// Ground collision
if (place_meeting(x, y + 1, obj_solid))
{
    while (!place_meeting(x, y + sign(vspeed_current), obj_solid))
        y += sign(vspeed_current);
    vspeed_current = 0;
    on_ground = true;
}`,
        },
        {
          path: "rooms/rm_game/rm_game.yy",
          content: `{
  "resourceType": "GMRoom",
  "name": "rm_game",
  "isDnd": false,
  "roomSettings": {
    "Width": 1280,
    "Height": 720
  },
  "layers": [
    { "resourceType": "GMRInstanceLayer", "name": "Instances", "depth": 0 },
    { "resourceType": "GMRBackgroundLayer", "name": "Background", "depth": 100 }
  ]
}`,
        },
      ],
    },
    sampleCode: `/// @description Player movement (Step event)
var _move_x = keyboard_check(vk_right) - keyboard_check(vk_left);
var _move_y = keyboard_check(vk_down) - keyboard_check(vk_up);

// Normalize diagonal movement
if (_move_x != 0 && _move_y != 0)
{
    _move_x *= 0.707;
    _move_y *= 0.707;
}

x += _move_x * move_speed;
y += _move_y * move_speed;

// Face movement direction
if (_move_x != 0)
    image_xscale = sign(_move_x);`,
  },

  bevy: {
    label: "Bevy",
    description: "Modern Rust-based ECS game engine with data-driven design, parallel systems, and excellent performance.",
    language: "Rust",
    fileExtension: ".rs",
    strengths: [
      "Excellent performance (Rust zero-cost abstractions)",
      "Modern ECS architecture",
      "Parallel system execution",
      "Memory safety without GC",
      "Rapidly growing ecosystem",
    ],
    weaknesses: [
      "Steep Rust learning curve",
      "Still maturing (API changes between versions)",
      "Smaller asset marketplace",
      "No visual editor (yet)",
      "Longer compile times",
    ],
    bestFor: [
      "Performance-critical games",
      "Simulation games",
      "ECS-based architectures",
      "Systems programmers",
      "Open-source advocates",
    ],
    projectTemplate: {
      files: [
        {
          path: "Cargo.toml",
          content: `[package]
name = "my_game"
version = "0.1.0"
edition = "2021"

[dependencies]
bevy = "0.13"

[profile.dev]
opt-level = 1

[profile.dev.package."*"]
opt-level = 3`,
        },
        {
          path: "src/main.rs",
          content: `use bevy::prelude::*;

mod player;
mod game;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "My Game".into(),
                resolution: (1280., 720.).into(),
                ..default()
            }),
            ..default()
        }))
        .add_plugins((
            player::PlayerPlugin,
            game::GamePlugin,
        ))
        .run();
}`,
        },
        {
          path: "src/player.rs",
          content: `use bevy::prelude::*;

pub struct PlayerPlugin;

impl Plugin for PlayerPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, spawn_player)
            .add_systems(Update, (player_movement, player_jump));
    }
}

#[derive(Component)]
pub struct Player {
    pub speed: f32,
    pub jump_force: f32,
}

#[derive(Component)]
pub struct Velocity(pub Vec2);

fn spawn_player(mut commands: Commands) {
    commands.spawn((
        SpriteBundle {
            sprite: Sprite {
                color: Color::rgb(0.2, 0.6, 1.0),
                custom_size: Some(Vec2::new(32.0, 48.0)),
                ..default()
            },
            transform: Transform::from_xyz(0.0, 0.0, 0.0),
            ..default()
        },
        Player {
            speed: 200.0,
            jump_force: 400.0,
        },
        Velocity(Vec2::ZERO),
    ));
}

fn player_movement(
    keyboard: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
    mut query: Query<(&Player, &mut Transform)>,
) {
    for (player, mut transform) in &mut query {
        let mut direction = 0.0;
        if keyboard.pressed(KeyCode::ArrowLeft) { direction -= 1.0; }
        if keyboard.pressed(KeyCode::ArrowRight) { direction += 1.0; }
        transform.translation.x += direction * player.speed * time.delta_seconds();
    }
}

fn player_jump(
    keyboard: Res<ButtonInput<KeyCode>>,
    mut query: Query<(&Player, &mut Velocity)>,
) {
    for (player, mut velocity) in &mut query {
        if keyboard.just_pressed(KeyCode::Space) {
            velocity.0.y = player.jump_force;
        }
    }
}`,
        },
        {
          path: "src/game.rs",
          content: `use bevy::prelude::*;

pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(GameState::default())
            .add_systems(Startup, setup_camera);
    }
}

#[derive(Resource, Default)]
pub struct GameState {
    pub score: u32,
    pub lives: u8,
    pub is_playing: bool,
}

fn setup_camera(mut commands: Commands) {
    commands.spawn(Camera2dBundle::default());
}`,
        },
      ],
    },
    sampleCode: `use bevy::prelude::*;

#[derive(Component)]
pub struct Player {
    pub speed: f32,
}

fn player_movement(
    keyboard: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
    mut query: Query<(&Player, &mut Transform)>,
) {
    for (player, mut transform) in &mut query {
        let mut direction = Vec2::ZERO;
        if keyboard.pressed(KeyCode::ArrowLeft) { direction.x -= 1.0; }
        if keyboard.pressed(KeyCode::ArrowRight) { direction.x += 1.0; }
        if keyboard.pressed(KeyCode::ArrowUp) { direction.y += 1.0; }
        if keyboard.pressed(KeyCode::ArrowDown) { direction.y -= 1.0; }

        let movement = direction.normalize_or_zero() * player.speed * time.delta_seconds();
        transform.translation += movement.extend(0.0);
    }
}`,
  },

  defold: {
    label: "Defold",
    description: "Lightweight, free game engine by King with Lua scripting, tiny runtime, and excellent mobile performance.",
    language: "Lua",
    fileExtension: ".lua",
    strengths: [
      "Extremely small runtime (~2MB)",
      "Excellent mobile performance",
      "100% free, no royalties",
      "Built-in hot reload",
      "Strong 2D physics (Box2D)",
    ],
    weaknesses: [
      "Smaller community",
      "Limited 3D support",
      "Lua lacks type system",
      "Fewer tutorials and resources",
      "Component-based workflow can feel rigid",
    ],
    bestFor: [
      "Mobile games",
      "Web games (HTML5)",
      "Small file size requirements",
      "Lua enthusiasts",
      "2D arcade/puzzle games",
    ],
    projectTemplate: {
      files: [
        {
          path: "game.project",
          content: `[project]
title = My Game
version = 0.1.0

[display]
width = 1280
height = 720

[physics]
type = 2D
gravity_y = -980

[script]
shared_state = 1`,
        },
        {
          path: "main/main.collection",
          content: `name: "main"
instances {
  id: "player"
  prototype: "/main/player.go"
  position { x: 640.0 y: 360.0 z: 0.0 }
}
instances {
  id: "camera"
  prototype: "/main/camera.go"
  position { x: 640.0 y: 360.0 z: 0.0 }
}`,
        },
        {
          path: "main/player.go",
          content: `components {
  id: "script"
  component: "/main/player.script"
}
components {
  id: "sprite"
  component: "/main/player.sprite"
}
components {
  id: "collisionobject"
  component: "/main/player.collisionobject"
}`,
        },
        {
          path: "main/player.script",
          content: `local SPEED = 200
local JUMP_FORCE = 500

function init(self)
    msg.post(".", "acquire_input_focus")
    self.velocity = vmath.vector3()
    self.on_ground = false
    self.input = { left = false, right = false, jump = false }
end

function update(self, dt)
    local direction = 0
    if self.input.left then direction = direction - 1 end
    if self.input.right then direction = direction + 1 end

    self.velocity.x = direction * SPEED

    if self.input.jump and self.on_ground then
        self.velocity.y = JUMP_FORCE
        self.on_ground = false
    end

    self.velocity.y = self.velocity.y - 980 * dt

    local pos = go.get_position()
    pos = pos + self.velocity * dt
    go.set_position(pos)
end

function on_input(self, action_id, action)
    if action_id == hash("left") then
        self.input.left = not action.released
    elseif action_id == hash("right") then
        self.input.right = not action.released
    elseif action_id == hash("jump") then
        self.input.jump = not action.released
    end
end`,
        },
      ],
    },
    sampleCode: `local SPEED = 200

function init(self)
    msg.post(".", "acquire_input_focus")
    self.velocity = vmath.vector3()
    self.direction = vmath.vector3()
end

function update(self, dt)
    if vmath.length(self.direction) > 0 then
        self.direction = vmath.normalize(self.direction)
    end

    local pos = go.get_position()
    pos = pos + self.direction * SPEED * dt
    go.set_position(pos)

    self.direction = vmath.vector3()
end

function on_input(self, action_id, action)
    if action_id == hash("left") then self.direction.x = -1
    elseif action_id == hash("right") then self.direction.x = 1
    elseif action_id == hash("up") then self.direction.y = 1
    elseif action_id == hash("down") then self.direction.y = -1
    end
end`,
  },

  godot: {
    label: "Godot",
    description: "Open-source game engine with GDScript, scene-node architecture, and growing community. Great for 2D and improving 3D.",
    language: "GDScript",
    fileExtension: ".gd",
    strengths: [
      "Completely free and open-source (MIT)",
      "Intuitive scene-node architecture",
      "GDScript is Python-like and easy to learn",
      "Excellent 2D engine",
      "Lightweight editor",
    ],
    weaknesses: [
      "3D still maturing vs Unity/Unreal",
      "Smaller asset marketplace",
      "GDScript not widely used outside Godot",
      "Console exports require third-party",
      "Fewer AAA-grade tools",
    ],
    bestFor: [
      "Indie 2D and 3D games",
      "Open-source enthusiasts",
      "Learning game development",
      "Small to medium teams",
      "Story-driven games",
    ],
    projectTemplate: {
      files: [
        {
          path: "project.godot",
          content: `[gd_resource type="ProjectSettings"]

config_version=5

[application]
config/name="My Game"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.2")

[display]
window/size/viewport_width=1280
window/size/viewport_height=720

[input]
move_left={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":4194319)] }
move_right={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":4194321)] }
jump={ "deadzone": 0.5, "events": [Object(InputEventKey,"keycode":32)] }`,
        },
        {
          path: "scenes/main.tscn",
          content: `[gd_scene load_steps=2 format=3]

[ext_resource type="PackedScene" path="res://scenes/player.tscn" id="1"]

[node name="Main" type="Node2D"]
[node name="Player" parent="." instance=ExtResource("1")]
position = Vector2(640, 360)`,
        },
        {
          path: "scripts/player.gd",
          content: `extends CharacterBody2D

@export var speed: float = 200.0
@export var jump_force: float = -400.0
@export var gravity: float = 980.0

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += gravity * delta

    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_force

    var direction := Input.get_axis("move_left", "move_right")
    velocity.x = direction * speed

    move_and_slide()`,
        },
      ],
    },
    sampleCode: `extends CharacterBody2D

@export var speed: float = 200.0
@export var jump_force: float = -400.0
@export var gravity: float = 980.0

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += gravity * delta

    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_force

    var direction := Input.get_axis("move_left", "move_right")
    velocity.x = direction * speed

    move_and_slide()`,
  },

  unreal: {
    label: "Unreal Engine",
    description: "AAA-grade game engine with C++/Blueprints, photorealistic rendering, and powerful toolchain for high-fidelity games.",
    language: "C++",
    fileExtension: ".cpp",
    strengths: [
      "Best-in-class graphics (Nanite, Lumen)",
      "Blueprint visual scripting",
      "Massive open-world support (World Partition)",
      "Professional-grade tools (Sequencer, MetaHuman)",
      "Free until $1M revenue",
    ],
    weaknesses: [
      "Very steep learning curve",
      "Heavy resource requirements",
      "Long compile times in C++",
      "Large project sizes",
      "Overkill for simple 2D games",
    ],
    bestFor: [
      "AAA-quality 3D games",
      "Photorealistic visuals",
      "Open-world games",
      "Cinematic experiences",
      "Large team projects",
    ],
    projectTemplate: {
      files: [
        {
          path: "Source/MyGame/MyGameCharacter.h",
          content: `#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "MyGameCharacter.generated.h"

UCLASS()
class MYGAME_API AMyGameCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    AMyGameCharacter();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement")
    float MoveSpeed = 600.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement")
    float JumpForce = 420.0f;

protected:
    virtual void BeginPlay() override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

    void MoveForward(float Value);
    void MoveRight(float Value);
};`,
        },
        {
          path: "Source/MyGame/MyGameCharacter.cpp",
          content: `#include "MyGameCharacter.h"
#include "Components/InputComponent.h"
#include "GameFramework/CharacterMovementComponent.h"

AMyGameCharacter::AMyGameCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    GetCharacterMovement()->MaxWalkSpeed = MoveSpeed;
    GetCharacterMovement()->JumpZVelocity = JumpForce;
}

void AMyGameCharacter::BeginPlay()
{
    Super::BeginPlay();
}

void AMyGameCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);
    PlayerInputComponent->BindAxis("MoveForward", this, &AMyGameCharacter::MoveForward);
    PlayerInputComponent->BindAxis("MoveRight", this, &AMyGameCharacter::MoveRight);
    PlayerInputComponent->BindAction("Jump", IE_Pressed, this, &ACharacter::Jump);
}

void AMyGameCharacter::MoveForward(float Value)
{
    if (Value != 0.0f)
    {
        const FRotator Rotation = Controller->GetControlRotation();
        const FVector Direction = FRotationMatrix(Rotation).GetUnitAxis(EAxis::X);
        AddMovementInput(Direction, Value);
    }
}

void AMyGameCharacter::MoveRight(float Value)
{
    if (Value != 0.0f)
    {
        const FRotator Rotation = Controller->GetControlRotation();
        const FVector Direction = FRotationMatrix(Rotation).GetUnitAxis(EAxis::Y);
        AddMovementInput(Direction, Value);
    }
}`,
        },
        {
          path: "MyGame.uproject",
          content: `{
  "FileVersion": 3,
  "EngineAssociation": "5.3",
  "Category": "",
  "Description": "",
  "Modules": [
    {
      "Name": "MyGame",
      "Type": "Runtime",
      "LoadingPhase": "Default"
    }
  ]
}`,
        },
      ],
    },
    sampleCode: `#include "MyCharacter.h"
#include "GameFramework/CharacterMovementComponent.h"

AMyCharacter::AMyCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    GetCharacterMovement()->MaxWalkSpeed = 600.0f;
}

void AMyCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis("MoveForward", this, &AMyCharacter::MoveForward);
    Input->BindAxis("MoveRight", this, &AMyCharacter::MoveRight);
    Input->BindAction("Jump", IE_Pressed, this, &ACharacter::Jump);
}

void AMyCharacter::MoveForward(float Value)
{
    const FVector Direction = GetActorForwardVector();
    AddMovementInput(Direction, Value);
}

void AMyCharacter::MoveRight(float Value)
{
    const FVector Direction = GetActorRightVector();
    AddMovementInput(Direction, Value);
}`,
  },
};

// ── Game Genre Templates ──

export const GAME_GENRE_TEMPLATES: Record<string, GameGenreTemplate> = {
  platformer: {
    label: "Platformer",
    description: "Side-scrolling or top-down platformer with jumping, obstacles, and collectibles.",
    coreMechanics: ["player_movement", "jumping", "collision_detection", "level_scrolling", "collectibles", "enemies"],
    recommendedEngines: ["gamemaker", "godot", "unity", "defold", "bevy", "unreal"],
    mechanicsCode: {
      unity: `// Platformer mechanics - Unity C#
public class PlatformerController : MonoBehaviour
{
    public float speed = 8f;
    public float jumpForce = 14f;
    private Rigidbody2D rb;
    private bool grounded;

    void Update()
    {
        float h = Input.GetAxisRaw("Horizontal");
        rb.velocity = new Vector2(h * speed, rb.velocity.y);
        if (Input.GetButtonDown("Jump") && grounded)
            rb.velocity = new Vector2(rb.velocity.x, jumpForce);
    }
}`,
      gamemaker: `/// Platformer mechanics - GML
var _h = keyboard_check(vk_right) - keyboard_check(vk_left);
x += _h * move_speed;
vspd += grav;
if (keyboard_check_pressed(vk_space) && on_ground)
    vspd = -jump_force;
y += vspd;
if (place_meeting(x, y, obj_solid))
{
    while (!place_meeting(x, y - sign(vspd), obj_solid))
        y -= sign(vspd);
    vspd = 0;
    on_ground = true;
}`,
      bevy: `// Platformer mechanics - Bevy Rust
fn platformer_movement(
    keyboard: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
    mut query: Query<(&Player, &mut Transform, &mut Velocity)>,
) {
    for (player, mut tf, mut vel) in &mut query {
        let mut dir = 0.0;
        if keyboard.pressed(KeyCode::ArrowLeft) { dir -= 1.0; }
        if keyboard.pressed(KeyCode::ArrowRight) { dir += 1.0; }
        vel.0.x = dir * player.speed;
        vel.0.y -= 980.0 * time.delta_seconds();
        if keyboard.just_pressed(KeyCode::Space) { vel.0.y = player.jump_force; }
        tf.translation += vel.0.extend(0.0) * time.delta_seconds();
    }
}`,
      defold: `-- Platformer mechanics - Defold Lua
function update(self, dt)
    local dir = 0
    if self.input.left then dir = dir - 1 end
    if self.input.right then dir = dir + 1 end
    self.velocity.x = dir * SPEED
    self.velocity.y = self.velocity.y - GRAVITY * dt
    if self.input.jump and self.on_ground then
        self.velocity.y = JUMP_FORCE
    end
    local pos = go.get_position()
    go.set_position(pos + self.velocity * dt)
end`,
      godot: `# Platformer mechanics - Godot GDScript
extends CharacterBody2D

@export var speed := 200.0
@export var jump_force := -400.0
@export var gravity := 980.0

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_force
    velocity.x = Input.get_axis("left", "right") * speed
    move_and_slide()`,
      unreal: `// Platformer mechanics - Unreal C++
void APlatformerCharacter::MoveRight(float Value)
{
    AddMovementInput(FVector(0, 1, 0), Value);
}
void APlatformerCharacter::Jump()
{
    ACharacter::Jump();
}`,
    },
  },

  roguelike: {
    label: "Roguelike",
    description: "Procedurally generated dungeons with permadeath, turn-based or real-time combat, and loot systems.",
    coreMechanics: ["procedural_generation", "permadeath", "turn_system", "inventory", "dungeon_rooms", "enemy_ai"],
    recommendedEngines: ["godot", "unity", "gamemaker", "bevy", "defold", "unreal"],
    mechanicsCode: {
      unity: `// Roguelike dungeon gen - Unity C#
public class DungeonGenerator : MonoBehaviour
{
    public int width = 50, height = 50;
    public int maxRooms = 10;
    private int[,] map;

    public void Generate()
    {
        map = new int[width, height];
        for (int i = 0; i < maxRooms; i++)
        {
            int w = Random.Range(4, 10);
            int h = Random.Range(4, 10);
            int x = Random.Range(1, width - w - 1);
            int y = Random.Range(1, height - h - 1);
            CarveRoom(x, y, w, h);
        }
    }

    void CarveRoom(int x, int y, int w, int h)
    {
        for (int i = x; i < x + w; i++)
            for (int j = y; j < y + h; j++)
                map[i, j] = 1;
    }
}`,
      gamemaker: `/// Roguelike dungeon gen - GML
var _grid = ds_grid_create(50, 50);
repeat(max_rooms)
{
    var _w = irandom_range(4, 9);
    var _h = irandom_range(4, 9);
    var _x = irandom_range(1, 50 - _w - 1);
    var _y = irandom_range(1, 50 - _h - 1);
    for (var i = _x; i < _x + _w; i++)
        for (var j = _y; j < _y + _h; j++)
            ds_grid_set(_grid, i, j, 1);
}`,
      bevy: `// Roguelike dungeon gen - Bevy Rust
fn generate_dungeon(mut commands: Commands) {
    let mut rng = rand::thread_rng();
    let mut map = vec![vec![0u8; 50]; 50];
    for _ in 0..10 {
        let w = rng.gen_range(4..10);
        let h = rng.gen_range(4..10);
        let x = rng.gen_range(1..50 - w);
        let y = rng.gen_range(1..50 - h);
        for i in x..x+w { for j in y..y+h { map[i][j] = 1; } }
    }
    commands.insert_resource(DungeonMap(map));
}`,
      defold: `-- Roguelike dungeon gen - Defold Lua
function generate_dungeon(self)
    self.map = {}
    for x = 1, 50 do
        self.map[x] = {}
        for y = 1, 50 do self.map[x][y] = 0 end
    end
    for i = 1, 10 do
        local w = math.random(4, 9)
        local h = math.random(4, 9)
        local rx = math.random(2, 50 - w)
        local ry = math.random(2, 50 - h)
        for x = rx, rx + w - 1 do
            for y = ry, ry + h - 1 do self.map[x][y] = 1 end
        end
    end
end`,
      godot: `# Roguelike dungeon gen - Godot GDScript
func generate_dungeon() -> Array:
    var map := []
    for x in range(50):
        map.append([])
        for y in range(50):
            map[x].append(0)
    for i in range(10):
        var w := randi_range(4, 9)
        var h := randi_range(4, 9)
        var rx := randi_range(1, 50 - w - 1)
        var ry := randi_range(1, 50 - h - 1)
        for x in range(rx, rx + w):
            for y in range(ry, ry + h):
                map[x][y] = 1
    return map`,
      unreal: `// Roguelike dungeon gen - Unreal C++
void ADungeonGenerator::GenerateDungeon()
{
    Map.SetNum(Width * Height);
    for (int32 i = 0; i < MaxRooms; i++)
    {
        int32 W = FMath::RandRange(4, 9);
        int32 H = FMath::RandRange(4, 9);
        int32 X = FMath::RandRange(1, Width - W - 1);
        int32 Y = FMath::RandRange(1, Height - H - 1);
        for (int32 ix = X; ix < X + W; ix++)
            for (int32 iy = Y; iy < Y + H; iy++)
                Map[iy * Width + ix] = 1;
    }
}`,
    },
  },

  rpg: {
    label: "RPG",
    description: "Role-playing game with character stats, dialogue, quests, inventory, and leveling systems.",
    coreMechanics: ["character_stats", "leveling", "dialogue", "quests", "inventory", "combat_system"],
    recommendedEngines: ["unity", "godot", "gamemaker", "unreal", "defold", "bevy"],
    mechanicsCode: {
      unity: `// RPG stats system - Unity C#
[CreateAssetMenu(fileName = "CharacterStats")]
public class CharacterStats : ScriptableObject
{
    public string characterName;
    public int level = 1;
    public int hp = 100, maxHp = 100;
    public int mp = 50, maxMp = 50;
    public int strength = 10, defense = 5, speed = 8;
    public int experience = 0;
    public int ExpToNextLevel => level * 100;

    public void GainExp(int amount)
    {
        experience += amount;
        while (experience >= ExpToNextLevel) LevelUp();
    }

    void LevelUp()
    {
        experience -= ExpToNextLevel;
        level++;
        maxHp += 10; hp = maxHp;
        strength += 2; defense += 1;
    }
}`,
      gamemaker: `/// RPG stats - GML
function create_character(_name) {
    return {
        name: _name, level: 1,
        hp: 100, max_hp: 100, mp: 50, max_mp: 50,
        str: 10, def: 5, spd: 8,
        exp: 0, exp_next: 100
    };
}
function gain_exp(_char, _amount) {
    _char.exp += _amount;
    while (_char.exp >= _char.exp_next) {
        _char.exp -= _char.exp_next;
        _char.level++;
        _char.max_hp += 10;
        _char.hp = _char.max_hp;
        _char.str += 2;
        _char.exp_next = _char.level * 100;
    }
}`,
      bevy: `// RPG stats - Bevy Rust
#[derive(Component)]
pub struct Stats {
    pub level: u32,
    pub hp: i32, pub max_hp: i32,
    pub mp: i32, pub max_mp: i32,
    pub strength: i32, pub defense: i32,
    pub experience: u32,
}
impl Stats {
    pub fn exp_to_next(&self) -> u32 { self.level * 100 }
    pub fn gain_exp(&mut self, amount: u32) {
        self.experience += amount;
        while self.experience >= self.exp_to_next() {
            self.experience -= self.exp_to_next();
            self.level += 1;
            self.max_hp += 10; self.hp = self.max_hp;
            self.strength += 2;
        }
    }
}`,
      defold: `-- RPG stats - Defold Lua
function create_character(name)
    return {
        name = name, level = 1,
        hp = 100, max_hp = 100, mp = 50, max_mp = 50,
        str = 10, def = 5, spd = 8,
        exp = 0, exp_next = 100
    }
end

function gain_exp(char, amount)
    char.exp = char.exp + amount
    while char.exp >= char.exp_next do
        char.exp = char.exp - char.exp_next
        char.level = char.level + 1
        char.max_hp = char.max_hp + 10
        char.hp = char.max_hp
        char.str = char.str + 2
        char.exp_next = char.level * 100
    end
end`,
      godot: `# RPG stats - Godot GDScript
class_name CharacterStats extends Resource

@export var character_name: String
@export var level: int = 1
@export var hp: int = 100
@export var max_hp: int = 100
@export var strength: int = 10
@export var defense: int = 5
var experience: int = 0

func exp_to_next() -> int:
    return level * 100

func gain_exp(amount: int) -> void:
    experience += amount
    while experience >= exp_to_next():
        experience -= exp_to_next()
        level += 1
        max_hp += 10
        hp = max_hp
        strength += 2`,
      unreal: `// RPG stats - Unreal C++
USTRUCT(BlueprintType)
struct FCharacterStats
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere) int32 Level = 1;
    UPROPERTY(EditAnywhere) int32 HP = 100;
    UPROPERTY(EditAnywhere) int32 MaxHP = 100;
    UPROPERTY(EditAnywhere) int32 Strength = 10;
    UPROPERTY(EditAnywhere) int32 Experience = 0;

    int32 ExpToNext() const { return Level * 100; }
    void GainExp(int32 Amount) {
        Experience += Amount;
        while (Experience >= ExpToNext()) {
            Experience -= ExpToNext();
            Level++; MaxHP += 10; HP = MaxHP; Strength += 2;
        }
    }
};`,
    },
  },

  shooter: {
    label: "Shooter",
    description: "First-person or top-down shooter with projectiles, hit detection, weapons, and health systems.",
    coreMechanics: ["projectiles", "hit_detection", "weapons", "health_system", "aiming", "enemy_waves"],
    recommendedEngines: ["unity", "unreal", "godot", "bevy", "gamemaker", "defold"],
    mechanicsCode: {
      unity: `// Shooter weapon system - Unity C#
public class Weapon : MonoBehaviour
{
    public GameObject bulletPrefab;
    public float fireRate = 0.2f;
    public float bulletSpeed = 20f;
    private float nextFire;

    void Update()
    {
        if (Input.GetButton("Fire1") && Time.time > nextFire)
        {
            nextFire = Time.time + fireRate;
            var bullet = Instantiate(bulletPrefab, transform.position, transform.rotation);
            bullet.GetComponent<Rigidbody2D>().velocity = transform.right * bulletSpeed;
            Destroy(bullet, 3f);
        }
    }
}`,
      gamemaker: `/// Shooter weapon - GML (Step event)
if (mouse_check_button(mb_left) && alarm[0] <= 0)
{
    alarm[0] = fire_rate;
    var _dir = point_direction(x, y, mouse_x, mouse_y);
    var _bullet = instance_create_layer(x, y, "Instances", obj_bullet);
    _bullet.direction = _dir;
    _bullet.speed = bullet_speed;
}`,
      bevy: `// Shooter weapon - Bevy Rust
fn fire_weapon(
    mouse: Res<ButtonInput<MouseButton>>,
    time: Res<Time>,
    mut cooldown: ResMut<FireCooldown>,
    mut commands: Commands,
    query: Query<&Transform, With<Player>>,
) {
    cooldown.timer.tick(time.delta());
    if mouse.pressed(MouseButton::Left) && cooldown.timer.finished() {
        cooldown.timer.reset();
        if let Ok(tf) = query.get_single() {
            commands.spawn(BulletBundle::new(tf.translation, tf.right()));
        }
    }
}`,
      defold: `-- Shooter weapon - Defold Lua
function fire(self)
    if self.cooldown <= 0 then
        self.cooldown = FIRE_RATE
        local pos = go.get_position()
        local dir = vmath.normalize(self.aim_direction)
        factory.create("#bullet_factory", pos, nil, { direction = dir })
    end
end`,
      godot: `# Shooter weapon - Godot GDScript
@export var bullet_scene: PackedScene
@export var fire_rate: float = 0.2
var cooldown: float = 0.0

func _process(delta: float) -> void:
    cooldown -= delta
    if Input.is_action_pressed("fire") and cooldown <= 0:
        cooldown = fire_rate
        var bullet = bullet_scene.instantiate()
        bullet.global_position = global_position
        bullet.direction = (get_global_mouse_position() - global_position).normalized()
        get_tree().root.add_child(bullet)`,
      unreal: `// Shooter weapon - Unreal C++
void AWeapon::Fire()
{
    if (GetWorld()->GetTimeSeconds() > NextFireTime)
    {
        NextFireTime = GetWorld()->GetTimeSeconds() + FireRate;
        FActorSpawnParameters Params;
        auto* Bullet = GetWorld()->SpawnActor<ABullet>(
            BulletClass, GetActorLocation(), GetActorRotation(), Params);
        if (Bullet) Bullet->SetVelocity(GetActorForwardVector() * BulletSpeed);
    }
}`,
    },
  },

  puzzle: {
    label: "Puzzle",
    description: "Logic-based puzzle game with grid mechanics, match systems, or physics puzzles.",
    coreMechanics: ["grid_system", "match_detection", "move_validation", "scoring", "level_progression", "hints"],
    recommendedEngines: ["defold", "gamemaker", "godot", "unity", "bevy", "unreal"],
    mechanicsCode: {
      unity: `// Match-3 grid - Unity C#
public class PuzzleGrid : MonoBehaviour
{
    public int width = 8, height = 8;
    private int[,] grid;

    public List<Vector2Int> FindMatches()
    {
        var matches = new List<Vector2Int>();
        for (int y = 0; y < height; y++)
            for (int x = 0; x < width - 2; x++)
                if (grid[x,y] == grid[x+1,y] && grid[x+1,y] == grid[x+2,y])
                    matches.AddRange(new[] { new Vector2Int(x,y), new Vector2Int(x+1,y), new Vector2Int(x+2,y) });
        return matches;
    }
}`,
      gamemaker: `/// Match-3 detection - GML
function find_matches(_grid, _w, _h) {
    var _matches = ds_list_create();
    for (var y = 0; y < _h; y++)
        for (var x = 0; x < _w - 2; x++)
            if (_grid[# x, y] == _grid[# x+1, y] && _grid[# x+1, y] == _grid[# x+2, y])
                ds_list_add(_matches, [x, y], [x+1, y], [x+2, y]);
    return _matches;
}`,
      bevy: `// Match-3 grid - Bevy Rust
fn find_matches(grid: &Vec<Vec<u8>>, w: usize, h: usize) -> Vec<(usize, usize)> {
    let mut matches = Vec::new();
    for y in 0..h {
        for x in 0..w.saturating_sub(2) {
            if grid[y][x] == grid[y][x+1] && grid[y][x+1] == grid[y][x+2] {
                matches.extend([(x,y), (x+1,y), (x+2,y)]);
            }
        }
    }
    matches
}`,
      defold: `-- Match-3 grid - Defold Lua
function find_matches(grid, w, h)
    local matches = {}
    for y = 1, h do
        for x = 1, w - 2 do
            if grid[y][x] == grid[y][x+1] and grid[y][x+1] == grid[y][x+2] then
                table.insert(matches, {x, y})
                table.insert(matches, {x+1, y})
                table.insert(matches, {x+2, y})
            end
        end
    end
    return matches
end`,
      godot: `# Match-3 grid - Godot GDScript
func find_matches(grid: Array, w: int, h: int) -> Array:
    var matches := []
    for y in range(h):
        for x in range(w - 2):
            if grid[y][x] == grid[y][x+1] and grid[y][x+1] == grid[y][x+2]:
                matches.append_array([Vector2i(x,y), Vector2i(x+1,y), Vector2i(x+2,y)])
    return matches`,
      unreal: `// Match-3 grid - Unreal C++
TArray<FIntPoint> APuzzleGrid::FindMatches()
{
    TArray<FIntPoint> Matches;
    for (int32 Y = 0; Y < Height; Y++)
        for (int32 X = 0; X < Width - 2; X++)
            if (Grid[Y * Width + X] == Grid[Y * Width + X + 1] &&
                Grid[Y * Width + X + 1] == Grid[Y * Width + X + 2])
                Matches.Append({FIntPoint(X,Y), FIntPoint(X+1,Y), FIntPoint(X+2,Y)});
    return Matches;
}`,
    },
  },

  racing: {
    label: "Racing",
    description: "Vehicle racing with physics-based driving, track design, and competitive mechanics.",
    coreMechanics: ["vehicle_physics", "track_system", "lap_counting", "drift_mechanics", "boost_system", "ai_racers"],
    recommendedEngines: ["unity", "unreal", "godot", "bevy", "gamemaker", "defold"],
    mechanicsCode: {
      unity: `// Racing vehicle - Unity C#
public class VehicleController : MonoBehaviour
{
    public float maxSpeed = 20f, acceleration = 8f;
    public float steerSpeed = 100f, driftFactor = 0.9f;
    private float currentSpeed;

    void FixedUpdate()
    {
        float throttle = Input.GetAxis("Vertical");
        float steer = Input.GetAxis("Horizontal");
        currentSpeed = Mathf.MoveTowards(currentSpeed, throttle * maxSpeed, acceleration * Time.fixedDeltaTime);
        transform.Rotate(0, 0, -steer * steerSpeed * Time.fixedDeltaTime * (currentSpeed / maxSpeed));
        transform.position += transform.up * currentSpeed * Time.fixedDeltaTime;
    }
}`,
      gamemaker: `/// Racing vehicle - GML
var _throttle = keyboard_check(vk_up) - keyboard_check(vk_down);
var _steer = keyboard_check(vk_right) - keyboard_check(vk_left);
spd = clamp(spd + _throttle * accel * delta_time, -max_speed * 0.3, max_speed);
spd *= friction;
direction -= _steer * turn_speed * (spd / max_speed);
x += lengthdir_x(spd, direction);
y += lengthdir_y(spd, direction);`,
      bevy: `// Racing vehicle - Bevy Rust
fn vehicle_movement(
    keyboard: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
    mut query: Query<(&mut Vehicle, &mut Transform)>,
) {
    for (mut car, mut tf) in &mut query {
        let throttle = keyboard.pressed(KeyCode::ArrowUp) as i32
                     - keyboard.pressed(KeyCode::ArrowDown) as i32;
        let steer = keyboard.pressed(KeyCode::ArrowRight) as i32
                  - keyboard.pressed(KeyCode::ArrowLeft) as i32;
        car.speed += throttle as f32 * car.accel * time.delta_seconds();
        car.speed = car.speed.clamp(-car.max_speed * 0.3, car.max_speed);
        let rot = -steer as f32 * car.turn_speed * (car.speed / car.max_speed);
        tf.rotate_z(rot * time.delta_seconds());
        let forward = tf.up();
        tf.translation += forward * car.speed * time.delta_seconds();
    }
}`,
      defold: `-- Racing vehicle - Defold Lua
function update(self, dt)
    local throttle = (self.input.up and 1 or 0) - (self.input.down and 1 or 0)
    local steer = (self.input.right and 1 or 0) - (self.input.left and 1 or 0)
    self.speed = self.speed + throttle * ACCEL * dt
    self.speed = math.max(-MAX_SPEED * 0.3, math.min(MAX_SPEED, self.speed))
    self.speed = self.speed * FRICTION
    self.angle = self.angle - steer * TURN_SPEED * (self.speed / MAX_SPEED) * dt
    local pos = go.get_position()
    pos.x = pos.x + math.cos(self.angle) * self.speed * dt
    pos.y = pos.y + math.sin(self.angle) * self.speed * dt
    go.set_position(pos)
    go.set_rotation(vmath.quat_rotation_z(self.angle))
end`,
      godot: `# Racing vehicle - Godot GDScript
@export var max_speed := 300.0
@export var accel := 150.0
@export var turn_speed := 2.5
var speed := 0.0

func _physics_process(delta: float) -> void:
    var throttle := Input.get_axis("brake", "accelerate")
    var steer := Input.get_axis("steer_left", "steer_right")
    speed = move_toward(speed, throttle * max_speed, accel * delta)
    rotation -= steer * turn_speed * (speed / max_speed) * delta
    velocity = Vector2.UP.rotated(rotation) * speed
    move_and_slide()`,
      unreal: `// Racing vehicle - Unreal C++ (using WheeledVehicle)
void ARaceCar::Throttle(float Value)
{
    GetVehicleMovement()->SetThrottleInput(Value);
}
void ARaceCar::Steer(float Value)
{
    GetVehicleMovement()->SetSteeringInput(Value);
}`,
    },
  },

  strategy: {
    label: "Strategy",
    description: "Turn-based or real-time strategy with resource management, unit control, and map systems.",
    coreMechanics: ["resource_management", "unit_control", "fog_of_war", "tech_tree", "tile_map", "ai_opponent"],
    recommendedEngines: ["godot", "unity", "bevy", "gamemaker", "unreal", "defold"],
    mechanicsCode: {
      unity: `// Strategy resource manager - Unity C#
public class ResourceManager : MonoBehaviour
{
    public static ResourceManager Instance;
    public int gold = 500, wood = 200, food = 100;

    public bool CanAfford(int g, int w, int f)
        => gold >= g && wood >= w && food >= f;

    public bool Spend(int g, int w, int f)
    {
        if (!CanAfford(g, w, f)) return false;
        gold -= g; wood -= w; food -= f;
        return true;
    }

    public void Earn(int g, int w, int f)
    { gold += g; wood += w; food += f; }
}`,
      gamemaker: `/// Strategy resources - GML
global.gold = 500;
global.wood = 200;
global.food = 100;

function can_afford(_g, _w, _f) {
    return (global.gold >= _g && global.wood >= _w && global.food >= _f);
}
function spend(_g, _w, _f) {
    if (!can_afford(_g, _w, _f)) return false;
    global.gold -= _g; global.wood -= _w; global.food -= _f;
    return true;
}`,
      bevy: `// Strategy resources - Bevy Rust
#[derive(Resource)]
pub struct GameResources {
    pub gold: i32, pub wood: i32, pub food: i32,
}
impl GameResources {
    pub fn can_afford(&self, g: i32, w: i32, f: i32) -> bool {
        self.gold >= g && self.wood >= w && self.food >= f
    }
    pub fn spend(&mut self, g: i32, w: i32, f: i32) -> bool {
        if !self.can_afford(g, w, f) { return false; }
        self.gold -= g; self.wood -= w; self.food -= f;
        true
    }
}`,
      defold: `-- Strategy resources - Defold Lua
local resources = { gold = 500, wood = 200, food = 100 }

function can_afford(g, w, f)
    return resources.gold >= g and resources.wood >= w and resources.food >= f
end

function spend(g, w, f)
    if not can_afford(g, w, f) then return false end
    resources.gold = resources.gold - g
    resources.wood = resources.wood - w
    resources.food = resources.food - f
    return true
end`,
      godot: `# Strategy resources - Godot GDScript
var gold: int = 500
var wood: int = 200
var food: int = 100

func can_afford(g: int, w: int, f: int) -> bool:
    return gold >= g and wood >= w and food >= f

func spend(g: int, w: int, f: int) -> bool:
    if not can_afford(g, w, f): return false
    gold -= g; wood -= w; food -= f
    return true`,
      unreal: `// Strategy resources - Unreal C++
UCLASS()
class AResourceManager : public AActor
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere) int32 Gold = 500;
    UPROPERTY(EditAnywhere) int32 Wood = 200;
    UPROPERTY(EditAnywhere) int32 Food = 100;

    bool CanAfford(int32 G, int32 W, int32 F) const
    { return Gold >= G && Wood >= W && Food >= F; }

    bool Spend(int32 G, int32 W, int32 F)
    {
        if (!CanAfford(G, W, F)) return false;
        Gold -= G; Wood -= W; Food -= F;
        return true;
    }
};`,
    },
  },

  survival: {
    label: "Survival",
    description: "Survival game with crafting, hunger/thirst systems, base building, and environmental hazards.",
    coreMechanics: ["crafting", "hunger_thirst", "inventory_management", "base_building", "day_night_cycle", "environment_hazards"],
    recommendedEngines: ["unity", "unreal", "godot", "bevy", "gamemaker", "defold"],
    mechanicsCode: {
      unity: `// Survival needs system - Unity C#
public class SurvivalNeeds : MonoBehaviour
{
    public float hunger = 100f, thirst = 100f, health = 100f;
    public float hungerRate = 0.5f, thirstRate = 0.8f;

    void Update()
    {
        hunger -= hungerRate * Time.deltaTime;
        thirst -= thirstRate * Time.deltaTime;
        if (hunger <= 0 || thirst <= 0)
            health -= 2f * Time.deltaTime;
        hunger = Mathf.Clamp(hunger, 0, 100);
        thirst = Mathf.Clamp(thirst, 0, 100);
        health = Mathf.Clamp(health, 0, 100);
    }

    public void Eat(float amount) { hunger = Mathf.Min(100, hunger + amount); }
    public void Drink(float amount) { thirst = Mathf.Min(100, thirst + amount); }
}`,
      gamemaker: `/// Survival needs - GML
hunger -= hunger_rate * delta_time;
thirst -= thirst_rate * delta_time;
if (hunger <= 0 || thirst <= 0)
    health -= 2 * delta_time;
hunger = clamp(hunger, 0, 100);
thirst = clamp(thirst, 0, 100);
health = clamp(health, 0, 100);`,
      bevy: `// Survival needs - Bevy Rust
#[derive(Component)]
pub struct SurvivalNeeds {
    pub hunger: f32, pub thirst: f32, pub health: f32,
}
fn tick_needs(time: Res<Time>, mut query: Query<&mut SurvivalNeeds>) {
    for mut needs in &mut query {
        needs.hunger -= 0.5 * time.delta_seconds();
        needs.thirst -= 0.8 * time.delta_seconds();
        if needs.hunger <= 0.0 || needs.thirst <= 0.0 {
            needs.health -= 2.0 * time.delta_seconds();
        }
        needs.hunger = needs.hunger.clamp(0.0, 100.0);
        needs.thirst = needs.thirst.clamp(0.0, 100.0);
        needs.health = needs.health.clamp(0.0, 100.0);
    }
}`,
      defold: `-- Survival needs - Defold Lua
function update(self, dt)
    self.hunger = self.hunger - 0.5 * dt
    self.thirst = self.thirst - 0.8 * dt
    if self.hunger <= 0 or self.thirst <= 0 then
        self.health = self.health - 2 * dt
    end
    self.hunger = math.max(0, math.min(100, self.hunger))
    self.thirst = math.max(0, math.min(100, self.thirst))
    self.health = math.max(0, math.min(100, self.health))
end`,
      godot: `# Survival needs - Godot GDScript
@export var hunger: float = 100.0
@export var thirst: float = 100.0
@export var health: float = 100.0

func _process(delta: float) -> void:
    hunger -= 0.5 * delta
    thirst -= 0.8 * delta
    if hunger <= 0 or thirst <= 0:
        health -= 2.0 * delta
    hunger = clampf(hunger, 0, 100)
    thirst = clampf(thirst, 0, 100)
    health = clampf(health, 0, 100)`,
      unreal: `// Survival needs - Unreal C++
void USurvivalComponent::TickNeeds(float DeltaTime)
{
    Hunger -= HungerRate * DeltaTime;
    Thirst -= ThirstRate * DeltaTime;
    if (Hunger <= 0 || Thirst <= 0)
        Health -= 2.0f * DeltaTime;
    Hunger = FMath::Clamp(Hunger, 0.f, 100.f);
    Thirst = FMath::Clamp(Thirst, 0.f, 100.f);
    Health = FMath::Clamp(Health, 0.f, 100.f);
}`,
    },
  },
};

// ── Utility Functions ──

/**
 * Get an engine profile by key.
 */
export function getEngineProfile(engine: string): EngineProfile | undefined {
  return ENGINE_PROFILES[engine.toLowerCase()];
}

/**
 * Keyword-based engine recommendation with reasoning.
 */
export function recommendEngine(gameDescription: string): EngineRecommendation {
  const desc = gameDescription.toLowerCase();

  const scores: Record<string, number> = {
    unity: 50,
    gamemaker: 40,
    bevy: 30,
    defold: 35,
    godot: 45,
    unreal: 25,
  };

  // 3D indicators
  if (/\b(3d|three.?dimensional|first.?person|fps|third.?person|open.?world)\b/.test(desc)) {
    scores.unity += 30;
    scores.unreal += 40;
    scores.godot += 15;
    scores.bevy += 10;
    scores.gamemaker -= 20;
    scores.defold -= 15;
  }

  // 2D indicators
  if (/\b(2d|two.?dimensional|pixel.?art|sprite|top.?down|side.?scroll)\b/.test(desc)) {
    scores.gamemaker += 35;
    scores.godot += 25;
    scores.defold += 20;
    scores.unity += 10;
    scores.unreal -= 20;
  }

  // Mobile indicators
  if (/\b(mobile|ios|android|phone|tablet|touch)\b/.test(desc)) {
    scores.defold += 25;
    scores.unity += 20;
    scores.gamemaker += 10;
    scores.unreal -= 15;
  }

  // Web indicators
  if (/\b(web|html5|browser|webgl)\b/.test(desc)) {
    scores.defold += 30;
    scores.godot += 15;
    scores.gamemaker += 10;
    scores.unity += 5;
    scores.unreal -= 25;
  }

  // Performance indicators
  if (/\b(performance|high.?performance|simulation|massive|thousands|ecs)\b/.test(desc)) {
    scores.bevy += 35;
    scores.unreal += 20;
    scores.unity += 10;
    scores.defold -= 5;
  }

  // Beginner indicators
  if (/\b(beginner|learning|simple|easy|first.?game|game.?jam|solo)\b/.test(desc)) {
    scores.gamemaker += 25;
    scores.godot += 20;
    scores.defold += 10;
    scores.bevy -= 20;
    scores.unreal -= 25;
  }

  // AAA indicators
  if (/\b(aaa|photorealistic|realistic|cinematic|unreal|nanite|lumen)\b/.test(desc)) {
    scores.unreal += 45;
    scores.unity += 15;
    scores.gamemaker -= 20;
    scores.defold -= 20;
  }

  // Genre-specific boosting
  if (/\b(platformer|metroidvania)\b/.test(desc)) scores.gamemaker += 20;
  if (/\b(roguelike|roguelite|dungeon)\b/.test(desc)) scores.godot += 15;
  if (/\b(rpg|role.?playing)\b/.test(desc)) scores.unity += 15;
  if (/\b(puzzle|match|casual)\b/.test(desc)) scores.defold += 20;
  if (/\b(racing|driving)\b/.test(desc)) { scores.unity += 15; scores.unreal += 15; }
  if (/\b(strategy|rts|turn.?based)\b/.test(desc)) scores.godot += 15;
  if (/\b(survival|craft)\b/.test(desc)) { scores.unity += 15; scores.unreal += 10; }

  // Open source preference
  if (/\b(open.?source|free|no.?royalty|foss)\b/.test(desc)) {
    scores.godot += 25;
    scores.bevy += 20;
    scores.defold += 15;
  }

  // Sort by score
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const [topEngine, topScore] = sorted[0];
  const totalMax = Math.max(...Object.values(scores));

  const profile = ENGINE_PROFILES[topEngine];
  const reasoning = `${profile.label} is recommended because it scores highest (${topScore} points) for your game description. ${profile.description.split(".")[0]}.`;

  return {
    engine: topEngine,
    confidence: Math.min(1, topScore / (totalMax + 20)),
    reasoning,
    alternatives: sorted.slice(1, 4).map(([eng]) => ({
      engine: eng,
      reasoning: `${ENGINE_PROFILES[eng].label}: ${ENGINE_PROFILES[eng].strengths[0]}`,
    })),
  };
}

/**
 * Generate project files for a given engine, genre, and project name.
 */
export function generateProjectFiles(
  engine: string,
  genre: string,
  projectName: string
): ProjectFile[] {
  const engineKey = engine.toLowerCase();
  const genreKey = genre.toLowerCase();
  const profile = ENGINE_PROFILES[engineKey];
  const genreTemplate = GAME_GENRE_TEMPLATES[genreKey];

  if (!profile) return [];

  const files: ProjectFile[] = [];

  // Add engine project template files (renamed with project name)
  for (const tmplFile of profile.projectTemplate.files) {
    files.push({
      path: tmplFile.path.replace(/MyGame|my_game|my-game/gi, projectName),
      content: tmplFile.content.replace(/MyGame|my_game|my-game/gi, projectName),
      language: profile.language,
    });
  }

  // Add genre-specific mechanics code if available
  if (genreTemplate?.mechanicsCode[engineKey]) {
    const ext = profile.fileExtension;
    const mechanicsPath = engineKey === "unity"
      ? `Assets/Scripts/Mechanics${ext}`
      : engineKey === "gamemaker"
        ? `scripts/scr_mechanics/scr_mechanics${ext}`
        : engineKey === "bevy"
          ? `src/mechanics${ext}`
          : engineKey === "defold"
            ? `main/mechanics.script`
            : engineKey === "godot"
              ? `scripts/mechanics${ext}`
              : `Source/${projectName}/Mechanics${ext === ".cpp" ? ".cpp" : ext}`;

    files.push({
      path: mechanicsPath,
      content: genreTemplate.mechanicsCode[engineKey],
      language: profile.language,
    });
  }

  return files;
}

/**
 * Basic code structure conversion between engines.
 * This is pattern-based mapping, not full transpilation.
 */
export function convertBetweenEngines(
  sourceEngine: string,
  targetEngine: string,
  code: string
): ConversionResult {
  const source = sourceEngine.toLowerCase();
  const target = targetEngine.toLowerCase();
  const targetProfile = ENGINE_PROFILES[target];

  if (!targetProfile) {
    return {
      sourceEngine: source,
      targetEngine: target,
      originalCode: code,
      convertedCode: `// Could not convert: unknown target engine "${target}"`,
      notes: [`Target engine "${target}" is not supported.`],
      confidence: 0,
    };
  }

  const notes: string[] = [];
  let converted = code;
  let confidence = 0.4;

  // Unity C# → target
  if (source === "unity") {
    notes.push("Converting from Unity C# patterns.");
    if (target === "godot") {
      converted = code
        .replace(/public class (\w+) : MonoBehaviour/g, "extends Node2D # $1")
        .replace(/void Update\(\)/g, "func _process(delta: float) -> void:")
        .replace(/void FixedUpdate\(\)/g, "func _physics_process(delta: float) -> void:")
        .replace(/void Start\(\)/g, "func _ready() -> void:")
        .replace(/Input\.GetAxisRaw\("Horizontal"\)/g, 'Input.get_axis("ui_left", "ui_right")')
        .replace(/Input\.GetButtonDown\("Jump"\)/g, 'Input.is_action_just_pressed("ui_accept")')
        .replace(/Debug\.Log\(/g, "print(")
        .replace(/\bfloat\b/g, "float")
        .replace(/\bint\b/g, "int")
        .replace(/\bbool\b/g, "bool");
      confidence = 0.5;
    } else if (target === "gamemaker") {
      converted = `/// Converted from Unity C#\n/// NOTE: Manual adjustments needed for GML syntax\n\n${code}`;
      notes.push("GML has a very different structure from C#. Manual review required.");
      confidence = 0.3;
    }
  }

  // GameMaker GML → target
  if (source === "gamemaker") {
    notes.push("Converting from GameMaker GML patterns.");
    if (target === "godot") {
      converted = code
        .replace(/keyboard_check\(vk_(\w+)\)/g, 'Input.is_action_pressed("$1")')
        .replace(/keyboard_check_pressed\(vk_(\w+)\)/g, 'Input.is_action_just_pressed("$1")')
        .replace(/place_meeting\(([^)]+)\)/g, "is_on_floor() # was place_meeting($1)")
        .replace(/instance_create_layer\(/g, "# instantiate scene equivalent\n# ");
      confidence = 0.4;
    }
  }

  // Generic fallback: wrap with conversion note
  if (confidence <= 0.3) {
    converted = `// Auto-converted from ${sourceEngine} to ${targetEngine}\n// This is a structural mapping — manual review required.\n// Target language: ${targetProfile.language}\n\n${code}`;
    notes.push("Low confidence conversion. Manual rewrite recommended.");
    notes.push(`Source (${sourceEngine}) and target (${targetEngine}) have very different paradigms.`);
  }

  notes.push("This is a pattern-based conversion, not full transpilation. Review all converted code before use.");

  return {
    sourceEngine: source,
    targetEngine: target,
    originalCode: code,
    convertedCode: converted,
    notes,
    confidence,
  };
}

/**
 * Side-by-side engine comparison on key dimensions.
 */
export function compareEngines(engines: string[]): EngineComparison {
  const validEngines = engines
    .map((e) => e.toLowerCase())
    .filter((e) => ENGINE_PROFILES[e]);

  if (validEngines.length === 0) {
    return { engines: [], dimensions: [], recommendation: "No valid engines to compare." };
  }

  const dimensions = [
    { name: "2D Capability", scores: { unity: 8, gamemaker: 10, bevy: 7, defold: 9, godot: 9, unreal: 5 } },
    { name: "3D Capability", scores: { unity: 9, gamemaker: 3, bevy: 7, defold: 3, godot: 7, unreal: 10 } },
    { name: "Ease of Learning", scores: { unity: 7, gamemaker: 9, bevy: 4, defold: 7, godot: 9, unreal: 4 } },
    { name: "Performance", scores: { unity: 8, gamemaker: 6, bevy: 10, defold: 8, godot: 7, unreal: 10 } },
    { name: "Mobile Support", scores: { unity: 9, gamemaker: 7, bevy: 5, defold: 10, godot: 7, unreal: 6 } },
    { name: "Web Export", scores: { unity: 7, gamemaker: 7, bevy: 6, defold: 10, godot: 8, unreal: 3 } },
    { name: "Community Size", scores: { unity: 10, gamemaker: 7, bevy: 5, defold: 4, godot: 8, unreal: 9 } },
    { name: "Asset Marketplace", scores: { unity: 10, gamemaker: 6, bevy: 3, defold: 3, godot: 5, unreal: 9 } },
    { name: "Cost", scores: { unity: 7, gamemaker: 6, bevy: 10, defold: 10, godot: 10, unreal: 8 } },
    { name: "Console Support", scores: { unity: 9, gamemaker: 6, bevy: 2, defold: 4, godot: 4, unreal: 10 } },
  ];

  const notes: Record<string, Record<string, string>> = {
    "2D Capability": { unity: "Solid 2D tools", gamemaker: "Industry-best 2D workflow", bevy: "Good 2D via ECS", defold: "Excellent lightweight 2D", godot: "First-class 2D engine", unreal: "3D-focused, 2D is secondary" },
    "3D Capability": { unity: "Strong general-purpose 3D", gamemaker: "Very limited 3D", bevy: "Growing 3D support", defold: "Minimal 3D", godot: "Improving with each release", unreal: "Best-in-class 3D graphics" },
    "Ease of Learning": { unity: "Large learning ecosystem", gamemaker: "Very beginner-friendly", bevy: "Requires Rust knowledge", defold: "Simple Lua scripting", godot: "Python-like GDScript", unreal: "Steep C++ curve" },
  };

  const comparisonDimensions = dimensions.map((dim) => ({
    dimension: dim.name,
    scores: Object.fromEntries(
      validEngines.map((e) => [e, dim.scores[e as keyof typeof dim.scores] ?? 5])
    ),
    notes: Object.fromEntries(
      validEngines.map((e) => [e, notes[dim.name]?.[e] ?? ""])
    ),
  }));

  // Calculate totals
  const totals: Record<string, number> = {};
  for (const eng of validEngines) {
    totals[eng] = comparisonDimensions.reduce((sum, d) => sum + (d.scores[eng] ?? 0), 0);
  }

  const best = Object.entries(totals).sort(([, a], [, b]) => b - a)[0];
  const recommendation = `${ENGINE_PROFILES[best[0]].label} leads with a total score of ${best[1]}/${dimensions.length * 10} across all dimensions.`;

  return {
    engines: validEngines,
    dimensions: comparisonDimensions,
    recommendation,
  };
}
