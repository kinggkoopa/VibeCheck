/**
 * Godot Project Template Library
 *
 * Pre-built scene trees, script stubs, and project configurations
 * for common Godot game archetypes. Used by the Godot Vibe Swarm
 * to bootstrap projects from proven starting points.
 */

// ── Types ──

export interface SceneNode {
  name: string;
  type: string;
  properties?: Record<string, string>;
  children?: SceneNode[];
}

export interface ScriptStub {
  filename: string;
  gdscript: string;
}

export interface GodotTemplate {
  label: string;
  description: string;
  gameType: "2d" | "3d";
  difficulty: "beginner" | "intermediate" | "advanced";
  sceneTemplate: SceneNode;
  scriptStubs: ScriptStub[];
  projectConfig: string;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ZipEntry {
  path: string;
  content: string;
  type: "text" | "binary";
}

// ── Templates ──

export const GODOT_TEMPLATES: Record<string, GodotTemplate> = {
  "2d-platformer": {
    label: "2D Platformer",
    description: "Classic side-scrolling platformer with player movement, enemies, collectibles, and level transitions.",
    gameType: "2d",
    difficulty: "beginner",
    sceneTemplate: {
      name: "Main",
      type: "Node2D",
      children: [
        {
          name: "Player",
          type: "CharacterBody2D",
          children: [
            { name: "Sprite2D", type: "Sprite2D", properties: { texture: "res://assets/sprites/player.png" } },
            { name: "CollisionShape2D", type: "CollisionShape2D", properties: { shape: "RectangleShape2D" } },
            { name: "AnimationPlayer", type: "AnimationPlayer" },
            { name: "Camera2D", type: "Camera2D", properties: { position_smoothing_enabled: "true", position_smoothing_speed: "5.0" } },
            { name: "CoyoteTimer", type: "Timer", properties: { wait_time: "0.15", one_shot: "true" } },
            { name: "JumpBufferTimer", type: "Timer", properties: { wait_time: "0.1", one_shot: "true" } },
          ],
        },
        {
          name: "TileMap",
          type: "TileMap",
          properties: { cell_size: "16" },
        },
        {
          name: "Enemies",
          type: "Node2D",
          children: [
            {
              name: "Slime",
              type: "CharacterBody2D",
              children: [
                { name: "Sprite2D", type: "Sprite2D", properties: { texture: "res://assets/sprites/slime.png" } },
                { name: "CollisionShape2D", type: "CollisionShape2D", properties: { shape: "RectangleShape2D" } },
                { name: "DetectionArea", type: "Area2D", children: [
                  { name: "CollisionShape2D", type: "CollisionShape2D", properties: { shape: "CircleShape2D", radius: "120" } },
                ] },
              ],
            },
          ],
        },
        {
          name: "Collectibles",
          type: "Node2D",
          children: [
            {
              name: "Coin",
              type: "Area2D",
              children: [
                { name: "Sprite2D", type: "Sprite2D", properties: { texture: "res://assets/sprites/coin.png" } },
                { name: "CollisionShape2D", type: "CollisionShape2D", properties: { shape: "CircleShape2D" } },
                { name: "AnimationPlayer", type: "AnimationPlayer" },
              ],
            },
          ],
        },
        {
          name: "UI",
          type: "CanvasLayer",
          children: [
            {
              name: "HUD",
              type: "Control",
              children: [
                { name: "ScoreLabel", type: "Label", properties: { text: "Score: 0" } },
                { name: "LivesLabel", type: "Label", properties: { text: "Lives: 3" } },
              ],
            },
          ],
        },
      ],
    },
    scriptStubs: [
      {
        filename: "player.gd",
        gdscript: `extends CharacterBody2D

@export var speed: float = 200.0
@export var jump_velocity: float = -350.0
@export var gravity_scale: float = 1.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var animation_player: AnimationPlayer = $AnimationPlayer
@onready var coyote_timer: Timer = $CoyoteTimer
@onready var jump_buffer_timer: Timer = $JumpBufferTimer

var gravity: float = ProjectSettings.get_setting("physics/2d/default_gravity")
var was_on_floor: bool = false
var jump_buffered: bool = false

func _physics_process(delta: float) -> void:
\tvar was_on_floor_last = is_on_floor()

\t# Gravity
\tif not is_on_floor():
\t\tvelocity.y += gravity * gravity_scale * delta

\t# Coyote time: start timer when leaving floor
\tif was_on_floor_last and not is_on_floor() and velocity.y >= 0:
\t\tcoyote_timer.start()

\t# Jump buffer
\tif Input.is_action_just_pressed(&"jump"):
\t\tjump_buffer_timer.start()

\t# Jump logic with coyote time and jump buffer
\tvar can_jump = is_on_floor() or not coyote_timer.is_stopped()
\tvar wants_jump = Input.is_action_just_pressed(&"jump") or not jump_buffer_timer.is_stopped()

\tif wants_jump and can_jump:
\t\tvelocity.y = jump_velocity
\t\tcoyote_timer.stop()
\t\tjump_buffer_timer.stop()

\t# Variable jump height
\tif Input.is_action_just_released(&"jump") and velocity.y < 0:
\t\tvelocity.y *= 0.5

\t# Horizontal movement
\tvar direction := Input.get_axis(&"move_left", &"move_right")
\tif direction:
\t\tvelocity.x = direction * speed
\t\tsprite.flip_h = direction < 0
\telse:
\t\tvelocity.x = move_toward(velocity.x, 0, speed * 0.2)

\tmove_and_slide()
`,
      },
      {
        filename: "enemy_slime.gd",
        gdscript: `extends CharacterBody2D

@export var speed: float = 60.0
@export var detection_range: float = 120.0

enum State { PATROL, CHASE, IDLE }

var gravity: float = ProjectSettings.get_setting("physics/2d/default_gravity")
var current_state: State = State.PATROL
var direction: float = 1.0
var player_ref: CharacterBody2D = null

@onready var sprite: Sprite2D = $Sprite2D
@onready var detection_area: Area2D = $DetectionArea

func _ready() -> void:
\tdetection_area.body_entered.connect(_on_detection_body_entered)
\tdetection_area.body_exited.connect(_on_detection_body_exited)

func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y += gravity * delta

\tmatch current_state:
\t\tState.PATROL:
\t\t\tvelocity.x = direction * speed
\t\t\tif is_on_wall():
\t\t\t\tdirection *= -1
\t\t\t\tsprite.flip_h = direction < 0
\t\tState.CHASE:
\t\t\tif player_ref:
\t\t\t\tvar dir = sign(player_ref.global_position.x - global_position.x)
\t\t\t\tvelocity.x = dir * speed * 1.5
\t\t\t\tsprite.flip_h = dir < 0
\t\tState.IDLE:
\t\t\tvelocity.x = move_toward(velocity.x, 0, speed)

\tmove_and_slide()

func _on_detection_body_entered(body: Node2D) -> void:
\tif body is CharacterBody2D and body.is_in_group(&"player"):
\t\tplayer_ref = body
\t\tcurrent_state = State.CHASE

func _on_detection_body_exited(body: Node2D) -> void:
\tif body == player_ref:
\t\tplayer_ref = null
\t\tcurrent_state = State.PATROL
`,
      },
      {
        filename: "game_manager.gd",
        gdscript: `extends Node

## Autoload singleton: manages game state, score, and level transitions.

signal score_changed(new_score: int)
signal lives_changed(new_lives: int)
signal game_over

var score: int = 0:
\tset(value):
\t\tscore = value
\t\tscore_changed.emit(score)

var lives: int = 3:
\tset(value):
\t\tlives = max(0, value)
\t\tlives_changed.emit(lives)
\t\tif lives <= 0:
\t\t\tgame_over.emit()

var current_level: int = 1

func add_score(amount: int) -> void:
\tscore += amount

func lose_life() -> void:
\tlives -= 1

func restart_level() -> void:
\tget_tree().reload_current_scene()

func next_level() -> void:
\tcurrent_level += 1
\t# TODO: Load next level scene
\tvar path = "res://scenes/levels/level_%d.tscn" % current_level
\tif ResourceLoader.exists(path):
\t\tget_tree().change_scene_to_file(path)

func reset_game() -> void:
\tscore = 0
\tlives = 3
\tcurrent_level = 1
`,
      },
    ],
    projectConfig: `; Engine configuration file.
; Do NOT edit this file via the editor. Use the project.godot editor instead.

[application]

config/name="PlatformerGame"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.3", "Forward Plus")

[autoload]

GameManager="*res://scripts/game_manager.gd"

[display]

window/size/viewport_width=1280
window/size/viewport_height=720
window/stretch/mode="viewport"

[input]

move_left={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":65,"key_label":0,"unicode":97)]
}
move_right={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":68,"key_label":0,"unicode":100)]
}
jump={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":32,"key_label":0,"unicode":32)]
}

[layer_names]

2d_physics/layer_1="player"
2d_physics/layer_2="enemies"
2d_physics/layer_3="world"
2d_physics/layer_4="collectibles"

[rendering]

textures/canvas_textures/default_texture_filter=0
`,
  },

  "2d-roguelike": {
    label: "2D Roguelike",
    description: "Procedurally generated dungeon crawler with turn-based or real-time combat, permadeath, and item systems.",
    gameType: "2d",
    difficulty: "intermediate",
    sceneTemplate: {
      name: "Main",
      type: "Node2D",
      children: [
        {
          name: "DungeonGenerator",
          type: "Node2D",
          children: [
            { name: "TileMap", type: "TileMap", properties: { cell_size: "16" } },
            { name: "RoomContainer", type: "Node2D" },
          ],
        },
        {
          name: "Player",
          type: "CharacterBody2D",
          children: [
            { name: "Sprite2D", type: "Sprite2D", properties: { texture: "res://assets/sprites/hero.png" } },
            { name: "CollisionShape2D", type: "CollisionShape2D", properties: { shape: "RectangleShape2D" } },
            { name: "Camera2D", type: "Camera2D", properties: { zoom: "Vector2(2, 2)" } },
            { name: "HitboxArea", type: "Area2D", children: [
              { name: "CollisionShape2D", type: "CollisionShape2D" },
            ] },
          ],
        },
        {
          name: "Entities",
          type: "Node2D",
          children: [
            { name: "EnemyContainer", type: "Node2D" },
            { name: "ItemContainer", type: "Node2D" },
          ],
        },
        {
          name: "UI",
          type: "CanvasLayer",
          children: [
            { name: "HealthBar", type: "ProgressBar" },
            { name: "Inventory", type: "Control" },
            { name: "Minimap", type: "SubViewportContainer" },
          ],
        },
      ],
    },
    scriptStubs: [
      {
        filename: "player_rogue.gd",
        gdscript: `extends CharacterBody2D

@export var speed: float = 120.0
@export var max_hp: int = 100
@export var attack_damage: int = 10
@export var defense: int = 5

signal hp_changed(current: int, maximum: int)
signal died

var hp: int = 100:
\tset(value):
\t\thp = clampi(value, 0, max_hp)
\t\thp_changed.emit(hp, max_hp)
\t\tif hp <= 0:
\t\t\tdied.emit()

var inventory: Array[Dictionary] = []

@onready var sprite: Sprite2D = $Sprite2D

func _ready() -> void:
\thp = max_hp

func _physics_process(delta: float) -> void:
\tvar input_dir := Vector2(
\t\tInput.get_axis(&"move_left", &"move_right"),
\t\tInput.get_axis(&"move_up", &"move_down")
\t)
\tvelocity = input_dir.normalized() * speed

\tif input_dir.x != 0:
\t\tsprite.flip_h = input_dir.x < 0

\tif Input.is_action_just_pressed(&"attack"):
\t\t_attack()

\tmove_and_slide()

func _attack() -> void:
\tvar bodies = $HitboxArea.get_overlapping_bodies()
\tfor body in bodies:
\t\tif body.has_method(&"take_damage"):
\t\t\tbody.take_damage(attack_damage)

func take_damage(amount: int) -> void:
\tvar actual = maxi(1, amount - defense)
\thp -= actual

func add_item(item: Dictionary) -> void:
\tinventory.append(item)
`,
      },
      {
        filename: "dungeon_generator.gd",
        gdscript: `extends Node2D

## Procedural dungeon generation using BSP (Binary Space Partitioning).

@export var map_width: int = 80
@export var map_height: int = 60
@export var min_room_size: int = 6
@export var max_room_size: int = 14
@export var max_rooms: int = 15

signal dungeon_generated(rooms: Array)

var rooms: Array[Rect2i] = []

@onready var tile_map: TileMap = $TileMap

func _ready() -> void:
\tgenerate()

func generate() -> void:
\trooms.clear()
\t_fill_walls()

\tfor i in max_rooms:
\t\tvar w = randi_range(min_room_size, max_room_size)
\t\tvar h = randi_range(min_room_size, max_room_size)
\t\tvar x = randi_range(1, map_width - w - 1)
\t\tvar y = randi_range(1, map_height - h - 1)
\t\tvar room = Rect2i(x, y, w, h)

\t\tvar overlaps = false
\t\tfor existing in rooms:
\t\t\tif room.grow(1).intersects(existing):
\t\t\t\toverlaps = true
\t\t\t\tbreak

\t\tif not overlaps:
\t\t\t_carve_room(room)
\t\t\tif rooms.size() > 0:
\t\t\t\t_carve_corridor(room.get_center(), rooms[-1].get_center())
\t\t\trooms.append(room)

\tdungeon_generated.emit(rooms)

func _fill_walls() -> void:
\tfor x in map_width:
\t\tfor y in map_height:
\t\t\ttile_map.set_cell(0, Vector2i(x, y), 0, Vector2i(0, 0))

func _carve_room(room: Rect2i) -> void:
\tfor x in range(room.position.x, room.end.x):
\t\tfor y in range(room.position.y, room.end.y):
\t\t\ttile_map.set_cell(0, Vector2i(x, y), 0, Vector2i(1, 0))

func _carve_corridor(from: Vector2i, to: Vector2i) -> void:
\tvar x = from.x
\twhile x != to.x:
\t\ttile_map.set_cell(0, Vector2i(x, from.y), 0, Vector2i(1, 0))
\t\tx += signi(to.x - x)
\tvar y = from.y
\twhile y != to.y:
\t\ttile_map.set_cell(0, Vector2i(to.x, y), 0, Vector2i(1, 0))
\t\ty += signi(to.y - y)
`,
      },
      {
        filename: "game_manager.gd",
        gdscript: `extends Node

## Autoload singleton: roguelike game state with permadeath.

signal floor_changed(floor_num: int)
signal run_ended(score: int)

var current_floor: int = 1
var total_score: int = 0
var run_seed: int = 0
var items_collected: Array[String] = []

func start_new_run() -> void:
\tcurrent_floor = 1
\ttotal_score = 0
\titems_collected.clear()
\trun_seed = randi()
\tseed(run_seed)
\tget_tree().change_scene_to_file("res://scenes/main.tscn")

func descend_floor() -> void:
\tcurrent_floor += 1
\tfloor_changed.emit(current_floor)
\tget_tree().reload_current_scene()

func end_run() -> void:
\trun_ended.emit(total_score)
\tget_tree().change_scene_to_file("res://scenes/game_over.tscn")

func add_score(amount: int) -> void:
\ttotal_score += amount
`,
      },
    ],
    projectConfig: `; Engine configuration file.

[application]

config/name="RoguelikeGame"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.3", "Forward Plus")

[autoload]

GameManager="*res://scripts/game_manager.gd"

[display]

window/size/viewport_width=1280
window/size/viewport_height=720
window/stretch/mode="viewport"

[input]

move_left={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":65)]}
move_right={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":68)]}
move_up={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":87)]}
move_down={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":83)]}
attack={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":32)]}
interact={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":69)]}

[layer_names]

2d_physics/layer_1="player"
2d_physics/layer_2="enemies"
2d_physics/layer_3="world"
2d_physics/layer_4="items"

[rendering]

textures/canvas_textures/default_texture_filter=0
`,
  },

  "2d-topdown-rpg": {
    label: "2D Top-Down RPG",
    description: "Classic top-down RPG with overworld exploration, NPC dialogue, turn-based or action combat, and quest systems.",
    gameType: "2d",
    difficulty: "intermediate",
    sceneTemplate: {
      name: "Main",
      type: "Node2D",
      children: [
        {
          name: "World",
          type: "Node2D",
          children: [
            { name: "TileMap", type: "TileMap", properties: { cell_size: "16" } },
            { name: "NPCContainer", type: "Node2D" },
            { name: "InteractableContainer", type: "Node2D" },
          ],
        },
        {
          name: "Player",
          type: "CharacterBody2D",
          children: [
            { name: "AnimatedSprite2D", type: "AnimatedSprite2D" },
            { name: "CollisionShape2D", type: "CollisionShape2D", properties: { shape: "CircleShape2D" } },
            { name: "Camera2D", type: "Camera2D", properties: { position_smoothing_enabled: "true" } },
            { name: "InteractionArea", type: "Area2D", children: [
              { name: "CollisionShape2D", type: "CollisionShape2D", properties: { shape: "RectangleShape2D" } },
            ] },
          ],
        },
        {
          name: "UI",
          type: "CanvasLayer",
          children: [
            { name: "HUD", type: "Control" },
            { name: "DialogueBox", type: "PanelContainer" },
            { name: "InventoryScreen", type: "Control" },
            { name: "PauseMenu", type: "Control" },
          ],
        },
      ],
    },
    scriptStubs: [
      {
        filename: "player_rpg.gd",
        gdscript: `extends CharacterBody2D

@export var speed: float = 100.0

signal interacted_with(target: Node2D)

var facing_direction: Vector2 = Vector2.DOWN
var can_move: bool = true

@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var interaction_area: Area2D = $InteractionArea

func _physics_process(delta: float) -> void:
\tif not can_move:
\t\tvelocity = Vector2.ZERO
\t\tmove_and_slide()
\t\treturn

\tvar input_dir := Vector2(
\t\tInput.get_axis(&"move_left", &"move_right"),
\t\tInput.get_axis(&"move_up", &"move_down")
\t)
\tvelocity = input_dir.normalized() * speed

\tif input_dir != Vector2.ZERO:
\t\tfacing_direction = input_dir.normalized()
\t\t_update_animation("walk")
\telse:
\t\t_update_animation("idle")

\tif Input.is_action_just_pressed(&"interact"):
\t\t_try_interact()

\tmove_and_slide()

func _update_animation(prefix: String) -> void:
\tvar dir_name = "down"
\tif abs(facing_direction.x) > abs(facing_direction.y):
\t\tdir_name = "right" if facing_direction.x > 0 else "left"
\telse:
\t\tdir_name = "down" if facing_direction.y > 0 else "up"
\tanimated_sprite.play(prefix + "_" + dir_name)

func _try_interact() -> void:
\tvar bodies = interaction_area.get_overlapping_bodies()
\tfor body in bodies:
\t\tif body.has_method(&"interact"):
\t\t\tbody.interact(self)
\t\t\tinteracted_with.emit(body)
\t\t\treturn
`,
      },
      {
        filename: "dialogue_manager.gd",
        gdscript: `extends Node

## Autoload: manages NPC dialogue sequences.

signal dialogue_started(npc_name: String)
signal dialogue_line(speaker: String, text: String)
signal dialogue_ended

var is_active: bool = false
var current_dialogue: Array[Dictionary] = []
var current_index: int = 0

func start_dialogue(dialogue: Array[Dictionary]) -> void:
\tcurrent_dialogue = dialogue
\tcurrent_index = 0
\tis_active = true
\tif dialogue.size() > 0:
\t\tdialogue_started.emit(dialogue[0].get("speaker", "???"))
\t\t_show_line()

func advance() -> void:
\tif not is_active:
\t\treturn
\tcurrent_index += 1
\tif current_index >= current_dialogue.size():
\t\tend_dialogue()
\telse:
\t\t_show_line()

func end_dialogue() -> void:
\tis_active = false
\tcurrent_dialogue.clear()
\tcurrent_index = 0
\tdialogue_ended.emit()

func _show_line() -> void:
\tvar line = current_dialogue[current_index]
\tdialogue_line.emit(line.get("speaker", "???"), line.get("text", ""))
`,
      },
      {
        filename: "game_manager.gd",
        gdscript: `extends Node

## Autoload singleton: RPG game state.

signal quest_updated(quest_id: String)

var player_stats: Dictionary = {
\t"level": 1, "xp": 0, "xp_to_next": 100,
\t"hp": 50, "max_hp": 50, "mp": 20, "max_mp": 20,
\t"attack": 10, "defense": 5
}
var quests: Dictionary = {}
var flags: Dictionary = {}

func add_xp(amount: int) -> void:
\tplayer_stats.xp += amount
\twhile player_stats.xp >= player_stats.xp_to_next:
\t\tplayer_stats.xp -= player_stats.xp_to_next
\t\tplayer_stats.level += 1
\t\tplayer_stats.xp_to_next = int(player_stats.xp_to_next * 1.5)
\t\tplayer_stats.max_hp += 10
\t\tplayer_stats.max_mp += 5
\t\tplayer_stats.attack += 2
\t\tplayer_stats.defense += 1

func set_flag(flag: String, value: Variant = true) -> void:
\tflags[flag] = value

func get_flag(flag: String, default_val: Variant = false) -> Variant:
\treturn flags.get(flag, default_val)

func start_quest(quest_id: String, data: Dictionary) -> void:
\tquests[quest_id] = data
\tquest_updated.emit(quest_id)
`,
      },
    ],
    projectConfig: `; Engine configuration file.

[application]

config/name="TopDownRPG"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.3", "Forward Plus")

[autoload]

GameManager="*res://scripts/game_manager.gd"
DialogueManager="*res://scripts/dialogue_manager.gd"

[display]

window/size/viewport_width=1280
window/size/viewport_height=720
window/stretch/mode="viewport"

[input]

move_left={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":65)]}
move_right={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":68)]}
move_up={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":87)]}
move_down={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":83)]}
interact={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":69)]}

[layer_names]

2d_physics/layer_1="player"
2d_physics/layer_2="npcs"
2d_physics/layer_3="world"

[rendering]

textures/canvas_textures/default_texture_filter=0
`,
  },

  "3d-fps": {
    label: "3D First-Person Shooter",
    description: "First-person shooter with mouselook, weapon system, enemy AI, and level design fundamentals.",
    gameType: "3d",
    difficulty: "intermediate",
    sceneTemplate: {
      name: "Main",
      type: "Node3D",
      children: [
        {
          name: "Player",
          type: "CharacterBody3D",
          children: [
            { name: "CollisionShape3D", type: "CollisionShape3D", properties: { shape: "CapsuleShape3D" } },
            {
              name: "Head",
              type: "Node3D",
              children: [
                { name: "Camera3D", type: "Camera3D", properties: { fov: "75" } },
                {
                  name: "WeaponPivot",
                  type: "Node3D",
                  children: [
                    { name: "WeaponMesh", type: "MeshInstance3D" },
                    { name: "RayCast3D", type: "RayCast3D", properties: { target_position: "Vector3(0, 0, -100)" } },
                    { name: "MuzzleFlash", type: "GPUParticles3D" },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: "World",
          type: "Node3D",
          children: [
            { name: "Floor", type: "StaticBody3D", children: [
              { name: "MeshInstance3D", type: "MeshInstance3D", properties: { mesh: "PlaneMesh", size: "Vector2(50, 50)" } },
              { name: "CollisionShape3D", type: "CollisionShape3D", properties: { shape: "WorldBoundaryShape3D" } },
            ] },
            { name: "DirectionalLight3D", type: "DirectionalLight3D", properties: { rotation_degrees: "Vector3(-45, -45, 0)" } },
            { name: "WorldEnvironment", type: "WorldEnvironment" },
          ],
        },
        {
          name: "Enemies",
          type: "Node3D",
          children: [
            {
              name: "EnemySoldier",
              type: "CharacterBody3D",
              children: [
                { name: "MeshInstance3D", type: "MeshInstance3D" },
                { name: "CollisionShape3D", type: "CollisionShape3D", properties: { shape: "CapsuleShape3D" } },
                { name: "NavigationAgent3D", type: "NavigationAgent3D" },
              ],
            },
          ],
        },
        {
          name: "UI",
          type: "CanvasLayer",
          children: [
            { name: "Crosshair", type: "TextureRect" },
            { name: "AmmoLabel", type: "Label" },
            { name: "HealthBar", type: "ProgressBar" },
          ],
        },
      ],
    },
    scriptStubs: [
      {
        filename: "fps_player.gd",
        gdscript: `extends CharacterBody3D

@export var speed: float = 5.0
@export var sprint_speed: float = 8.0
@export var jump_velocity: float = 4.5
@export var mouse_sensitivity: float = 0.002
@export var max_hp: int = 100

signal hp_changed(current: int, maximum: int)

var hp: int = 100
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
@onready var raycast: RayCast3D = $Head/WeaponPivot/RayCast3D

func _ready() -> void:
\tInput.mouse_mode = Input.MOUSE_MODE_CAPTURED
\thp = max_hp

func _unhandled_input(event: InputEvent) -> void:
\tif event is InputEventMouseMotion:
\t\trotate_y(-event.relative.x * mouse_sensitivity)
\t\thead.rotate_x(-event.relative.y * mouse_sensitivity)
\t\thead.rotation.x = clampf(head.rotation.x, -PI / 2, PI / 2)

\tif event.is_action_pressed(&"shoot"):
\t\t_shoot()

\tif event.is_action_pressed(&"ui_cancel"):
\t\tInput.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y -= gravity * delta

\tif Input.is_action_just_pressed(&"jump") and is_on_floor():
\t\tvelocity.y = jump_velocity

\tvar current_speed = sprint_speed if Input.is_action_pressed(&"sprint") else speed
\tvar input_dir := Input.get_vector(&"move_left", &"move_right", &"move_forward", &"move_back")
\tvar direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

\tif direction:
\t\tvelocity.x = direction.x * current_speed
\t\tvelocity.z = direction.z * current_speed
\telse:
\t\tvelocity.x = move_toward(velocity.x, 0, current_speed)
\t\tvelocity.z = move_toward(velocity.z, 0, current_speed)

\tmove_and_slide()

func _shoot() -> void:
\tif raycast.is_colliding():
\t\tvar target = raycast.get_collider()
\t\tif target and target.has_method(&"take_damage"):
\t\t\ttarget.take_damage(25)

func take_damage(amount: int) -> void:
\thp = maxi(0, hp - amount)
\thp_changed.emit(hp, max_hp)
`,
      },
      {
        filename: "enemy_soldier.gd",
        gdscript: `extends CharacterBody3D

@export var speed: float = 3.5
@export var max_hp: int = 50
@export var attack_range: float = 15.0
@export var attack_damage: int = 10

enum State { IDLE, PATROL, CHASE, ATTACK }

var hp: int = 50
var current_state: State = State.PATROL
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var player_ref: Node3D = null

@onready var nav_agent: NavigationAgent3D = $NavigationAgent3D

func _ready() -> void:
\thp = max_hp
\tnav_agent.velocity_computed.connect(_on_velocity_computed)

func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y -= gravity * delta

\tmatch current_state:
\t\tState.CHASE:
\t\t\tif player_ref:
\t\t\t\tnav_agent.target_position = player_ref.global_position
\t\t\t\tvar next_pos = nav_agent.get_next_path_position()
\t\t\t\tvar dir = (next_pos - global_position).normalized()
\t\t\t\tvelocity.x = dir.x * speed
\t\t\t\tvelocity.z = dir.z * speed
\t\t\t\tlook_at(Vector3(player_ref.global_position.x, global_position.y, player_ref.global_position.z))
\t\tState.IDLE, State.PATROL:
\t\t\tvelocity.x = move_toward(velocity.x, 0, speed)
\t\t\tvelocity.z = move_toward(velocity.z, 0, speed)

\tmove_and_slide()

func _on_velocity_computed(safe_velocity: Vector3) -> void:
\tvelocity = safe_velocity

func take_damage(amount: int) -> void:
\thp -= amount
\tif hp <= 0:
\t\tqueue_free()
\telse:
\t\tcurrent_state = State.CHASE
\t\tplayer_ref = get_tree().get_first_node_in_group(&"player")
`,
      },
      {
        filename: "game_manager.gd",
        gdscript: `extends Node

## Autoload singleton: FPS game state.

signal ammo_changed(current: int, max_ammo: int)

var ammo: int = 30
var max_ammo: int = 30
var kills: int = 0

func reload() -> void:
\tammo = max_ammo
\tammo_changed.emit(ammo, max_ammo)

func use_ammo() -> bool:
\tif ammo <= 0:
\t\treturn false
\tammo -= 1
\tammo_changed.emit(ammo, max_ammo)
\treturn true

func register_kill() -> void:
\tkills += 1

func restart() -> void:
\tammo = max_ammo
\tkills = 0
\tget_tree().reload_current_scene()
`,
      },
    ],
    projectConfig: `; Engine configuration file.

[application]

config/name="FPSGame"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.3", "Forward Plus")

[autoload]

GameManager="*res://scripts/game_manager.gd"

[display]

window/size/viewport_width=1920
window/size/viewport_height=1080

[input]

move_forward={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":87)]}
move_back={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":83)]}
move_left={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":65)]}
move_right={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":68)]}
jump={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":32)]}
sprint={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":16777237)]}
shoot={"deadzone":0.5,"events":[Object(InputEventMouseButton,"button_index":1)]}
reload={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":82)]}

[layer_names]

3d_physics/layer_1="player"
3d_physics/layer_2="enemies"
3d_physics/layer_3="world"
3d_physics/layer_4="projectiles"
`,
  },

  "3d-third-person": {
    label: "3D Third-Person Adventure",
    description: "Third-person character controller with orbit camera, melee combat, and exploration.",
    gameType: "3d",
    difficulty: "advanced",
    sceneTemplate: {
      name: "Main",
      type: "Node3D",
      children: [
        {
          name: "Player",
          type: "CharacterBody3D",
          children: [
            { name: "MeshInstance3D", type: "MeshInstance3D", properties: { mesh: "CapsuleMesh" } },
            { name: "CollisionShape3D", type: "CollisionShape3D", properties: { shape: "CapsuleShape3D" } },
            { name: "AnimationPlayer", type: "AnimationPlayer" },
            {
              name: "CameraPivot",
              type: "Node3D",
              children: [
                {
                  name: "SpringArm3D",
                  type: "SpringArm3D",
                  properties: { spring_length: "5.0", collision_mask: "1" },
                  children: [
                    { name: "Camera3D", type: "Camera3D", properties: { fov: "70" } },
                  ],
                },
              ],
            },
            { name: "AttackArea", type: "Area3D", children: [
              { name: "CollisionShape3D", type: "CollisionShape3D", properties: { shape: "SphereShape3D", radius: "2.0" } },
            ] },
          ],
        },
        {
          name: "World",
          type: "Node3D",
          children: [
            { name: "Terrain", type: "StaticBody3D", children: [
              { name: "MeshInstance3D", type: "MeshInstance3D" },
              { name: "CollisionShape3D", type: "CollisionShape3D" },
            ] },
            { name: "DirectionalLight3D", type: "DirectionalLight3D" },
            { name: "WorldEnvironment", type: "WorldEnvironment" },
          ],
        },
        {
          name: "UI",
          type: "CanvasLayer",
          children: [
            { name: "HealthBar", type: "ProgressBar" },
            { name: "StaminaBar", type: "ProgressBar" },
            { name: "InteractPrompt", type: "Label" },
          ],
        },
      ],
    },
    scriptStubs: [
      {
        filename: "third_person_player.gd",
        gdscript: `extends CharacterBody3D

@export var speed: float = 4.0
@export var sprint_speed: float = 7.0
@export var jump_velocity: float = 5.0
@export var rotation_speed: float = 10.0
@export var mouse_sensitivity: float = 0.003
@export var max_hp: int = 100
@export var max_stamina: float = 100.0
@export var stamina_regen: float = 15.0
@export var sprint_cost: float = 20.0

signal hp_changed(current: int, maximum: int)
signal stamina_changed(current: float, maximum: float)

var hp: int = 100
var stamina: float = 100.0
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var is_attacking: bool = false

@onready var camera_pivot: Node3D = $CameraPivot
@onready var spring_arm: SpringArm3D = $CameraPivot/SpringArm3D
@onready var animation_player: AnimationPlayer = $AnimationPlayer

func _ready() -> void:
\tInput.mouse_mode = Input.MOUSE_MODE_CAPTURED
\thp = max_hp
\tstamina = max_stamina

func _unhandled_input(event: InputEvent) -> void:
\tif event is InputEventMouseMotion:
\t\tcamera_pivot.rotate_y(-event.relative.x * mouse_sensitivity)
\t\tspring_arm.rotate_x(-event.relative.y * mouse_sensitivity)
\t\tspring_arm.rotation.x = clampf(spring_arm.rotation.x, -PI / 4, PI / 3)

\tif event.is_action_pressed(&"attack") and not is_attacking:
\t\t_attack()

func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y -= gravity * delta

\tif Input.is_action_just_pressed(&"jump") and is_on_floor():
\t\tvelocity.y = jump_velocity

\tvar is_sprinting = Input.is_action_pressed(&"sprint") and stamina > 0
\tvar current_speed = sprint_speed if is_sprinting else speed

\tif is_sprinting:
\t\tstamina = maxf(0, stamina - sprint_cost * delta)
\telse:
\t\tstamina = minf(max_stamina, stamina + stamina_regen * delta)
\tstamina_changed.emit(stamina, max_stamina)

\tvar input_dir := Input.get_vector(&"move_left", &"move_right", &"move_forward", &"move_back")
\tvar direction := (camera_pivot.global_basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

\tif direction:
\t\tvelocity.x = direction.x * current_speed
\t\tvelocity.z = direction.z * current_speed
\t\t# Rotate player mesh toward movement direction
\t\tvar target_rotation = atan2(direction.x, direction.z)
\t\trotation.y = lerp_angle(rotation.y, target_rotation, rotation_speed * delta)
\telse:
\t\tvelocity.x = move_toward(velocity.x, 0, current_speed)
\t\tvelocity.z = move_toward(velocity.z, 0, current_speed)

\tmove_and_slide()

func _attack() -> void:
\tis_attacking = true
\tvar targets = $AttackArea.get_overlapping_bodies()
\tfor target in targets:
\t\tif target.has_method(&"take_damage"):
\t\t\ttarget.take_damage(20)
\tawait get_tree().create_timer(0.5).timeout
\tis_attacking = false

func take_damage(amount: int) -> void:
\thp = maxi(0, hp - amount)
\thp_changed.emit(hp, max_hp)
`,
      },
      {
        filename: "enemy_melee.gd",
        gdscript: `extends CharacterBody3D

@export var speed: float = 3.0
@export var max_hp: int = 80
@export var attack_damage: int = 15
@export var attack_cooldown: float = 1.5

var hp: int = 80
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var can_attack: bool = true

@onready var nav_agent: NavigationAgent3D = $NavigationAgent3D

func _ready() -> void:
\thp = max_hp

func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y -= gravity * delta

\tvar player = get_tree().get_first_node_in_group(&"player")
\tif player:
\t\tnav_agent.target_position = player.global_position
\t\tvar next = nav_agent.get_next_path_position()
\t\tvar dir = (next - global_position).normalized()
\t\tvelocity.x = dir.x * speed
\t\tvelocity.z = dir.z * speed
\t\tlook_at(Vector3(player.global_position.x, global_position.y, player.global_position.z))

\tmove_and_slide()

func take_damage(amount: int) -> void:
\thp -= amount
\tif hp <= 0:
\t\tqueue_free()
`,
      },
      {
        filename: "game_manager.gd",
        gdscript: `extends Node

## Autoload singleton: third-person adventure game state.

signal checkpoint_reached(id: String)

var checkpoints: Dictionary = {}
var last_checkpoint: String = ""

func save_checkpoint(id: String, position: Vector3) -> void:
\tcheckpoints[id] = position
\tlast_checkpoint = id
\tcheckpoint_reached.emit(id)

func respawn_at_checkpoint() -> void:
\tif last_checkpoint in checkpoints:
\t\tvar player = get_tree().get_first_node_in_group(&"player")
\t\tif player:
\t\t\tplayer.global_position = checkpoints[last_checkpoint]

func restart() -> void:
\tcheckpoints.clear()
\tlast_checkpoint = ""
\tget_tree().reload_current_scene()
`,
      },
    ],
    projectConfig: `; Engine configuration file.

[application]

config/name="ThirdPersonAdventure"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.3", "Forward Plus")

[autoload]

GameManager="*res://scripts/game_manager.gd"

[display]

window/size/viewport_width=1920
window/size/viewport_height=1080

[input]

move_forward={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":87)]}
move_back={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":83)]}
move_left={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":65)]}
move_right={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":68)]}
jump={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":32)]}
sprint={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":16777237)]}
attack={"deadzone":0.5,"events":[Object(InputEventMouseButton,"button_index":1)]}

[layer_names]

3d_physics/layer_1="player"
3d_physics/layer_2="enemies"
3d_physics/layer_3="world"
`,
  },

  "puzzle-game": {
    label: "Puzzle Game",
    description: "Grid-based or physics-based puzzle game with level progression, undo system, and star ratings.",
    gameType: "2d",
    difficulty: "beginner",
    sceneTemplate: {
      name: "Main",
      type: "Node2D",
      children: [
        {
          name: "PuzzleBoard",
          type: "Node2D",
          children: [
            { name: "Grid", type: "TileMap", properties: { cell_size: "64" } },
            { name: "PieceContainer", type: "Node2D" },
          ],
        },
        {
          name: "UI",
          type: "CanvasLayer",
          children: [
            {
              name: "HUD",
              type: "Control",
              children: [
                { name: "MoveCounter", type: "Label", properties: { text: "Moves: 0" } },
                { name: "Timer", type: "Label", properties: { text: "00:00" } },
                { name: "StarDisplay", type: "HBoxContainer" },
              ],
            },
            {
              name: "LevelSelect",
              type: "Control",
              children: [
                { name: "GridContainer", type: "GridContainer", properties: { columns: "5" } },
              ],
            },
            {
              name: "WinScreen",
              type: "Control",
              children: [
                { name: "StarsEarned", type: "HBoxContainer" },
                { name: "NextButton", type: "Button" },
                { name: "RetryButton", type: "Button" },
              ],
            },
            {
              name: "UndoButton",
              type: "Button",
              properties: { text: "Undo" },
            },
          ],
        },
      ],
    },
    scriptStubs: [
      {
        filename: "puzzle_board.gd",
        gdscript: `extends Node2D

## Manages the puzzle grid, piece placement, and win condition checks.

@export var grid_size: Vector2i = Vector2i(8, 8)
@export var cell_size: int = 64

signal move_made(total_moves: int)
signal puzzle_solved(moves: int, time: float)

var grid: Array = []
var move_count: int = 0
var move_history: Array[Dictionary] = []
var elapsed_time: float = 0.0
var is_playing: bool = false

func _ready() -> void:
\t_init_grid()

func _process(delta: float) -> void:
\tif is_playing:
\t\telapsed_time += delta

func _init_grid() -> void:
\tgrid.clear()
\tfor x in grid_size.x:
\t\tvar column: Array = []
\t\tfor y in grid_size.y:
\t\t\tcolumn.append(0)
\t\tgrid.append(column)

func start_level(level_data: Dictionary) -> void:
\t_init_grid()
\tmove_count = 0
\tmove_history.clear()
\telapsed_time = 0.0
\tis_playing = true
\t# TODO: Parse level_data and populate grid

func make_move(from: Vector2i, to: Vector2i) -> bool:
\tif not _is_valid_move(from, to):
\t\treturn false

\tmove_history.append({"from": from, "to": to, "piece": grid[from.x][from.y]})
\tgrid[to.x][to.y] = grid[from.x][from.y]
\tgrid[from.x][from.y] = 0
\tmove_count += 1
\tmove_made.emit(move_count)

\tif _check_win():
\t\tis_playing = false
\t\tpuzzle_solved.emit(move_count, elapsed_time)

\treturn true

func undo() -> void:
\tif move_history.is_empty():
\t\treturn
\tvar last = move_history.pop_back()
\tgrid[last.from.x][last.from.y] = last.piece
\tgrid[last.to.x][last.to.y] = 0
\tmove_count -= 1
\tmove_made.emit(move_count)

func _is_valid_move(from: Vector2i, to: Vector2i) -> bool:
\tif from.x < 0 or from.x >= grid_size.x or from.y < 0 or from.y >= grid_size.y:
\t\treturn false
\tif to.x < 0 or to.x >= grid_size.x or to.y < 0 or to.y >= grid_size.y:
\t\treturn false
\treturn grid[from.x][from.y] != 0

func _check_win() -> bool:
\t# TODO: Implement puzzle-specific win condition
\treturn false

func get_star_rating() -> int:
\t# 3 stars for optimal, 2 for good, 1 for completion
\t# TODO: Configure per-level thresholds
\tif move_count <= 10:
\t\treturn 3
\telif move_count <= 20:
\t\treturn 2
\treturn 1
`,
      },
      {
        filename: "puzzle_piece.gd",
        gdscript: `extends Sprite2D

## A draggable puzzle piece.

@export var grid_position: Vector2i = Vector2i.ZERO
@export var piece_type: int = 0

signal piece_clicked(piece: Node2D)
signal piece_released(piece: Node2D, grid_pos: Vector2i)

var dragging: bool = false
var drag_offset: Vector2 = Vector2.ZERO
var original_position: Vector2 = Vector2.ZERO

func _input(event: InputEvent) -> void:
\tif event is InputEventMouseButton:
\t\tif event.pressed and _is_mouse_over():
\t\t\tdragging = true
\t\t\tdrag_offset = global_position - get_global_mouse_position()
\t\t\toriginal_position = global_position
\t\t\tpiece_clicked.emit(self)
\t\telif not event.pressed and dragging:
\t\t\tdragging = false
\t\t\tvar target_grid = _snap_to_grid(get_global_mouse_position())
\t\t\tpiece_released.emit(self, target_grid)

\tif event is InputEventMouseMotion and dragging:
\t\tglobal_position = get_global_mouse_position() + drag_offset

func _is_mouse_over() -> bool:
\tvar rect = get_rect()
\treturn rect.has_point(to_local(get_global_mouse_position()))

func _snap_to_grid(pos: Vector2) -> Vector2i:
\tvar board = get_parent().get_parent() as Node2D
\tvar local = pos - board.global_position
\treturn Vector2i(int(local.x / 64), int(local.y / 64))

func snap_to_position(grid_pos: Vector2i, cell_size: int) -> void:
\tgrid_position = grid_pos
\tposition = Vector2(grid_pos.x * cell_size + cell_size / 2, grid_pos.y * cell_size + cell_size / 2)
`,
      },
      {
        filename: "game_manager.gd",
        gdscript: `extends Node

## Autoload singleton: puzzle game progression.

signal level_unlocked(level: int)

var current_level: int = 1
var max_level: int = 30
var stars: Dictionary = {}  # level_num -> star_count

func complete_level(level: int, star_count: int) -> void:
\tvar prev = stars.get(level, 0)
\tstars[level] = maxi(prev, star_count)
\tif level >= current_level and level < max_level:
\t\tcurrent_level = level + 1
\t\tlevel_unlocked.emit(current_level)

func get_stars(level: int) -> int:
\treturn stars.get(level, 0)

func get_total_stars() -> int:
\tvar total = 0
\tfor s in stars.values():
\t\ttotal += s
\treturn total

func is_level_unlocked(level: int) -> bool:
\treturn level <= current_level

func load_level(level: int) -> void:
\tif is_level_unlocked(level):
\t\t# TODO: Load level data from resource file
\t\tget_tree().change_scene_to_file("res://scenes/main.tscn")
`,
      },
    ],
    projectConfig: `; Engine configuration file.

[application]

config/name="PuzzleGame"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.3", "Forward Plus")

[autoload]

GameManager="*res://scripts/game_manager.gd"

[display]

window/size/viewport_width=1280
window/size/viewport_height=720
window/stretch/mode="viewport"

[input]

click={"deadzone":0.5,"events":[Object(InputEventMouseButton,"button_index":1)]}
undo={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":90,"ctrl_pressed":true)]}
restart={"deadzone":0.5,"events":[Object(InputEventKey,"physical_keycode":82)]}

[rendering]

textures/canvas_textures/default_texture_filter=0
`,
  },
};

// ── Utility Functions ──

/**
 * Get a template by key.
 */
export function getTemplate(key: string): GodotTemplate | undefined {
  return GODOT_TEMPLATES[key];
}

/**
 * Generate the full project file structure from a template.
 * Returns an array of {path, content} for every file in the project.
 */
export function generateProjectStructure(
  template: GodotTemplate,
  projectName: string
): ProjectFile[] {
  const files: ProjectFile[] = [];

  // project.godot with name replaced
  const config = template.projectConfig.replace(
    /config\/name="[^"]*"/,
    `config/name="${projectName}"`
  );
  files.push({ path: "project.godot", content: config });

  // Script files
  for (const stub of template.scriptStubs) {
    files.push({
      path: `scripts/${stub.filename}`,
      content: stub.gdscript,
    });
  }

  // Scene file stubs (tscn format placeholder)
  const sceneNodes = flattenSceneTree(template.sceneTemplate);
  files.push({
    path: "scenes/main.tscn",
    content: generateTscnStub(template.sceneTemplate, template.scriptStubs),
  });

  // Folder placeholders (empty .gdkeep files)
  const folders = [
    "scenes/",
    "scripts/",
    "assets/sprites/",
    "assets/audio/sfx/",
    "assets/audio/music/",
    "assets/fonts/",
    "assets/shaders/",
    "themes/",
    "resources/",
  ];

  if (template.gameType === "3d") {
    folders.push("assets/models/");
    folders.push("assets/materials/");
  }

  for (const folder of folders) {
    files.push({
      path: `${folder}.gdkeep`,
      content: "# Placeholder to preserve folder structure",
    });
  }

  return files;
}

/**
 * Prepare files for ZIP export.
 */
export function generateZipManifest(files: ProjectFile[]): ZipEntry[] {
  return files.map((file) => ({
    path: file.path,
    content: file.content,
    type: "text" as const,
  }));
}

// ── Internal helpers ──

function flattenSceneTree(node: SceneNode, prefix: string = ""): string[] {
  const path = prefix ? `${prefix}/${node.name}` : node.name;
  const result = [path];
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenSceneTree(child, path));
    }
  }
  return result;
}

function generateTscnStub(root: SceneNode, scripts: ScriptStub[]): string {
  const lines: string[] = [];

  // Header
  lines.push(`[gd_scene format=3]`);
  lines.push("");

  // External resources (scripts)
  scripts.forEach((script, i) => {
    lines.push(`[ext_resource type="Script" path="res://scripts/${script.filename}" id="${i + 1}"]`);
  });
  lines.push("");

  // Root node
  const rootScript = scripts.find((s) => s.filename.includes("player") || s.filename.includes("game"));
  lines.push(`[node name="${root.name}" type="${root.type}"]`);
  lines.push("");

  // Children (first level only for stub)
  if (root.children) {
    for (const child of root.children) {
      lines.push(`[node name="${child.name}" type="${child.type}" parent="."]`);
      if (child.properties) {
        for (const [key, value] of Object.entries(child.properties)) {
          lines.push(`${key} = ${value}`);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
