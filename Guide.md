# Simple Vision Cast — Developer Guide

Simple Vision Cast is a Construct 3 behavior that computes a **visibility polygon** around any object in real time using raycasting. It shapes the host object's mesh into that polygon every tick, giving you hardware-accelerated light cones, dynamic fog-of-war, detection radii, and searchlight effects without writing any shader code. It doubles as a spatial query engine - any event sheet or script can ask "is this world point visible right now?" making it equally useful for stealth AI, lighting, exploration, and gameplay logic.

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Project Setup](#2-project-setup)
3. [Plugin Properties](#3-plugin-properties)
4. [Obstacle Modes](#4-obstacle-modes)
5. [Cone and Facing Angle](#5-cone-and-facing-angle)
6. [Mesh Deformation and Rendering](#6-mesh-deformation-and-rendering)
7. [Point-in-Visibility Queries](#7-point-in-visibility-queries)
8. [Polygon Data Access](#8-polygon-data-access)
9. [Performance Tuning](#9-performance-tuning)
10. [Actions Reference](#10-actions-reference)
11. [Conditions Reference](#11-conditions-reference)
12. [Expressions Reference](#12-expressions-reference)
13. [Triggers Reference](#13-triggers-reference)
14. [System Use Cases](#14-system-use-cases)
15. [Game Use Cases](#15-game-use-cases)
16. [Using Simple Vision Cast with the Built-in Line of Sight Behavior](#16-using-simple-vision-cast-with-the-built-in-line-of-sight-behavior)
17. [Using Simple Vision Cast with the Drawing Canvas Addon](#17-using-simple-vision-cast-with-the-drawing-canvas-addon)
18. [Scripting (C3 Script / JavaScript)](#18-scripting-c3-script--javascript)
19. [Tips and Common Mistakes](#19-tips-and-common-mistakes)

---

## 1. Core Concepts

### The problem this addon solves

The built-in Construct 3 tools for visibility are binary: two objects either have a clear line between them or they don't. There is no native way to compute *how much of the world* a given object can see the continuous region bounded by all visible angles. Calculating that by hand means casting hundreds of rays in script, collating the hit points, sorting them into a polygon, and then spending more time figuring out how to render it. Simple Vision Cast does all of that for you in an optimised internal loop, exposes the resulting polygon to your event sheet, and writes it directly to the host object's mesh so the renderer shows it automatically.

### Key design decisions

Simple Vision Cast is a **behavior**, not a plugin. You add it to an existing Construct object, typically a sprite with additive blending set up as a light, or an invisible rectangle used purely for detection. The behavior reads the host object's position and angle to define the ray origin and the cone orientation. The resulting visibility polygon is a fan of world-space coordinates emanating from that origin.

The host object's mesh is used for rendering. This means the object must have a finite size on screen, a 1×1-pixel sprite will deform its mesh, but nothing visible will appear. Use a sprite sized at least as large as the intended `Range`.

**Mesh deformation and gameplay logic are independent.** You can disable mesh writes entirely and still use `IsPointInVisibility` for stealth checks. You can also enable mesh deformation on an invisible layer to drive a Light Effect mask without the mesh being the final visual.

### Key concepts at a glance

| Term | Meaning |
|------|---------|
| **Visibility polygon** | The continuous region of world space that the ray origin can "see", bounded by obstacles |
| **Ray origin** | The host object's current centre position; the fan source |
| **Cone of view** | The angular arc (in degrees) the rays sweep; 360 = full circle |
| **Facing angle offset** | Rotates the cone relative to the host object's own angle property |
| **Obstacle mode** | How obstacles are identified: Solid behavior, Custom objects, or Tag |
| **Mesh stagger** | Skipping mesh writes to save GPU bandwidth while keeping LOS logic accurate |

### Scenarios where this addon excels

- **Dynamic lighting in dark levels** - place a light-sprite with additive blending; the mesh deforms to cast realistic shadows around walls.
- **Stealth guard detection cones** - give each guard a directional cone; check `IsPointInVisibility` against the player position each tick.
- **Fog of war for real-time strategy** - maintain one SVC instance per unit; union the polygons or use per-layer masking.
- **Environmental hazard radii** - a spinning trap emits a visibility polygon; anything inside is damaged.
- **Searchlight puzzles** - a rotating spotlight with a narrow cone; the player must cross without being seen.
- **Investigation systems** - reveal interactable objects only when they fall inside the player's cone of view.
- **Sonar / radar pings** - expand and contract the range dynamically to animate a pulse effect.

---

## 2. Project Setup

### Step 1 — Add the behavior

Select any sprite in your layout, open the Properties panel, click **Add behavior**, and choose **Simple Vision Cast**. The behavior is per-instance.

### Step 2 — Configure the sprite

The host sprite will have its mesh deformed into the visibility polygon. Use a white, fully opaque sprite with additive blending for a light cone effect. Set its origin to the point the light should emanate from (usually the center). Size it generously, at least as wide and tall as the intended range so the mesh has vertices to work with.

### Step 3 — Set properties

In the Properties panel, set `Range`, `Cone`, `Ray density`, and `Obstacle mode` for your use case. For a torch, `Range = 250`, `Cone = 60`, `Ray density = 75%`. For a guard, `Range = 300`, `Cone = 90`, `Ray density = 50%`.

### Step 4 — Add obstacle objects

If using **Tag** mode, tag your wall objects with the string you placed in `Obstacle tag` (e.g. `"wall"`). If using **Solid** mode, ensure wall objects have the built-in Solid behavior.

### Step 5 — First working example (player torch)

```
Event: System > Every tick
  Action: Torch.SimpleVisionCast > Set facing angle to Torch.Angle

Event: Torch.SimpleVisionCast > On polygon updated
  Condition: Torch.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: Text > Set text to "Player is lit!"
```

The mesh updates automatically - no explicit "render" action is needed.

---

## 3. Plugin Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Range** | Float (px) | 300 | Maximum ray travel distance. Higher values are more expensive. |
| **Cone** | Float (°) | 360 | Angular sweep of the visibility fan. 360 = omnidirectional. |
| **Ray density** | Percent | 100% | Rays cast per degree of cone. Lower values are faster but produce blockier polygons. |
| **Obstacle mode** | Combo | Solid | How obstacles are detected: Solid behavior, Custom objects, or Tag. |
| **Obstacle tag** | Text | "wall" | Tag string used when Obstacle mode is Tag. Comma-separate for multiple tags. |
| **Mesh deform enabled** | Check | true | Whether the visibility polygon is written to the host mesh each update. |
| **Mesh update interval** | Integer (frames) | 0 | Frames to skip between mesh writes. 0 = write every frame. |
| **Mesh stagger mode** | Combo | Stable | How skipped-frame mesh writes behave: Stable (freeze) or Hybrid (live LOS, staggered mesh). |
| **Enabled** | Check | true | Master switch. When false, raycasting and mesh updates stop entirely. |

---

## 4. Obstacle Modes

Simple Vision Cast offers three ways to decide which objects block rays. Choose the mode that matches your scene structure.

### Solid behavior mode

All objects in the layout that have Construct's built-in **Solid** behavior will block rays. This is the fastest mode to set up and requires zero tag management. The downside is that every Solid object blocks rays - if some solid objects should be walkable (like platform floors) but transparent to light, you need a different mode.

```
Event: System > On start of layout
  // No setup needed, all Solid objects automatically block rays
```

### Custom objects mode

You register specific object types. Only instances of those types will be candidates. This mode is ideal when your obstacles share no common tag or behavior but you have a finite, known set of types.

```
Event: System > On start of layout
  Action: Guard.SimpleVisionCast > Set obstacle mode to Custom objects
  Action: Guard.SimpleVisionCast > Add Wall as an obstacle object
  Action: Guard.SimpleVisionCast > Add Crate as an obstacle object
  Action: Guard.SimpleVisionCast > Add Door as an obstacle object
```

### Tag mode

Only instances tagged with the obstacle tag string are candidates. This is the most flexible and performant mode for large scenes - you can include or exclude individual instances dynamically.

```
Event: System > On start of layout
  Action: Light.SimpleVisionCast > Set obstacle mode to Tag
  Action: Light.SimpleVisionCast > Set obstacle tag to "wall"

Event: Button clicked (add fence)
  Action: Fence > Add instance variable tag "wall"
  // SVC picks it up on the next rebuild automatically
```

### Switching modes at runtime

```
Event: Player picks up "Thermal Goggles" item
  Action: Player.SimpleVisionCast > Set obstacle mode to Custom objects
  Action: Player.SimpleVisionCast > Clear all obstacle objects
  Action: Player.SimpleVisionCast > Add ThermalWall as an obstacle object
  // Thermal walls are a separate object type; normal walls no longer block
```

---

## 5. Cone and Facing Angle

The **cone of view** defines *how wide* the visibility fan is. The **facing angle offset** defines *which direction* the fan points, relative to the host object's own angle.

Setting the facing angle is important for directional objects like guards or torches. If you leave the offset at 0, the cone always points in the direction of the host object's `Angle` property.

```
Event: System > Every tick
  Action: Guard.SimpleVisionCast > Set facing angle offset to Guard.Angle
  // Alternatively, rotate the Guard object itself and leave offset at 0
```

For an enemy that turns to face a waypoint:

```
Event: Guard reaches waypoint
  Action: Guard > Set angle toward next waypoint
  // The cone follows automatically because SVC reads the host angle
```

For a cone that sweeps independently of the sprite angle (e.g. a camera mounted on a wall that pans):

```
Event: System > Every tick
  Action: Camera.SimpleVisionCast > Set facing angle offset to Camera.Angle
  Action: Camera > Set angle to 0  // keep the sprite upright
  // The cone pans while the visual stays still
```

---

## 6. Mesh Deformation and Rendering

Every tick, Simple Vision Cast rewrites the host object's mesh so its vertices trace the computed visibility polygon. No shader is needed, this is a standard Construct mesh deformation.

### Rendering a light cone

1. Create a large white sprite (e.g. 700×700 px, centered origin).
2. Set blending to **Additive** on the sprite.
3. Add SVC with `Range = 300`, `Cone = 90`, `Mesh deform enabled = true`.
4. Place it on a dark layer set to **Destination-out** or use a second layer with additive blending.

The mesh deforms every frame, creating a smooth shadow-casting light.

### Disabling mesh for pure gameplay use

If you only need detection logic and no visual, disable deformation to save bandwidth:

```
Event: System > On start of layout
  Action: DetectionZone.SimpleVisionCast > Disable mesh deform
```

Detection via `IsPointInVisibility` still works with mesh deform off.

### Mesh stagger modes

**Stable** (default): the mesh freezes between scheduled write ticks. The visual is choppy at low frame budgets but uses less GPU time. **Hybrid**: the visibility polygon is recomputed every frame for accurate gameplay queries, but the mesh is only written on the scheduled interval tick, blending smooth logic with reduced render cost.

```
Event: System > On start of layout
  // 20 background torches — only update mesh every 3 frames
  Action: BgTorch.SimpleVisionCast > Set mesh update interval to 3
  Action: BgTorch.SimpleVisionCast > Set mesh stagger mode to Hybrid
```

### Setting the mesh pin origin

The mesh fan radiates from a normalised position on the host sprite. Default is `(0.5, 0.5)` the centre. For a wall-mounted torch where the origin should be at the base, shift it:

```
Event: System > On start of layout
  Action: WallTorch.SimpleVisionCast > Set mesh pin origin to 0.5, 1.0
  // Fan origin is now the bottom-center of the sprite
```

---

## 7. Point-in-Visibility Queries

`IsPointInVisibility(x, y)` is the primary gameplay query. It returns true when the given world-space coordinate falls inside the current visibility polygon.

### Enemy spots the player

```
Event: System > Every tick
  Condition: Guard.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: Guard > Set state to "Alert"
```

### Multiple guards sharing a detection system

```
Event: System > Every tick (for each Guard)
  Condition: Guard.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: System > Set variable AnyGuardSeesPlayer to 1
```

### Collecting items only when in view

```
Event: On collision between Player and Coin
  Condition: Player.SimpleVisionCast > Point Coin.X, Coin.Y is in visibility
    Action: Coin > Destroy
    Action: HUD > Add 1 to score
```

### Checking multiple targets in a loop

```
Event: System > Every tick
  Action: System > Set variable VisibleEnemyCount to 0
  Sub-event: For each Enemy
    Condition: Player.SimpleVisionCast > Point Enemy.X, Enemy.Y is in visibility
      Action: System > Add 1 to VisibleEnemyCount
```

---

## 8. Polygon Data Access

The visibility polygon's raw point data is accessible through the `Visibility` expression group. This lets you iterate every vertex, check which obstacle a ray hit, and compute derived metrics.

### Expressions

| Expression | Returns | What it gives you |
|---|---|---|
| `CountPolyPoints` | number | Total vertices in the current polygon |
| `GetPolyPointX(i)` | number | World X of vertex i |
| `GetPolyPointY(i)` | number | World Y of vertex i |
| `GetPolyPointAngle(i)` | number | Angle (degrees) from origin to vertex i |
| `GetPolyPointDist(i)` | number | Distance from origin to vertex i |
| `GetPolyHitUID(i)` | number | UID of the obstacle hit at vertex i, or -1 if open space |
| `PolygonArea` | number | Approximate area of the polygon |
| `LastPolygonUpdateTime` | number | Runtime timestamp of the last rebuild |

### Logging which obstacles a guard can see

```
Event: Guard.SimpleVisionCast > On polygon updated
  Sub-event: For i = 0 to Guard.SimpleVisionCast.CountPolyPoints - 1
    Condition: Guard.SimpleVisionCast.GetPolyHitUID(i) >= 0
      Action: DebugLog > Print "Obstacle UID: " & Guard.SimpleVisionCast.GetPolyHitUID(i)
```

### Showing polygon area in a UI diagnostic

```
Event: System > Every tick
  Action: AreaText > Set text to "Visible area: " & round(Player.SimpleVisionCast.PolygonArea) & " px²"
```

### Detecting when a specific wall enters view

```
Event: Guard.SimpleVisionCast > On polygon updated
  Sub-event: For i = 0 to Guard.SimpleVisionCast.CountPolyPoints - 1
    Condition: Guard.SimpleVisionCast.GetPolyHitUID(i) = TargetWall.UID
      Action: System > Set variable TargetWallVisible to 1
```

---

## 9. Performance Tuning

A single SVC instance at 300px range, 360° cone, 100% density runs in under 1 ms on a modern desktop. The cost scales with `range × density × obstacleCount`. With dozens of instances in a busy scene you need a budget strategy.

### Four levers in order of impact

| Lever | When to use |
|---|---|
| **Reduce ray density** | First choice; drop to 25–50% for background lights |
| **Increase raycast skip rate** | Off-screen or non-critical emitters - update every 3-5 frames |
| **Cap obstacle candidates** | Very dense scenes with hundreds of tagged obstacles |
| **Time-based mesh interval** | Backgrounds that only need ~10 mesh writes per second |

### Adaptive quality based on framerate

```
Event: System > Every tick
  Condition: System.FPS < 50
    Action: AllLights.SimpleVisionCast > Set ray density to 25
    Action: AllLights.SimpleVisionCast > Set raycast skip rate to 3
  Else condition: System.FPS >= 58
    Action: AllLights.SimpleVisionCast > Set ray density to 75
    Action: AllLights.SimpleVisionCast > Set raycast skip rate to 1
```

### On raycast budget exceeded

```
Event: Guard.SimpleVisionCast > On raycast took longer than 2 ms
  Action: Guard.SimpleVisionCast > Set ray density to 30
  Action: DebugLog > Print "SVC budget hit: " & Guard.SimpleVisionCast.LastRaycastMs & " ms"
```

### Staggering many instances

Distribute update offsets across the frame by using `SetRaycastSkipRate` and varying `SetEnabled` on a round-robin timer so not all instances rebuild on the same frame.

---

## 10. Actions Reference

### Setup

| Action | Description |
|---|---|
| **Set range** | Sets the maximum ray travel distance in pixels. |
| **Set cone of view** | Sets the angular sweep in degrees (1–360). |
| **Set ray density** | Sets the ray-per-degree ratio as a percentage (1–100). |
| **Set facing angle offset** | Rotates the cone relative to the host object's angle. |
| **Set obstacle mode** | Switches between Solid, Custom objects, and Tag obstacle detection. |
| **Set obstacle tag** | Replaces the active obstacle tag(s); comma-separate for multiple. |
| **Add obstacle tag** | Adds one or more tags to the active tag set without clearing others. |
| **Remove obstacle tag** | Removes one or more tags from the active tag set. |
| **Add obstacle object** | Registers an object type as a custom obstacle (Custom objects mode). |
| **Remove obstacle object** | Unregisters an object type from custom obstacle mode. |
| **Clear obstacle objects** | Removes all registered custom obstacle types at once. |
| **Set ray count** | Sets the number of primary rays cast each update directly. |

### Mesh

| Action | Description |
|---|---|
| **Enable mesh deform** | Resumes writing the visibility polygon to the host mesh each tick. |
| **Disable mesh deform** | Stops all mesh writes; visibility queries still work. |
| **Reset mesh** | Flattens the mesh back to a rectangular grid and disables deformation. |
| **Set mesh pin origin** | Moves the fan origin within the host sprite (normalized 0–1 coordinates). |

### State

| Action | Description |
|---|---|
| **Set enabled** | Enables or disables the entire behavior, including raycasting. |

### Performance

| Action | Description |
|---|---|
| **Set mesh update interval** | Skips N frames between mesh writes (0 = every frame). |
| **Set mesh update interval (time)** | Sets a time-based mesh write interval in seconds; 0 reverts to frame-based. |
| **Set mesh stagger mode** | Switches between Stable (freeze) and Hybrid (live LOS, staggered mesh). |
| **Set raycast skip rate** | Rebuilds the visibility polygon only once every N frames. |
| **Set max obstacle candidates** | Caps the number of obstacles tested per rebuild (0 = unlimited). |

---

## 11. Conditions Reference

| Condition | Description |
|---|---|
| **Is enabled** | True when the behavior is currently active. Invertible. |
| **Is mesh deform enabled** | True when the mesh is being written each update. |
| **Is obstacle mode active** | True when the given mode (Solid/Custom/Tag) is the active mode. |
| **Has obstacle tag** | True when the given tag is in the active obstacle tag set. |
| **Has obstacle object** | True when the given object type is registered as a custom obstacle. |
| **Is point in visibility** | True when the given world-space X, Y falls inside the visibility polygon. |

---

## 12. Expressions Reference

### State

| Expression | Returns | Description |
|---|---|---|
| `ARange` | number | Current maximum range in pixels. |
| `ActiveConeOfView` | number | Current cone angle in degrees. |
| `ActiveFacingAngle` | number | Current facing angle offset in degrees. |
| `ActiveObstacleMode` | string | Active mode key: `"solid_behaviour"`, `"custom_objects"`, or `"tag"`. |
| `ActiveObstacleTag` | string | Current primary obstacle tag, or empty string outside tag mode. |
| `CountObstacleObjects` | number | Number of registered custom obstacle types. |

### Visibility

| Expression | Returns | Description |
|---|---|---|
| `CountPolyPoints` | number | Number of vertices in the current visibility polygon. |
| `GetPolyPointX(i)` | number | World X of polygon vertex at index i. |
| `GetPolyPointY(i)` | number | World Y of polygon vertex at index i. |
| `GetPolyPointAngle(i)` | number | Angle in degrees from the origin to vertex i. |
| `GetPolyPointDist(i)` | number | Distance in pixels from the origin to vertex i. |
| `GetPolyHitUID(i)` | number | UID of the obstacle hit at vertex i, or -1 for open space. |
| `PolygonArea` | number | Approximate area of the visibility polygon in square pixels. |
| `LastPolygonUpdateTime` | number | Runtime timestamp (seconds) of the last polygon rebuild. |

### Performance

| Expression | Returns | Description |
|---|---|---|
| `LastRaycastMs` | number | Time in milliseconds for the most recent vision rebuild. |
| `ObstacleCandidateCount` | number | Number of obstacle instances tested in the last rebuild. |
| `ActiveMeshUpdateInterval` | number | Current frame skip count between mesh writes. |
| `ActiveMeshUpdateIntervalTime` | number | Current time-based mesh write interval in seconds (0 = frame-based). |
| `ActiveMeshStaggerMode` | string | Current stagger mode key: `"stable"` or `"hybrid"`. |
| `ActiveRaycastSkipRate` | number | Frames between vision rebuilds (0 or 1 = no skip). |

---

## 13. Triggers Reference

| Trigger | Description |
|---|---|
| **On polygon updated** | Fires after every successful visibility polygon rebuild. |
| **On mesh not ready** | Fires when mesh deformation is enabled but the host has no writable mesh. |
| **On obstacle mode changed** | Fires after the active obstacle mode changes. |
| **On obstacle tag changed** | Fires after the primary obstacle tag changes in tag mode. |
| **On raycast budget exceeded** | Fires after any rebuild where the raycast duration exceeded the given threshold in ms. |

---

## 14. System Use Cases

### Setup system

The Setup system controls how rays are parameterised and which objects they collide with.

**Use case 1 — Minimal static light**

Scenario: A candle sprite that illuminates a radius around itself; walls are all tagged "wall".

```
Event: System > On start of layout
  Action: Candle.SimpleVisionCast > Set obstacle mode to Tag
  Action: Candle.SimpleVisionCast > Set obstacle tag to "wall"
  // Range, cone, and density set in Properties panel; nothing more needed
```

No per-tick actions are required — the behavior updates automatically.

**Use case 2 — Switching obstacle sets mid-game**

Scenario: A player uses a "Phase Torch" that ignores wooden walls and only sees stone walls.

```
Event: Player equips "Phase Torch"
  Action: Player.SimpleVisionCast > Set obstacle mode to Tag
  Action: Player.SimpleVisionCast > Set obstacle tag to "stone_wall"

Event: Player unequips "Phase Torch"
  Action: Player.SimpleVisionCast > Set obstacle tag to "wall,stone_wall"
```

**Use case 3 — Runtime cone adjustment**

Scenario: A guard's vision narrows when suspicious and widens when relaxed.

```
Event: Guard enters Suspicious state
  Action: Guard.SimpleVisionCast > Set cone of view to 50
  Action: Guard.SimpleVisionCast > Set range to 400

Event: Guard enters Relaxed state
  Action: Guard.SimpleVisionCast > Set cone of view to 90
  Action: Guard.SimpleVisionCast > Set range to 300
```

---

### Visibility polygon system

The Visibility system is where gameplay logic reads the computed polygon.

**Use case 4 — Item reveal on view entry**

Scenario: Clue objects in a detective game only become visible when the player looks at them.

```
Event: Clue.SimpleVisionCast > On polygon updated
  Condition: Clue.IsVisible = false
  Condition: Detective.SimpleVisionCast > Point Clue.X, Clue.Y is in visibility
    Action: Clue > Set visible to true
    Action: Clue > Start "reveal" animation
```

**Use case 5 — Proximity threat within cone**

Scenario: Damage the player if they walk into an active laser's cone.

```
Event: System > Every tick
  Condition: Laser.SimpleVisionCast > Is enabled
  Condition: Laser.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: Player > Subtract 1 from Health
```

**Use case 6 — Polygon area as a game mechanic**

Scenario: A puzzle scores players based on how much of the room their light fills.

```
Event: Timer fires "round_end"
  Action: ScoreText > Set text to "Coverage: " & round(Light.SimpleVisionCast.PolygonArea / RoomArea * 100) & "%"
```

---

### Mesh system

The Mesh system controls the visual rendering of the polygon.

**Use case 7 — Layer-masked shadow rendering**

Scenario: Use a dark overlay layer with a destination-out blending sprite to punch a hole where the light falls.

```
Event: System > On start of layout
  Action: ShadowMask.SimpleVisionCast > Enable mesh deform
  Action: ShadowMask.SimpleVisionCast > Set mesh pin origin to 0.5, 0.5
  // ShadowMask sprite: white fill, destination-out blending on the shadow layer
```

The mesh deforms to the polygon shape automatically; no further events are needed.

**Use case 8 — Freeze mesh for cinematic cutscene**

Scenario: During a cutscene, freeze the lighting polygon so performance is not wasted.

```
Event: Cutscene starts
  Action: AllLights.SimpleVisionCast > Disable mesh deform
  Action: AllLights.SimpleVisionCast > Set enabled to false

Event: Cutscene ends
  Action: AllLights.SimpleVisionCast > Set enabled to true
  Action: AllLights.SimpleVisionCast > Enable mesh deform
```

---

### Performance system

The Performance system keeps frame budgets under control in complex scenes.

**Use case 9 — Adaptive quality**

Scenario: Automatically lower quality when frame rate drops below 50.

```
Event: System > Every 1 second
  Condition: System.FPS < 50
    Action: AllLights.SimpleVisionCast > Set raycast skip rate to 3
    Action: AllLights.SimpleVisionCast > Set ray density to 25
  Condition: System.FPS >= 58
    Action: AllLights.SimpleVisionCast > Set raycast skip rate to 1
    Action: AllLights.SimpleVisionCast > Set ray density to 75
```

**Use case 10 — Background torch bank**

Scenario: 30 decorative torches in a dungeon hall need minimal CPU use.

```
Event: System > On start of layout (for each BgTorch)
  Action: BgTorch.SimpleVisionCast > Set mesh update interval to 4
  Action: BgTorch.SimpleVisionCast > Set mesh stagger mode to Hybrid
  Action: BgTorch.SimpleVisionCast > Set raycast skip rate to 5
  Action: BgTorch.SimpleVisionCast > Set max obstacle candidates to 10
  // Rebuilds vision every 5 frames; writes mesh every 4; checks only 10 nearest walls
```

---

### Save/Load system

SVC persists its entire configuration state to Construct's savegame JSON automatically. All properties, obstacle tags, and custom object names are saved and restored.

**Use case 11 — Mid-dungeon save**

Scenario: Player saves in a dungeon; their torch range and cone upgrades must persist.

```
Event: Player presses Save button
  Action: System > Save to slot 1
  // SVC automatically writes range, cone, density, obstacle mode, tags to the slot

Event: System > On slot 1 loaded
  // SVC automatically restores all its state; no extra actions needed
```

---

## 15. Game Use Cases

### 1. Basic player torch in a top-down dungeon

**Scenario:** A top-down dungeon game where the player carries a torch that illuminates only what is directly visible.

```
Event: System > On start of layout
  Action: Torch.SimpleVisionCast > Set obstacle mode to Tag
  Action: Torch.SimpleVisionCast > Set obstacle tag to "wall"

Event: System > Every tick
  Action: Torch.X > Set X to Player.X
  Action: Torch.Y > Set Y to Player.Y
  Action: Torch.SimpleVisionCast > Set facing angle offset to Player.Angle
```

The Torch sprite has additive blending. The dark overlay layer uses destination-out blending so everything outside the cone stays black.

---

### 2. Guard patrol detection cone

**Scenario:** A patrolling guard has a narrow forward cone. Entering it triggers an alert.

```
Event: System > On start of layout
  Action: Guard.SimpleVisionCast > Set cone of view to 90
  Action: Guard.SimpleVisionCast > Set range to 350
  Action: Guard.SimpleVisionCast > Set obstacle tag to "wall"

Event: System > Every tick
  Action: Guard.SimpleVisionCast > Set facing angle offset to Guard.Angle

Event: Guard.SimpleVisionCast > On polygon updated
  Condition: Guard.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: Guard > Set state to "Alert"
    Action: AlarmSound > Play
```

---

### 3. Fog of war for a top-down RTS

**Scenario:** Each unit has its own vision cone; the explored area is stored on a fog-of-war layer.

```
Event: System > Every tick (for each Unit)
  Sub-event: For i = 0 to Unit.SimpleVisionCast.CountPolyPoints - 1
    Action: FogCanvas > Erase circle at
      Unit.SimpleVisionCast.GetPolyPointX(i),
      Unit.SimpleVisionCast.GetPolyPointY(i), radius 8
```

For performance, stagger each unit's raycast skip rate and use `On polygon updated` rather than `Every tick` to drive the canvas erase.

---

### 4. Stealth game — player hides from guards

**Scenario:** The player must avoid all guard cones. Any guard that sees the player triggers a chase.

```
Event: System > Every tick (for each Guard)
  Condition: Guard.SimpleVisionCast > Point Player.X, Player.Y is in visibility
  Condition: Guard.state = "Patrol"
    Action: Guard > Set state to "Chase"
    Action: Guard > Set target to Player
    Action: Alert > Set visible to true
    Action: AlertSound > Play

Event: System > Every tick (for each Guard)
  Condition: Guard.state = "Chase"
  Condition: Guard.SimpleVisionCast > Point Player.X, Player.Y is in visibility = false
    Action: Guard > Set state to "Search"
```

---

### 5. Tower defense — tower targeting by vision

**Scenario:** Towers only attack enemies that are inside their vision polygon.

```
Event: System > Every tick (for each Tower)
  Action: System > Set variable TowerHasTarget to false
  Sub-event: For each Enemy
    Condition: Tower.SimpleVisionCast > Point Enemy.X, Enemy.Y is in visibility
    Condition: TowerHasTarget = false
      Action: Tower > Fire projectile toward Enemy
      Action: System > Set variable TowerHasTarget to true
```

Towers have 360° cones by default; change to directional cones for aesthetic variety.

---

### 6. Puzzle — rotating searchlight

**Scenario:** A spotlight rotates around a fixed pivot. The player must cross a gap when the cone points away.

```
Event: System > Every tick
  Action: Spotlight > Rotate 45 degrees per second
  // SVC facing angle reads Spotlight.Angle automatically

Event: Spotlight.SimpleVisionCast > On polygon updated
  Condition: Spotlight.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: System > Restart layout
    Action: DeathSound > Play
```

---

### 7. Horror game — monster's sensory zone

**Scenario:** A blind monster "sees" by sound its detection radius expands when the player makes noise.

```
Event: Player footstep sound plays
  Action: Monster.SimpleVisionCast > Set range to 500
  Action: Monster.SimpleVisionCast > Set cone of view to 360

Event: System > 2 seconds after "footstep"
  Action: Monster.SimpleVisionCast > Set range to 150
  Action: Monster.SimpleVisionCast > Set cone of view to 360

Event: System > Every tick
  Condition: Monster.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: Monster > Set state to "Hunt"
```

---

### 8. Dynamic light flicker effect

**Scenario:** A candle flickers by randomly adjusting range each frame.

```
Event: System > Every tick
  Action: Candle.SimpleVisionCast > Set range to 200 + random(50) - 25
  Action: Candle.SimpleVisionCast > Set ray density to 60
  // The mesh deforms to the new polygon shape each tick, creating organic flicker
```

---

### 9. Multiple light sources with additive blending

**Scenario:** Ten torches illuminate a dungeon. All use additive blending sprites on a single lighting layer.

```
Event: System > On start of layout (for each Torch)
  Action: Torch.SimpleVisionCast > Set obstacle mode to Tag
  Action: Torch.SimpleVisionCast > Set obstacle tag to "wall"
  Action: Torch.SimpleVisionCast > Set mesh update interval to 2
  Action: Torch.SimpleVisionCast > Set max obstacle candidates to 15
  // Additive blending is set in the sprite editor, not via events
```

Because each torch uses additive blending, overlapping cones naturally brighten the center.

---

### 10. Invisible detection zone for traps

**Scenario:** A pressure plate activates a spike trap when the player enters the spike zone, but only if the guard is watching.

```
Event: Player steps on pressure plate
  Condition: Guard.SimpleVisionCast > Point SpikeTrap.X, SpikeTrap.Y is in visibility
    Action: SpikeTrap > Activate
  Else condition:
    Action: Player > Play "close call" animation
```

SVC on the Guard; `IsPointInVisibility` on the trap's location - no visible mesh needed.

---

### 11. Day/night cycle — sun as a radial light

**Scenario:** A top-down scene fades from night to day by scaling the SVC range of a large ambient light.

```
Event: System > Every tick
  Action: SunLight.SimpleVisionCast > Set range to 200 + DayCycle * 1800
  // DayCycle is 0.0 (midnight) to 1.0 (noon)
  // At noon, range = 2000 (covers the full layout); at midnight, range = 200 (tiny glow)
```

---

### 12. Escort NPC — maintain line-of-sight to player

**Scenario:** An escort NPC stops and waits if the player leaves its view.

```
Event: System > Every tick
  Condition: Escort.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: Escort > Move toward Player at 150 px/sec
  Else:
    Action: Escort > Play animation "Idle"
    Action: HUD > Show "Escort is waiting..."
```

---

### 13. Collectibles revealed by proximity

**Scenario:** Hidden coins are only drawn when the player's torch reaches them.

```
Event: System > On start of layout (for each Coin)
  Action: Coin > Set visible to false

Event: System > Every 0.2 seconds
  Sub-event: For each Coin
    Condition: Player.SimpleVisionCast > Point Coin.X, Coin.Y is in visibility
      Action: Coin > Set visible to true
    Else:
      Action: Coin > Set visible to false
```

---

### 14. Exploding barrel chain reaction

**Scenario:** An explosion emits a blast cone. Any barrel inside the cone also explodes.

```
Event: Barrel explodes
  Action: BlastZone > Set position to Barrel.X, Barrel.Y
  Action: BlastZone.SimpleVisionCast > Set cone of view to 360
  Action: BlastZone.SimpleVisionCast > Set range to 200

Event: BlastZone.SimpleVisionCast > On polygon updated
  Sub-event: For each OtherBarrel
    Condition: BlastZone.SimpleVisionCast > Point OtherBarrel.X, OtherBarrel.Y is in visibility
      Action: OtherBarrel > Explode
  Action: BlastZone > Destroy
```

---

### 15. Sniper scope zoom — narrow cone at long range

**Scenario:** When the player aims, the view snaps to a long-range narrow cone.

```
Event: Player right-clicks (aim)
  Action: Player.SimpleVisionCast > Set cone of view to 15
  Action: Player.SimpleVisionCast > Set range to 1200
  Action: Player.SimpleVisionCast > Set ray density to 100

Event: Player releases right-click
  Action: Player.SimpleVisionCast > Set cone of view to 90
  Action: Player.SimpleVisionCast > Set range to 350
  Action: Player.SimpleVisionCast > Set ray density to 50
```

---

### 16. Vision cone on a vehicle — headlights

**Scenario:** A top-down car has twin headlight beams that follow the car's direction.

```
Event: System > On start of layout
  Action: LeftHeadlight.SimpleVisionCast > Set cone of view to 50
  Action: LeftHeadlight.SimpleVisionCast > Set range to 500
  Action: RightHeadlight.SimpleVisionCast > Set cone of view to 50
  Action: RightHeadlight.SimpleVisionCast > Set range to 500

Event: System > Every tick
  Action: LeftHeadlight > Set position to Car.ImagePointX("LeftLight"), Car.ImagePointY("LeftLight")
  Action: LeftHeadlight.SimpleVisionCast > Set facing angle offset to Car.Angle
  Action: RightHeadlight > Set position to Car.ImagePointX("RightLight"), Car.ImagePointY("RightLight")
  Action: RightHeadlight.SimpleVisionCast > Set facing angle offset to Car.Angle
```

---

### 17. Boss with sector-based attacks

**Scenario:** A boss has three rotating attack zones. The player takes damage in any active sector.

```
Event: System > Every tick
  Action: BossZone.SimpleVisionCast > Set facing angle offset to BossZone.Angle + BossRotationOffset
  Condition: BossZone.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: Player > Subtract 5 from Health
```

Spawn three separate BossZone instances at 120° offsets with independent SVC cones.

---

### 18. Sound radius — music volume by distance

**Scenario:** A radio object plays music louder as the player gets closer, but sound is blocked by walls.

```
Event: System > Every tick
  Condition: Radio.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    // Player is within unobstructed range — use polygon area as proximity proxy
    Action: MusicChannel > Set volume to -1 * (distance(Radio.X, Radio.Y, Player.X, Player.Y) / Radio.SimpleVisionCast.ARange * 50)
  Else:
    Action: MusicChannel > Set volume to -50
    // Muffled when walls obstruct
```

---

### 19. Security camera network

**Scenario:** Four cameras cover overlapping areas. If any camera sees the player, an alarm fires.

```
Event: System > Every tick (for each Camera)
  Condition: Camera.SimpleVisionCast > Point Player.X, Player.Y is in visibility
  Condition: AlarmActive = false
    Action: System > Set variable AlarmActive to true
    Action: Alarm > Play
    Action: AllGuards > Set state to "Alert"
```

Each camera has a 60° cone at different facing angles and a shared "wall" obstacle tag.

---

### 20. Light switch — toggle room illumination

**Scenario:** A light switch turns on/off a ceiling light that reveals the room.

```
Event: Player presses E near LightSwitch
  Condition: LightSwitch.IsOn = true
    Action: LightSwitch > Set variable IsOn to false
    Action: CeilingLight.SimpleVisionCast > Set enabled to false
    Action: CeilingLight.SimpleVisionCast > Reset mesh
  Else:
    Action: LightSwitch > Set variable IsOn to true
    Action: CeilingLight.SimpleVisionCast > Set enabled to true
    Action: CeilingLight.SimpleVisionCast > Enable mesh deform
```

---

### 21. Sonar pulse animation

**Scenario:** A submarine sends a sonar ping that expands outward, revealing submarines and mines.

```
Event: Player presses Space (sonar)
  Action: SonarPulse > Set position to Sub.X, Sub.Y
  Action: SonarPulse.SimpleVisionCast > Set range to 10
  Action: System > Create timeline "SonarExpand"

Event: Timeline "SonarExpand" > Every tick
  Condition: SonarPulse.SimpleVisionCast.ARange < 800
    Action: SonarPulse.SimpleVisionCast > Set range to SonarPulse.SimpleVisionCast.ARange + 20
  Else:
    Action: SonarPulse.SimpleVisionCast > Disable mesh deform
    Action: SonarPulse.SimpleVisionCast > Set enabled to false

Event: SonarPulse.SimpleVisionCast > On polygon updated
  Sub-event: For each Mine
    Condition: SonarPulse.SimpleVisionCast > Point Mine.X, Mine.Y is in visibility
      Action: Mine > Start "Ping" animation
```

---

### 22. Turret with blind spot

**Scenario:** A turret has a 270° cone (leaving a 90° blind spot behind). Sneaking through the blind spot is the puzzle.

```
Event: System > On start of layout
  Action: Turret.SimpleVisionCast > Set cone of view to 270
  Action: Turret.SimpleVisionCast > Set facing angle offset to Turret.Angle

Event: System > Every tick
  Condition: Turret.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    Action: Turret > Fire at Player
```

Place the blind spot indicator as a visual overlay on the Turret sprite so the player can orient themselves.

---

### 23. Minimap fog reveal

**Scenario:** The minimap shows only the areas the player has already illuminated.

```
Event: Player.SimpleVisionCast > On polygon updated
  Sub-event: For i = 0 to Player.SimpleVisionCast.CountPolyPoints - 1
    Action: MinimapFogCanvas > Erase at
      Player.SimpleVisionCast.GetPolyPointX(i) * MinimapScale,
      Player.SimpleVisionCast.GetPolyPointY(i) * MinimapScale,
      radius 3
```

The minimap canvas starts fully grey; polygon points erase the fog as the player explores.

---

### Other game use cases

**Top-down stealth games** are the flagship genre for Simple Vision Cast. Every guard, camera, and patrol light can carry its own SVC instance. The designer controls how wide and how far each cone reaches, whether it rotates, and how quickly it reacts when the player crosses its path. Because `IsPointInVisibility` is a simple boolean check, tying guard states to detection is a handful of events rather than a custom raycasting script.

**Tower defense** games benefit from per-tower vision polygons that naturally respect maze geometry. A tower's range is not a circle - it is a polygon shaped by the maze walls. Enemies that dart behind barricades are genuinely safe. Upgrading a tower can widen its cone or extend its range at runtime, with the mesh reflecting the upgrade visually the same frame.

**Horror survival** games use directional cones to give monsters a field of view that the player can exploit. Combine a narrow cone with `IsPointInVisibility` so the monster must turn to face the player before triggering a chase. An ambient 360° SVC with a short range simulates a monster's hearing radius - any footstep sound event can temporarily expand the range, making the game react to player noise in a spatially honest way.

**Dungeon crawler and roguelikes** use SVC for both the visual atmosphere (torches, magical glows, cursed flames) and for gameplay - locked chests reveal their contents only when fully inside the player's cone, hidden passages reveal themselves as rays pass through breakable wall segments, and darkness serves as a real obstacle rather than a tint effect.

**Real-time strategy and tactical RPG games** adopt SVC for fog of war. Each unit has a vision cone sized to their stats. Cloaking abilities disable the SVC behavior; scouting upgrades increase range and density at runtime. The `PolygonArea` expression becomes a numerical representation of how much of the map a unit currently controls.

**Puzzle platformers** turn the visibility system into an interactive obstacle. Spotlights, lasers, and detection fields are visible mechanics the player must navigate. The narrow-cone sonar ping pattern (expand range over time, detect on polygon update) creates a one-button puzzle mechanic with no scripting.

**Point-and-click adventure games** use SVC to gate interactable objects - the player can only examine an object once it falls within their current looking direction. Combine with the `OnPolygonUpdated` trigger to smoothly reveal investigation prompts as the camera pans or the player character rotates.

**Side-scrolling action games** mount SVC on projectiles to give them a "proximity fuse" quality - a missile explodes when its forward cone first intersects an obstacle's polygon points. SVC on a side-scroller requires obstacle mode Tag; tag only the geometry that should block the cone, not the floor.

**Racing games** use SVC as headlight simulation. Two narrow-cone SVC instances on each car illuminate the road ahead and cast shadows from barriers and other cars. Reducing ray density to 25% and updating the mesh every other frame keeps the effect cheap enough for a full grid of AI cars.

**Survival crafting games** give lanterns and campfires a 360° visibility polygon that drives heat and light mechanics simultaneously. If the player is inside the polygon they gain warmth; if wildlife is inside they are attracted or repelled. The same polygon drives the visual. Disabling mesh deform at night when the player is far from the fire reclaims that budget instantly.

**Metroidvania and exploration games** use SVC to simulate a helmet's built-in visor or the glow of a power-up. When the player acquires a new ability, swapping the obstacle mode from Tag to Solid (to reveal all objects, not just tagged ones) becomes the mechanical expression of the upgrade - a one-liner action that changes the entire world's visual presentation.

**MOBA-style games** need dense vision overlap from many instances. SVC's candidate cap (`SetMaxObstacleCandidates`) and stagger system make it viable for a full team of five hero instances plus dozens of minions, each with their own vision polygons, without saturating the frame budget.

**Submarine and naval combat games** use expanding-range sonar pings (incrementally increasing `SetRange` each frame) to reveal enemy positions in the dark. Because the polygon only extends through open water - walls and islands occlude it - the sonar naturally respects geometry.

**City builder and management games** use SVC for NPC pathing awareness - a city guard's cone of view determines which citizens they interact with. Disabling mesh deform on every guard and only enabling it for the currently selected guard keeps the display clean while all detection logic runs silently.

**Escape room games** reward players who position themselves carefully - a clue is only readable when both the player's torch and the static room light share the same patch of wall. The intersection of two visibility polygons can be approximated by checking `IsPointInVisibility` on both SVC instances.

**Educational and narrative games** deploy SVC as a dramatic spotlight - a narrator's spotlight that follows the key object in a scene, leaving everything else in shadow. The spotlight is an SVC instance on an invisible sprite; only the lit objects are rendered with normal blending.

**Farming and life simulation games** tie SVC to NPC awareness - a farmer notices if a crop plot falls in their forward 90° cone at close range, triggering harvest or watering animations. This is a pure gameplay-logic use; mesh deform is disabled, and `IsPointInVisibility` drives the NPC's daily routine.

**Battle royale and arena shooters** use a per-player SVC for the "heard footsteps" ring - a brief expanding pulse that highlights enemies briefly without revealing them permanently. The short lifetime (start range 0, grow to 400 over 0.5 seconds, then destroy) creates a mechanical heartbeat that skilled players can use to locate threats.

**Puzzle-platformer light reflection games** simulate mirrors by spawning a secondary SVC instance at each mirror's position, setting its facing angle to the reflected angle, and treating it as a "child" of the original beam. No actual ray-reflection math is needed - each SVC independently occludes.

**Rhythm action games** use a spinning SVC cone as the "hit zone" - the cone sweeps in sync with the BPM. A note is only valid when it falls inside the cone at the moment of the beat event. This combines audio timing with spatial logic in a way that feels completely natural to the player.

**Tactical card games with a board** use SVC to drive "flanking bonuses" - a unit's attack stat is boosted when the target is inside their cone but outside the target's own cone, implementing a positional advantage system without any manual angle math.

**Space exploration games** use SVC as the sensor sweep of a scanning probe. As the probe orbits a planet, the narrow forward cone sweeps across the surface, revealing terrain tiles, resources, and anomalies. The planet geometry acts as the obstacle set.

**Underwater exploration games** use a dim, short-range 360° SVC to simulate bioluminescent vision in the deep sea. The range dynamically shrinks as the player descends (increasing pressure / less light), creating spatial tension through a simple `SetRange` expression tied to the player's depth variable.

---

## 16. Using Simple Vision Cast with the Built-in Line of Sight Behavior

Construct 3's built-in **Line of Sight** (LoS) behavior answers a single binary question: "does object A have a clear straight line to object B?" Simple Vision Cast answers a much broader one: "what is the full polygon of space that object A can see?" These two behaviors are complementary, and combining them produces AI that is both spatially aware *and* precisely accurate.

### Why use both?

| Capability | Simple Vision Cast | Built-in Line of Sight |
|---|---|---|
| Compute a full visibility polygon | ✔ | ✗ |
| Cheap pre-filter (is target in cone?) | ✔ (IsPointInVisibility) | ✗ |
| Precise single ray to a specific target | ✗ | ✔ |
| Respects Solid behavior obstacles natively | ✔ (Solid mode) | ✔ |
| Range cone with custom angle | ✔ | Partial (range only) |
| Per-vertex polygon data (hit UIDs) | ✔ | ✗ |
| Mesh rendering of visibility area | ✔ | ✗ |
| Performance on many instances | Configurable | Lightweight for single checks |

### The two-pass detection pattern

The most efficient stealth guard implementation uses SVC as a **broad phase** pre-filter, then Line of Sight as a **narrow phase** confirmation.

```
Event: System > Every tick (for each Guard)
  // Pass 1: broad phase — is the player roughly in the guard's cone?
  Condition: Guard.SimpleVisionCast > Point Player.X, Player.Y is in visibility
    // Pass 2: narrow phase — is there actually a clear direct line?
    Condition: Guard.LineOfSight > Has line of sight to Player
      Action: Guard > Set state to "Alert"
      Action: Guard > Set target to Player
```

**Why the two-pass approach?** `IsPointInVisibility` is a polygon point-in-polygon test - very fast. The built-in Line of Sight behavior uses a separate collision-based ray. Running LoS on every guard every frame is cheap, but if you have 50 guards and 20 enemies, 1,000 LoS checks per frame add up. Filtering with SVC first means LoS only runs when SVC already confirms the target is plausibly in range.

### Sharing obstacle sets

Both behaviors can share the same obstacle objects. If you use **Solid mode** on SVC, the same objects that block SVC rays also block the built-in LoS automatically, no duplicate configuration.

If you use **Tag mode** on SVC, add the built-in LoS behavior's obstacle setting to match. This keeps both systems consistent.

### Using SVC for visuals, LoS for logic

SVC renders the light cone beautifully. The built-in LoS can confirm a single crisp ray without the polygon overhead. Use them on different objects for a clean separation of concerns:

```
// LightCone sprite: SVC for mesh rendering (visual only)
Event: System > On start of layout
  Action: LightCone.SimpleVisionCast > Enable mesh deform
  Action: LightCone.SimpleVisionCast > Set cone of view to 70
  Action: LightCone.SimpleVisionCast > Set range to 400

// Guard sprite: built-in LoS for confirmation
Event: System > Every tick
  Condition: Guard.LineOfSight > Has line of sight to Player
  Condition: distance(Guard.X, Guard.Y, Player.X, Player.Y) < 400
    Action: Guard > Set state to "Alert"
```

Here the visual cone is driven by SVC; the detection decision is made by LoS. If you later want to mirror the detection to the visual, add `IsPointInVisibility` as the pre-filter on the Guard's SVC instance.

### Detecting peripheral targets with SVC, then confirming with LoS

SVC's polygon can be queried for *all* points hit by rays, while LoS checks one target at a time. For games with many enemy NPCs, iterate the polygon to cheaply identify which UIDs are in view, then run a targeted LoS check only for those UIDs:

```
Event: Guard.SimpleVisionCast > On polygon updated
  Sub-event: For i = 0 to Guard.SimpleVisionCast.CountPolyPoints - 1
    Condition: Guard.SimpleVisionCast.GetPolyHitUID(i) >= 0
      // A polygon vertex hit something — is it a civilian NPC?
      Condition: System > Pick instance with UID Guard.SimpleVisionCast.GetPolyHitUID(i)
        Condition: Civilian exists
          // Narrow-phase confirm
          Condition: Guard.LineOfSight > Has line of sight to Civilian
            Action: Guard > Shout "Stop right there!"
```

### Expanding LoS range when SVC polygon shrinks

As walls close in, the SVC polygon area decreases. You can use `PolygonArea` to dynamically adjust how aggressively the guard checks:

```
Event: System > Every tick
  Condition: Guard.SimpleVisionCast.PolygonArea < 5000
    // Guard is in a tight corridor — rely more on proximity LoS
    Action: Guard.LineOfSight > Set range to 500
  Else:
    Action: Guard.LineOfSight > Set range to 300
```

### Summary of combination patterns

| Pattern | SVC role | LoS role |
|---|---|---|
| Two-pass detection | Broad-phase cone pre-filter | Narrow-phase single target confirm |
| Visual + logic separation | Mesh deform for light rendering | Binary detection per target |
| Polygon UID scan + confirm | Identify which objects are hit | Confirm clear line to each hit object |
| Adaptive LoS range | PolygonArea drives LoS range value | Adjustable range from SVC input |

### Other Line of Sight combination use cases

**Multiplayer games with peer-to-peer visibility** use SVC as a local optimization and LoS as a network authority check. Each client computes its own SVC cones; the server uses LoS to verify shots, spells, and detections are actually valid before applying effects. The broad phase keeps network traffic low; the narrow phase ensures cheat-proof gameplay.

**Procedural dungeon games** combine SVC fog-of-war with LoS verification - the player explores a dynamically generated level, and their vision cone reveals new rooms. When they fire a ranged weapon through a door, LoS checks confirm whether the shot actually passes through the opening or is blocked by the frame.

**Swarm AI systems** use SVC on the player or leader unit to quickly identify nearby swarm members, then LoS on each member to confirm they have a clear path back to the leader before signaling a regroup event. This saves the cost of checking hundreds of LoS rays per frame.

**Turn-based tactics games** run SVC once per turn to show the player's attack range and threat radius, then use LoS when the player confirms an action to verify the line exists. The combination gives clear visual feedback without redundant raycasting each frame.

**Beam weapons and lasers** use SVC as the sweep envelope and LoS as the instantaneous hit test. A sweeping laser is visualized by SVC's mesh; when it settles on a target, a LoS check confirms the hit and applies damage.

**Guard patrol AI with memory** uses SVC to detect the player in real time and LoS to confirm visual contact. Once the guard spots the player, the guard "remembers" the player's last known position for several seconds even if the LoS breaks, creating realistic chase behavior.

**Spell-casting systems with line-of-effect validation** use SVC to show the caster's visible area and LoS to check each targeted enemy or ally is actually reachable before applying the spell effect.

**Fog-of-war with line-of-sight verification** combines SVC's persistent polygon with LoS's frame-accurate checks, so a unit can "see" a far-off enemy within the fog polygon but the actual hit only registers if LoS confirms no walls are in between.

---

## 17. Using Simple Vision Cast with the Drawing Canvas Addon

The **Drawing Canvas** addon is a powerful tool for programmatic 2D graphics. Combined with Simple Vision Cast, it opens up possibilities for custom polygon rendering, data visualization, and complex visual effects that go beyond mesh deformation. While SVC's mesh system is optimized for real-time rendering, Drawing Canvas excels at overlays, debug displays, post-processing, and cases where you need precise pixel-level control.

### Why combine SVC with Drawing Canvas?

| Use case | Why it works |
|---|---|
| **Debug visualization** | Draw polygon vertices, ray directions, and hit points as overlay guides for development |
| **Custom polygon styling** | Render the polygon with strokes, gradients, or patterns not possible with mesh blending |
| **Multi-layer vision stacking** | Composite multiple SVC polygons on canvas with additive, multiplicative, or custom blend modes |
| **Post-process lighting effects** | Extract polygon data and feed it into canvas-based bloom, blur, or glow effects |
| **Minimap integration** | Draw the visibility polygon scaled and rotated onto a minimap canvas |
| **Recording and replay** | Capture polygon frames to canvas and export as image data for analysis or replays |
| **Procedural terrain overlay** | Layer SVC vision polygon over a procedurally drawn terrain map |

### Drawing the visibility polygon on canvas

The basic pattern is: on each `On polygon updated` trigger, loop through the polygon points and draw them to the canvas.

```javascript
// In C3 script
const svc = myGuard.behaviors.SimpleVisionCast;
const canvas = runtime.objects.DebugCanvas.getFirstInstance();

svc.addEventListener("OnPolygonUpdated", () => {
  canvas.clearCanvas(runtime.bandColor(0, 0, 0, 0));
  
  const count = svc._countPolyPoints();
  const points = [];
  
  for (let i = 0; i < count; i++) {
    points.push([svc._getPolyPointX(i), svc._getPolyPointY(i)]);
  }
  
  // Draw filled polygon
  canvas.fillPoly(points, runtime.bandColor(200, 255, 150, 100));
  
  // Draw outline
  canvas.linePoly(points, runtime.bandColor(255, 255, 255, 255), 2, "butt");
});
```

### Event sheet approach: drawing via canvas actions

If you prefer events over script, pair SVC expressions with canvas actions:

```
Event: Guard.SimpleVisionCast > On polygon updated
  Action: DebugCanvas > Clear canvas to color 0, 0, 0, 0
  Sub-event: For i = 0 to Guard.SimpleVisionCast.CountPolyPoints - 1
    Action: DebugCanvas > Draw line from
      Guard.X, Guard.Y
      to Guard.SimpleVisionCast.GetPolyPointX(i), Guard.SimpleVisionCast.GetPolyPointY(i)
      color 200, 255, 100, thickness 1
```

This approach is simpler to set up but loops through every point every frame, which is slower than the scripted polygon fill method.

### Minimap: scaling and rotating SVC polygon

A common use case is rendering the SVC polygon on a minimap canvas, scaled and offset.

```javascript
const minimapScale = 0.2;  // 1 world pixel = 0.2 map pixels
const minimapX = 50;        // top-left corner of minimap canvas
const minimapY = 50;

svc.addEventListener("OnPolygonUpdated", () => {
  const count = svc._countPolyPoints();
  const scaled = [];
  
  for (let i = 0; i < count; i++) {
    const wx = svc._getPolyPointX(i);
    const wy = svc._getPolyPointY(i);
    // Scale and translate to minimap space
    scaled.push([
      minimapX + wx * minimapScale,
      minimapY + wy * minimapScale
    ]);
  }
  
  minimapCanvas.fillPoly(scaled, runtime.bandColor(255, 200, 100, 150));
  minimapCanvas.linePoly(scaled, runtime.bandColor(255, 255, 255, 200), 1, "butt");
});
```

### Debug overlay: marking ray hits

Visualize which obstacles the rays are hitting by drawing circles at hit points and lines to unhit open-space rays.

```javascript
const debugCanvas = runtime.objects.DebugOverlay.getFirstInstance();

svc.addEventListener("OnPolygonUpdated", () => {
  const count = svc._countPolyPoints();
  
  debugCanvas.clearCanvas(runtime.bandColor(0, 0, 0, 0));
  
  for (let i = 0; i < count; i++) {
    const px = svc._getPolyPointX(i);
    const py = svc._getPolyPointY(i);
    const uid = svc._getPolyHitUID(i);
    
    if (uid >= 0) {
      // Hit an obstacle - draw a red circle
      debugCanvas.fillEllipse(px, py, 4, 4, runtime.bandColor(255, 0, 0, 200));
    } else {
      // Open ray - draw a blue dot
      debugCanvas.fillEllipse(px, py, 2, 2, runtime.bandColor(0, 0, 255, 150));
    }
  }
});
```

### Composite multiple vision cones

Layer multiple SVC polygons on one canvas to visualize guard overlaps or faction-specific vision blending.

```javascript
const compositeCanvas = runtime.objects.VisionComposite.getFirstInstance();

function drawSVCPolygon(canvas, svc, color) {
  const count = svc._countPolyPoints();
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push([svc._getPolyPointX(i), svc._getPolyPointY(i)]);
  }
  canvas.fillPoly(points, color);
}

// Draw all guards' cones additively
compositeCanvas.clearCanvas(runtime.bandColor(0, 0, 0, 255));
for (const guard of runtime.objects.Guard.getAllInstances()) {
  const svc = guard.behaviors.SimpleVisionCast;
  drawSVCPolygon(compositeCanvas, svc, runtime.bandColor(100, 255, 100, 80));
  // Additive blending on the canvas layer creates bright zones where cones overlap
}
```

### Exporting polygon data as image

Capture the canvas and save it for analysis, replay, or machine learning training.

```javascript
svc.addEventListener("OnPolygonUpdated", () => {
  const count = svc._countPolyPoints();
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push([svc._getPolyPointX(i), svc._getPolyPointY(i)]);
  }
  
  recordingCanvas.clearCanvas(runtime.bandColor(0, 0, 0, 255));
  recordingCanvas.fillPoly(points, runtime.bandColor(255, 255, 255, 255));
  
  // Save every 10 updates for replay or analysis
  if (runtime.globalVars.updateCount++ % 10 === 0) {
    recordingCanvas.saveImage("image/png", 1.0);
  }
});
```

### Bloom and glow effect on visibility polygon

Render the polygon to canvas, apply a blur effect, and composite back to the main layer for a soft glow.

```javascript
const backbufferCanvas = runtime.objects.BloomBuffer.getFirstInstance();
const finalCanvas = runtime.objects.CompositeOutput.getFirstInstance();

svc.addEventListener("OnPolygonUpdated", () => {
  // Step 1: Draw polygon to backbuffer
  backbufferCanvas.clearCanvas(runtime.bandColor(0, 0, 0, 0));
  const count = svc._countPolyPoints();
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push([svc._getPolyPointX(i), svc._getPolyPointY(i)]);
  }
  backbufferCanvas.fillPoly(points, runtime.bandColor(255, 200, 100, 200));
  
  // Step 2: Composite blurred version (would require blur shader or multiple passes)
  // For now, just draw directly with reduced opacity for a simple glow
  finalCanvas.clearCanvas(runtime.bandColor(0, 0, 0, 0));
  finalCanvas.fillPoly(points, runtime.bandColor(255, 200, 100, 100));
});
```

### Performance considerations

- **Polygon drawing is CPU-bound**, not GPU-bound like mesh deformation. For many overlapping polygons, consider drawing only every N updates.
- **Canvas saveImage is slow** - only call it on-demand, not every frame.
- **Use lower-resolution canvases** for debug visualizations; full-resolution canvases are expensive to clear and fill each frame.
- **Stagger polygon drawing** across multiple canvases by using different `On polygon updated` listeners on different SVC instances.

### Event sheet example: drawing with shapes layer

For a simple debug display without scripting, use a dedicated canvas object and shape drawing:

```
Event: Guard.SimpleVisionCast > On polygon updated
  Action: DebugShapesCanvas > Clear canvas
  Action: DebugShapesCanvas > Set draw blend mode to additive
  Sub-event: For i = 0 to Guard.SimpleVisionCast.CountPolyPoints - 1
    Action: DebugShapesCanvas > Draw line
      From: Guard.X, Guard.Y
      To: Guard.SimpleVisionCast.GetPolyPointX(i), Guard.SimpleVisionCast.GetPolyPointY(i)
      Color: rgb(100, 255, 100)
      Thickness: 2
```

This creates a visible debug overlay without affecting game performance.

### Other Drawing Canvas use cases

**Heatmaps for developer analytics** visualize which areas of the level are most frequently within player vision cones. Each polygon update writes to a heatmap canvas, accumulating brightness at frequently-seen locations. Export the heatmap at level end to identify level design issues or opportunities.

**AI vision debugging during development** shows real-time rays from SVC on a debug canvas layer, with different colors for hit vs. unhit rays. Developers can see exactly why an AI is or isn't detecting something without console spam.

**Procedurally generated vision zones** use canvas to draw complex, multi-textured SVC polygons overlaid on procedural terrain. The polygon acts as a mask or overlay for dynamically generated maps.

**Composite faction vision** on a shared strategy map draws each faction's SVC cones on a single canvas layer with transparent blending, so players can see where each faction's control zones overlap.

**Replay visualization** saves a sequence of SVC polygons to canvas over time, allowing players or developers to scrub through a replay and see exactly what each character could see at any moment.

**Accessibility overlays** render SVC polygons with high-contrast colors and outlines to help colorblind players or those with low vision more clearly distinguish between lit and shadowed areas.

**Real-time pathfinding visualization** uses canvas to draw SVC polygons alongside computed pathfinding routes, so developers can verify AI movement respects line-of-sight occlusion correctly.

**Lightmap baking visualization** pre-computes SVC polygons at grid positions across a level and saves them to canvas, creating a baked lightmap for offline use in performance-critical scenarios.

**Multiplayer spectator mode** draws all players' vision cones on a shared canvas overlay, letting spectators or tournament organizers see the full strategic picture of which areas are visible to whom.

**Screen-space ambient occlusion interaction** computes SVC polygons and feeds them into a canvas-based SSAO simulation to darken areas in shadows more convincingly than mesh deformation alone.

---

## 18. Scripting (C3 Script / JavaScript)

### Accessing the behavior

Because Simple Vision Cast is a behavior, access it from the instance's `behaviors` object. The name used in script is the **behavior's name as set in the Construct project** (the name shown in the Behaviors panel), not the addon ID.

```javascript
const inst = runtime.objects.Guard.getFirstInstance();
const svc = inst.behaviors.SimpleVisionCast;
```

### Calling actions from script

All ACEs marked `expose: true` are copied directly onto the behavior prototype. The method name is derived from the ACE filename in PascalCase. Calling from script produces the same side effects as the event sheet action.

```javascript
// Set range and cone
svc.SetRange(400);
svc.SetConeOfView(90);
svc.SetRayDensity(75);

// Obstacle setup
svc.SetObstacleMode(0);   // 0 = solid_behaviour, 1 = custom_objects, 2 = tag
svc.SetObstacleTag("wall,pillar");
svc.AddObstacleTag("crate");
svc.RemoveObstacleTag("crate");

// Mesh
svc.EnableMeshDeform();
svc.DisableMeshDeform();
svc.ResetMesh();
svc.SetMeshPinOrigin(0.5, 1.0);

// Performance
svc.SetMeshUpdateInterval(3);
svc.SetMeshStaggerMode(0);  // 0 = stable, 1 = hybrid
svc.SetRaycastSkipRate(5);
svc.SetMaxObstacleCandidates(20);

// State
svc.SetEnabled(true);
```

> **Combo parameters arrive as 0-based indices.** `SetObstacleMode(0)` is Solid, `(1)` is Custom objects, `(2)` is Tag. `SetMeshStaggerMode(0)` is Stable, `(1)` is Hybrid.

### Reading state from script

Public getter methods on the instance class are callable from script:

```javascript
// Configuration
svc._getActiveRange();           // current range in pixels
svc._getActiveConeOfView();      // current cone angle
svc._getActiveFacingAngle();     // current facing offset
svc._getActiveObstacleMode();    // "solid_behaviour" | "custom_objects" | "tag"
svc._getActiveObstacleTag();     // current tag string

// Polygon data
svc._countPolyPoints();
svc._getPolyPointX(i);
svc._getPolyPointY(i);
svc._getPolyPointAngle(i);
svc._getPolyPointDist(i);
svc._getPolyHitUID(i);
svc._getPolygonAreaExpression();
svc._getLastPolygonUpdateTime();

// Performance
svc._lastRaycastMs;
svc._obstacleCandidateCount;

// State flags
svc._isEnabled();
svc._isMeshDeformEnabled();
svc._isPointInVisibility(worldX, worldY);
```

### Listening to triggers from script

```javascript
svc.addEventListener("OnPolygonUpdated", () => {
  const area = svc._getPolygonAreaExpression();
  console.log("Polygon area:", area);
});

svc.addEventListener("OnMeshNotReady", () => {
  console.warn("No writable mesh found — check sprite mesh settings.");
});

svc.addEventListener("OnObstacleModeChanged", () => {
  console.log("Obstacle mode is now:", svc._getActiveObstacleMode());
});

svc.addEventListener("OnObstacleTagChanged", () => {
  console.log("Obstacle tag is now:", svc._getActiveObstacleTag());
});
```

### Looping polygon points

```javascript
const count = svc._countPolyPoints();
for (let i = 0; i < count; i++) {
  const x = svc._getPolyPointX(i);
  const y = svc._getPolyPointY(i);
  const uid = svc._getPolyHitUID(i);
  if (uid >= 0) {
    console.log(`Ray ${i} hit obstacle UID ${uid} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
  }
}
```

### Complete example — adaptive guard in script

```javascript
// In a C3 script attached to the Guard object
runOnStartOfLayout(() => {
  const guard = runtime.objects.Guard.getFirstInstance();
  const svc = guard.behaviors.SimpleVisionCast;

  svc.SetConeOfView(90);
  svc.SetRange(350);
  svc.SetObstacleMode(2);   // Tag mode
  svc.SetObstacleTag("wall");
  svc.SetRayDensity(50);

  svc.addEventListener("OnPolygonUpdated", () => {
    const player = runtime.objects.Player.getFirstInstance();
    if (!player) return;

    const inSight = svc._isPointInVisibility(player.x, player.y);
    if (inSight && guard.instVars.state !== "Alert") {
      guard.instVars.state = "Alert";
      runtime.objects.AlarmSound.getFirstInstance()?.behaviors.Audio?.playAt(guard.x, guard.y);
    }
  });
});
```

---

## 19. Tips and Common Mistakes

- **The sprite must be large enough to hold the mesh.** If the host sprite is smaller than the `Range` value, polygon vertices outside the sprite bounds will be clipped. Make the sprite at least `Range × 2` in both width and height, centered at the origin.

- **Facing angle offset vs. object angle.** The cone always sweeps around `hostObject.Angle + facingOffset`. If you want the cone to follow the object's rotation automatically, leave the offset at 0 and rotate the object. If you want the cone to face independently (e.g. a mounted camera), control the offset instead and keep the object angle fixed.

- **Tag mode requires instances to exist before the first rebuild.** If you spawn wall objects after the behavior first runs, SVC picks them up on the next rebuild automatically. No re-registration is needed.

- **`IsPointInVisibility` uses the polygon from the last rebuild, not a real-time cast.** If the polygon update interval is set to 5 frames, the polygon used for point checks can be up to 5 frames stale. Use `On polygon updated` to run logic only after a fresh rebuild.

- **`GetPolyHitUID` returns -1 for open rays.** Not every polygon vertex hits an obstacle - rays that reach maximum range without hitting anything produce a vertex at the range boundary with UID -1. Filter these out when scanning for hit objects.

- **Do not use `ResetMesh` in an every-tick event.** `ResetMesh` destroys the mesh deformation and disables it. Call it only when you intentionally want to clear the visual (e.g. on light switch off).

- **Custom objects mode needs at least one registered type.** If you switch to Custom objects mode without registering any types, the behavior has no candidates and produces a full-range polygon with no occlusion. Always register your types in the same event that sets the mode.

- **The behavior is per-instance, not per-type.** Changing the cone of view on one Guard does not affect other Guards. If you want to batch-update all guards, use a `for each Guard` loop.

- **Savegame support is automatic.** All SVC state is written to and read from Construct's slot saves. Do not manually save and restore SVC configuration - it will double-apply.

- **`OnRaycastBudgetExceeded` fires every frame the cost is over budget.** Do not reduce density inside this trigger without a cooldown, or you will fire a density reduction every frame, eventually reaching minimum quality. Use a boolean flag or a timer to gate the response.
